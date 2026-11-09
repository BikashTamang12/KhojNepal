import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { name: 'Mobile', width: 375, height: 812 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1280, height: 800 },
] as const;

const PUBLIC_ROUTES = ['/', '/items', '/about', '/login', '/register'] as const;

test.describe('Responsive Layout, Theme Switching & Accessibility (Axe + Keyboard)', () => {
  test('renders cleanly without horizontal overflow on Mobile, Tablet, and Desktop viewports', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const route of PUBLIC_ROUTES) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main h1').first()).toBeVisible();

        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        expect(
          overflow.scrollWidth,
          `${vp.name} (${vp.width}px) overflowed on ${route}`,
        ).toBeLessThanOrEqual(overflow.innerWidth);
      }

      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main h1').first()).toBeVisible();

      const mobileToggle = page.locator('button.mobile-menu-toggle');
      const desktopNav = page.locator('nav.main-nav');

      if (vp.width < 768) {
        await expect(mobileToggle).toBeVisible();
        await expect(desktopNav).toBeHidden();

        await mobileToggle.click();
        await expect(page.locator('#public-mobile-nav')).toBeVisible();
        await mobileToggle.click();
        await expect(page.locator('#public-mobile-nav')).toBeHidden();
      } else {
        await expect(mobileToggle).toBeHidden();
        await expect(desktopNav).toBeVisible();
      }
    }
  });

  test('switches light and dark themes, updates computed styles, and persists across reload', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('khojnepal_theme', 'light');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const lightStyles = await page.evaluate(() => {
      const s = getComputedStyle(document.body);
      return { bg: s.backgroundColor, color: s.color };
    });

    await page.locator('button.theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const storedTheme = await page.evaluate(() =>
      localStorage.getItem('khojnepal_theme'),
    );
    expect(storedTheme).toBe('dark');

    await page.waitForTimeout(220);
    const darkStyles = await page.evaluate(() => {
      const s = getComputedStyle(document.body);
      return { bg: s.backgroundColor, color: s.color };
    });

    expect(darkStyles.bg).not.toBe(lightStyles.bg);
    expect(darkStyles.color).not.toBe(lightStyles.color);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const reloadDomBg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(reloadDomBg).toBe(darkStyles.bg);
  });

  test('passes automated axe-core WCAG checks in light & dark themes and supports keyboard navigation', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width: 1280, height: 800 });

    for (const theme of ['light', 'dark'] as const) {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(
        (t) => localStorage.setItem('khojnepal_theme', t),
        theme,
      );

      for (const route of PUBLIC_ROUTES) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main h1').first()).toBeVisible();
        await page
          .locator('app-loading')
          .waitFor({ state: 'detached', timeout: 5000 })
          .catch(() => undefined);

        const results = await new AxeBuilder({ page }).analyze();
        expect(
          results.violations,
          `Axe violations on ${route} (${theme} mode): ${JSON.stringify(
            results.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              nodes: v.nodes.map((n) => n.html),
            })),
            null,
            2,
          )}`,
        ).toEqual([]);
      }
    }

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#login-email')).toBeVisible();
    await page.locator('#login-email').focus();
    await expect(page.locator('#login-email')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#login-password')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('form button[type="submit"]')).toBeFocused();
  });

  test('authenticated workspace layout supports mobile drawer, zero overflow, theme switching, and WCAG checks', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    const uniqueEmail = `pw.ws.${Date.now()}@example.com`;
    const workspaceRoutes = [
      '/items/my',
      '/items/report-lost',
      '/matching',
      '/claims',
      '/notifications',
      '/profile',
    ] as const;

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await page.locator('#register-full-name').fill('Workspace A11y User');
    await page.locator('#register-email').fill(uniqueEmail);
    await page.locator('#register-password').fill('secret123');
    await page.locator('#register-confirm-password').fill('secret123');
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/items\/my$/);

    // Mobile drawer + overflow checks across workspace routes
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('button.mobile-drawer-btn')).toBeVisible();
    await page.locator('button.mobile-drawer-btn').click();
    await expect(page.locator('aside.shell-sidebar.open')).toBeVisible();
    await page.locator('button.sidebar-close-btn').click();
    await expect(page.locator('aside.shell-sidebar.open')).toBeHidden();

    for (const route of workspaceRoutes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main h1').first()).toBeVisible();
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(
        overflow.scrollWidth,
        `Mobile workspace overflow on ${route}`,
      ).toBeLessThanOrEqual(overflow.innerWidth);
    }

    // Desktop light & dark Axe WCAG scan across key workspace forms/views
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const theme of ['light', 'dark'] as const) {
      await page.evaluate(
        (t) => localStorage.setItem('khojnepal_theme', t),
        theme,
      );
      for (const route of ['/items/my', '/items/report-lost', '/profile'] as const) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main h1').first()).toBeVisible();
        await page
          .locator('app-loading')
          .waitFor({ state: 'detached', timeout: 5000 })
          .catch(() => undefined);

        const results = await new AxeBuilder({ page }).analyze();
        expect(
          results.violations,
          `Workspace Axe violations on ${route} (${theme} mode): ${JSON.stringify(
            results.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              nodes: v.nodes.map((n) => n.html),
            })),
            null,
            2,
          )}`,
        ).toEqual([]);
      }
    }
  });
});
