/**
 * Renders a share URL in a real browser and dumps the schedule table —
 * use this to verify what users will actually see (local dev or production).
 *
 * Usage:
 *   node scripts/verify-share-url.mjs "<url>" [--channel msedge] [--screenshot out.png]
 *
 * --channel msedge uses the system Edge browser; handy when Playwright's
 * own Chromium download is unavailable.
 */
import { chromium } from '@playwright/test'

const args = process.argv.slice(2)
const url = args.find(a => !a.startsWith('--'))
if (!url) {
  console.error(
    'Usage: node scripts/verify-share-url.mjs "<url>" [--channel msedge] [--screenshot out.png]'
  )
  process.exit(1)
}
const flag = name => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}

const browser = await chromium.launch({ channel: flag('channel'), headless: true })
const page = await browser.newPage({ viewport: { width: 1100, height: 1600 } })
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)

for (const row of await page.locator('table tr').allInnerTexts()) {
  console.log(row.replace(/\n/g, ' | '))
}

const screenshot = flag('screenshot')
if (screenshot) {
  await page.screenshot({ path: screenshot, fullPage: true })
  console.log(`screenshot saved: ${screenshot}`)
}
await browser.close()
