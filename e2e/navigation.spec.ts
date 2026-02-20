import { test, expect } from '@playwright/test';
import { hasTestCredentials, loginViaUI } from './helpers/auth';

// Skip all tests in this file if no test credentials are configured
test.beforeEach(async () => {
  test.skip(!hasTestCredentials(), 'E2E_USER_EMAIL and E2E_USER_PASSWORD required');
});

test.describe('Authenticated Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test('dashboard loads after login', async ({ page }) => {
    // Should be on dashboard (or redirected there)
    await page.goto('/dashboard');
    await expect(page.locator('body')).not.toContainText('Welcome back'); // not on login
    // Dashboard should have some recognizable content
    await expect(page.locator('main')).toBeVisible();
  });

  test('can navigate to courses page', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    // Courses page should render (either course list or empty state)
    const hasContent = await page.locator('main').isVisible();
    expect(hasContent).toBe(true);
  });

  test('can navigate to progress page', async ({ page }) => {
    await page.goto('/progress');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
  });

  test('can navigate to settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
  });

  test('can navigate to notifications page', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
  });

  test('can navigate to social page', async ({ page }) => {
    await page.goto('/social');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
  });

  test('can navigate to visualizations page', async ({ page }) => {
    await page.goto('/visualizations');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
  });

  test('root / redirects to dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    expect(page.url()).toContain('/dashboard');
  });
});
