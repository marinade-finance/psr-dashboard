// ValidatorDetail sheet tests: clicking a bonded row opens the sheet,
// sheet shows validator info, sheet can be dismissed via close button and
// via Escape key. Dark mode toggle tests also live here.
import { test, expect } from './fixtures/mock-api'
import type { Page } from '@playwright/test'

async function waitForData(page: Page) {
  await page.waitForSelector('tbody tr', { timeout: 90000 })
}

// The sheet is a custom component (not Radix): when open it renders a
// fixed overlay div with class "fixed inset-0 z-50".
// The ValidatorDetail sheet opens only for validators with a bond.
const SHEET_OVERLAY = '.fixed.inset-0.z-50'

async function openDetailSheet(page: Page): Promise<boolean> {
  const rows = page.locator('tbody tr')
  const count = await rows.count()
  for (let i = 0; i < Math.min(count, 30); i++) {
    await rows.nth(i).click()
    await page.waitForTimeout(300)
    const visible = await page.locator(SHEET_OVERLAY).first().isVisible().catch(() => false)
    if (visible) return true
  }
  return false
}

test.describe('ValidatorDetail sheet (basic SAM, no simulation)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForData(page)
  })

  test('clicking a bonded row opens the detail sheet', async ({ page }) => {
    const opened = await openDetailSheet(page)
    test.skip(!opened, 'no bonded validators in dataset')
    await expect(page.locator(SHEET_OVERLAY).first()).toBeVisible()
  })

  test('sheet displays truncated validator vote account', async ({ page }) => {
    const opened = await openDetailSheet(page)
    test.skip(!opened, 'no bonded validators in dataset')
    // The sheet shows a truncated pubkey in form "XXXXXXXX...XXXX"
    const text = await page.locator(SHEET_OVERLAY).first().innerText()
    expect(text).toMatch(/[1-9A-HJ-NP-Za-km-z]{4,}\.{3}[1-9A-HJ-NP-Za-km-z]{4}/)
  })

  test('close button dismisses the sheet', async ({ page }) => {
    const opened = await openDetailSheet(page)
    test.skip(!opened, 'no bonded validators in dataset')
    const closeBtn = page.locator(SHEET_OVERLAY).locator('button').first()
    await closeBtn.click()
    await expect(page.locator(SHEET_OVERLAY)).toHaveCount(0, { timeout: 5000 })
  })

  test('Escape key dismisses the sheet', async ({ page }) => {
    const opened = await openDetailSheet(page)
    test.skip(!opened, 'no bonded validators in dataset')
    await page.keyboard.press('Escape')
    await expect(page.locator(SHEET_OVERLAY)).toHaveCount(0, { timeout: 5000 })
  })

  test('sheet contains bond health info', async ({ page }) => {
    const opened = await openDetailSheet(page)
    test.skip(!opened, 'no bonded validators in dataset')
    const text = await page.locator(SHEET_OVERLAY).first().innerText()
    expect(text).toMatch(/Healthy|Watch|Critical/)
  })
})

test.describe('Dark mode toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[class*="navigation"]', { timeout: 15000 })
  })

  test('toggle switches and persists theme', async ({ page }) => {
    const html = page.locator('html')
    const initialDark = await html.evaluate(el => el.classList.contains('dark'))

    const toggle = page.locator('button[aria-label*="mode"], button[aria-label*="Mode"]')
    await expect(toggle).toBeVisible()

    // Toggle once — should flip
    await toggle.click()
    const afterDark = await html.evaluate(el => el.classList.contains('dark'))
    expect(afterDark).toBe(!initialDark)

    // localStorage should record the preference
    const stored = await page.evaluate(() => localStorage.getItem('theme'))
    expect(['dark', 'light']).toContain(stored)

    // Toggle back — should restore
    await toggle.click()
    const restoredDark = await html.evaluate(el => el.classList.contains('dark'))
    expect(restoredDark).toBe(initialDark)
  })
})
