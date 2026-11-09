import { expect, test } from '@playwright/test';

test.describe('Frontend <-> Live NestJS API Integration E2E', () => {
  test('public browse, search routing, login validation, and live 401 API error alert', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Lost something?');

    await page
      .locator('.search-input-wrapper input[type="search"]')
      .fill('wallet');
    await page.locator('button.search-button').click();

    await expect(page).toHaveURL(/\/items\?q=wallet/);
    await expect(page.locator('h1')).toContainText('Browse Lost & Found Items');
    await expect(page.locator('#browse-q')).toHaveValue('wallet');

    await page.goto('/about');
    await expect(page.locator('h1')).toContainText(
      'Smart Lost & Found Recovery Across Nepal',
    );

    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Sign in to KhojNepal');

    // Client-side form validation on empty submit
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText('Email address is required.')).toBeVisible();
    await expect(page.getByText('Password is required.')).toBeVisible();

    // Live API 401 error alert on invalid credentials
    await page.locator('#login-email').fill('nonexistent-user@example.com');
    await page.locator('#login-password').fill('wrongpass123');
    await page.locator('form button[type="submit"]').click();

    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test('full authenticated E2E journey: register -> session reload -> guard check -> report lost item -> profile update -> logout', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const uniqueId = Date.now();
    const email = `pw.e2e.${uniqueId}@example.com`;
    const itemTitle = `E2E Lost Leather Wallet ${uniqueId}`;

    // 1. Register validation + real account creation
    await page.goto('/register');
    await expect(page.locator('h1')).toContainText('Create Your Account');

    await page.locator('#register-full-name').fill('Playwright E2E User');
    await page.locator('#register-email').fill(email);
    await page.locator('#register-password').fill('secret123');
    await page.locator('#register-confirm-password').fill('mismatch123');
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText('Passwords do not match.')).toBeVisible();

    await page.locator('#register-confirm-password').fill('secret123');
    await page.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL(/\/items\/my$/);
    await expect(page.locator('h1')).toContainText('My Reported Items');

    // Verify JWT persisted in storage and survives reload via /auth/me
    const token = await page.evaluate(() =>
      localStorage.getItem('khojnepal_access_token'),
    );
    expect(token).toBeTruthy();

    await page.reload();
    await expect(page).toHaveURL(/\/items\/my$/);
    await expect(page.locator('h1')).toContainText('My Reported Items');

    // Non-admin member attempting /admin/users is redirected away
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/$/);

    // 2. Navigate to Report Lost -> wait for seeded categories & Nepal locations -> submit live report
    await page.goto('/items/report-lost');
    await expect(page.locator('h1')).toContainText('Report a Lost Item');

    await page.waitForFunction(() => {
      const cat = document.querySelector('#item-category') as HTMLSelectElement | null;
      const loc = document.querySelector('#item-location') as HTMLSelectElement | null;
      return Boolean(cat && cat.options.length > 1 && loc && loc.options.length > 1);
    });

    await page.locator('#item-title').fill(itemTitle);
    await page.locator('#item-category').selectOption({ index: 1 });
    await page.locator('#item-location').selectOption({ index: 1 });
    await page.locator('#item-brand').fill('Wildcraft');
    await page.locator('#item-color').fill('Dark Brown');
    await page
      .locator('#item-description')
      .fill(
        'Playwright E2E test item report with brown stitching and zip pocket.',
      );

    await page.locator('form button[type="submit"]').click();

    // Redirects to /items/:id from live PostgreSQL response
    await expect(page).toHaveURL(/\/items\/[0-9a-f-]+$/i);
    await expect(page.locator('h1')).toContainText(itemTitle);

    // Verify listing appears in My Reports and Public Directory
    await page.goto('/items/my');
    await expect(page.getByText(itemTitle)).toBeVisible();

    // Close the test report cleanly
    await page
      .locator('article.report-row', { hasText: itemTitle })
      .getByRole('button', { name: 'Close' })
      .click();
    await expect(
      page
        .locator('article.report-row', { hasText: itemTitle })
        .getByRole('button', { name: 'Reopen' }),
    ).toBeVisible();

    await page.goto(`/items?q=${encodeURIComponent(itemTitle)}`);
    await expect(page.getByText(itemTitle)).toBeVisible();

    // 3. Profile update via live PATCH /users/me
    await page.goto('/profile');
    await expect(page.locator('h1')).toContainText('My Profile');
    await expect(page.locator('#profile-fullname')).toHaveValue(
      'Playwright E2E User',
    );
    await page.locator('#profile-fullname').fill('Playwright Verified User');
    await page.getByRole('button', { name: 'Save Profile' }).click();
    await page.reload();
    await expect(page.locator('#profile-fullname')).toHaveValue(
      'Playwright Verified User',
    );

    // 4. Sign out and verify protected route redirects back to /login
    await page.locator('.sidebar-logout').click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/items/my');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fitems%2Fmy/);
  });

  test('admin lands on /admin, can open /login to switch to a regular user, and ignores stale /admin returnUrl', async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);
    const memberEmail = `pw.switch.${Date.now()}@example.com`;
    const memberReg = await request.post('http://localhost:3000/auth/register', {
      data: {
        fullName: 'Switch Account Member',
        email: memberEmail,
        password: 'secret123',
      },
    });
    expect(memberReg.ok()).toBe(true);

    // 1. Admin login -> /admin
    await page.goto('/login');
    await page.locator('#login-email').fill('admin@gmail.com');
    await page.locator('#login-password').fill('password');
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator('h1')).toContainText('System Overview');

    // 2. Visiting /login (or /login?returnUrl=/admin/users) while signed in as admin shows switch banner and does not lock out /login
    await page.goto('/login?returnUrl=%2Fadmin%2Fusers');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fadmin%2Fusers/);
    await expect(page.getByText(/Currently signed in as/i)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to Admin Console' })).toBeVisible();

    // 3. Switching directly to the USER account routes to /items/my (ignores stale /admin/users returnUrl)
    await page.locator('#login-email').fill(memberEmail);
    await page.locator('#login-password').fill('secret123');
    await page.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL(/\/items\/my$/);
    await expect(page.locator('h1')).toContainText('My Reported Items');
  });
});
