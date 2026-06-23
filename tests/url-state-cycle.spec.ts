// URL ?v= state cycle for the SAM detail sheet:
//   - clicking a row pushes ?v= (one history entry)
//   - clicking ANY row while the sheet is open closes it and clears ?v=
//     (intentional dismiss-first behaviour — a second click opens the
//      target validator). See src/pages/stake-auction-marketplace.tsx
//      handleValidatorClick.
//   - opening via deep link ?v= then closing strips the param (handleBack
//     replaceState path)
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const V01 = 'FiXtUREv1111111111111111111111111111111111aa'
const V02 = 'FiXtUREv2222222222222222222222222222222222bb'
const SHEET = '[role="dialog"]'

async function gotoSam(page: Page) {
  await page.goto('/test-')
  await page.waitForSelector('tbody tr', { timeout: 30000 })
}

test.describe('URL ?v= state cycle', () => {
  test('opening first row pushes ?v= to history', async ({ page }) => {
    await gotoSam(page)
    const before = page.url()
    await page.locator('tbody tr').first().click()
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\?v=[1-9A-HJ-NP-Za-km-z]{32,}/)
    expect(page.url()).not.toBe(before)
  })

  test('clicking another row while sheet is open closes it and clears ?v=', async ({
    page,
  }) => {
    // Open V01 — pushState
    await page.goto(`/test-?v=${V01}`)
    await page.waitForSelector('tbody tr', { timeout: 30000 })
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 10000 })
    expect(page.url()).toContain(V01)

    // Click V02 row while sheet is open — the new dismiss-first behaviour
    // closes the sheet and clears ?v= rather than switching to V02.
    const v02Row = page.locator(`tbody tr[data-vote-account="${V02}"]`).first()
    await expect(v02Row).toBeVisible()
    await v02Row.click({ position: { x: 50, y: 10 } })
    await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 5000 })
    await expect(page).not.toHaveURL(/\?v=/)
  })

  test('deep-link open + close strips ?v= without a back step', async ({
    page,
  }) => {
    // Arrive via deep link — no pushState was done by the app, so handleBack
    // takes the replaceState path instead of window.history.back().
    await page.goto(`/test-?v=${V01}`)
    await page.waitForSelector('tbody tr', { timeout: 30000 })
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 10000 })

    await page.keyboard.press('Escape')
    await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 5000 })
    await expect(page).not.toHaveURL(/\?v=/)
  })
})
