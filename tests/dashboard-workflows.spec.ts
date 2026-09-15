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
 await expect(page.getByRole('alert').filter({hasText:'wasn’t sent'})).toBeVisible();
 await expect(page.getByPlaceholder('Write a message...')).toHaveValue('Keep this draft');
 await put(`users/${client.uid}`, {denyWrites:false});
 await page.getByRole('button',{name:'Send message'}).click();
 await expect(page.getByPlaceholder('Write a message...')).toHaveValue('');
 await adminContext.close();
});

test('project brief saves drafts, preserves answers on failure, submits once, and appears for the admin', async ({page, browser}) => {
 const client = await user(); await user(adminEmail, 'Ayush'); await login(page,client.email); await page.goto('/dashboard/projects');
 for (const name of ['Garden Studio','Second Project']) {
  await page.getByRole('button',{name:/New project/}).click();
  await page.getByRole('dialog',{name:'Create project'}).getByLabel('Project name').fill(name);
  await page.getByRole('button',{name:'Create project',exact:true}).click();
  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByRole('heading',{name:'What kind of website is this?'})).toBeVisible();
  await page.getByRole('button',{name:'Save & exit'}).click();
  await expect(page).toHaveURL(/\/dashboard\/projects$/);
 }
 const projects = await list(`users/${client.uid}/projects`);
 expect(projects).toHaveLength(2);
 const project = projects.find((d:any) => d.fields.projectName.stringValue === 'Garden Studio');
 const id = project.name.split('/').pop();
 await page.goto(`/dashboard/projects/${id}/setup`);
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.locator('form').getByRole('alert')).toContainText('Choose the kind of website');
 await page.getByRole('button',{name:/Personal Portfolio/}).click();
 await put(`users/${client.uid}`,{denyWrites:true});
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.locator('form').getByRole('alert')).toContainText('could not be saved');
 await expect(page.getByRole('heading',{name:'What kind of website is this?'})).toBeVisible();
 await expect(page.getByRole('button',{name:/Personal Portfolio/})).toHaveAttribute('aria-pressed','true');
 await put(`users/${client.uid}`,{denyWrites:false});
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:/Minimal & airy/}).click();
 await page.getByRole('button',{name:'Save & exit'}).click();
 await expect(page).toHaveURL(/\/dashboard\/projects$/);
 await page.goto(`/dashboard/projects/${id}/setup`);
 await expect(page.getByRole('button',{name:/Minimal & airy/})).toHaveAttribute('aria-pressed','true');
 await page.screenshot({path:'artifacts/project-brief-look-desktop.png',animations:'disabled'});
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByLabel('Or point us at them').fill('https://example.com/my-photos');
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Projects',exact:true}).click();
 await page.getByLabel('Anything else?').fill('A short bio on the home page.');
 await page.getByRole('button',{name:'Review your brief'}).click();
 await page.getByRole('button',{name:'Edit type of website'}).click();
 await expect(page.getByRole('button',{name:/Personal Portfolio/})).toHaveAttribute('aria-pressed','true');
 for (let i=0;i<3;i++) await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Review your brief'}).click();
 await expect(page.getByText('Minimal & airy',{exact:true})).toBeVisible();
 await page.screenshot({path:'artifacts/project-brief-review-desktop.png',animations:'disabled',fullPage:true});
 await put(`users/${client.uid}`,{denyWrites:true});
 await page.getByRole('button',{name:'Send project brief'}).click();
 await expect(page.locator('form').getByRole('alert')).toContainText('could not send');
 expect((await get(`users/${client.uid}/projects/${id}`)).setupComplete.booleanValue).toBe(false);
 expect(await list(`users/${client.uid}/adminNotifications`)).toHaveLength(0);
 await put(`users/${client.uid}`,{denyWrites:false});
 await page.getByRole('button',{name:'Send project brief'}).dblclick();
 await expect(page).toHaveURL(new RegExp(`/dashboard/projects/${id}$`));
 const saved = await get(`users/${client.uid}/projects/${id}`);
 expect(saved.setupComplete.booleanValue).toBe(true);
 expect(saved.categoryId.stringValue).toBe('portfolio');
 expect(saved.stylePicks.arrayValue.values.map((v:any)=>v.stringValue)).toEqual(['minimal']);
 expect(saved.pages.arrayValue.values.map((v:any)=>v.stringValue)).toEqual(['Projects']);
 expect(saved.additionalNotes.stringValue).toBe('A short bio on the home page.');
 expect(saved.timelinePreference).toBeUndefined();
 expect(saved.estimatedBudget).toBeUndefined();
 expect(saved.paymentPlan).toBeUndefined();
 expect(saved.requestedPaymentPlan).toBeUndefined();
 expect(saved.dueDate).toBeUndefined();
 expect((await list(`users/${client.uid}/adminNotifications`)).filter((d:any) => d.fields.type.stringValue === 'new_project')).toHaveLength(1);
 await expect(page.getByRole('region',{name:'Project brief'})).toContainText('Minimal & airy');
 const adminContext = await browser.newContext(); const admin = await adminContext.newPage();
 await login(admin,adminEmail); await admin.goto(`/dashboard/projects/${id}?userId=${client.uid}`);
 await expect(admin.getByRole('region',{name:'Project brief'})).toContainText('Personal Portfolio');
 await expect(admin.getByRole('region',{name:'Project brief'})).toContainText('https://example.com/my-photos');
 await put(`users/${client.uid}/projects/${id}`,{approval:'Approved'});
 await page.goto(`/dashboard/projects/${id}/setup`);
 await expect(page).toHaveURL(new RegExp(`/dashboard/projects/${id}$`));
 expect((await get(`users/${client.uid}/projects/${id}`)).approval.stringValue).toBe('Approved');
 await adminContext.close();
});

