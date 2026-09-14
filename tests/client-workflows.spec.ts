import { test, expect, Page } from '@playwright/test';

const firestore = 'http://127.0.0.1:8088/v1/projects/demo-lucidify/databases/(default)/documents';
const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer owner' };
const password = 'Testing123!';

function field(value: unknown): unknown {
  if (value === null) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  if (typeof value === 'string') return { stringValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(field) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value as object).map(([key, item]) => [key, field(item)])) } };
}
async function save(path: string, data: Record<string, unknown>) {
  const mask = Object.keys(data).map(key => `updateMask.fieldPaths=${encodeURIComponent(key)}`).join('&');
  const response = await fetch(`${firestore}/${path}?${mask}`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, field(value)])) }),
  });
  expect(response.ok, await response.text()).toBeTruthy();
}
async function read(path: string) {
  return (await (await fetch(`${firestore}/${path}`, { headers })).json());
}
async function account(extra: Record<string, unknown> = {}) {
  const email = `workflow-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
  const response = await fetch('http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-lucidify', {
    method: 'POST', headers, body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const { localId: uid } = await response.json();
  expect(uid).toBeTruthy();
  await save(`users/${uid}`, { firstName: 'Client', email, setUp: true, ...extra });
  return { uid, email };
}
async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByPlaceholder('Email address').fill(email);
  await page.getByPlaceholder('Password (min. 6 characters)').fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back, Client!' })).toBeVisible();
}
async function conversation(uid: string, id: string, title: string, unread = 0) {
  await save(`users/${uid}/conversations/${id}`, { title, timestamp: new Date(), lastMessage: '', unreadCounts: { [uid]: unread, Lucidify: 0 } });
}

test('create, save and resume a project brief, then submit it on mobile', async ({ page }) => {
  const { uid, email } = await account();
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, email);
  await page.goto('/dashboard/projects');
  await page.getByRole('button', { name: '+ New project', exact: true }).click();
  await page.getByPlaceholder('e.g. My Awesome Website').fill('Client storefront');
  await page.getByPlaceholder('What would you like built? A quick idea is enough.').fill('Help customers order online.');
  await page.getByRole('button', { name: 'Continue to Setup' }).dblclick();
  await expect(page).toHaveURL(/\/dashboard\/projects\/[^/?]+\/setup$/);
  const projectId = page.url().split('/').at(-2)!;
  expect((await read(`users/${uid}/projects`)).documents).toHaveLength(1);
  await page.getByRole('button', { name: '1 month', exact: false }).click();
  await page.getByRole('button', { name: 'Save & exit' }).click();
  await expect(page).toHaveURL(/\/dashboard\/projects$/);
  expect((await read(`users/${uid}/projects/${projectId}`)).fields.dueDate.stringValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await page.getByRole('link').filter({ hasText: 'Client storefront' }).click();
  await expect(page.getByRole('heading', { name: 'When do you want to launch?' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: false }).click();
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('button', { name: /Not sure yet/ }).click();
  await page.getByRole('button', { name: 'Save & exit' }).click();
  await expect(page).toHaveURL(/\/dashboard\/projects$/);
  await page.getByRole('link').filter({ hasText: 'Client storefront' }).click();
  await expect(page.getByRole('heading', { name: 'What should your site be built on?' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: false }).click();
  await page.getByRole('button', { name: 'Continue', exact: false }).click();
  await page.getByRole('button', { name: '$1,000 – $2,500', exact: false }).click();
  await page.getByRole('button', { name: /50% \/ 50%/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: false }).click();
  await page.getByRole('button', { name: /No thanks/ }).click();
  await page.getByRole('button', { name: 'Submit Project', exact: false }).dblclick();
  await expect(page).toHaveURL(new RegExp(`/dashboard/projects/${projectId}$`));
  await expect(page.getByRole('heading', { name: 'Your submitted brief' })).toBeVisible();
  await expect(page.getByText('Pending review', { exact: true })).toBeVisible();
  const project = (await read(`users/${uid}/projects/${projectId}`)).fields;
  expect(project.setupComplete.booleanValue).toBe(true);
  expect(project.platform.stringValue).toBe('Not sure');
  await page.screenshot({ path: 'artifacts/client-submitted-brief-mobile.png', fullPage: true });
});

test('failed Save & exit keeps answers and retries without leaving setup', async ({ page }) => {
  const { uid, email } = await account({ denyWrites: true });
  await save(`users/${uid}/projects/draft`, { projectName: 'Saved draft', setupComplete: false, setupStep: 3 });
  await login(page, email);
  await page.goto('/dashboard/projects/draft/setup');
  await page.getByRole('button', { name: /Shopify/ }).click();
  await page.getByRole('button', { name: 'Save & exit' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'We couldn’t save your project' })).toBeVisible();
  await expect(page).toHaveURL(/\/draft\/setup$/);
  expect((await read(`users/${uid}/projects/draft`)).fields.platform).toBeUndefined();
  await save(`users/${uid}`, { denyWrites: false });
  await page.getByRole('button', { name: 'Save & exit' }).click();
  await expect(page).toHaveURL(/\/dashboard\/projects$/);
  expect((await read(`users/${uid}/projects/draft`)).fields.platform.stringValue).toBe('Shopify');
});

test('dashboard actions, legacy approvals, declined filters, and live project updates', async ({ page }) => {
  const { uid, email } = await account();
  await save(`users/${uid}/projects/draft`, { projectName: 'Needs a brief', approval: 'Pending', setupComplete: false });
  await save(`users/${uid}/projects/legacy`, { projectName: 'Legacy website', approval: 'approved', progress: '140', status: 999 });
  await save(`users/${uid}/projects/declined`, { projectName: 'Old scope', approval: 'Declined', setupComplete: true });
  await login(page, email);
  await expect(page.getByRole('region', { name: 'Your next steps' })).toContainText('Needs a brief');
  await expect(page.getByRole('link', { name: 'Continue setup', exact: true })).toHaveAttribute('href', '/dashboard/projects/draft/setup');
  await page.goto('/dashboard/projects');
  await expect(page.getByRole('link').filter({ hasText: 'Legacy website' })).toContainText('100%');
  await page.getByLabel('Filter projects').selectOption('declined');
  await expect(page.getByText('Old scope', { exact: true })).toBeVisible();
  await expect(page.getByText('Pending approval', { exact: true })).toHaveCount(0);
  await page.getByLabel('Search projects').fill('nothing matches');
  await expect(page.getByText('No projects match your search.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await save(`users/${uid}/projects/live`, { projectName: 'Added while open', approval: 'Pending', setupComplete: true });
  await expect(page.getByText('Added while open', { exact: true })).toBeVisible();
});

test('canonical project URLs use the route and signed-in owner, and show missing projects', async ({ page }) => {
  const { uid, email } = await account();
  const other = await account();
  await save(`users/${uid}/projects/own`, { projectName: 'My private brief', approval: 'Pending', setupComplete: true });
  await save(`users/${other.uid}/projects/other`, { projectName: 'Someone else’s project', approval: 'Approved' });
  await login(page, email);
  await page.goto(`/dashboard/projects/own?userId=${other.uid}&projectId=other`);
  await expect(page.getByRole('heading', { name: 'My private brief' })).toBeVisible();
  await expect(page.getByText('Someone else’s project')).toHaveCount(0);
  await page.goto('/dashboard/projects/missing');
  await expect(page.getByRole('alert').filter({ hasText: 'Project not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to projects' }).click();
  await expect(page).toHaveURL(/\/dashboard\/projects$/);
});

test('message drafts survive chat switching and reload; project questions send once with context', async ({ page }) => {
  const { uid, email } = await account();
  await conversation(uid, 'lucidify', 'Lucidify');
  await conversation(uid, 'second', 'Project support');
  await save(`users/${uid}/projects/store`, { projectName: 'Spring Store', approval: 'Pending', setupComplete: true });
  await login(page, email);
  await page.goto('/dashboard/projects/store');
  await page.getByRole('link', { name: 'Ask the team about this project' }).click();
  await expect(page.getByText('Your message will include the project name.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Open conversation with Lucidify', exact: true }).click();
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('First line');
  await page.getByRole('textbox', { name: 'Message', exact: true }).press('Shift+Enter');
  await page.getByRole('textbox', { name: 'Message', exact: true }).press('End');
  await page.getByRole('textbox', { name: 'Message', exact: true }).press('A');
  const draft = await page.getByRole('textbox', { name: 'Message', exact: true }).inputValue();
  expect(draft).toContain('\n');
  await page.getByRole('button', { name: 'Open conversation with Project support' }).click();
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue('');
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('A different question');
  await page.getByRole('button', { name: 'Open conversation with Lucidify', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue(draft);
  await page.reload();
  await page.getByRole('button', { name: 'Open conversation with Lucidify', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue(draft);
  await page.getByRole('button', { name: 'Send message', exact: true }).dblclick();
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue('');
  const saved = await read(`users/${uid}/conversations/lucidify/messages`);
  expect(saved.documents).toHaveLength(1);
  expect(saved.documents[0].fields.text.stringValue).toBe(`[Project: Spring Store]\n${draft.trim()}`);
  await page.getByRole('button', { name: 'Open conversation with Project support' }).click();
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue('A different question');
});

test('metadata write failure rolls back the message and preserves its draft for retry', async ({ page }) => {
  const { uid, email } = await account({ denyConversationMetadataWrites: true });
  await conversation(uid, 'lucidify', 'Lucidify');
  await login(page, email);
  await page.goto('/dashboard/messages');
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Please confirm the launch date');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Your message wasn’t sent' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue('Please confirm the launch date');
  expect((await read(`users/${uid}/conversations/lucidify/messages`)).documents || []).toHaveLength(0);
  expect((await read(`users/${uid}/conversations/lucidify`)).fields.lastMessage.stringValue).toBe('');
  await save(`users/${uid}`, { denyConversationMetadataWrites: false });
  await page.getByRole('button', { name: 'Send message', exact: true }).dblclick();
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue('');
  expect((await read(`users/${uid}/conversations/lucidify/messages`)).documents).toHaveLength(1);
  expect((await read(`users/${uid}/conversations/lucidify`)).fields.unreadCounts.mapValue.fields.Lucidify.integerValue).toBe('1');
});

test('mobile conversation previews update live and remain unread until opened', async ({ page }) => {
  const { uid, email } = await account();
  await conversation(uid, 'lucidify', 'Lucidify', 2);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, email);
  await page.goto('/dashboard/messages');
  const row = page.getByRole('button', { name: 'Open conversation with Lucidify', exact: true });
  await expect(row).toBeVisible();
  expect((await read(`users/${uid}/conversations/lucidify`)).fields.unreadCounts.mapValue.fields[uid].integerValue).toBe('2');
  await save(`users/${uid}/conversations/lucidify/messages/reply`, { text: 'Your project is ready for review', sender: 'Lucidify', timestamp: new Date() });
  await save(`users/${uid}/conversations/lucidify`, { lastMessage: 'Your project is ready for review', unreadCounts: { [uid]: 3, Lucidify: 0 } });
  await expect(row).toContainText('Your project is ready for review');
  await expect(row).toContainText('3');
  await row.click();
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toBeVisible();
  await expect.poll(async () => (await read(`users/${uid}/conversations/lucidify`)).fields.unreadCounts.mapValue.fields[uid].integerValue).toBe('0');
  await page.screenshot({ path: 'artifacts/client-messages-mobile.png', fullPage: true });
});

test('direct message subscriptions discover conversations and update previews without reload', async ({ page }) => {
  const { uid, email } = await account();
  await login(page, email);
  await page.goto('/dashboard/messages');
  await expect(page.getByText('No conversations yet')).toBeVisible();
  await save('directMessages/workflow-' + uid, { participants: [uid, 'teammate'], participantProfiles: { teammate: { firstName: 'Project', lastName: 'Partner' } }, lastMessage: 'Hello client', timestamp: new Date(), unreadCounts: { [uid]: 1 } });
  await save(`users/${uid}/dmConversations/workflow-${uid}`, { otherUserId: 'teammate' });
  const row = page.getByRole('button', { name: 'Open conversation with Project Partner' });
  await expect(row).toContainText('Hello client');
  await row.click();
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Thanks for the update');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue('');
  await expect(row).toContainText('Thanks for the update');
  expect((await read(`directMessages/workflow-${uid}/messages`)).documents).toHaveLength(1);
});

test('admin replies send once and increment the latest client unread count without overwriting other readers', async ({ page }) => {
  const client = await account();
  const clientName = `Reply target ${client.uid}`;
  await save(`users/${client.uid}`, { firstName: clientName });
  await conversation(client.uid, 'lucidify', 'Lucidify', 3);
  const email = 'ayush.bhujle@gmail.com';
  const request = { method: 'POST', headers, body: JSON.stringify({ email, password, returnSecureToken: true }) };
  let response = await fetch('http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-lucidify', request);
  if (!response.ok) response = await fetch('http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-lucidify', request);
  const { localId } = await response.json();
  expect(localId).toBeTruthy();
  await save(`users/${localId}`, { firstName: 'Admin', email, setUp: true });
  await page.goto('/login');
  await page.getByPlaceholder('Email address').fill(email);
  await page.getByPlaceholder('Password (min. 6 characters)').fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/dashboard/messages');
  await page.getByPlaceholder('Search', { exact: true }).fill(clientName);
  await page.getByRole('heading', { name: clientName, exact: true, level: 4 }).click();
  // Simulate changes from another session after the admin selected the thread.
  await save(`users/${client.uid}/conversations/lucidify`, { unreadCounts: { [client.uid]: 7, Lucidify: 5 } });
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('The launch date is confirmed');
  await page.getByRole('button', { name: 'Send message', exact: true }).dblclick();
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue('');
  const thread = (await read(`users/${client.uid}/conversations/lucidify`)).fields;
  expect(thread.unreadCounts.mapValue.fields[client.uid].integerValue).toBe('8');
  expect(thread.unreadCounts.mapValue.fields.Lucidify.integerValue).toBe('5');
  expect((await read(`users/${client.uid}/conversations/lucidify/messages`)).documents).toHaveLength(1);
});
