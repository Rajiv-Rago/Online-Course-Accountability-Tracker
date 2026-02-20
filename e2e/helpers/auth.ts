import { type Page, expect } from '@playwright/test';

/**
 * Test credentials from environment variables.
 * Set E2E_USER_EMAIL and E2E_USER_PASSWORD in .env.local or CI env.
 * This user should have onboarding_completed = true.
 */
export const TEST_USER = {
  email: process.env.E2E_USER_EMAIL ?? '',
  password: process.env.E2E_USER_PASSWORD ?? '',
};

export function hasTestCredentials(): boolean {
  return !!(TEST_USER.email && TEST_USER.password);
}

/**
 * Log in via the login page UI.
 * After login, waits for navigation away from /login.
 */
export async function loginViaUI(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_USER.email);
  await page.getByLabel('Password').fill(TEST_USER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for redirect away from login (either /dashboard or /onboarding)
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 15_000,
  });
}

/**
 * Ensure we're on an authenticated page.
 * If redirected to login, perform login first.
 */
export async function ensureAuthenticated(page: Page) {
  if (page.url().includes('/login')) {
    await loginViaUI(page);
  }
}
