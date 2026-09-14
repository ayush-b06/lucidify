import { readFileSync } from 'node:fs';
import { directoryProfile } from '../utils/memberNames';
import { test, expect, Page, BrowserContext } from '@playwright/test';
const firestore = 'http://127.0.0.1:8080/v1/projects/demo-lucidify/databases/(default)/documents';
const adminEmail = 'ayush.bhujle@gmail.com';
const unique = () => `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const field = (value: any): any => value instanceof Date ? { timestampValue: value.toISOString() } : value === null ? { nullValue: null } : typeof value === 'boolean' ? { booleanValue: value } : typeof value === 'number' ? { doubleValue: value } : typeof value === 'object' ? Array.isArray(value) ? { arrayValue: { values: value.map(field) } } : { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k,v]) => [k,field(v)])) } } : { stringValue: value };
async function put(path: string, data: Record<string, unknown>) {
 const response = await fetch(`${firestore}/${path}?${Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&')}`, { method: 'PATCH', headers: { 'Content-Type':'application/json', Authorization:'Bearer owner' }, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k,v]) => [k,field(v)])) }) });
 expect(response.ok).toBeTruthy();
}
async function get(path: string) { return (await (await fetch(`${firestore}/${path}`, { headers: { Authorization:'Bearer owner' } })).json()).fields; }
async function list(path: string) { return (await (await fetch(`${firestore}/${path}`, { headers: { Authorization:'Bearer owner' } })).json()).documents || []; }
async function user(email = `${unique()}@example.test`, firstName = 'Morgan') {
 const body = JSON.stringify({ email, password:'Testing123!', returnSecureToken:true });
 let result = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-lucidify', { method:'POST', headers: {'Content-Type':'application/json'}, body })).json();
 if (!result.localId) result = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-lucidify', { method:'POST', headers: {'Content-Type':'application/json'}, body })).json();
 expect(result.localId).toBeTruthy();
 const uid = result.localId as string;
 await put(`users/${uid}`, { email, firstName, lastName:'Lee', setUp:true, selectedAvatar:'Avatar 4.png', denyWrites:false, denyReads:false });
 await put(`users/${uid}/conversations/lucidify`, { title:'Lucidify', isPinned:true, lastMessage:'Welcome to your project space', unreadCounts:{ [uid]:0, Lucidify:0 } });
 await put(`userDirectory/${uid}`,directoryProfile({firstName,lastName:'Lee',selectedAvatar:'Avatar 4.png'}));
 return { uid, email, token: result.idToken };
}
async function login(page: Page, email: string) {
 await page.goto('/login');
 await page.getByPlaceholder('Email address').fill(email);
 await page.getByPlaceholder('Password (min. 6 characters)').fill('Testing123!');
 await page.getByRole('button', { name:'Sign In', exact:true }).click();
 await expect(page).toHaveURL(/\/dashboard$/);
}
async function bell(page: Page) { await page.getByRole('button', {name:/^Notifications/}).filter({visible:true}).click(); return page.getByRole('region', {name:'Notification inbox'}); }

const cloudinaryUploads = 'https://api.cloudinary.com/v1_1/dldxkfbz4/**/upload';
async function mockDownloads(target: Page | BrowserContext) {
 await target.route('https://res.cloudinary.com/dldxkfbz4/**', route => route.fulfill({status:200,contentType:route.request().url().endsWith('.png')?'image/png':'application/octet-stream',body:route.request().url().endsWith('.png')?Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'):Buffer.from('Synthetic attachment content')}));
}
test.beforeEach(async ({page}) => {
 await page.route(cloudinaryUploads, route => {
  const body=route.request().postDataBuffer()?.toString()||'';
  const name=/filename="([^"]+)"/.exec(body)?.[1]||'file.txt';
  const resource=route.request().url().includes('/image/')?'image':'raw';
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({secure_url:`https://res.cloudinary.com/dldxkfbz4/${resource}/upload/v1/test/${encodeURIComponent(name)}`})});
 });
 await mockDownloads(page);
});

