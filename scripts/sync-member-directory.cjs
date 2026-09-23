// Run with an authenticated Firebase CLI on PATH, or --firebase-tools /path/to/firebase-tools.
// Dry-run by default; --apply creates missing public name/avatar projections.
// Add --repair-search to rebuild stale prefixes without changing saved names or avatars.
// Add --repair-email to populate display emails on existing directory entries.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function loadDirectoryProfile() {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../utils/memberNames.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const names = {}; new Function('exports', compiled)(names);
  return names.directoryProfile;
}
async function main() {
  const index = process.argv.indexOf('--firebase-tools');
  let cli = index >= 0 ? process.argv[index + 1] : '';
  if (!cli) {
    for (const folder of (process.env.PATH || '').split(path.delimiter)) {
      const binary = path.join(folder, 'firebase');
      if (fs.existsSync(binary)) { cli = path.resolve(path.dirname(fs.realpathSync(binary)), '../..'); break; }
    }
  }
  if (!cli) throw new Error('Install/run Firebase CLI and sign in, then provide --firebase-tools /path/to/firebase-tools if it is not on PATH.');
  const project = 'lucidify-playground';
  const auth = require(path.join(cli, 'lib/auth'));
  const options = { project };
  auth.setActiveAccount(options, auth.selectAccount(undefined, process.cwd()));
  await require(path.join(cli, 'lib/requireAuth')).requireAuth(options);
  const { Client } = require(path.join(cli, 'lib/apiv2'));
  const client = new Client({ urlPrefix: 'https://firestore.googleapis.com', apiVersion: 'v1' });
  const root = `projects/${project}/databases/(default)/documents`;
  const directoryProfile = loadDirectoryProfile();
  const value = v => v === null ? { nullValue: null } : Array.isArray(v) ? { arrayValue: { values: v.map(value) } } : { stringValue: v };
  let pageToken = '', eligible = 0, created = 0, existing = 0, repairable = 0, repaired = 0;
  const apply = process.argv.includes('--apply');
  const repairSearch = process.argv.includes('--repair-search');
  const repairEmail = process.argv.includes('--repair-email');
  do {
    const query = new URLSearchParams({ pageSize: '100', ...(pageToken ? { pageToken } : {}) });
    const result = await client.get(`${root}/users?${query}`);
    for (const document of result.body.documents || []) {
      const fields = document.fields || {};
      if (fields.setUp?.booleanValue !== true || fields.email?.stringValue === 'ayush.bhujle@gmail.com' || !fields.firstName?.stringValue) continue;
      const uid = document.name.split('/').pop();
      const entry = directoryProfile({ firstName: fields.firstName.stringValue, lastName: fields.lastName?.stringValue || '', selectedAvatar: fields.selectedAvatar?.stringValue || null, email: fields.email?.stringValue || '' });
      eligible++;
      if (repairSearch || repairEmail) {
        const result = await client.post(`${root}:batchGet`, { documents: [`${root}/userDirectory/${uid}`] });
        const saved = result.body.find(item => item.found)?.found;
        if (saved) {
          existing++;
          const data = saved.fields;
          const expected = directoryProfile({ firstName: data.firstName?.stringValue || '', lastName: data.lastName?.stringValue || '' }).searchPrefixes;
          const current = (data.searchPrefixes?.arrayValue?.values || []).map(item => item.stringValue);
          const changes = {};
          if (repairSearch && JSON.stringify(current) !== JSON.stringify(expected)) changes.searchPrefixes = expected;
          if (repairEmail && data.email?.stringValue !== entry.email) changes.email = entry.email;
          if (Object.keys(changes).length) {
            repairable++;
            if (apply) {
              await client.post(`${root}:commit`, { writes: [{
                update: { name: saved.name, fields: Object.fromEntries(Object.entries(changes).map(([key, v]) => [key, value(v)])) },
                updateMask: { fieldPaths: Object.keys(changes) },
                currentDocument: { updateTime: saved.updateTime },
              }] });
              repaired++;
            }
          }
          continue;
        }
      }
      if (!apply) continue;
      try {
        await client.post(`${root}:commit`, { writes: [{ update: { name: `${root}/userDirectory/${uid}`, fields: Object.fromEntries(Object.entries(entry).map(([key, v]) => [key, value(v)])) }, currentDocument: { exists: false } }] });
        created++;
      } catch (error) {
        if (error.status === 409 || error.context?.response?.statusCode === 409 || error.message?.includes('ALREADY_EXISTS')) existing++;
        else throw error;
      }
    }
    pageToken = result.body.nextPageToken || '';
  } while (pageToken);
  console.log(JSON.stringify({ project, dryRun: !apply, eligible, created, existing, repairable, repaired }));
}
module.exports = { loadDirectoryProfile };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
