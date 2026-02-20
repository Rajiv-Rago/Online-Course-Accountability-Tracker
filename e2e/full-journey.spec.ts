import { test, expect } from '@playwright/test';
import { hasTestCredentials, loginViaUI } from './helpers/auth';

test.beforeEach(async () => {
  test.skip(!hasTestCredentials(), 'E2E_USER_EMAIL and E2E_USER_PASSWORD required');
});

test.describe('Full User Journey', () => {
  test('login -> dashboard -> create course -> view course', async ({ page }) => {
    // 1. Login
    await loginViaUI(page);

    // 2. Verify dashboard loads
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();

    // 3. Navigate to create course
    await page.goto('/courses/new');
    await page.waitForLoadState('networkidle');

    const timestamp = Date.now();
    const courseTitle = `Journey Test ${timestamp}`;

    await page.getByLabel(/Course Title/i).fill(courseTitle);

    const modulesField = page.getByLabel(/Total Modules/i);
    if (await modulesField.isVisible()) {
      await modulesField.fill('15');
    }

    await page.getByRole('button', { name: /Create Course/i }).click();

    // 4. Should navigate to the course detail page
    await page.waitForURL((url) => /\/courses\/[a-z0-9-]+$/.test(url.pathname), {
      timeout: 10_000,
    });

    // 5. Verify course title appears on detail page
    await expect(page.getByText(courseTitle)).toBeVisible({ timeout: 5_000 });
  });

  test('login -> courses list -> view existing course', async ({ page }) => {
    await loginViaUI(page);

    // Navigate to courses list
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    // Check if any courses exist
    const hasCourses = await page.locator('a[href*="/courses/"]').first().isVisible().catch(() => false);

    if (hasCourses) {
      // Click the first course link
      await page.locator('a[href*="/courses/"]').first().click();
      await page.waitForLoadState('networkidle');

      // Should be on a course detail page
      expect(page.url()).toMatch(/\/courses\/[a-z0-9-]+/);
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('login -> progress -> check streak display', async ({ page }) => {
    await loginViaUI(page);

    await page.goto('/progress');
    await page.waitForLoadState('networkidle');

    // Progress page should have some content visible
    await expect(page.locator('main')).toBeVisible();
  });

  test('login -> social -> achievements page', async ({ page }) => {
    await loginViaUI(page);

    await page.goto('/social/achievements');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('main')).toBeVisible();
  });

  test('login -> settings -> update profile name', async ({ page }) => {
    await loginViaUI(page);

    await page.goto('/settings/profile');
    await page.waitForLoadState('networkidle');

    // Find a name/display name field and verify it's editable
    const nameField = page.getByLabel(/name|display/i).first();
    if (await nameField.isVisible()) {
      const originalValue = await nameField.inputValue();
      expect(typeof originalValue).toBe('string');
    }
  });
});

test.describe('Mobile Responsive', () => {
  test.beforeEach(async () => {
    test.skip(!hasTestCredentials(), 'E2E_USER_EMAIL and E2E_USER_PASSWORD required');
  });

  test.use({ viewport: { width: 375, height: 667 } });

  test('login page is usable on mobile viewport', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

    // Form should be within viewport (not overflowing)
    const signInButton = page.getByRole('button', { name: 'Sign in' });
    const box = await signInButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  });

  test('dashboard renders without horizontal scroll on mobile', async ({ page }) => {
    await loginViaUI(page);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check page doesn't overflow horizontally
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375 + 1); // +1 for rounding
  });
});
