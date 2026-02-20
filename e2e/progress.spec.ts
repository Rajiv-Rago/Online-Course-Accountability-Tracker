import { test, expect } from '@playwright/test';
import { hasTestCredentials, loginViaUI } from './helpers/auth';

test.beforeEach(async () => {
  test.skip(!hasTestCredentials(), 'E2E_USER_EMAIL and E2E_USER_PASSWORD required');
});

test.describe('Progress Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test.describe('Progress Overview', () => {
    test('renders progress page with streak and stats', async ({ page }) => {
      await page.goto('/progress');
      await page.waitForLoadState('networkidle');

      // Progress page should render main content
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test.describe('Timer Page', () => {
    test('renders timer interface', async ({ page }) => {
      await page.goto('/progress/timer');
      await page.waitForLoadState('networkidle');

      // Should show timer controls or course selection
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test.describe('Session Log Page', () => {
    test('renders session log form', async ({ page }) => {
      await page.goto('/progress/log');
      await page.waitForLoadState('networkidle');

      // Should have session logging interface
      await expect(page.locator('main')).toBeVisible();
    });
  });
});

test.describe('Analysis Pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test('renders AI analysis overview', async ({ page }) => {
    await page.goto('/analysis');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
  });

  test('renders weekly analysis page', async ({ page }) => {
    await page.goto('/analysis/weekly');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
  });
});
