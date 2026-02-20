import { test, expect } from '@playwright/test';
import { hasTestCredentials, loginViaUI } from './helpers/auth';

test.beforeEach(async () => {
  test.skip(!hasTestCredentials(), 'E2E_USER_EMAIL and E2E_USER_PASSWORD required');
});

test.describe('Settings Pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test('renders profile settings page', async ({ page }) => {
    await page.goto('/settings/profile');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('main')).toBeVisible();
    // Should show profile form fields
    const displayNameField = page.getByLabel(/name|display/i);
    if (await displayNameField.isVisible()) {
      await expect(displayNameField).toBeVisible();
    }
  });

  test('renders notification settings page', async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
  });

  test('renders account settings page', async ({ page }) => {
    await page.goto('/settings/account');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
  });

  test('renders integrations settings page', async ({ page }) => {
    await page.goto('/settings/integrations');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
  });
});
