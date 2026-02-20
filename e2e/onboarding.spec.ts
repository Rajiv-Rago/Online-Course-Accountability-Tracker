import { test, expect } from '@playwright/test';

/**
 * Onboarding tests use a fresh signup account.
 * These require E2E_SIGNUP_EMAIL and E2E_SIGNUP_PASSWORD env vars
 * pointing to a user that has NOT completed onboarding yet.
 *
 * Since creating fresh accounts programmatically requires Supabase admin
 * access, these tests are designed to skip gracefully when credentials
 * aren't available.
 */

const SIGNUP_EMAIL = process.env.E2E_SIGNUP_EMAIL ?? '';
const SIGNUP_PASSWORD = process.env.E2E_SIGNUP_PASSWORD ?? '';

test.describe('Onboarding Flow', () => {
  test.beforeEach(async () => {
    test.skip(
      !SIGNUP_EMAIL || !SIGNUP_PASSWORD,
      'E2E_SIGNUP_EMAIL and E2E_SIGNUP_PASSWORD required for onboarding tests'
    );
  });

  test('authenticated user without onboarding is redirected to /onboarding', async ({ page }) => {
    // Login with the user who hasn't completed onboarding
    await page.goto('/login');
    await page.getByLabel('Email').fill(SIGNUP_EMAIL);
    await page.getByLabel('Password').fill(SIGNUP_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Should redirect to onboarding, not dashboard
    await page.waitForURL('**/onboarding', { timeout: 15_000 });
    expect(page.url()).toContain('/onboarding');
  });

  test('onboarding wizard renders step 1 with name and experience level', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(SIGNUP_EMAIL);
    await page.getByLabel('Password').fill(SIGNUP_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/onboarding', { timeout: 15_000 });

    // Step 1: Welcome - should show name field and experience level
    await expect(page.getByText(/What should we call you/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Next/i })).toBeVisible();
  });

  test('can progress through onboarding steps', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(SIGNUP_EMAIL);
    await page.getByLabel('Password').fill(SIGNUP_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/onboarding', { timeout: 15_000 });

    // Step 1: Fill name
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.fill('E2E Test User');
    await page.getByRole('button', { name: /Next/i }).click();

    // Step 2: Goals - should show goal selection
    await expect(page.getByText(/goal/i).first()).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: /Next/i }).click();

    // Step 3: Schedule - should show day selection
    await expect(page.getByText(/study/i).first()).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: /Next/i }).click();

    // Step 4: Style - should show motivation style
    await expect(page.getByText(/style|motivation/i).first()).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: /Next/i }).click();

    // Step 5: Complete - should show summary and finish button
    await expect(
      page.getByRole('button', { name: /Start Learning/i })
    ).toBeVisible({ timeout: 5_000 });
  });
});
