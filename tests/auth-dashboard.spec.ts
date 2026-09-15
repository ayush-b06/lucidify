import { test, expect, Page } from '@playwright/test';
const password = 'Testing123!';
const uniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
const firestore = 'http://127.0.0.1:8080/v1/projects/demo-lucidify/databases/(default)/documents';

async function seedUser(email: string, profile?: Record<string, unknown>) {
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-lucidify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  let { localId } = await response.json();
  if (!localId) {
    const signedIn = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-lucidify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    ({ localId } = await signedIn.json());
  }
  expect(localId).toBeTruthy();
  if (profile) {
    const fields = Object.fromEntries(Object.entries(profile).map(([key, value]) => [key,
      typeof value === 'boolean' ? { booleanValue: value } : { stringValue: value },
    ]));
    const saved = await fetch(`${firestore}/users/${localId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ fields }),
    });
    expect(saved.ok).toBeTruthy();
  }
  return localId as string;
}
async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByPlaceholder('Email address').fill(email);
  await page.getByPlaceholder('Password (min. 6 characters)').fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
}

test('signed-out dashboard redirects to login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome Back!' })).toBeVisible();
});

test('signup, new-tab recovery, minimal name and avatar setup, atomic setup, and theme navigation', async ({ page, context }) => {
  await page.goto('/signup');
  await page.getByPlaceholder('Email address').fill(uniqueEmail());
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const passwords = page.getByPlaceholder('Password (min. 8 characters)');
  await passwords.nth(0).fill(password);
  await passwords.nth(1).fill(password);
  await page.getByRole('button', { name: 'Complete Sign Up' }).click();
  await expect(page).toHaveURL(/\/signup\/get-started$/);
  await expect(page.getByRole('textbox', { name: 'What should we call you?' })).toBeVisible();
  // A new tab has no sessionStorage signupEmail/signupUid.
  const recovered = await context.newPage();
  await recovered.goto('/dashboard');
  await expect(recovered).toHaveURL(/\/signup\/get-started$/);
  await recovered.getByRole('textbox', { name: 'What should we call you?' }).fill('Taylor');
  await expect(recovered.getByRole('radio')).toHaveCount(24);
  await expect(recovered.getByRole('textbox')).toHaveCount(1);
  await expect(recovered.locator('input[type=file]')).toHaveCount(0);
  await recovered.getByRole('img', { name: 'Avatar 1', exact: true }).click();
  await expect(recovered.getByRole('radio', { name: 'Avatar 1', exact: true })).toBeChecked();
  await recovered.screenshot({ path: 'artifacts/account-setup-desktop.png', animations: 'disabled' });
  await recovered.getByRole('button', { name: 'Finish setup' }).click();
  await expect(recovered).toHaveURL(/\/dashboard$/);
  await expect(recovered.getByRole('heading', { name: 'Welcome back, Taylor!' })).toBeVisible();
  await recovered.locator('img').evaluateAll(images => Promise.all(images.filter(img => img.getBoundingClientRect().width > 0 && img.getBoundingClientRect().height > 0 && img.getBoundingClientRect().x >= 0).map(img => (img as HTMLImageElement).decode().catch(() => {}))));
  const toggleBox = await recovered.getByRole('button', { name: 'Switch to dark mode' }).boundingBox();
  const iconBox = await recovered.getByRole('button', { name: 'Switch to dark mode' }).locator('svg').boundingBox();
  expect(iconBox!.x).toBeGreaterThanOrEqual(toggleBox!.x);
  expect(iconBox!.y).toBeGreaterThanOrEqual(toggleBox!.y);
  await recovered.screenshot({ animations: 'disabled', path: 'artifacts/dashboard-light.png' });
  await recovered.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(recovered.locator('html')).toHaveAttribute('data-theme', 'dark');
  await recovered.goto('/dashboard/messages');
  await expect(recovered.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(recovered.getByText("Welcome to Lucidify! We're excited to help you get started with your project.", { exact: true }).last()).toBeVisible();
  await recovered.goto('/dashboard');
  await expect(recovered.getByRole('heading', { name: 'Welcome back, Taylor!' })).toBeVisible();
  await expect(recovered.locator('html')).toHaveAttribute('data-theme', 'dark');
  await recovered.locator('img').evaluateAll(images => Promise.all(images.filter(img => img.getBoundingClientRect().width > 0 && img.getBoundingClientRect().height > 0 && img.getBoundingClientRect().x >= 0).map(img => (img as HTMLImageElement).decode().catch(() => {}))));
  await recovered.screenshot({ animations: 'disabled', path: 'artifacts/dashboard-dark.png' });
  await recovered.getByRole('button', { name: 'Switch to light mode' }).click();
  await recovered.setViewportSize({ width: 390, height: 844 });
  await recovered.getByRole('button', { name: 'Open menu' }).click();
  await expect(recovered.locator('.translate-x-0')).toBeVisible();
  await recovered.locator('img').evaluateAll(images => Promise.all(images.filter(img => img.getBoundingClientRect().width > 0 && img.getBoundingClientRect().height > 0 && img.getBoundingClientRect().x >= 0).map(img => (img as HTMLImageElement).decode().catch(() => {}))));
  await recovered.screenshot({ animations: 'disabled', path: 'artifacts/dashboard-mobile.png' });
});

test('incomplete existing profile resumes setup after email login', async ({ page }) => {
  const email = uniqueEmail();
  await seedUser(email, { firstName: 'Incomplete', setUp: false });
  await login(page, email);
  await expect(page).toHaveURL(/\/signup\/get-started$/);
  await expect(page.getByRole('textbox', { name: 'What should we call you?' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'What should we call you?' })).toBeVisible();
});

test('completed account goes directly to dashboard', async ({ page }) => {
  const email = uniqueEmail();
  await seedUser(email, { firstName: 'Returning', setUp: true });
  await login(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Welcome back, Returning!' })).toBeVisible();
  await page.goto('/signup/get-started');
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(await page.locator('img[src*="%2Fnull"]').count()).toBe(0);
});

test('signing up ignores an existing session while logging in still resumes one', async ({ page }) => {
  const email = uniqueEmail();
  await seedUser(email, { firstName: 'Returning', setUp: true });
  await login(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);

  // Signup shows its form to a signed-in visitor instead of bouncing them to the dashboard.
  await page.goto('/signup');
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole('heading', { name: 'Create an Account' })).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(/\/signup$/);

  // Logging in still picks the session back up without asking again.
  await page.goto('/login');
  await expect(page).toHaveURL(/\/dashboard$/);

  // And a signed-in visitor can still create a second account from the signup form.
  const second = uniqueEmail();
  await page.goto('/signup');
  await page.getByPlaceholder('Email address').fill(second);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByPlaceholder('Password (min. 8 characters)').nth(0).fill(password);
  await page.getByPlaceholder('Password (min. 8 characters)').nth(1).fill(password);
  await page.getByRole('button', { name: 'Complete Sign Up' }).click();
  await expect(page).toHaveURL(/\/signup\/get-started$/);
});

test('invalid credentials and existing email show useful errors; back does not submit', async ({ page }) => {
  const email = uniqueEmail();
  await seedUser(email);
  await login(page, uniqueEmail());
  await expect(page.getByRole('alert').filter({ hasText: 'Invalid email or password' })).toBeVisible();
  await page.goto('/signup');
  await page.getByPlaceholder('Email address').fill(email);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByPlaceholder('Password (min. 8 characters)').nth(0).fill(password);
  await page.getByPlaceholder('Password (min. 8 characters)').nth(1).fill(password);
  await page.getByRole('button', { name: 'Go Back' }).click();
  await expect(page.getByRole('heading', { name: 'Create an Account' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Complete Sign Up' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'already has an account' })).toBeVisible();
});

async function patchProfile(uid: string, fields: Record<string, unknown>) {
  const result = await fetch(`${firestore}/users/${uid}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields }),
  });
  expect(result.ok).toBeTruthy();
}

