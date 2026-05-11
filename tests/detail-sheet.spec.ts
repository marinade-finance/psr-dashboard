// ValidatorDetail sheet tests: clicking a bonded row opens the sheet,
// sheet shows validator info, sheet can be dismissed via close button and
// via Escape key. Dark mode toggle tests also live here.
import { test, expect } from './fixtures/mock-api'
import type { Page } from '@playwright/test'

async function waitForData(page: Page) {
  await page.waitForSelector('tbody tr', { timeout: 90000 })
}

// The sheet is a Radix dialog (see src/components/ui/sheet.tsx). The Content
// element carries role="dialog"; the Overlay is purely decorative. Target
// the dialog role for content/buttons, the overlay for visibility.
// The ValidatorDetail sheet opens only for validators with a bond.
const SHEET_OVERLAY = '[role="dialog"]'

async function openDetailSheet(page: Page): Promise<boolean> {
  const rows = page.locator('tbody tr')
  const count = await rows.count()
  for (let i = 0; i < Math.min(count, 30); i++) {
    await rows.nth(i).click()
    await page.waitForTimeout(300)
    const visible = await page
      .locator(SHEET_OVERLAY)
      .first()
      .isVisible()
      .catch(() => false)
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

  test('sheet displays the full validator vote account', async ({ page }) => {
    const opened = await openDetailSheet(page)
    test.skip(!opened, 'no bonded validators in dataset')
    // The sheet shows the full base58 pubkey (32-44 chars, no truncation).
    const text = await page.locator(SHEET_OVERLAY).first().innerText()
    expect(text).toMatch(/[1-9A-HJ-NP-Za-km-z]{32,44}/)
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
    // The Reserve row renders one of: Fully covered / Adequate / Critical /
    // Watch / "Top up …". The header also says "Bond" + "Bid runway".
    expect(text).toMatch(
      /Fully covered|Adequate|Critical|Watch|Top up|Bid runway/,
    )
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

    const toggle = page.locator(
      'button[aria-label*="mode"], button[aria-label*="Mode"]',
    )
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
    const restoredDark = await html.evaluate(el =>
      el.classList.contains('dark'),
    )
    expect(restoredDark).toBe(initialDark)
  })
})

test.describe('Dark mode on expert routes', () => {
  for (const path of ['/expert-', '/expert-bonds', '/expert-protected-events', '/expert-docs']) {
    test(`dark mode toggle works on ${path}`, async ({ page }) => {
      await page.goto(path)
      await page.waitForSelector('[class*="navigation"]', { timeout: 15000 })

      const html = page.locator('html')
      const initialDark = await html.evaluate(el => el.classList.contains('dark'))

      const toggle = page.locator(
        'button[aria-label*="mode"], button[aria-label*="Mode"]',
      )
      await expect(toggle).toBeVisible()
      await toggle.click()

      const afterDark = await html.evaluate(el => el.classList.contains('dark'))
      expect(afterDark).toBe(!initialDark)

      // restore
      await toggle.click()
    })
  }
})

test.describe('ValidatorDetail sheet (expert SAM)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/expert-')
    await waitForData(page)
  })

  test('clicking a bonded row opens the detail sheet on expert route', async ({
    page,
  }) => {
    const opened = await openDetailSheet(page)
    test.skip(!opened, 'no bonded validators in dataset')
    await expect(page.locator(SHEET_OVERLAY).first()).toBeVisible()
  })

  test('sheet on expert route shows full vote account', async ({ page }) => {
    const opened = await openDetailSheet(page)
    test.skip(!opened, 'no bonded validators in dataset')
    const text = await page.locator(SHEET_OVERLAY).first().innerText()
    expect(text).toMatch(/[1-9A-HJ-NP-Za-km-z]{32,44}/)
  })

  test('escape dismisses sheet on expert route', async ({ page }) => {
    const opened = await openDetailSheet(page)
    test.skip(!opened, 'no bonded validators in dataset')
    await page.keyboard.press('Escape')
    await expect(page.locator(SHEET_OVERLAY)).toHaveCount(0, { timeout: 5000 })
  })
})
