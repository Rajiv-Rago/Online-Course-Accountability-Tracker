import { test, expect } from '@playwright/test';
import { hasTestCredentials, loginViaUI } from './helpers/auth';

test.beforeEach(async () => {
  test.skip(!hasTestCredentials(), 'E2E_USER_EMAIL and E2E_USER_PASSWORD required');
});

test.describe('Course Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test.describe('Course List Page', () => {
    test('shows courses or empty state', async ({ page }) => {
      await page.goto('/courses');
      await page.waitForLoadState('networkidle');

      // Should show either course cards (links to /courses/uuid) OR the empty state
      const hasCourses = await page.locator('a[href*="/courses/"]').first().isVisible().catch(() => false);
      const hasEmptyState = await page.getByText(/No courses yet|Add Your First Course/i).isVisible().catch(() => false);

      expect(hasCourses || hasEmptyState).toBe(true);
    });

    test('has link to create new course', async ({ page }) => {
      await page.goto('/courses');
      await page.waitForLoadState('networkidle');

      // Should have a way to create a new course (button or link)
      const addButton = page.getByRole('link', { name: /add|new|create/i }).or(
        page.getByRole('button', { name: /add|new|create/i })
      );
      await expect(addButton.first()).toBeVisible();
    });
  });

  test.describe('Create Course Page', () => {
    test('renders course creation form', async ({ page }) => {
      await page.goto('/courses/new');
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { name: /Add New Course/i })).toBeVisible();
      await expect(page.getByLabel(/Course Title/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Create Course/i })).toBeVisible();
    });

    test('has back link to courses list', async ({ page }) => {
      await page.goto('/courses/new');
      await page.waitForLoadState('networkidle');

      const backLink = page.getByRole('link', { name: /back to courses/i }).or(
        page.getByRole('button', { name: /cancel/i })
      );
      await expect(backLink.first()).toBeVisible();
    });

    test('requires course title for submission', async ({ page }) => {
      await page.goto('/courses/new');
      await page.waitForLoadState('networkidle');

      // Try to submit without filling in title
      await page.getByRole('button', { name: /Create Course/i }).click();

      // Should show validation error or stay on same page
      expect(page.url()).toContain('/courses/new');
    });

    test('fills out and submits course form', async ({ page }) => {
      await page.goto('/courses/new');
      await page.waitForLoadState('networkidle');

      // Fill in required and optional fields
      const timestamp = Date.now();
      const courseTitle = `E2E Test Course ${timestamp}`;

      await page.getByLabel(/Course Title/i).fill(courseTitle);

      // Fill optional fields if visible
      const urlField = page.getByLabel(/Course URL/i);
      if (await urlField.isVisible()) {
        await urlField.fill('https://example.com/test-course');
      }

      const modulesField = page.getByLabel(/Total Modules/i);
      if (await modulesField.isVisible()) {
        await modulesField.fill('10');
      }

      // Submit
      await page.getByRole('button', { name: /Create Course/i }).click();

      // Should navigate away from /courses/new on success
      await page.waitForURL((url) => !url.pathname.includes('/courses/new'), {
        timeout: 10_000,
      });

      // Should be on the new course's detail page
      expect(page.url()).toContain('/courses/');
    });
  });
});
