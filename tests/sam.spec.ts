// SAM page tests: data loading, metrics, columns, sorting, bond coloring,
// winning-set divider, expert mode, validator detail sheet, simulation from sheet.
import { test, expect } from './fixtures/mock-api'
import type { Page } from '@playwright/test'

async function waitForData(page: Page) {
  await page.waitForSelector('tbody tr', { timeout: 50000 })
}

function parseNum(s: string): number {
  return parseFloat(s.replace(/[^0-9.\-]/g, ''))
}

test.describe('SAM basic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForData(page)
  })

  test('table loads with rows', async ({ page }) => {
    expect(await page.locator('tbody tr').count()).toBeGreaterThan(0)
  })

  test('all 4 metrics visible', async ({ page }) => {
    for (const label of [
      'Total Auction Stake',
      'Winning APY',
      'Projected APY',
      'Winning Validators',
    ]) {
      await expect(page.getByText(label).first()).toBeVisible()
    }
  })

  test('no error message', async ({ page }) => {
    await expect(page.getByText('Error fetching data')).not.toBeVisible()
  })

  test('header columns present: #, Validator, Max APY, Bond, Stake, Next Step', async ({
    page,
  }) => {
    const headers = await page.locator('thead th').allInnerTexts()
    for (const col of [
      '#',
      'Validator',
      'Max APY',
      'Bond',
      'Stake',
      'Next Step',
    ]) {
      expect(
        headers.some(h => h.includes(col)),
        `column "${col}" missing`,
      ).toBe(true)
    }
  })

  test('Total Auction Stake has comma-formatted SOL', async ({ page }) => {
    const card = page
      .locator('div')
      .filter({ hasText: /^Total Auction Stake/ })
      .first()
    await expect(card).toBeVisible()
    const text = await card.innerText()
    expect(text).toMatch(/\d{1,3}(,\d{3})+/)
  })

  test('Winning APY and Projected APY contain valid percentages', async ({
    page,
  }) => {
    for (const label of ['Winning APY', 'Projected APY']) {
      const card = page
        .locator('div')
        .filter({ hasText: new RegExp(`^${label}`) })
        .first()
      await expect(card).toBeVisible()
      const text = await card.innerText()
      expect(text).toContain('%')
      expect(text).not.toContain('NaN')
    }
  })

  test('bond health badge present in bond column', async ({ page }) => {
    const bondCells = page.locator('tbody tr td:nth-child(4)')
    await expect(bondCells.first()).toBeVisible()
    const text = await bondCells.first().innerText()
    expect(text).toMatch(/Healthy|Watch|Critical/)
  })

  test('winning-set divider row present', async ({ page }) => {
    await expect(page.getByText(/Winning Set Cutoff/i).first()).toBeVisible()
  })
})

test.describe('SAM sorting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForData(page)
  })

  test('default sort: Max APY header shows ↓', async ({ page }) => {
    const h = page
      .locator('th')
      .filter({ hasText: /Max APY/ })
      .first()
    await expect(h).toContainText('↓')
  })

  test('click Max APY header toggles ASC/DESC (default is ↓)', async ({
    page,
  }) => {
    const h = page
      .locator('th')
      .filter({ hasText: /Max APY/ })
      .first()
    // Default is Max APY ↓. First click on the active column flips to ↑.
    await h.click()
    await expect(h).toContainText('↑', { timeout: 5000 })
    // Second click flips back to ↓.
    await h.click()
    await expect(h).toContainText('↓', { timeout: 5000 })
  })

  test('sort values: Max APY ASC produces ascending numbers', async ({
    page,
  }) => {
    const h = page
      .locator('th')
      .filter({ hasText: /Max APY/ })
      .first()
    // Default is ↓; one click flips to ↑.
    await h.click()
    await expect(h).toContainText('↑')

    const cells = page.locator('tbody tr td:nth-child(3)')
    const n = await cells.count()
    const vals: number[] = []
    for (let i = 0; i < Math.min(n, 20); i++) {
      const v = parseNum(await cells.nth(i).innerText())
      if (!isNaN(v)) vals.push(v)
    }
    expect(vals.length).toBeGreaterThan(1)
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeGreaterThanOrEqual(vals[i - 1])
    }
  })
})

test.describe('SAM bond cell coloring', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForData(page)
  })

  test('bond column has Healthy/Watch/Critical labels', async ({ page }) => {
    // Bond health badges are rendered inline in the bond cell
    const bondCells = page.locator('tbody tr td:nth-child(4)')
    const count = await bondCells.count()
    const texts: string[] = []
    for (let i = 0; i < Math.min(count, 30); i++) {
      texts.push(await bondCells.nth(i).innerText())
    }
    const hasLabel = texts.some(t => /Healthy|Watch|Critical/.test(t))
    expect(hasLabel).toBe(true)
  })
})