test('failed setup is atomic, keeps answers, and retries once without duplicate messages on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const email = uniqueEmail();
  const uid = await seedUser(email, { denyWrites: true, setUp: false, firstName: 'Existing', companyName: 'Saved studio', bio: 'My existing bio', lastName: 'Lee' });
  await login(page, email);
  await expect(page).toHaveURL(/\/signup\/get-started$/);
  await expect(page.getByRole('textbox', { name: 'What should we call you?' })).toHaveValue('Existing');
  await page.getByRole('textbox', { name: 'What should we call you?' }).fill('Mobile');
  await page.getByRole('img', { name: 'Avatar 2', exact: true }).click();
  await page.getByRole('button', { name: 'Finish setup' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'couldn’t save your setup' })).toBeVisible();
  const profile = await (await fetch(`${firestore}/users/${uid}`, { headers: { Authorization: 'Bearer owner' } })).json();
  expect(profile.fields.setUp.booleanValue).toBe(false);
  const messages = await fetch(`${firestore}/users/${uid}/conversations/lucidify/messages/welcome`, { headers: { Authorization: 'Bearer owner' } });
  expect(messages.status).toBe(404);
  await page.screenshot({ path: 'artifacts/setup-mobile-retry.png', animations: 'disabled' });
  const finishBox = await page.getByRole('button', { name: 'Finish setup' }).boundingBox();
  expect(finishBox!.x).toBeGreaterThanOrEqual(0);
  expect(finishBox!.x + finishBox!.width).toBeLessThanOrEqual(390);
  await patchProfile(uid, { ...profile.fields, denyWrites: { booleanValue: false }, setUp: { booleanValue: false } });
  await page.getByRole('button', { name: 'Finish setup' }).dblclick();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Welcome back, Mobile!' })).toBeVisible();
  const preserved = await (await fetch(`${firestore}/users/${uid}`, { headers: { Authorization: 'Bearer owner' } })).json();
  expect(preserved.fields.companyName.stringValue).toBe('Saved studio');
  expect(preserved.fields.bio.stringValue).toBe('My existing bio');
  expect(preserved.fields.lastName.stringValue).toBe('Lee');
  const conversations = await (await fetch(`${firestore}/users/${uid}/conversations`, { headers: { Authorization: 'Bearer owner' } })).json();
  expect(conversations.documents).toHaveLength(1);
  const welcomeMessages = await (await fetch(`${firestore}/users/${uid}/conversations/lucidify/messages`, { headers: { Authorization: 'Bearer owner' } })).json();
  expect(welcomeMessages.documents).toHaveLength(1);
});