test('name results update while typing, ignore case, clear on deletion, and retain duplicate names', async ({page}) => {
 const prefix=`Al${Date.now()}`, alice=prefix+'ice', alicia=prefix+'icia';
 const me=await user(undefined,'Searcher'); await user(undefined,alice); await user(undefined,alicia); await user(undefined,alice);
 await login(page,me.email); await page.goto('/dashboard/messages');
 await page.getByRole('button',{name:/New/}).click(); const modal=page.getByRole('dialog',{name:'New message'});
 const search=modal.getByLabel('Name',{exact:true});
 await search.fill(prefix); await expect(modal.getByRole('button',{name:`Message ${alice} Lee`})).toHaveCount(2);
 await expect(modal.getByRole('button',{name:`Message ${alicia} Lee`})).toBeVisible();
 await search.fill(alicia.toUpperCase()); await expect(modal.getByRole('button',{name:`Message ${alicia} Lee`})).toBeVisible();
 await expect(modal.getByRole('button',{name:`Message ${alice} Lee`})).toHaveCount(0);
 await search.fill('NoSuchMember'); await expect(modal.getByRole('status')).toContainText('No matching names');
 await search.fill(''); await expect(modal.getByRole('list',{name:'Matching people'}).getByRole('button')).toHaveCount(0);
 await search.fill(`${alice} Lee`); await expect(modal.getByRole('button',{name:`Message ${alice} Lee`})).toHaveCount(2);
 await expect(modal.getByText(/@example.test/)).toHaveCount(0);
 await modal.screenshot({path:'artifacts/name-search.png',animations:'disabled'});
});

test('Cloudinary support attachments reach the admin, download, and notify for file-only messages', async ({page,browser}) => {
 const client=await user(); await user(adminEmail,'Ayush');
 const context=await browser.newContext({acceptDownloads:true});const admin=await context.newPage();await mockDownloads(context);
 await login(page,client.email);await login(admin,adminEmail);
 await page.goto('/dashboard/messages?conversationId=lucidify');await admin.goto(`/dashboard/messages?userId=${client.uid}&conversationId=lucidify`);
 await expect(page.getByLabel('Attach files',{exact:true})).toBeEnabled();
 await page.getByLabel('Attach files',{exact:true}).setInputFiles([
  {name:'brief.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nMy website brief')},
  {name:'sample.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')}
 ]);
 await expect(page.getByLabel('Attachments ready to send')).toContainText('brief.pdf');
 expect(await list(`users/${client.uid}/conversations/lucidify/messages`)).toHaveLength(0);
 await page.getByRole('button',{name:'Send message'}).dblclick();
 await expect(admin.getByRole('button',{name:'Download brief.pdf'})).toBeVisible({timeout:15000});
 await expect(admin.getByRole('img',{name:'sample.png',exact:true})).toBeVisible();
 const downloadPromise=admin.waitForEvent('download'); await admin.getByRole('button',{name:'Download brief.pdf'}).click();
 expect((await downloadPromise).suggestedFilename()).toBe('brief.pdf');
 const messages=await list(`users/${client.uid}/conversations/lucidify/messages`);expect(messages).toHaveLength(1);
 const attachment=messages[0].fields.attachments.arrayValue.values[0].mapValue.fields;
 expect(attachment.url.stringValue).toMatch(/^https:\/\/res\.cloudinary\.com\/dldxkfbz4\/raw\/upload\//);
 expect((await list(`users/${client.uid}/adminNotifications`)).filter((d:any)=>d.fields.type.stringValue==='message')).toHaveLength(1);
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'artifacts/chat-attachments-mobile.png',animations:'disabled'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await context.close();
});

test('drop stages files, failed sends retain them, and switching chats keeps separate drafts', async ({page}) => {
 const recipient=`Recipient${Date.now()}`;
 const client=await user(undefined,'Sender'),other=await user(undefined,recipient);
 await login(page,client.email);await page.goto('/dashboard/messages?conversationId=lucidify');
 await expect(page.getByLabel('Message',{exact:true})).toBeEnabled();
 const drop=await page.evaluateHandle(()=>{const data=new DataTransfer();data.items.add(new File(['Notes for my website'],'notes.txt',{type:'text/plain'}));return data;});
 await page.getByLabel('Chat',{exact:true}).dispatchEvent('drop',{dataTransfer:drop});
 await expect(page.getByLabel('Attachments ready to send')).toContainText('notes.txt');
 await page.getByLabel('Message',{exact:true}).fill('Support draft');
 await page.getByRole('button',{name:/New/}).click(); const modal=page.getByRole('dialog',{name:'New message'});
 await modal.getByLabel('Name',{exact:true}).fill(recipient);await modal.getByRole('button',{name:`Message ${recipient} Lee`}).click();
 await expect(page.getByLabel('Message',{exact:true})).toHaveValue('');
 await expect(page.getByLabel('Attachments ready to send')).toHaveCount(0);
 await page.getByLabel('Message',{exact:true}).fill('Direct draft');
 await page.getByRole('heading',{name:'Lucidify',exact:true}).first().click();
 await expect(page.getByLabel('Message',{exact:true})).toHaveValue('Support draft');
 await expect(page.getByLabel('Attachments ready to send')).toContainText('notes.txt');
 await put(`users/${client.uid}`,{denyWrites:true});
 await page.getByRole('button',{name:'Send message'}).click();
 await expect(page.getByRole('alert').filter({hasText:'wasn’t sent'})).toBeVisible({timeout:15000});
 expect(await list(`users/${client.uid}/conversations/lucidify/messages`)).toHaveLength(0);
 await put(`users/${client.uid}`,{denyWrites:false});
 await page.getByRole('button',{name:'Send message'}).dblclick();
 await expect(page.getByRole('button',{name:'Download notes.txt'})).toBeVisible();
 expect(await list(`users/${client.uid}/conversations/lucidify/messages`)).toHaveLength(1);
 await page.getByRole('heading',{name:`${recipient} Lee`,exact:true}).first().click();
 await expect(page.getByLabel('Message',{exact:true})).toHaveValue('Direct draft');
 await expect(page.getByLabel('Attach files',{exact:true})).toBeEnabled();
 await page.getByLabel('Attach files',{exact:true}).setInputFiles({name:'direct.txt',mimeType:'text/plain',buffer:Buffer.from('Direct attachment')});
 await page.getByRole('button',{name:'Send message'}).click();
 await expect(page.getByRole('button',{name:'Download direct.txt'})).toBeVisible();
 const id=[client.uid,other.uid].sort().join('_');
 expect((await list(`directMessages/${id}/messages`))[0].fields.attachments.arrayValue.values).toHaveLength(1);
});

