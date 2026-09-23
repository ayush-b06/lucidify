import { readFileSync } from 'node:fs';
import { test, expect, Page } from '@playwright/test';
import { directoryProfile } from '../utils/memberNames';

const root = 'http://127.0.0.1:8080/v1/projects/demo-lucidify/databases/(default)/documents';
const adminEmail = 'ayush.bhujle@gmail.com';
const unique = () => `member-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const field = (value: any): any => value === null ? { nullValue: null } : typeof value === 'boolean' ? { booleanValue: value } : typeof value === 'number' ? { integerValue: String(value) } : Array.isArray(value) ? { arrayValue: { values: value.map(field) } } : typeof value === 'object' ? { mapValue: { fields: fields(value) } } : { stringValue: value };
const fields = (data: Record<string, any>) => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, field(value)]));
async function put(path: string, data: Record<string, any>, token = 'owner') {
    return fetch(`${root}/${path}?${Object.keys(data).map(key => `updateMask.fieldPaths=${encodeURIComponent(key)}`).join('&')}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: fields(data) }),
    });
}
const get = (path: string, token = 'owner') => fetch(`${root}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
async function user(firstName: string, email = `${unique()}@example.test`) {
    const body = JSON.stringify({ email, password: 'Testing123!', returnSecureToken: true });
    const request = (method: string) => fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:${method}?key=demo-lucidify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).then(r => r.json());
    let result = await request('signUp');
    if (!result.localId) result = await request('signInWithPassword');
    expect(result.localId).toBeTruthy();
    const profile = { firstName, lastName: 'Lee', email, selectedAvatar: 'Avatar 4.png', setUp: true };
    expect((await put(`users/${result.localId}`, profile)).ok).toBeTruthy();
    if (email !== adminEmail) expect((await put(`userDirectory/${result.localId}`, directoryProfile(profile))).ok).toBeTruthy();
    return { uid: result.localId as string, token: result.idToken as string, email, name: `${firstName} Lee`, firstName };
}
async function login(page: Page, email: string) {
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill(email);
    await page.getByPlaceholder('Password (min. 6 characters)').fill('Testing123!');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
}
async function useRules(path: string) {
    const result = await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-lucidify:securityRules', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: { files: [{ name: 'security.rules', content: readFileSync(path, 'utf8') }] } }),
    });
    expect(result.ok).toBeTruthy();
    expect(((await result.json()).issues || []).filter((issue: any) => issue.severity === 'ERROR')).toHaveLength(0);
}
async function addClient(page: Page, member: Awaited<ReturnType<typeof user>>) {
    await page.getByRole('button', { name: 'Add client', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Add client' });
    await dialog.getByLabel('Search by name').fill(member.firstName);
    const button = dialog.getByRole('button', { name: `Add ${member.name}`, exact: true });
    await expect(button).toContainText(member.email);
    await button.click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'Current clients' })).toContainText(member.email);
}
async function membership(ownerId: string, projectId: string, memberId: string, actorId: string, token: string, paths?: string[]) {
    const targets = paths || [`users/${ownerId}/projects/${projectId}/members/${memberId}`, `users/${memberId}/sharedProjects/${ownerId}_${projectId}`];
    return fetch(`${root}:commit`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ writes: targets.map(path => ({
            update: { name: `projects/demo-lucidify/databases/(default)/documents/${path}`, fields: fields({ ownerId, projectId, addedBy: actorId }) },
            updateTransforms: [{ fieldPath: 'addedAt', setToServerValue: 'REQUEST_TIME' }],
        })) }),
    });
}

test.beforeAll(async () => { await useRules('firebase/firestore.rules'); });
test.afterAll(async () => { await useRules('tests/firestore.rules'); });

test('clients and admin share one live project, search names with email display, and collaborate on files', async ({ page, browser }) => {
    test.setTimeout(120000);
    const owner = await user(`Owner${Date.now()}`), member = await user(`Partner${Date.now()}`), third = await user(`Third${Date.now()}`), fourth = await user(`Fourth${Date.now()}`);
    await user('Ayush', adminEmail);
    const id = unique(), projectPath = `users/${owner.uid}/projects/${id}`;
    expect((await put(projectPath, { projectName: 'Shared organization', projectDescription: 'Original brief', approval: 'Approved', setupComplete: true, progress: 10, status: 1 })).ok).toBeTruthy();
    const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
    const [partner, admin] = await Promise.all(contexts.map(context => context.newPage()));
    const url = `/dashboard/projects/${id}?userId=${owner.uid}`;
    try {
        await login(page, owner.email); await login(partner, member.email); await login(admin, adminEmail);
        await partner.goto('/dashboard/projects'); await page.goto(url); await admin.goto(url);
        await page.getByRole('button', { name: 'Add client', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Add client' });
        await dialog.getByLabel('Search by name').fill(member.email);
        await expect(dialog.getByRole('status')).toContainText('Search by their name');
        await expect(dialog.getByRole('list', { name: 'Matching clients' }).getByRole('button')).toHaveCount(0);
        // An email prefix that is not a name must not return the member either.
        await dialog.getByLabel('Search by name').fill(member.email.split('@')[0]);
        await expect(dialog.getByRole('status')).toHaveText('No matching names.');
        await dialog.getByLabel('Search by name').fill(member.firstName.toUpperCase());
        await expect(dialog.getByText(member.email, { exact: true })).toBeVisible();
        await page.setViewportSize({ width: 390, height: 844 });
        await dialog.screenshot({ path: 'artifacts/project-members-mobile.png', animations: 'disabled' });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await dialog.getByRole('button', { name: `Add ${member.name}`, exact: true }).dblclick();
        await expect(dialog).toHaveCount(0);
        await expect(partner.getByText('Shared organization', { exact: true })).toBeVisible();
        await partner.getByRole('link').filter({ hasText: 'Shared organization' }).click();
        await expect(partner).toHaveURL(new RegExp(`userId=${owner.uid}`));
        await addClient(partner, third);
        await addClient(admin, fourth);
        await expect(page.getByRole('heading', { name: 'Project clients (4)' })).toBeVisible();
        await expect(partner.getByRole('heading', { name: 'Project clients (4)' })).toBeVisible();
        await partner.getByRole('button', { name: 'Edit project details', exact: true }).click();
        await partner.getByLabel('Project name', { exact: true }).fill('Organization together');
        await partner.getByRole('button', { name: 'Save details' }).click();
        for (const target of [page, partner, admin]) await expect(target.getByRole('heading', { name: 'Organization together', exact: true })).toBeVisible();
        // Reject a stale edit of the same field, preserving the user's draft.
        await page.getByRole('button', { name: 'Edit project details', exact: true }).click();
        await page.getByLabel('Project name', { exact: true }).fill('Stale name');
        await partner.getByRole('button', { name: 'Edit project details', exact: true }).click();
        await partner.getByLabel('Project name', { exact: true }).fill('Latest name');
        await partner.getByRole('button', { name: 'Save details' }).click();
        await expect(admin.getByRole('heading', { name: 'Latest name', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Save details' }).click();
        await expect(page.getByRole('form', { name: 'Edit project details' }).getByRole('alert')).toContainText('Someone updated these details');
        await expect(page.getByLabel('Project name', { exact: true })).toHaveValue('Stale name');
        await page.getByRole('button', { name: 'Cancel', exact: true }).click();
        await partner.route('https://api.cloudinary.com/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ secure_url: 'https://res.cloudinary.com/dldxkfbz4/image/upload/shared-photo.png' }) }));
        for (const target of [page, partner, admin]) await target.getByRole('navigation', { name: 'Project sections' }).getByRole('link', { name: 'Uploads' }).click();
        await partner.getByRole('button', { name: 'Add files', exact: true }).click();
        await partner.getByLabel('Files to upload').setInputFiles({ name: 'Team photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
        await partner.getByRole('button', { name: 'Add 1 file', exact: true }).click();
        await expect(partner.getByRole('dialog', { name: 'Add files' })).toHaveCount(0);
        for (const target of [page, partner, admin]) await expect(target.getByText('Team photo', { exact: true }).first()).toBeVisible();
        await partner.reload();
        await expect(partner.getByText('Team photo', { exact: true }).first()).toBeVisible();
        await admin.goto('/dashboard/projects');
        await expect(admin.getByText('Latest name', { exact: true })).toHaveCount(1);
        expect((await (await get(projectPath)).json()).fields.projectName.stringValue).toBe('Latest name');
        expect((await get(`users/${member.uid}/projects/${id}`)).status).toBe(404);
    } finally { await Promise.all(contexts.map(context => context.close())); }
});

test('production rules prevent unauthorized and partial memberships and impose no 20-client cap', async () => {
    test.setTimeout(90000);
    const owner = await user('AccessOwner'), outsider = await user('Outsider'), partner = await user('AccessPartner');
    const id = unique(), path = `users/${owner.uid}/projects/${id}`;
    expect((await put(path, { projectName: 'Private organization' })).ok).toBeTruthy();
    expect((await get(path, outsider.token)).status).toBe(403);
    expect((await membership(owner.uid, id, outsider.uid, outsider.uid, outsider.token)).status).toBe(403);
    expect((await membership(owner.uid, id, partner.uid, owner.uid, owner.token, [`users/${owner.uid}/projects/${id}/members/${partner.uid}`])).status).toBe(403);
    expect((await membership(owner.uid, id, partner.uid, owner.uid, owner.token, [`users/${partner.uid}/sharedProjects/${owner.uid}_${id}`])).status).toBe(403);
    expect((await membership(owner.uid, id, partner.uid, owner.uid, owner.token)).status).toBe(200);
    expect((await get(path, partner.token)).status).toBe(200);
    expect((await put(path, { projectDescription: 'Collaborator edit' }, partner.token)).status).toBe(200);
    expect((await get(`users/${owner.uid}`, partner.token)).status).toBe(403);
    expect((await put(`users/${owner.uid}/projects/private`, { projectName: 'Other project' })).ok).toBeTruthy();
    expect((await get(`users/${owner.uid}/projects/private`, partner.token)).status).toBe(403);
    expect((await put(`users/${owner.uid}/projects/private`, { projectName: 'Unauthorized' }, partner.token)).status).toBe(403);
    expect((await membership(owner.uid, id, outsider.uid, partner.uid, partner.token)).status).toBe(200);
    for (let i = 0; i < 24; i++) {
        const uid = `${unique()}-${i}`;
        expect((await put(`userDirectory/${uid}`, directoryProfile({ firstName: `Member${i}`, email: `${uid}@example.test` }))).ok).toBeTruthy();
        expect((await membership(owner.uid, id, uid, partner.uid, partner.token)).status).toBe(200);
    }
    const roster = await (await get(`${path}/members`, partner.token)).json();
    expect(roster.documents).toHaveLength(26);
    // Existing access records cannot be retargeted to a different project.
    expect((await put(`users/${partner.uid}/sharedProjects/${owner.uid}_${id}`, { projectId: 'private' }, partner.token)).status).toBe(403);
});