test('profile lookup failure offers a working retry instead of a blank dashboard', async ({ page }) => {
  const email = uniqueEmail();
  const uid = await seedUser(email, { firstName: 'Recovered', setUp: true, denyReads: true });
  await login(page, email);
  await expect(page.getByRole('alert').filter({ hasText: 'couldn’t load your profile' })).toBeVisible();
  await patchProfile(uid, { firstName: { stringValue: 'Recovered' }, setUp: { booleanValue: true } });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back, Recovered!' })).toBeVisible();
});

test('new Google login reaches setup', async ({ page }) => {
  await page.goto('/login');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Sign in with Google' }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  await popup.getByText('Add new account').click();
  await popup.locator('#email-input').fill(uniqueEmail());
  await popup.locator('#display-name-input').fill('Google Test');
  await popup.getByRole('button', { name: 'Sign in with Google.com' }).click();
  await expect(page).toHaveURL(/\/signup\/get-started$/);
  await expect(page.getByRole('textbox', { name: 'What should we call you?' })).toBeVisible();
});

test('cancelled Google signup is visible on the first signup step', async ({ page }) => {
  await page.goto('/signup');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Sign up with Google' }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  await popup.close();
  await expect(page.getByRole('alert').filter({ hasText: 'cancelled' })).toBeVisible({ timeout: 15000 });
});

for (const role of ['client', 'admin']) {
  test(`${role} dashboard pages load in both themes without runtime errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const email = role === 'admin' ? 'ayush.bhujle@gmail.com' : uniqueEmail();
    await seedUser(email, { firstName: 'Dashboard', setUp: true, selectedAvatar: 'Avatar 1.png' });
    await login(page, email);
    await expect(page).toHaveURL(/\/dashboard$/);
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark mode' }).click();
      for (const route of ['projects', 'messages', 'transactions', 'profile', 'settings']) {
        await page.goto(`/dashboard/${route}`);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expect(page.locator('.DashboardBackgroundGradient').first()).toBeVisible();
        await expect(page.getByRole('button', { name: 'Switch to light mode' })).toHaveCount(theme === 'dark' ? 1 : 0);
      }
      await page.goto('/dashboard');
    }
    expect(errors).toEqual([]);
  });
}
