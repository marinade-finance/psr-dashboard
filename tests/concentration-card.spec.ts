// Per-validator Concentration card in the detail Overview: country + ASO
// group share vs cap, with an "at cap" state when that group is the binding
// constraint. Deep-links the sheet via /test-?v= (deterministic fixtures).
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const SHEET = '[role="dialog"]'

// ASO-capped fixture validator (France / Hetzner — Hetzner over the ASO cap).
const CAPPED_VOTE = 'FiXtUREv2222222222222222222222222222222222bb'

async function openSheet(page: Page, vote: string) {
  await page.goto(`/test-?v=${vote}`)
  await page.waitForSelector(SHEET, { timeout: 30000 })
}

test.describe('validator detail — Concentration card', () => {
  test('shows country + ASO group share against the cap', async ({ page }) => {
    await openSheet(page, CAPPED_VOTE)
    const sheet = page.locator(SHEET)
    await expect(sheet).toContainText('Concentration')
    await expect(sheet).toContainText('Country')
    await expect(sheet).toContainText('ASO')
    // Each row reads "X% of Y% cap".
    await expect(sheet).toContainText(/of\s+\d+% cap/)
  })

  test('flags the binding group with an "at cap" marker', async ({ page }) => {
    await openSheet(page, CAPPED_VOTE)
    // Hetzner is over the ASO cap for this fixture validator.
    await expect(page.locator(SHEET)).toContainText('at cap')
  })
})
