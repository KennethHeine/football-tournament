import { test, expect } from '@playwright/test';

test.describe('Football Tournament App', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display the home page with create button', async ({ page }) => {
    await page.goto('/');
    
    // Check for the main title
    await expect(page.locator('h1')).toContainText('Fodboldturnering Program Builder');
    
    // Check for the create new tournament button
    const createButton = page.getByRole('button', { name: /Opret Ny Turnering/i });
    await expect(createButton).toBeVisible();
  });

  test('should create a new tournament and navigate through the wizard', async ({ page }) => {
    await page.goto('/');
    
    // Click on "Create New Tournament" button
    await page.getByRole('button', { name: /Opret Ny Turnering/i }).click();
    
    // Step 1: Tournament Settings
    await expect(page.locator('h1')).toContainText('Fodboldturnering Program Builder');
    
    // Fill in tournament name
    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill('Test Tournament');
    
    // Fill in number of pitches
    const pitchesInput = page.locator('input[name="numPitches"]');
    await pitchesInput.fill('2');
    
    // Fill in match duration
    const durationInput = page.locator('input[name="matchDurationMinutes"]');
    await durationInput.fill('30');
    
    // Click next
    const nextButton = page.getByRole('button', { name: /Næste/i });
    await nextButton.click();
    
    // Step 2: Add Teams
    // Add first team
    const teamInput = page.locator('input#teamName');
    await teamInput.fill('Team A');
    await page.getByRole('button', { name: /^Tilføj$/i }).click();
    
    // Add second team
    await teamInput.fill('Team B');
    await page.getByRole('button', { name: /^Tilføj$/i }).click();
    
    // Add third team
    await teamInput.fill('Team C');
    await page.getByRole('button', { name: /^Tilføj$/i }).click();
    
    // Add fourth team
    await teamInput.fill('Team D');
    await page.getByRole('button', { name: /^Tilføj$/i }).click();
    
    // Verify teams are added
    await expect(page.locator('text=Team A')).toBeVisible();
    await expect(page.locator('text=Team B')).toBeVisible();
    await expect(page.locator('text=Team C')).toBeVisible();
    await expect(page.locator('text=Team D')).toBeVisible();
    
    // Click next
    await page.getByRole('button', { name: /Næste/i }).click();
    
    // Step 3: Scheduling Mode
    // The default mode should be round-robin
    // Click next to generate schedule
    await page.getByRole('button', { name: /Generer/i }).click();
    
    // Step 4: View Schedule
    // Check that matches are generated
    await expect(page.getByRole('cell', { name: 'Team A' }).first()).toBeVisible();
    
    // Save tournament
    const saveButton = page.getByRole('button', { name: /Gem Turnering/i });
    await saveButton.click();
    
    // Should be back on home page
    await expect(page.locator('text=Test Tournament')).toBeVisible();
  });

  test('should save and load a tournament', async ({ page }) => {
    await page.goto('/');
    
    // Create a tournament
    await page.getByRole('button', { name: /Opret Ny Turnering/i }).click();
    
    // Step 1
    await page.locator('input[name="name"]').fill('Saved Tournament');
    await page.locator('input[name="numPitches"]').fill('2');
    await page.locator('input[name="matchDurationMinutes"]').fill('30');
    await page.getByRole('button', { name: /Næste/i }).click();
    
    // Step 2 - Add teams
    const teamInput = page.locator('input#teamName');
    for (const team of ['Team A', 'Team B', 'Team C', 'Team D']) {
      await teamInput.fill(team);
      await page.getByRole('button', { name: /^Tilføj$/i }).click();
    }
    await page.getByRole('button', { name: /Næste/i }).click();
    
    // Step 3
    await page.getByRole('button', { name: /Generer/i }).click();
    
    // Step 4 - Save
    await page.getByRole('button', { name: /Gem Turnering/i }).click();
    
    // Verify tournament appears in the list
    await expect(page.locator('text=Saved Tournament')).toBeVisible();
    
    // Reload page to verify persistence
    await page.reload();
    
    // Tournament should still be there
    await expect(page.locator('text=Saved Tournament')).toBeVisible();
  });

  test('should delete a tournament', async ({ page }) => {
    await page.goto('/');
    
    // Create a tournament first
    await page.getByRole('button', { name: /Opret Ny Turnering/i }).click();
    await page.locator('input[name="name"]').fill('Tournament to Delete');
    await page.locator('input[name="numPitches"]').fill('2');
    await page.locator('input[name="matchDurationMinutes"]').fill('30');
    await page.getByRole('button', { name: /Næste/i }).click();
    
    const teamInput = page.locator('input#teamName');
    for (const team of ['Team A', 'Team B']) {
      await teamInput.fill(team);
      await page.getByRole('button', { name: /^Tilføj$/i }).click();
    }
    await page.getByRole('button', { name: /Næste/i }).click();
    await page.getByRole('button', { name: /Generer/i }).click();
    await page.getByRole('button', { name: /Gem Turnering/i }).click();
    
    // Find and hover over the tournament card to reveal delete button
    const tournamentCard = page.locator('[class*="group"]').filter({ hasText: 'Tournament to Delete' });
    await tournamentCard.hover();
    
    // Click delete button (the destructive/red button with trash icon)
    await tournamentCard.locator('button.text-destructive').click();
    
    // Confirm deletion in dialog
    await page.getByRole('button', { name: /Slet/i }).click();
    
    // Tournament should be removed
    await expect(page.locator('text=Tournament to Delete')).not.toBeVisible();
  });
});
