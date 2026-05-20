// SAM table rows are keyboard-activatable: each row is rendered with
// role="button" and tabIndex=0 (see src/components/sam-table/sam-table.tsx).
// Pressing Enter or Space on a focused row must open the validator detail
// sheet, the same as a mouse click. None of the existing specs cover the
// keyboard path — this file fills that gap.
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const SHEET = '[role="dialog"]'

async function gotoSam(page: Page) {
  await page.goto('/test-')
  await page.waitForSelector('tbody tr', { timeout: 30000 })
}

test.describe('SAM table — keyboard activation of rows', () => {
  test('Enter key on a focused row opens the detail sheet', async ({
    page,
  }) => {
    await gotoSam(page)
    const row = page.locator('tbody tr[role="button"]').first()
    await row.focus()
    await row.press('Enter')
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
    // URL gains the ?v=<voteAccount> deep-link marker.
    await expect(page).toHaveURL(/\?v=[1-9A-HJ-NP-Za-km-z]{32,}/)
  })

  test('Space key on a focused row opens the detail sheet', async ({
    page,
  }) => {
    await gotoSam(page)
    const row = page.locator('tbody tr[role="button"]').first()
    await row.focus()
    await row.press(' ')
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
  })

  test('row carries the expected a11y attributes (role + tabindex + aria-label)', async ({
    page,
  }) => {
    await gotoSam(page)
    const row = page.locator('tbody tr[role="button"]').first()
    await expect(row).toHaveAttribute('role', 'button')
    await expect(row).toHaveAttribute('tabindex', '0')
    const aria = await row.getAttribute('aria-label')
    expect(aria, 'aria-label should describe the row').toMatch(
      /Open detail for /,
    )
  })

  test('Escape closes the sheet after a keyboard-opened row', async ({
    page,
  }) => {
    await gotoSam(page)
    const row = page.locator('tbody tr[role="button"]').first()
    await row.focus()
    await row.press('Enter')
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
    await page.keyboard.press('Escape')
    await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 5000 })
  })

  test('other keys on a focused row do NOT open the sheet', async ({
    page,
  }) => {
    await gotoSam(page)
    const row = page.locator('tbody tr[role="button"]').first()
    await row.focus()
    // 'a' has no meaning — must not open the sheet.
    await row.press('a')
    await expect(page.locator(SHEET)).toHaveCount(0)
  })
})
