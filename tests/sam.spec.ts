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
    for (const label of ['Total Auction Stake', 'Winning APY', 'Projected APY', 'Winning Validators']) {
      await expect(page.getByText(label).first()).toBeVisible()
    }
  })

  test('no error message', async ({ page }) => {
    await expect(page.getByText('Error fetching data')).not.toBeVisible()
  })

  test('header columns present: #, Validator, Max APY, Bond, Stake, Next Step', async ({ page }) => {
    const headers = await page.locator('thead th').allInnerTexts()
    for (const col of ['#', 'Validator', 'Max APY', 'Bond', 'Stake', 'Next Step']) {
      expect(headers.some(h => h.includes(col)), `column "${col}" missing`).toBe(true)
    }
  })

  test('Total Auction Stake has comma-formatted SOL', async ({ page }) => {
    const card = page.locator('div').filter({ hasText: /^Total Auction Stake/ }).first()
    await expect(card).toBeVisible()
    const text = await card.innerText()
    expect(text).toMatch(/\d{1,3}(,\d{3})+/)
  })

  test('Winning APY and Projected APY contain valid percentages', async ({ page }) => {
    for (const label of ['Winning APY', 'Projected APY']) {
      const card = page.locator('div').filter({ hasText: new RegExp(`^${label}`) }).first()
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

  test('default sort: Stake Δ header shows ↓', async ({ page }) => {
    const h = page.locator('th').filter({ hasText: /Stake/ }).first()
    await expect(h).toContainText('↓')
  })

  test('click Max APY header: first click DESC (↓), second click ASC (↑)', async ({ page }) => {
    const h = page.locator('th').filter({ hasText: /Max APY/ }).first()
    await h.click()
    await expect(h).toContainText('↓', { timeout: 5000 })
    await h.click()
    await expect(h).toContainText('↑', { timeout: 5000 })
  })

  test('sort values: Max APY ASC produces ascending numbers', async ({ page }) => {
    const h = page.locator('th').filter({ hasText: /Max APY/ }).first()
    await h.click() // first click = DESC
    await h.click() // second click = ASC
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

  test('switching sort column: default Stake ↓ → Max APY ↓ → Max APY ↑', async ({ page }) => {
    const maxApyH = page.locator('th').filter({ hasText: /Max APY/ }).first()
    const stakeH = page.locator('th').filter({ hasText: /Stake/ }).first()

    // Initially stake column has ↓
    await expect(stakeH).toContainText('↓')

    // First click on Max APY = new column → DESC
    await maxApyH.click()
    await expect(maxApyH).toContainText('↓')

    // Second click on same column = toggle to ASC
    await maxApyH.click()
    await expect(maxApyH).toContainText('↑')
  })
})

test.describe('SAM expert', () => {
  test('loads with rows and no error', async ({ page }) => {
    await page.goto('/expert-')
    await waitForData(page)
    expect(await page.locator('tbody tr').count()).toBeGreaterThan(0)
    await expect(page.getByText('Error fetching data')).not.toBeVisible()
  })

  test('Expert Guide link visible in nav', async ({ page }) => {
    await page.goto('/expert-')
    await waitForData(page)
    await expect(page.getByRole('link', { name: 'Expert Guide' })).toBeVisible()
  })
})

test.describe('SAM error state', () => {
  test('shows error when API fails', async ({ page }) => {
    await page.route(/marinade\.finance/, route => route.abort())
    await page.goto('/')
    await expect(page.getByText('Error fetching data')).toBeVisible({ timeout: 30000 })
  })
})
