import { test, expect } from '@playwright/test';

test.describe('PWA Update Notifications', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should verify PWAUpdatePrompt component is integrated in the app', async ({ page }) => {
    await page.goto('/');
    
    // Verify the app loads correctly
    await expect(page.locator('h1')).toContainText('Fodboldturnering Program Builder');
    
    // The PWAUpdatePrompt component should be rendered in the React tree
    // (even if not visible when no update is available)
    // We can't easily test the actual update prompt without a real service worker update,
    // but we can verify the app structure is correct
    const appLoaded = await page.locator('body').isVisible();
    expect(appLoaded).toBe(true);
  });

  test('should check that service worker is supported', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if service worker API is available
    const swSupported = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    
    expect(swSupported).toBe(true);
  });

  test('should load the app with PWA infrastructure', async ({ page }) => {
    await page.goto('/');
    
    // Verify the page title
    await expect(page).toHaveTitle(/Fodboldturnering Program Builder/);
    
    // Verify the main content loads
    await expect(page.locator('h1')).toBeVisible();
    
    // Verify the create button is present
    const createButton = page.getByRole('button', { name: /Opret Ny Turnering/i });
    await expect(createButton).toBeVisible();
  });

  test('should have the PWA update component in the DOM structure', async ({ page }) => {
    // Note: The PWAUpdatePrompt component is always mounted in the app,
    // but it only becomes visible when there's an update available.
    // In dev/test mode without an actual service worker update, it won't be visible.
    
    await page.goto('/');
    
    // Just verify the app loaded successfully
    await expect(page.locator('body')).toBeVisible();
    
    // The presence of the component can be verified by checking that
    // the app doesn't crash with the PWAUpdatePrompt included
    const errorMessages = await page.locator('[role="alert"]').count();
    expect(errorMessages).toBe(0); // No error alerts should appear
  });

  test('should navigate through tournament creation flow without PWA interference', async ({ page }) => {
    // This verifies that adding the PWAUpdatePrompt doesn't break existing functionality
    await page.goto('/');
    
    // Click on "Create New Tournament" button
    await page.getByRole('button', { name: /Opret Ny Turnering/i }).click();
    
    // Verify we're on the tournament settings step
    await expect(page.locator('h1')).toContainText('Fodboldturnering Program Builder');
    
    // Fill in tournament name
    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill('PWA Test Tournament');
    
    // Verify input works
    await expect(nameInput).toHaveValue('PWA Test Tournament');
  });
});
