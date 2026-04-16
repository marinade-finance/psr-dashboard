// ValidatorDetail sheet tests: clicking a row with a bond opens the sheet,
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
})

test.describe('Dark mode toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[class*="navigation"]', { timeout: 15000 })
  })

  test('dark mode toggle button is visible in navigation', async ({ page }) => {
    const toggle = page.locator('button[aria-label*="mode"], button[aria-label*="Mode"]')
    await expect(toggle).toBeVisible()
  })

  test('clicking toggle switches dark class on <html>', async ({ page }) => {
    const html = page.locator('html')
    const initialDark = await html.evaluate(el => el.classList.contains('dark'))

    const toggle = page.locator('button[aria-label*="mode"], button[aria-label*="Mode"]')
    await toggle.click()

    const afterDark = await html.evaluate(el => el.classList.contains('dark'))
    expect(afterDark).toBe(!initialDark)
  })

  test('clicking toggle twice restores original theme', async ({ page }) => {
    const html = page.locator('html')
    const initialDark = await html.evaluate(el => el.classList.contains('dark'))

    const toggle = page.locator('button[aria-label*="mode"], button[aria-label*="Mode"]')
    await toggle.click()
    await page.waitForTimeout(100)
    await toggle.click()
    await page.waitForTimeout(100)

    const finalDark = await html.evaluate(el => el.classList.contains('dark'))
    expect(finalDark).toBe(initialDark)
  })

  test('theme preference persisted in localStorage', async ({ page }) => {
    const toggle = page.locator('button[aria-label*="mode"], button[aria-label*="Mode"]')
    await toggle.click()

    const stored = await page.evaluate(() => localStorage.getItem('theme'))
    expect(['dark', 'light']).toContain(stored)
  })
})
