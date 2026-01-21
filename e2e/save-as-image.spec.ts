import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

test.describe('Save as Image functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  // Helper function to navigate to Step 4 (Schedule view) with a generated schedule
  async function navigateToSchedule(
    page: import('@playwright/test').Page,
    tournamentName = 'Test Turnering'
  ) {
    await page.goto('/')

    // Click on "Create New Tournament" button
    await page.getByRole('button', { name: /Opret Ny Turnering/i }).click()

    // Step 1: Tournament Settings
    await page.locator('input[name="name"]').fill(tournamentName)
    await page.locator('input[name="numPitches"]').fill('2')
    await page.locator('input[name="matchDurationMinutes"]').fill('30')
    await page.getByRole('button', { name: /Næste/i }).click()

    // Step 2: Add Teams
    const teamInput = page.locator('input#teamName')
    for (const team of ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta']) {
      await teamInput.fill(team)
      await page.getByRole('button', { name: /^Tilføj$/i }).click()
    }
    await page.getByRole('button', { name: /Næste/i }).click()

    // Step 3: Generate Schedule
    await page.getByRole('button', { name: /Generer/i }).click()

    // Wait for schedule to be visible
    await page.waitForSelector('table')
  }

  test('should display the save as image button', async ({ page }) => {
    await navigateToSchedule(page)

    // Check that the "Billede" button is visible (text shortened for mobile)
    const saveImageButton = page.getByRole('button', { name: /Billede/i })
    await expect(saveImageButton).toBeVisible()
    await expect(saveImageButton).toBeEnabled()
  })

  test('should download an image file when clicking save as image button', async ({ page }) => {
    await navigateToSchedule(page)

    // Listen for console errors
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })

    // Click the save as image button (text shortened to "Billede" for mobile)
    await page.getByRole('button', { name: /Billede/i }).click()

    // Wait for the download
    const download = await downloadPromise

    // Verify the downloaded file has the correct name pattern
    const fileName = download.suggestedFilename()
    expect(fileName).toMatch(/.*-skema\.png$/)

    // Verify the file was downloaded successfully
    const filePath = await download.path()
    expect(filePath).toBeTruthy()

    // Verify no console errors occurred
    expect(consoleErrors).toHaveLength(0)
  })

  test('should show success toast after image export', async ({ page }) => {
    await navigateToSchedule(page)

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })

    // Click the save as image button (text shortened to "Billede" for mobile)
    await page.getByRole('button', { name: /Billede/i }).click()

    // Wait for download
    await downloadPromise

    // Check that success toast is displayed
    const successToast = page.locator('text=Billede downloadet')
    await expect(successToast).toBeVisible({ timeout: 5000 })
  })

  test('should download image with correct file size (visual content verification)', async ({
    page,
  }) => {
    await navigateToSchedule(page, 'Test Turnering 2024')

    // Set up download directory
    const downloadDir = '/tmp/downloads'
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true })
    }

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })

    // Click the save as image button (text shortened to "Billede" for mobile)
    await page.getByRole('button', { name: /Billede/i }).click()

    // Wait for the download
    const download = await downloadPromise
    const downloadPath = path.join(downloadDir, download.suggestedFilename())
    await download.saveAs(downloadPath)

    // Copy to a standard location for visual inspection
    fs.copyFileSync(downloadPath, '/tmp/tournament-image.png')

    // Verify the file exists and has substantial content (fonts loaded properly = larger file)
    const stats = fs.statSync('/tmp/tournament-image.png')
    expect(stats.size).toBeGreaterThan(100000) // Image should be at least 100KB with proper fonts

    console.log(`Image downloaded successfully: ${stats.size} bytes`)
  })

  test('should not show error toast during image export', async ({ page }) => {
    await navigateToSchedule(page)

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })

    // Click the save as image button (text shortened to "Billede" for mobile)
    await page.getByRole('button', { name: /Billede/i }).click()

    // Wait for download
    await downloadPromise

    // Check that no error toast is displayed
    const errorToast = page.locator('[data-sonner-toast][data-type="error"]')
    await expect(errorToast).not.toBeVisible({ timeout: 2000 })
  })
})
