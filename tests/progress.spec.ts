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

const preview = (page: Page) => page.getByRole('progressbar', {name:'Build progress preview'});
const stage = (page: Page, number: number) => page.getByRole('button', {name:new RegExp(`Stage ${number}:`)});

test('stage and milestone previews synchronize; saved changes reach every open project view', async ({page,browser}) => {
 test.setTimeout(120000);
 const client=await user(); await user(adminEmail,'Ayush'); const id=unique();
 await put(`users/${client.uid}/projects/${id}`, {projectName:'Progress test',setupComplete:true,approval:'Approved',status:1,progress:0});
 await login(page,adminEmail); await page.goto(`/dashboard/projects/${id}/progress?userId=${client.uid}`);
 await expect(page.getByRole('button',{name:'Save Changes',exact:true})).toBeDisabled();
 const context=await browser.newContext(); const reader=await context.newPage(); await login(reader,client.email);
 await reader.goto(`/dashboard/projects/${id}/progress`);
 await expect(reader.getByRole('progressbar',{name:'Build progress',exact:true})).toHaveAttribute('aria-valuenow','0');
 for (const [number,percent] of [[1,0],[2,25],[3,50],[4,75],[5,100]]) {
  await stage(page,number).click();
  await expect(preview(page)).toHaveAttribute('aria-valuenow',String(percent));
 }
 await stage(page,3).click();
 await page.getByRole('checkbox',{name:/Development environment set up/}).click();
 await expect(preview(page)).toHaveAttribute('aria-valuenow','55');
 await stage(page,2).click(); await expect(preview(page)).toHaveAttribute('aria-valuenow','25');
 await stage(page,3).click(); await expect(preview(page)).toHaveAttribute('aria-valuenow','55');
 await expect(page.getByRole('checkbox',{name:/Development environment set up/})).toBeChecked();
 await expect(page.getByRole('status').filter({hasText:'Unsaved changes'})).toBeVisible();
 await expect(reader.getByRole('progressbar',{name:'Build progress',exact:true})).toHaveAttribute('aria-valuenow','0');
 const overview=await context.newPage(); await overview.goto(`/dashboard/projects/${id}`);
 const dashboard=await context.newPage(); await dashboard.goto('/dashboard');
 const projects=await context.newPage(); await projects.goto('/dashboard/projects');
 const adminOverview=await page.context().newPage(); await adminOverview.goto(`/dashboard/projects/${id}?userId=${client.uid}`);
 const adminProjects=await page.context().newPage(); await adminProjects.goto('/dashboard/projects');
 await page.getByRole('button',{name:'Save Changes',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Progress saved'})).toBeVisible();
 await expect(reader.getByRole('progressbar',{name:'Build progress',exact:true})).toHaveAttribute('aria-valuenow','55');
 await expect(reader.getByRole('heading',{name:'Stage 3: Developing'})).toBeVisible();
 for (const tab of [overview,dashboard,projects,adminOverview,adminProjects]) await expect(tab.getByText('55%',{exact:true}).first()).toBeVisible();
 expect((await list(`users/${client.uid}/notifications`)).filter((n:any)=>n.fields.type.stringValue==='project_update')).toHaveLength(1);
 await page.reload(); await expect(preview(page)).toHaveAttribute('aria-valuenow','55');
 await expect(stage(page,3)).toHaveAttribute('aria-pressed','true');
 await page.screenshot({path:'artifacts/progress-admin-saved.png',animations:'disabled'});
 await reader.setViewportSize({width:390,height:844}); await reader.screenshot({path:'artifacts/progress-client-mobile.png',animations:'disabled'});
 await adminOverview.close(); await adminProjects.close(); await context.close();
});

test('failed progress saves keep the preview, retry atomically, and never duplicate the alert', async ({page}) => {
 const client=await user(); await user(adminEmail,'Ayush'); const id=unique();
 await put(`users/${client.uid}/projects/${id}`,{projectName:'Retry progress',approval:'Approved',setupComplete:true,status:1,progress:0,denyAdminWrites:true});
 await login(page,adminEmail); await page.goto(`/dashboard/projects/${id}/progress?userId=${client.uid}`);
 await stage(page,4).click(); await page.getByRole('button',{name:'Save Changes',exact:true}).click();
 await expect(page.locator('.DashboardNotice[role="alert"]')).toContainText('Could not save');
 await expect(preview(page)).toHaveAttribute('aria-valuenow','75');
 expect(Number((await get(`users/${client.uid}/projects/${id}`)).status.doubleValue)).toBe(1);
 expect(await list(`users/${client.uid}/notifications`)).toHaveLength(0);
 await put(`users/${client.uid}/projects/${id}`,{denyAdminWrites:false});
 await page.getByRole('button',{name:'Save Changes',exact:true}).dblclick();
 await expect(page.getByRole('status').filter({hasText:'Progress saved'})).toBeVisible();
 expect(await list(`users/${client.uid}/notifications`)).toHaveLength(1);
 await page.reload(); await expect(preview(page)).toHaveAttribute('aria-valuenow','75');
});

test('concurrent edits require reload; manual percentages persist and automatic progress can be restored', async ({page}) => {
 const client=await user(); await user(adminEmail,'Ayush'); const id=unique();
 await put(`users/${client.uid}/projects/${id}`,{projectName:'Shared progress',approval:'Approved',status:1,progress:0});
 await login(page,adminEmail); await page.goto(`/dashboard/projects/${id}/progress?userId=${client.uid}`);
 await stage(page,4).click();
 await put(`users/${client.uid}/projects/${id}`,{status:3,progress:60,recentActivity:'Updated in another tab'});
 await page.getByRole('button',{name:'Save Changes',exact:true}).click();
 await expect(page.locator('.DashboardNotice[role="alert"]')).toContainText('another session');
 expect(await list(`users/${client.uid}/notifications`)).toHaveLength(0);
 await page.getByRole('button',{name:'Reload saved version'}).click();
 await expect(preview(page)).toHaveAttribute('aria-valuenow','60');
 await expect(stage(page,3)).toHaveAttribute('aria-pressed','true');
 await page.getByRole('slider',{name:'Overall progress'}).fill('68');
 await page.getByRole('button',{name:'Save Changes',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Progress saved'})).toBeVisible();
 await page.reload(); await expect(preview(page)).toHaveAttribute('aria-valuenow','68');
 await page.getByRole('button',{name:'Use stage and milestone progress'}).click();
 await expect(preview(page)).toHaveAttribute('aria-valuenow','50');
 await stage(page,5).click(); await page.getByRole('checkbox',{name:/Website successfully launched/}).click();
 await expect(preview(page)).toHaveAttribute('aria-valuenow','100');
 await page.getByRole('button',{name:'Save Changes',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Progress saved'})).toBeVisible();
});