test('upload errors and file limits are visible, and retry sends a multiline message', async ({page}) => {
 const client=await user();await login(page,client.email);await page.goto('/dashboard/messages?conversationId=lucidify');
 await expect(page.getByLabel('Attach files',{exact:true})).toBeEnabled();
 await page.getByLabel('Attach files',{exact:true}).setInputFiles({name:'too-large.zip',mimeType:'application/zip',buffer:Buffer.alloc(10*1024*1024+1)});
 await expect(page.getByRole('alert').filter({hasText:'10 MB'})).toBeVisible();
 await expect(page.getByLabel('Attachments ready to send')).toHaveCount(0);
 const failUpload=(route: import('@playwright/test').Route)=>route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:{message:'Upload denied'}})});
 await page.route(cloudinaryUploads,failUpload);
 await expect(page.getByLabel('Attach files',{exact:true})).toBeEnabled();
 await page.getByLabel('Attach files',{exact:true}).setInputFiles({name:'retry.txt',mimeType:'text/plain',buffer:Buffer.from('Retry me')});
 const input=page.getByLabel('Message',{exact:true});await input.fill('First line');await input.press('Shift+Enter');await input.pressSequentially('Second line');
 await page.getByRole('button',{name:'Send message'}).click();
 await expect(page.getByRole('alert').filter({hasText:'wasn’t sent'})).toBeVisible({timeout:15000});
 await expect(page.getByLabel('Attachments ready to send')).toContainText('retry.txt');
 await page.unroute(cloudinaryUploads, failUpload);await page.getByRole('button',{name:'Send message'}).click();
 await expect(page.getByRole('button',{name:'Download retry.txt'})).toBeVisible();
 const saved=(await list(`users/${client.uid}/conversations/lucidify/messages`))[0].fields;
 expect(saved.text.stringValue).toBe('First line\nSecond line');
});

async function useRules(path: string) {
 const response = await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-lucidify:securityRules', {
  method:'PUT', headers:{'Content-Type':'application/json'},
  body:JSON.stringify({ignore_errors:true,rules:{files:[{name:'security.rules',content:readFileSync(path,'utf8')}]}})
 });
 expect(response.ok).toBe(true);
 const body=await response.json();expect((body.issues||[]).filter((issue:any)=>issue.severity==='ERROR')).toHaveLength(0);
}

