import { test, expect } from '@playwright/test';

test.describe('Auth Pages', () => {
  test.describe('Login Page', () => {
    test('renders login form with email and password fields', async ({ page }) => {
      await page.goto('/login');

      await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    });

    test('shows OAuth buttons for Google and GitHub', async ({ page }) => {
      await page.goto('/login');

      await expect(page.getByRole('button', { name: /Google/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /GitHub/i })).toBeVisible();
    });

    test('has link to signup page', async ({ page }) => {
      await page.goto('/login');

      const signupLink = page.getByRole('link', { name: 'Sign up' });
      await expect(signupLink).toBeVisible();
      await expect(signupLink).toHaveAttribute('href', '/signup');
    });

    test('shows error on invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel('Email').fill('invalid@test.com');
      await page.getByLabel('Password').fill('wrongpassword');
      await page.getByRole('button', { name: 'Sign in' }).click();

      // Should show an error message (Supabase returns "Invalid login credentials")
      await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({ timeout: 10_000 });
    });

    test('disables submit button while loading', async ({ page }) => {
      await page.goto('/login');

      await page.getByLabel('Email').fill('test@example.com');
      await page.getByLabel('Password').fill('password123');

      // Intercept Supabase auth to delay response
      await page.route('**/auth/v1/token*', async (route) => {
        await new Promise((r) => setTimeout(r, 2000));
        await route.fulfill({ status: 400, json: { error: 'Invalid' } });
      });

      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
    });

    test('requires email and password fields (HTML validation)', async ({ page }) => {
      await page.goto('/login');

      // Try submitting empty form
      await page.getByRole('button', { name: 'Sign in' }).click();

      // Email field should show validation (required)
      const emailInput = page.getByLabel('Email');
      await expect(emailInput).toHaveAttribute('required', '');
    });
  });

  test.describe('Signup Page', () => {
    test('renders signup form with name, email, and password fields', async ({ page }) => {
      await page.goto('/signup');

      await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
      await expect(page.getByLabel('Full Name')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
    });

    test('has link to login page', async ({ page }) => {
      await page.goto('/signup');

      const loginLink = page.getByRole('link', { name: 'Sign in' });
      await expect(loginLink).toBeVisible();
      await expect(loginLink).toHaveAttribute('href', '/login');
    });

    test('enforces minimum password length of 6 characters', async ({ page }) => {
      await page.goto('/signup');

      const passwordInput = page.getByLabel('Password');
      await expect(passwordInput).toHaveAttribute('minlength', '6');
    });

    test('shows OAuth buttons for Google and GitHub', async ({ page }) => {
      await page.goto('/signup');

      await expect(page.getByRole('button', { name: /Google/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /GitHub/i })).toBeVisible();
    });
  });
});

test.describe('Auth Redirects', () => {
  test('redirects unauthenticated users from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  test('redirects unauthenticated users from /courses to /login', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  test('redirects unauthenticated users from /progress to /login', async ({ page }) => {
    await page.goto('/progress');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  test('redirects unauthenticated users from /settings/profile to /login', async ({ page }) => {
    await page.goto('/settings/profile');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  test('allows access to /login without redirect', async ({ page }) => {
    await page.goto('/login');
    // Should stay on login page, not redirect
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    expect(page.url()).toContain('/login');
  });

  test('allows access to /signup without redirect', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
    expect(page.url()).toContain('/signup');
  });
});
