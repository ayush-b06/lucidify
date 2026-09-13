import { test, expect, Page } from '@playwright/test';
const firestore = 'http://127.0.0.1:8080/v1/projects/demo-lucidify/databases/(default)/documents';
const adminEmail = 'ayush.bhujle@gmail.com';
const unique = () => `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const field = (value: any): any => value === null ? { nullValue: null } : typeof value === 'boolean' ? { booleanValue: value } : typeof value === 'number' ? { doubleValue: value } : typeof value === 'object' ? Array.isArray(value) ? { arrayValue: { values: value.map(field) } } : { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k,v]) => [k,field(v)])) } } : { stringValue: value };
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
 return { uid, email };
}
async function login(page: Page, email: string) {
 await page.goto('/login');
 await page.getByPlaceholder('Email address').fill(email);
 await page.getByPlaceholder('Password (min. 6 characters)').fill('Testing123!');
 await page.getByRole('button', { name:'Sign In', exact:true }).click();
 await expect(page).toHaveURL(/\/dashboard$/);
}
async function bell(page: Page) { await page.getByRole('button', {name:/^Notifications/}).filter({visible:true}).click(); return page.getByRole('region', {name:'Notification inbox'}); }

test('live support messages deliver admin and client alerts, clear visible chat unread, and preserve a failed draft', async ({ page, browser }) => {
 const client = await user(); await user(adminEmail, 'Ayush');
 const adminContext = await browser.newContext(); const admin = await adminContext.newPage();
 await login(page,client.email); await login(admin,adminEmail);
 await page.goto('/dashboard/messages?conversationId=lucidify');
 const text = `Please review ${unique()}`;
 await page.getByPlaceholder('Write a message...').fill(text);
 await page.getByRole('button',{name:'Send message'}).click();
 const inbox = await bell(admin);
 await expect(inbox.getByText(text, {exact:true})).toBeVisible();
 await inbox.getByRole('button').filter({hasText:text}).click();
 await expect(admin).toHaveURL(new RegExp(`userId=${client.uid}`));
 await expect(admin.getByText(text,{exact:true}).last()).toBeVisible();
 await expect.poll(async () => (await get(`users/${client.uid}/conversations/lucidify`)).unreadCounts.mapValue.fields.Lucidify.integerValue || (await get(`users/${client.uid}/conversations/lucidify`)).unreadCounts.mapValue.fields.Lucidify.doubleValue).toBe('0');
 await page.goto('/dashboard');
 const reply = `Reviewed ${unique()}`;
 await admin.getByPlaceholder('Write a Message...').fill(reply);
 await admin.getByRole('button',{name:'Send message'}).click();
 const clientInbox = await bell(page);
 await expect(clientInbox.getByText(reply,{exact:true})).toBeVisible();
 await clientInbox.getByRole('button').filter({hasText:reply}).click();
 await expect(page).toHaveURL(/\/dashboard\/messages\?conversationId=lucidify$/);
 await expect(page.getByText(reply,{exact:true}).last()).toBeVisible();
 await put(`users/${client.uid}`, {denyWrites:true});
 await page.getByPlaceholder('Write a message...').fill('Keep this draft');
 await page.getByRole('button',{name:'Send message'}).click();
 await expect(page.locator('.DashboardNotice[role="alert"]')).toContainText('wasn’t sent');
 await expect(page.getByPlaceholder('Write a message...')).toHaveValue('Keep this draft');
 await put(`users/${client.uid}`, {denyWrites:false});
 await page.getByRole('button',{name:'Send message'}).click();
 await expect(page.getByPlaceholder('Write a message...')).toHaveValue('');
 await adminContext.close();
});

test('project creation can be reopened, setup save failures stay put, submission notifies admin, and direct routes use owner identity', async ({page}) => {
 const client = await user(); await login(page,client.email); await page.goto('/dashboard/projects');
 for (const name of ['Garden Studio','Second Project']) {
  await page.getByRole('button',{name:/New project/}).click();
  await page.getByRole('dialog',{name:'Create project'}).getByLabel('Project name').fill(name);
  await page.getByRole('button',{name:'Create project',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(name,{exact:true})).toBeVisible();
 }
 const projects = await list(`users/${client.uid}/projects`);
 expect(projects).toHaveLength(2);
 const project = projects.find((d:any) => d.fields.projectName.stringValue === 'Garden Studio');
 const id = project.name.split('/').pop();
 await page.goto(`/dashboard/projects/${id}/setup?userId=somebody-else&projectId=wrong`);
 await page.getByRole('button',{name:/1 month/}).click();
 await put(`users/${client.uid}`,{denyWrites:true});
 await page.getByRole('button',{name:/Continue/}).click();
 await expect(page.locator('.DashboardNotice[role="alert"]')).toContainText('could not be saved');
 await expect(page.getByText('When do you want to launch?',{exact:true})).toBeVisible();
 await put(`users/${client.uid}`,{denyWrites:false});
 await page.getByRole('button',{name:/Continue/}).click();
 await page.getByRole('button',{name:'Skip for now'}).click();
 await page.getByRole('button',{name:/Next.js/}).click();
 await page.getByRole('button',{name:/Continue/}).click();
 await page.getByRole('button',{name:/Continue/}).click();
 await page.getByRole('button',{name:/\$1,000 – \$2,500/}).click();
 await page.getByRole('button',{name:/Monthly/}).click();
 await page.getByRole('button',{name:/Continue/}).click();
 await page.getByRole('button',{name:/No thanks/}).click();
 await page.getByRole('button',{name:/Submit|Launch|Finish|Send/}).click();
 await expect(page).toHaveURL(new RegExp(`/dashboard/projects/${id}\\?`));
 const saved = await get(`users/${client.uid}/projects/${id}`);
 expect(saved.setupComplete.booleanValue).toBe(true);
 expect(saved.requestedPaymentPlan.stringValue).toBe('Monthly');
 expect(saved.paymentPlan).toBeUndefined();
 expect((await list(`users/${client.uid}/adminNotifications`)).filter((d:any) => d.fields.type.stringValue === 'new_project')).toHaveLength(1);
 await page.goto(`/dashboard/projects/${id}`);
 await expect(page.getByText('Garden Studio',{exact:true}).first()).toBeVisible();
 await expect(page.getByText('NaN',{exact:false})).toHaveCount(0);
});

test('admin approval and payment recording each persist with a client notification', async ({page}) => {
 const client = await user(); const id=unique(); await user(adminEmail,'Ayush');
 await put(`users/${client.uid}/projects/${id}`, {projectName:id, approval:'Pending', setupComplete:true, status:1, progress:0, paymentPlan:2, paymentAmount:125, weeksPaid:0});
 await login(page,adminEmail); await page.goto('/dashboard/projects');
 const card = page.locator('div').filter({has:page.getByText(id,{exact:true})}).filter({has:page.getByRole('button',{name:'Approve',exact:true})}).last();
 await card.getByRole('button',{name:'Approve',exact:true}).click();
 await expect.poll(async () => (await get(`users/${client.uid}/projects/${id}`)).approval.stringValue).toBe('Approved');
 await expect.poll(async () => (await list(`users/${client.uid}/notifications`)).length).toBe(1);
 await page.goto('/dashboard/transactions');
 const payment = page.locator('div').filter({has:page.getByText(id,{exact:true})}).filter({has:page.getByRole('button',{name:'Mark Paid',exact:true})}).last();
 await payment.getByRole('button',{name:'Mark Paid',exact:true}).click();
 await expect.poll(async () => Number((await get(`users/${client.uid}/projects/${id}`)).weeksPaid.integerValue)).toBe(1);
 await expect.poll(async () => (await list(`users/${client.uid}/notifications`)).length).toBe(2);
});

test('mobile notification inbox stays visible, supports both themes, safe links, keyboard close and read persistence', async ({page}) => {
 const client=await user();
 await put(`users/${client.uid}/notifications/a`,{title:'Design ready',message:'Your homepage is ready to review.',type:'upload',read:false,link:'https://example.com'});
 await put(`users/${client.uid}/notifications/b`,{title:'Project approved',message:'We have approved Garden Studio.',type:'project_update',read:false});
 await login(page,client.email); await page.setViewportSize({width:390,height:844});
 let inbox=await bell(page);
 await expect(inbox.getByText('Design ready',{exact:true})).toBeVisible();
 const bounds=await inbox.boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(390); expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(844);
 await page.screenshot({path:'artifacts/notifications-mobile-light.png',animations:'disabled'});
 await inbox.getByRole('button').filter({hasText:'Design ready'}).click();
 await expect(page).toHaveURL(/\/dashboard$/);
 await inbox.getByRole('button',{name:'Mark all read'}).click();
 await expect(inbox.getByText('You’re all caught up')).toBeVisible();
 await page.keyboard.press('Escape'); await expect(inbox).toHaveCount(0);
 await page.getByRole('button',{name:'Switch to dark mode'}).click(); inbox=await bell(page);
 await page.screenshot({path:'artifacts/notifications-mobile-dark.png',animations:'disabled'});
 await page.reload(); inbox=await bell(page);
 await expect(inbox.getByText('You’re all caught up')).toBeVisible();
});

test('profile validation and deletion requests preserve the account and report failures', async ({page}) => {
 const client=await user(); await login(page,client.email); await page.goto('/dashboard/profile');
 await page.getByRole('button',{name:/Edit Profile/}).click();
 await page.getByLabel('First Name',{exact:true}).fill('');
 await page.getByRole('button',{name:/Save Changes/}).click();
 await expect(page.locator('.DashboardNotice[role="alert"]')).toContainText('first name');
 await page.getByLabel('First Name',{exact:true}).fill('Updated');
 await page.getByRole('button',{name:/Save Changes/}).click();
 await expect.poll(async () => (await get(`users/${client.uid}`)).firstName.stringValue).toBe('Updated');
 await page.goto('/dashboard/settings');
 await page.getByRole('button',{name:'Request deletion',exact:true}).click();
 await page.getByRole('button',{name:'Send request',exact:true}).click();
 await expect(page.getByRole('button',{name:'Request sent',exact:true})).toBeDisabled();
 expect((await get(`users/${client.uid}`)).firstName.stringValue).toBe('Updated');
 expect((await get(`users/${client.uid}`)).deletionRequestedAt.timestampValue).toBeTruthy();
 expect((await get(`users/${client.uid}/adminNotifications/account-deletion`)).type.stringValue).toBe('account');
});

test('direct conversations appear live for both participants and reopen without resetting messages', async ({page,browser}) => {
 const a=await user(undefined,'Alex'), b=await user(undefined,'Robin');
 const context=await browser.newContext(); const other=await context.newPage();
 await login(page,a.email); await login(other,b.email); await other.goto('/dashboard/messages'); await page.goto('/dashboard/messages');
 await page.getByRole('button',{name:/New/}).click();
 const modal=page.getByRole('dialog',{name:'New message'});
 await modal.getByLabel('Recipient email').fill(b.email);
 await modal.getByRole('button',{name:'Search',exact:true}).click();
 await modal.getByRole('button',{name:/Start Conversation/}).click();
 await expect(modal).toHaveCount(0);
 await expect(other.getByText('Alex Lee',{exact:true}).first()).toBeVisible();
 const text=`Direct hello ${unique()}`;
 await page.getByPlaceholder('Write a message...').fill(text); await page.getByRole('button',{name:'Send message'}).click();
 const id=[a.uid,b.uid].sort().join('_');
 await expect.poll(async () => (await get(`directMessages/${id}`)).lastMessage.stringValue).toBe(text);
 const inbox=await bell(other); await inbox.getByRole('button').filter({hasText:text}).click();
 await expect(other.getByText(text,{exact:true}).last()).toBeVisible();
 await page.getByRole('button',{name:/New/}).click();
 await modal.getByLabel('Recipient email').fill(b.email); await modal.getByRole('button',{name:'Search',exact:true}).click();
 await modal.getByRole('button',{name:/Open Conversation/}).click();
 expect((await get(`directMessages/${id}`)).lastMessage.stringValue).toBe(text);
 expect(await list(`directMessages/${id}/messages`)).toHaveLength(1);
 await context.close();
});

test('design uploads report remote failures, fit on mobile, and save the design with its notification', async ({page}) => {
 const client=await user(); await user(adminEmail,'Ayush'); const id=unique();
 await put(`users/${client.uid}/projects/${id}`,{projectName:'Garden Studio',setupComplete:true,approval:'Approved',status:2});
 await login(page,adminEmail); await page.goto(`/dashboard/projects/${id}/uploads?userId=${client.uid}`); await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:/Upload|New Design|Add Design/i}).click();
 const modal=page.getByRole('dialog',{name:'Create a web design'});
 await expect(modal).toBeVisible();
 const bounds=await modal.boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(390);
 expect(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.route('https://api.cloudinary.com/**',route=>route.fulfill({status:500,body:'Upload failed'}));
 const file={name:'preview.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')};
 await modal.getByLabel('Design image').setInputFiles(file);
 await expect(modal.getByRole('alert')).toContainText('upload failed');
 await page.unroute('https://api.cloudinary.com/**');
 await page.route('https://api.cloudinary.com/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({secure_url:'https://res.cloudinary.com/demo/image/upload/sample.jpg'})}));
 await modal.getByLabel('Design image').setInputFiles(file);
 await modal.getByLabel('Design name').fill('Homepage concept'); await modal.getByLabel('Design description').fill('A welcoming homepage for Garden Studio.');
 await modal.getByRole('button',{name:'Sections',exact:true}).click(); await modal.getByRole('button',{name:'Homepage',exact:true}).click();
 await page.screenshot({path:'artifacts/design-dialog-mobile.png',animations:'disabled'});
 await modal.getByRole('button',{name:'Create Web Design',exact:true}).click();
 await expect(modal).toHaveCount(0);
 expect(await list(`users/${client.uid}/projects/${id}/section web designs`)).toHaveLength(1);
 expect((await list(`users/${client.uid}/notifications`)).filter((d:any)=>d.fields.type.stringValue==='upload')).toHaveLength(1);
});

test('unknown project data cannot break totals or cards, and negative billing amounts are rejected', async ({page}) => {
 const client=await user(); const id=unique();
 await put(`users/${client.uid}/projects/${id}`,{projectName:'Legacy project',approval:'Approved',paymentPlan:'Monthly',paymentAmount:200,weeksPaid:15,status:999,progress:'not-a-number'});
 await login(page,client.email); await page.goto('/dashboard/projects');
 await expect(page.getByText('Legacy project',{exact:true})).toBeVisible();
 await expect(page.getByText('Planning',{exact:true})).toBeVisible();
 await page.goto(`/dashboard/projects/${id}`);
 await expect(page.getByRole('region',{name:'Project brief'})).toContainText('Monthly');
 await expect(page.locator('body')).not.toContainText('NaN');
 await page.goto('/dashboard/transactions'); await expect(page.locator('body')).not.toContainText('NaN');
 await user(adminEmail,'Ayush'); await page.context().clearCookies();
 // Separate context is unnecessary: the login form signs into the new identity.
 await login(page,adminEmail); await page.goto(`/dashboard/projects/${id}?userId=${client.uid}`);
 await page.getByLabel('Payment amount').fill('-20'); await page.getByRole('button',{name:'Set',exact:true}).click();
 await expect(page.locator('.DashboardNotice[role="alert"]')).toContainText('non-negative');
 expect(Number((await get(`users/${client.uid}/projects/${id}`)).paymentAmount.doubleValue || (await get(`users/${client.uid}/projects/${id}`)).paymentAmount.integerValue)).toBe(200);
});

test('notification read failure is visible and can be retried without losing the link', async ({page}) => {
 const client=await user(); await put(`users/${client.uid}/notifications/retry`,{title:'Review your message',message:'A new message is waiting.',read:false,type:'message',link:'/dashboard/messages?conversationId=lucidify'});
 await login(page,client.email); const inbox=await bell(page);
 await put(`users/${client.uid}`,{denyWrites:true});
 await inbox.getByRole('button').filter({hasText:'Review your message'}).click();
 await expect(inbox.getByRole('alert')).toContainText('Couldn’t mark');
 await expect(page).toHaveURL(/\/dashboard$/);
 await put(`users/${client.uid}`,{denyWrites:false});
 await inbox.getByRole('button').filter({hasText:'Review your message'}).click();
 await expect(page).toHaveURL(/\/dashboard\/messages\?conversationId=lucidify$/);
 expect((await get(`users/${client.uid}/notifications/retry`)).read.booleanValue).toBe(true);
});