test('choosing a type alone can be submitted on mobile without any further detail', async ({page}) => {
 const client = await user(); const id=unique();
 await put(`users/${client.uid}/projects/${id}`,{projectName:'My personal site',setupComplete:false,platform:'Next.js',paymentPlan:2,requestedPaymentPlan:'50/50',dueDate:'2027-01-01'});
 await page.setViewportSize({width:390,height:844}); await login(page,client.email);
 await page.evaluate(()=>localStorage.setItem('lucidify-theme','dark'));
 await page.goto(`/dashboard/projects/${id}/setup`);
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await expect(page.getByRole('heading',{name:'What kind of website is this?'})).toBeVisible();
 await page.getByRole('button',{name:/Blog \/ Writing/}).click();
 await page.screenshot({path:'artifacts/project-brief-mobile-dark.png',animations:'disabled',fullPage:true});
 for (let i=0;i<3;i++) await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Review your brief'}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Send project brief'}).click();
 await expect(page).toHaveURL(new RegExp(`/dashboard/projects/${id}$`));
 const saved=await get(`users/${client.uid}/projects/${id}`);
 expect(saved.setupComplete.booleanValue).toBe(true);
 expect(saved.categoryId.stringValue).toBe('blog');
 expect(saved.additionalNotes.stringValue).toBe('');
 expect(saved.platform.stringValue).toBe('Next.js');
 expect(Number(saved.paymentPlan.doubleValue ?? saved.paymentPlan.integerValue)).toBe(2);
 expect(saved.requestedPaymentPlan.stringValue).toBe('50/50');
 expect(saved.dueDate.stringValue).toBe('2027-01-01');
});

