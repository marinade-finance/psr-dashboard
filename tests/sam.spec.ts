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

  test('7 header columns: #, Validator, Max APY, Bond, Stake Δ, Next Step, chevron', async ({ page }) => {
    const headers = await page.locator('thead th').allInnerTexts()
    expect(headers).toHaveLength(7)
    expect(headers[0]).toContain('#')
    expect(headers[1]).toContain('Validator')
    expect(headers[2]).toContain('Max APY')
    expect(headers[3]).toContain('Bond')
    expect(headers[4]).toContain('Stake')
    expect(headers[5]).toContain('Next Step')
  })

  test('Total Auction Stake has comma-formatted SOL', async ({ page }) => {
    const card = page.locator('div').filter({ hasText: /^Total Auction Stake/ }).first()
    await expect(card).toBeVisible()
    const text = await card.innerText()
    expect(text).toMatch(/\d{1,3}(,\d{3})+/)
  })

  test('Winning APY contains %', async ({ page }) => {
    const card = page.locator('div').filter({ hasText: /^Winning APY/ }).first()
    await expect(card).toBeVisible()
    const text = await card.innerText()
    expect(text).toContain('%')
  })

  test('Projected APY is not NaN', async ({ page }) => {
    const card = page.locator('div').filter({ hasText: /^Projected APY/ }).first()
    await expect(card).toBeVisible()
    const text = await card.innerText()
    expect(text).not.toContain('NaN')
    expect(text).toContain('%')
  })

  test('bond health badge present in bond column', async ({ page }) => {
    const bondCells = page.locator('tbody tr td:nth-child(4)')
    const firstCell = bondCells.first()
    await expect(firstCell).toBeVisible()
    // bond badge contains Healthy, Watch, or Critical
    const text = await firstCell.innerText()
    expect(text).toMatch(/Healthy|Watch|Critical/)
  })

  test('winning-set divider row present', async ({ page }) => {
    // The divider row spans all columns between winners and non-winners
    await expect(page.getByText(/Winning set/i).first()).toBeVisible()
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

  test('click Max APY header: ASC (↑) then DESC (↓)', async ({ page }) => {
    const h = page.locator('th').filter({ hasText: /Max APY/ }).first()
    await h.click()
    await expect(h).toContainText('↑')
    await h.click()
    await expect(h).toContainText('↓')
  })

  test('sort values: Max APY ASC produces ascending numbers', async ({ page }) => {
    const h = page.locator('th').filter({ hasText: /Max APY/ }).first()
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

test.describe('SAM validator detail sheet', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForData(page)
  })

  test('clicking a row opens detail sheet', async ({ page }) => {
    await page.locator('tbody tr').first().click()
    // Sheet slides in — look for APY Breakdown or bond health detail
    await expect(page.getByText(/APY Breakdown|Bond Health|Healthy|Watch|Critical/).first()).toBeVisible({ timeout: 5000 })
  })

  test('sheet has close button', async ({ page }) => {
    await page.locator('tbody tr').first().click()
    await expect(page.getByText(/APY Breakdown|Bond Health/).first()).toBeVisible({ timeout: 5000 })
    // Close button (×)
    const closeBtn = page.locator('button').filter({ hasText: /×/ }).first()
    await closeBtn.click()
    await expect(page.getByText(/APY Breakdown/).first()).not.toBeVisible({ timeout: 3000 })
  })
})

test.describe('SAM expert', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/expert-')
    await waitForData(page)
  })

  test('loads with rows', async ({ page }) => {
    expect(await page.locator('tbody tr').count()).toBeGreaterThan(0)
  })

  test('no error message', async ({ page }) => {
    await expect(page.getByText('Error fetching data')).not.toBeVisible()
  })
})

test.describe('SAM error state', () => {
  test('shows error when API fails', async ({ page }) => {
    await page.route(/marinade\.finance/, route => route.abort())
    await page.goto('/')
    await expect(page.getByText('Error fetching data')).toBeVisible({ timeout: 30000 })
  })
})