test.describe('SAM sort secondary', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForData(page)
  })

  test('Max APY ↓ default → click toggles ↑ → click toggles ↓', async ({
    page,
  }) => {
    const maxApyH = page
      .locator('th')
      .filter({ hasText: /Max APY/ })
      .first()

    // Default sort column = Max APY ↓ (handleSort treats same-column click
    // as a toggle).
    await expect(maxApyH).toContainText('↓')

    await maxApyH.click()
    await expect(maxApyH).toContainText('↑')

    await maxApyH.click()
    await expect(maxApyH).toContainText('↓')
  })
})

test.describe('SAM expert', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/expert-')
    await waitForData(page)
  })

  test('loads with rows and no error', async ({ page }) => {
    expect(await page.locator('tbody tr').count()).toBeGreaterThan(0)
    await expect(page.getByText('Error fetching data')).not.toBeVisible()
  })

  test('Docs link visible in nav on expert route', async ({ page }) => {
    // Match the nav Docs link only (sam page also has a "Full docs↗" link).
    await expect(
      page.getByRole('link', { name: 'Docs', exact: true }).first(),
    ).toBeVisible()
  })

  test('all 4 metrics visible on expert route', async ({ page }) => {
    for (const label of [
      'Total Auction Stake',
      'Winning APY',
      'Projected APY',
      'Winning Validators',
    ]) {
      await expect(page.getByText(label).first()).toBeVisible()
    }
  })

  test('expert has at least as many rows as basic', async ({ page }) => {
    const expertCount = await page.locator('tbody tr').count()
    await page.goto('/')
    await waitForData(page)
    const basicCount = await page.locator('tbody tr').count()
    // Expert shows sub-min-bond validators too, so count >= basic
    expect(expertCount).toBeGreaterThanOrEqual(basicCount)
  })

  test('jump-to-validator search box visible', async ({ page }) => {
    // ValidatorJump search is rendered when onValidatorSearch is passed (both modes)
    const search = page.locator('input[placeholder*="Jump"]').or(
      page.locator('input[placeholder*="Search"]').or(
        page.locator('input[placeholder*="validator"]'),
      ),
    )
    await expect(search.first()).toBeVisible()
  })

  test('winning-set divider present in expert mode', async ({ page }) => {
    await expect(page.getByText(/Winning Set Cutoff/i).first()).toBeVisible()
  })

  test('Re-delegation stat visible in expert mode', async ({ page }) => {
    await expect(page.getByText('Re-delegation').first()).toBeVisible()
  })
})

test.describe('SAM simulation mode (via detail sheet)', () => {
  // The simulation toggle lives in the ValidatorDetail sheet.
  // Open a bonded row, toggle simulation on, verify the What-If section appears.

  async function openSheetForBondedRow(page: import('@playwright/test').Page): Promise<boolean> {
    const SHEET_OVERLAY = '[role="dialog"]'
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

  test('simulation toggle appears in detail sheet', async ({ page }) => {
    await page.goto('/')
    await waitForData(page)
    const opened = await openSheetForBondedRow(page)
    test.skip(!opened, 'no bonded validators in dataset')
    // The sheet has a "Simulate" label next to a Switch
    await expect(
      page.locator('[role="dialog"]').getByText('Simulate').first(),
    ).toBeVisible()
  })

  test('toggling simulation reveals What-If section', async ({ page }) => {
    await page.goto('/')
    await waitForData(page)
    const opened = await openSheetForBondedRow(page)
    test.skip(!opened, 'no bonded validators in dataset')

    // Toggle simulation on
    const toggle = page
      .locator('[role="dialog"]')
      .locator('button[role="switch"], [aria-label="Toggle simulation mode"]')
      .first()
    await toggle.click()

    // What-If Simulation section should now be visible
    await expect(
      page.locator('[role="dialog"]').getByText('What-If Simulation').first(),
    ).toBeVisible({ timeout: 5000 })
  })

  test('simulation inputs present after enabling', async ({ page }) => {
    await page.goto('/')
    await waitForData(page)
    const opened = await openSheetForBondedRow(page)
    test.skip(!opened, 'no bonded validators in dataset')

    const toggle = page
      .locator('[role="dialog"]')
      .locator('button[role="switch"], [aria-label="Toggle simulation mode"]')
      .first()
    await toggle.click()

    // Should have numeric inputs for commission / bid fields
    const inputs = page
      .locator('[role="dialog"]')
      .locator('input[type="number"]')
    await expect(inputs.first()).toBeVisible({ timeout: 5000 })
    expect(await inputs.count()).toBeGreaterThanOrEqual(2)
  })
})

test.describe('SAM error state', () => {
  test('shows error when API fails', async ({ page }) => {
    await page.route(/marinade\.finance/, route => route.abort())
    await page.goto('/')
    await expect(page.getByText('Error fetching data')).toBeVisible({
      timeout: 30000,
    })
  })
})
