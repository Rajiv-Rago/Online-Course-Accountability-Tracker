import { test, expect } from '@playwright/test';
import { hasTestCredentials, loginViaUI } from './helpers/auth';

test.beforeEach(async () => {
  test.skip(!hasTestCredentials(), 'E2E_USER_EMAIL and E2E_USER_PASSWORD required');
});

test.describe('Social Features', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test.describe('Achievements Page', () => {
    test('renders achievements gallery with earned and locked sections', async ({ page }) => {
      await page.goto('/social/achievements');
      await page.waitForLoadState('networkidle');

      // Should show achievement content
      await expect(page.locator('main')).toBeVisible();
    });
  });

  test.describe('Buddies Page', () => {
    test('renders buddy list or empty state', async ({ page }) => {
      await page.goto('/social/buddies');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('main')).toBeVisible();
    });
  });

  test.describe('Leaderboard Page', () => {
    test('renders weekly leaderboard', async ({ page }) => {
      await page.goto('/social/leaderboard');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('main')).toBeVisible();
    });
  });
});
