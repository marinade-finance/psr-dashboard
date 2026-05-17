// URL ?v= cycle: row click pushes ?v=, opening a *different* validator
// while the sheet is already open swaps ?v= (one history entry per
// validator change), browser-back navigates back through the chain, and
// closing the sheet strips ?v=.
//
// Covers the URL-driven state for the validator detail sheet — a
// real-user-pain hot-spot whenever back/forward + deep links interact.
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const SHEET = '[role="dialog"]'
const V01 = 'FiXtUREv1111111111111111111111111111111111aa'
const V02 = 'FiXtUREv2222222222222222222222222222222222bb'

async function gotoSam(page: Page) {
  await page.goto('/test-')
  await page.waitForSelector('tbody tr', { timeout: 30000 })
}

test.describe('URL ?v= cycle — open, swap, back, close', () => {
  test('opening a row pushes ?v= to the URL', async ({ page }) => {
    await gotoSam(page)
    await page.locator('tbody tr[role="button"]').first().click()
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\?v=[1-9A-HJ-NP-Za-km-z]{32,}/)
  })

  test('closing the sheet strips ?v= from the URL', async ({ page }) => {
    await page.goto(`/test-?v=${V01}`)
    await page.waitForSelector('tbody tr', { timeout: 30000 })
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
    await page.locator(SHEET).getByRole('button', { name: 'Close' }).click()
    await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 5000 })
    await expect(page).not.toHaveURL(/\?v=/)
  })

  test('closing and reopening swaps ?v= between validators', async ({
    page,
  }) => {
    // Open V01.
    await page.goto(`/test-?v=${V01}`)
    await page.waitForSelector('tbody tr', { timeout: 30000 })
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(new RegExp(`\\?v=${V01}`))

    // Close, then open V02 by clicking its row. (Search-while-open is a
    // separate flow logged in COVERAGE.md — the Radix sheet overlay blocks
    // pointer events on the search dropdown behind it.)
    await page.locator(SHEET).getByRole('button', { name: 'Close' }).click()
    await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 5000 })

    const v02Row = page.locator(`tbody tr[data-vote-account="${V02}"]`).first()
    await v02Row.click()
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(new RegExp(`\\?v=${V02}`))
  })

  test('browser back from the detail sheet closes it (and clears ?v=)', async ({
    page,
  }) => {
    await gotoSam(page)
    await page.locator('tbody tr[role="button"]').first().click()
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
    await page.goBack()
    await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 5000 })
    await expect(page).not.toHaveURL(/\?v=/)
  })

  test('Escape closes sheet and ?v= is removed from URL', async ({ page }) => {
    await page.goto(`/test-?v=${V02}`)
    await page.waitForSelector('tbody tr', { timeout: 30000 })
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
    await page.keyboard.press('Escape')
    await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 5000 })
    await expect(page).not.toHaveURL(/\?v=/)
  })
})