test('optional logo upload failure retains the draft and a successful retry survives reopening', async ({page}) => {
 const client=await user(); const id=unique();
 await put(`users/${client.uid}/projects/${id}`,{projectName:'My shopfront',setupComplete:false});
 await login(page,client.email); await page.goto(`/dashboard/projects/${id}/setup`);
 // Business sites are asked for a logo; portfolios are not.
 await page.getByRole('button',{name:/Business \/ Services/}).click();
 for(let i=0;i<2;i++) await page.getByRole('button',{name:'Continue',exact:true}).click();
 let uploadFails=true;
 await page.route('https://api.cloudinary.com/**',route=>route.fulfill({status:uploadFails?500:200,contentType:'application/json',body:JSON.stringify(uploadFails?{error:'Upload failed'}:{secure_url:'https://example.com/logo.png'})}));
 await page.getByLabel('A logo, if you have one').setInputFiles({name:'logo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.locator('form').getByRole('alert')).toContainText('could not be saved');
 await expect(page.getByRole('heading',{name:'What do you have already?'})).toBeVisible();
 expect((await get(`users/${client.uid}/projects/${id}`)).logoUrl.stringValue).toBe('');
 uploadFails=false;
 await page.getByRole('button',{name:'Save & exit'}).click();
 await expect(page).toHaveURL(/\/dashboard\/projects$/);
 await page.goto(`/dashboard/projects/${id}/setup`);
 await expect(page.getByRole('img',{name:'Your logo'})).toHaveAttribute('src','https://example.com/logo.png');
 await page.getByRole('button',{name:'Remove logo'}).click();
 await page.getByRole('button',{name:'Save & exit'}).click();
 await expect(page).toHaveURL(/\/dashboard\/projects$/);
 expect((await get(`users/${client.uid}/projects/${id}`)).logoUrl.stringValue).toBe('');
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
 const recipient=`Robin${Date.now()}`;
 const a=await user(undefined,'Alex'), b=await user(undefined,recipient);
 const context=await browser.newContext(); const other=await context.newPage();
 await login(page,a.email); await login(other,b.email); await other.goto('/dashboard/messages'); await page.goto('/dashboard/messages');
 await page.getByRole('button',{name:/New/}).click();
 const modal=page.getByRole('dialog',{name:'New message'});
 await modal.getByLabel('Name',{exact:true}).fill(recipient);
 await modal.getByRole('button',{name:`Message ${recipient} Lee`,exact:true}).click();
 await expect(modal).toHaveCount(0);
 await expect(other.getByText('Alex Lee',{exact:true}).first()).toBeVisible();
 const text=`Direct hello ${unique()}`;
 await page.getByPlaceholder('Write a message...').fill(text); await page.getByRole('button',{name:'Send message'}).click();
 const id=[a.uid,b.uid].sort().join('_');
 await expect.poll(async () => (await get(`directMessages/${id}`)).lastMessage.stringValue).toBe(text);
 const inbox=await bell(other); await inbox.getByRole('button').filter({hasText:text}).click();
 await expect(other.getByText(text,{exact:true}).last()).toBeVisible();
 await page.getByRole('button',{name:/New/}).click();
 await modal.getByLabel('Name',{exact:true}).fill(recipient);
 await modal.getByRole('button',{name:`Message ${recipient} Lee`,exact:true}).click();
 expect((await get(`directMessages/${id}`)).lastMessage.stringValue).toBe(text);
 expect(await list(`directMessages/${id}/messages`)).toHaveLength(1);
 await context.close();
});

const png = {name:'homepage-concept.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')};

test('adding files names them before upload, reports failures, fits on mobile, and notifies the client', async ({page}) => {
 const client=await user(); await user(adminEmail,'Ayush'); const id=unique();
 await put(`users/${client.uid}/projects/${id}`,{projectName:'Garden Studio',setupComplete:true,approval:'Approved',status:2});
 await login(page,adminEmail); await page.goto(`/dashboard/projects/${id}/uploads?userId=${client.uid}`); await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Add files',exact:true}).click();
 const modal=page.getByRole('dialog',{name:'Add files'});
 await expect(modal).toBeVisible();
 const bounds=await modal.boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(390);
 expect(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await modal.getByLabel('Files to upload').setInputFiles(png);
 // The chosen file is named on screen before anything is sent; the old form never showed this.
 await expect(modal.getByText('homepage-concept.png',{exact:true})).toBeVisible();
 await page.route('https://api.cloudinary.com/**',route=>route.fulfill({status:500,body:'Upload failed'}));
 await modal.getByRole('button',{name:/^Add 1 file/}).click();
 await expect(modal.getByRole('alert')).toContainText('could not be saved');
 await expect(modal.getByText('homepage-concept.png',{exact:true})).toBeVisible();
 expect(await list(`users/${client.uid}/projects/${id}/uploads`)).toHaveLength(0);
 await page.unroute('https://api.cloudinary.com/**');
 await page.route('https://api.cloudinary.com/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({secure_url:'https://res.cloudinary.com/demo/image/upload/sample.jpg'})}));
 await modal.getByRole('button',{name:'Design',exact:true}).click();
 await modal.locator('#resource-note').fill('Let me know what you think.');
 await page.screenshot({path:'artifacts/upload-dialog-mobile.png',animations:'disabled'});
 await modal.getByRole('button',{name:/^Add 1 file/}).click();
 await expect(modal).toHaveCount(0);
 const saved=await list(`users/${client.uid}/projects/${id}/uploads`);
 expect(saved).toHaveLength(1);
 expect(saved[0].fields.fileName.stringValue).toBe('homepage-concept.png');
 expect(saved[0].fields.kind.stringValue).toBe('design');
 expect(saved[0].fields.title.stringValue).toBe('homepage concept');
 expect((await list(`users/${client.uid}/notifications`)).filter((d:any)=>d.fields.type.stringValue==='upload')).toHaveLength(1);
 await expect(page.getByText('homepage-concept.png',{exact:true})).toBeVisible();
});

test('one list merges old designs, brief photos and new uploads; the client likes and removes with confirmation', async ({page}) => {
 const client=await user(); await user(adminEmail,'Ayush'); const id=unique();
 await put(`users/${client.uid}/projects/${id}`,{projectName:'Garden Studio',setupComplete:true,approval:'Approved',status:2,briefAssets:{food:['https://res.cloudinary.com/demo/image/upload/food.jpg']}});
 await put(`users/${client.uid}/projects/${id}/section web designs/legacy1`,{designName:'Old homepage',designDescription:'Saved by the old form',designURL:'https://res.cloudinary.com/demo/image/upload/old.jpg',designPage:'Sections',designType:'Homepage',dateCreated:'2026-09-01T00:00:00.000Z'});
 await put(`users/${client.uid}/projects/${id}/uploads/mine`,{url:'https://res.cloudinary.com/demo/image/upload/mine.jpg',fileName:'my-photo.jpg',title:'My photo',note:'',kind:'photo',uploadedAt:'2026-09-10T00:00:00.000Z',uploadedByRole:'client',liked:false});
 await login(page,client.email); await page.goto(`/dashboard/projects/${id}/uploads`);
 // Every source in one grid, with no Sections / Full-Page split left.
 await expect(page.getByRole('button',{name:/^Expand /})).toHaveCount(3);
 await expect(page.getByRole('button',{name:'Sections',exact:true})).toHaveCount(0);
 await expect(page.getByText('my-photo.jpg',{exact:true})).toBeVisible();
 // Liking a design tells the team.
 await page.getByRole('button',{name:'♡ I like this one'}).click();
 await expect(page.getByRole('button',{name:'♥ You like this'})).toBeVisible();
 await expect.poll(async()=>(await get(`users/${client.uid}/projects/${id}/section web designs/legacy1`)).selectedDesign.booleanValue).toBe(true);
 expect(await list(`users/${client.uid}/adminNotifications`)).toHaveLength(1);
 // Lucidify's design is not the client's to delete; their own upload is.
 await expect(page.getByRole('button',{name:'Remove Old homepage'})).toHaveCount(0);
 await page.getByRole('button',{name:'Remove My photo'}).click();
 const confirm=page.getByRole('alertdialog',{name:'Remove file'});
 await expect(confirm).toContainText('still open it');
 await confirm.getByRole('button',{name:'Keep it'}).click();
 await expect(page.getByRole('button',{name:/^Expand /})).toHaveCount(3);
 await page.getByRole('button',{name:'Remove My photo'}).click();
 await page.getByRole('alertdialog',{name:'Remove file'}).getByRole('button',{name:'Remove',exact:true}).click();
 await expect(page.getByRole('button',{name:/^Expand /})).toHaveCount(2);
 expect(await list(`users/${client.uid}/projects/${id}/uploads`)).toHaveLength(0);
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

test('dashboard guides a new client through draft, review, approval, and next steps', async ({page}) => {
 const client = await user(); await page.setViewportSize({width:390,height:844}); await login(page,client.email);
 await page.getByRole('button',{name:'Create your first project',exact:true}).click();
 await page.getByRole('dialog',{name:'Create project'}).getByLabel('Project name').fill('My writing space');
 await page.getByRole('button',{name:'Create project',exact:true}).click();
 await expect(page).toHaveURL(/\/setup$/);
 await page.getByRole('button',{name:/Blog \/ Writing/}).click();
 await page.getByRole('button',{name:'Save & exit'}).click();
 await expect(page).toHaveURL(/\/dashboard\/projects$/);
 const project = (await list(`users/${client.uid}/projects`))[0]; const id=project.name.split('/').pop();
 await page.goto('/dashboard');
 await expect(page.getByRole('heading',{name:'Continue your project brief'})).toBeVisible();
 await expect(page.getByText('Overall Progress',{exact:true})).toHaveCount(0);
 await expect(page.getByText('Payments',{exact:true})).toHaveCount(0);
 await page.getByRole('link',{name:'Continue your brief',exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({path:'artifacts/dashboard-draft-mobile.png',animations:'disabled',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 await page.getByRole('link',{name:'Continue your brief',exact:true}).click();
 await expect(page.getByRole('button',{name:/Blog \/ Writing/})).toHaveAttribute('aria-pressed','true');
 for(let i=0;i<3;i++) await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('button',{name:'Review your brief'}).click();
 await page.getByRole('button',{name:'Send project brief'}).click();
 await expect(page).toHaveURL(new RegExp(`/dashboard/projects/${id}$`));
 await page.goto('/dashboard');
 await expect(page.getByRole('heading',{name:'Your brief is with us'})).toBeVisible();
 await expect(page.getByText('Overall Progress',{exact:true})).toHaveCount(0);
 // New projects follow the build stage, so Designing reads 40% without setting a percentage.
 await put(`users/${client.uid}/projects/${id}`,{approval:'Approved',status:2});
 await expect(page.getByRole('heading',{name:'Active Project',exact:true})).toBeVisible();
 await expect(page.getByText('40%',{exact:true}).first()).toBeVisible();
 await expect(page.getByText('To be arranged',{exact:true})).toBeVisible();
 await put(`users/${client.uid}/projects/${id}`,{approval:'Declined'});
 await expect(page.getByRole('heading',{name:'Let’s talk about your project'})).toBeVisible();
 await expect(page.getByText('Overall Progress',{exact:true})).toHaveCount(0);
});
