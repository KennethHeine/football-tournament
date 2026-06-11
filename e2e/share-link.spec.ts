import { test, expect, type Page } from '@playwright/test'

const TEAMS = ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta']

// Helper to create a tournament and land on the schedule view (step 4)
async function navigateToSchedule(page: Page, tournamentName = 'Del Link Turnering') {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())

  await page.getByRole('button', { name: /Opret Ny Turnering/i }).click()

  // Step 1: Tournament Settings
  await page.locator('input[name="name"]').fill(tournamentName)
  await page.locator('input[name="numPitches"]').fill('2')
  await page.locator('input[name="matchDurationMinutes"]').fill('30')
  await page.getByRole('button', { name: /Næste/i }).click()

  // Step 2: Add Teams
  const teamInput = page.locator('input#teamName')
  for (const team of TEAMS) {
    await teamInput.fill(team)
    await page.getByRole('button', { name: /^Tilføj$/i }).click()
  }
  await page.getByRole('button', { name: /Næste/i }).click()

  // Step 3: Generate Schedule
  await page.getByRole('button', { name: /Generer/i }).click()

  // Step 4: schedule table is visible
  await page.waitForSelector('table')
}

test.describe('Share link roundtrip', () => {
  test('copies a share link that opens the same schedule in a fresh context', async ({
    page,
    browser,
  }) => {
    // Stub clipboard.writeText before any page script runs so the copied URL
    // is captured into a window variable. This works on both Chromium and
    // WebKit (which does not support clipboard permission grants).
    await page.addInitScript(() => {
      const captured: { text: string } = { text: '' }
      ;(window as unknown as { __copied: { text: string } }).__copied = captured
      const stub = {
        writeText: (text: string) => {
          captured.text = text
          return Promise.resolve()
        },
      }
      Object.defineProperty(navigator, 'clipboard', { value: stub, configurable: true })
    })

    await navigateToSchedule(page)

    const matchRowCount = await page.locator('tbody tr').count()
    expect(matchRowCount).toBeGreaterThan(0)

    await page.getByRole('button', { name: /Del link/i }).click()

    // The success toast confirms the copy completed
    await expect(page.getByText('Delingslink kopieret')).toBeVisible()

    await expect
      .poll(() =>
        page.evaluate(() => (window as unknown as { __copied: { text: string } }).__copied.text)
      )
      .toContain('share=')
    const shareUrl = await page.evaluate(
      () => (window as unknown as { __copied: { text: string } }).__copied.text
    )

    // Open the captured URL in a completely fresh browser context
    const freshContext = await browser.newContext()
    try {
      const sharedPage = await freshContext.newPage()
      await sharedPage.goto(shareUrl)

      // The shared tournament loads straight into the schedule view
      await expect(sharedPage.getByText('Delt turnering indlæst')).toBeVisible()
      await expect(sharedPage.locator('table')).toBeVisible()

      // Same number of match rows and the same team names
      await expect(sharedPage.locator('tbody tr')).toHaveCount(matchRowCount)
      for (const team of TEAMS) {
        await expect(sharedPage.locator('table')).toContainText(team)
      }
    } finally {
      await freshContext.close()
    }
  })
})
