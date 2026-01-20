import { test, expect } from '@playwright/test';

test.describe('Save as Image functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  // Helper function to navigate to Step 4 (Schedule view) with a generated schedule
  async function navigateToSchedule(page: import('@playwright/test').Page) {
    await page.goto('/');
    
    // Click on "Create New Tournament" button
    await page.getByRole('button', { name: /Opret Ny Turnering/i }).click();
    
    // Step 1: Tournament Settings
    await page.locator('input[name="name"]').fill('Image Test Tournament');
    await page.locator('input[name="numPitches"]').fill('2');
    await page.locator('input[name="matchDurationMinutes"]').fill('30');
    await page.getByRole('button', { name: /Næste/i }).click();
    
    // Step 2: Add Teams
    const teamInput = page.locator('input#teamName');
    for (const team of ['Team A', 'Team B', 'Team C', 'Team D']) {
      await teamInput.fill(team);
      await page.getByRole('button', { name: /^Tilføj$/i }).click();
    }
    await page.getByRole('button', { name: /Næste/i }).click();
    
    // Step 3: Generate Schedule
    await page.getByRole('button', { name: /Generer/i }).click();
    
    // Now on Step 4: View Schedule
    await expect(page.getByRole('cell', { name: 'Team A' }).first()).toBeVisible();
  }

  test('should display the save as image button', async ({ page }) => {
    await navigateToSchedule(page);
    
    // Check that the "Gem som billede" button is visible
    const saveImageButton = page.getByRole('button', { name: /Gem som billede/i });
    await expect(saveImageButton).toBeVisible();
    await expect(saveImageButton).toBeEnabled();
  });

  test('should trigger image generation and capture any errors', async ({ page }) => {
    await navigateToSchedule(page);
    
    // Listen for console messages to detect any errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Listen for page errors (uncaught exceptions)
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
    
    // Click the save as image button
    const saveImageButton = page.getByRole('button', { name: /Gem som billede/i });
    await saveImageButton.click();
    
    // Wait for loading toast or button state change
    await page.waitForTimeout(5000);
    
    // Check for any errors (helpful for debugging)
    if (consoleErrors.length > 0 || pageErrors.length > 0) {
      console.log('Console errors:', consoleErrors);
      console.log('Page errors:', pageErrors);
    }
    
    // The button should be back to normal state (not disabled) after completion
    await expect(page.getByRole('button', { name: /Gem som billede/i })).toBeEnabled({ timeout: 10000 });
  });

  test('should download an image file when clicking save as image button', async ({ page }) => {
    await navigateToSchedule(page);
    
    // Listen for console messages to detect any errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Set up download listener before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    
    // Click the save as image button
    const saveImageButton = page.getByRole('button', { name: /Gem som billede/i });
    await saveImageButton.click();
    
    // Wait for the download to be triggered
    const download = await downloadPromise;
    
    // Verify the downloaded file has the correct name pattern
    const fileName = download.suggestedFilename();
    expect(fileName).toMatch(/.*-skema\.png$/);
    
    // Verify the file was downloaded successfully
    const path = await download.path();
    expect(path).toBeTruthy();
    
    // Check no console errors occurred
    expect(consoleErrors).toHaveLength(0);
  });

  test('should show success toast after image export', async ({ page }) => {
    await navigateToSchedule(page);
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    
    // Click the save as image button
    await page.getByRole('button', { name: /Gem som billede/i }).click();
    
    // Wait for download to complete
    await downloadPromise;
    
    // Check that success toast with "Billede downloadet" is displayed
    const successToast = page.locator('text=Billede downloadet');
    await expect(successToast).toBeVisible({ timeout: 5000 });
  });

  test('should not show error toast during image export', async ({ page }) => {
    await navigateToSchedule(page);
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    
    // Click the save as image button
    await page.getByRole('button', { name: /Gem som billede/i }).click();
    
    // Wait for download to complete
    await downloadPromise;
    
    // Check that no error toast is displayed
    // Sonner toasts use data attributes for type
    const errorToast = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(errorToast).not.toBeVisible({ timeout: 2000 });
  });
});