test('production rules allow name lookup and message delivery while denying outsiders and forged senders', async ({page,browser}) => {
 const client=await user(), other=await user(undefined,`RuleRecipient${Date.now()}`), outsider=await user();await user(adminEmail,'Ayush');
 const recipient=(await get(`users/${other.uid}`)).firstName.stringValue;
 await useRules('firebase/firestore.rules');
 const context=await browser.newContext();const admin=await context.newPage();await mockDownloads(context);
 try {
  const read=(path:string,token?:string)=>fetch(`${firestore}/${path}`,{headers:token?{Authorization:`Bearer ${token}`}:{}});
  expect((await read(`users/${client.uid}`)).status).toBe(403);
  expect((await read(`users/${client.uid}`,outsider.token)).status).toBe(403);
  expect((await read(`users/${client.uid}`,client.token)).status).toBe(200);
  expect((await read(`userDirectory/${other.uid}`,client.token)).status).toBe(200);
  expect((await read('users',client.token)).status).toBe(403);
  await login(page,client.email);await page.goto('/dashboard/messages');
  await page.getByRole('button',{name:/New/}).click();const modal=page.getByRole('dialog',{name:'New message'});
  await modal.getByLabel('Name',{exact:true}).fill(recipient);await modal.getByRole('button',{name:`Message ${recipient} Lee`}).click();
  await expect(modal).toHaveCount(0);
  await page.getByLabel('Message',{exact:true}).fill('Private direct message');await page.getByRole('button',{name:'Send message'}).click();
  await expect(page.getByLabel('Message',{exact:true})).toHaveValue('');
  const id=[client.uid,other.uid].sort().join('_');
  expect(await list(`directMessages/${id}/messages`)).toHaveLength(1);
  expect((await read(`directMessages/${id}/messages`,outsider.token)).status).toBe(403);
  expect((await read(`directMessages/${id}/messages`,other.token)).status).toBe(200);
  const forged={text:'Forged',attachments:[],sender:other.uid,timestamp:new Date(),isRead:false};
  const response=await fetch(`${firestore}/directMessages/${id}/messages/forged`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${client.token}`},body:JSON.stringify({fields:Object.fromEntries(Object.entries(forged).map(([k,v])=>[k,field(v)]))})});
  expect(response.status).toBe(403);
  await page.getByRole('heading',{name:'Lucidify',exact:true}).first().click();
  await page.getByLabel('Message',{exact:true}).fill('Support under production rules');await page.getByRole('button',{name:'Send message'}).click();
  await expect(page.getByLabel('Message',{exact:true})).toHaveValue('');
  await login(admin,adminEmail);await admin.goto(`/dashboard/messages?userId=${client.uid}&conversationId=lucidify`);
  await expect(admin.getByText('Support under production rules',{exact:true}).last()).toBeVisible();
  await admin.getByLabel('Message',{exact:true}).fill('Admin reply under production rules');await admin.getByRole('button',{name:'Send message'}).click();
  await expect(page.getByText('Admin reply under production rules',{exact:true}).last()).toBeVisible();
 } finally { await context.close();await useRules('tests/firestore.rules'); }
});

test('reading older messages keeps the scroll position when new messages arrive', async ({page}) => {
 const client=await user();
 for(let i=0;i<40;i++) await put(`users/${client.uid}/conversations/lucidify/messages/old-${i}`,{text:`Earlier message ${i}\nSecond line of this message`,sender:i%2?'Lucidify':client.uid,timestamp:new Date(Date.now()-100000+i*1000),isRead:false});
 await login(page,client.email);await page.goto('/dashboard/messages?conversationId=lucidify');
 const history=page.getByLabel('Chat',{exact:true}).locator('div.overflow-y-auto').last();
 await expect(page.getByText('Earlier message 39',{exact:false})).toBeVisible();
 await history.evaluate(element=>{element.scrollTop=100;element.dispatchEvent(new Event('scroll',{bubbles:true}));});
 await put(`users/${client.uid}/conversations/lucidify/messages/incoming`,{text:'Incoming while reading',sender:'Lucidify',timestamp:new Date(),isRead:false});
 await expect(page.getByText('Incoming while reading',{exact:true})).toBeAttached();
 expect(await history.evaluate(element=>element.scrollTop)).toBe(100);
 await page.getByLabel('Message',{exact:true}).fill('My response');await page.getByRole('button',{name:'Send message'}).click();
 await expect.poll(()=>history.evaluate(element=>element.scrollHeight-element.scrollTop-element.clientHeight)).toBeLessThan(100);
});

test('blocked PDF downloads explain how to recover and retry after delivery is enabled', async ({page}) => {
 const client=await user();await login(page,client.email);await page.goto('/dashboard/messages?conversationId=lucidify');
 await expect(page.getByLabel('Attach files',{exact:true})).toBeEnabled();
 await page.getByLabel('Attach files',{exact:true}).setInputFiles({name:'blocked.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nTest')});
 await page.getByRole('button',{name:'Send message'}).click();
 const download=page.getByRole('button',{name:'Download blocked.pdf'});await expect(download).toBeVisible();
 const denied=(route:import('@playwright/test').Route)=>route.fulfill({status:401,body:'Restricted'});
 const url='https://res.cloudinary.com/dldxkfbz4/raw/upload/v1/test/blocked.pdf';await page.route(url,denied);
 await download.click();await expect(page.getByRole('alert').filter({hasText:'PDF and ZIP downloads are currently blocked'})).toBeVisible();
 await page.unroute(url,denied);const downloaded=page.waitForEvent('download');await download.click();expect((await downloaded).suggestedFilename()).toBe('blocked.pdf');
 await expect(page.getByRole('alert').filter({hasText:'PDF and ZIP downloads are currently blocked'})).toHaveCount(0);
});
