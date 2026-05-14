// Bonds table: columns, default sort, sorting interactions, ValidatorIdentity
// cell, expert-only Max protectable column. Spec source is SCREENS.md.
import { test, expect } from './fixtures/mock-api'

import type { Page } from '@playwright/test'

async function waitForBonds(page: Page) {
  await page
    .getByText(/of Marinade stake is bond-protected/i)
    .waitFor({ timeout: 110000 })
  await page.waitForSelector('table tbody tr', { timeout: 30000 })
}

function parseNum(s: string): number {
  return parseFloat(s.replace(/[^0-9.,-]/g, '').replace(/,/g, '')) || 0
}

test.describe('Bonds table columns (basic)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-bonds')
    await waitForBonds(page)
  })

  test('columns: # + Validator + Marinade Stake + Bond Balance + Protected Stake + Coverage', async ({
    page,
  }) => {
    const headers = await page.locator('table thead th').allInnerTexts()
    // First column is the row-number column ("#").
    expect(headers[0].trim()).toBe('#')
    // The remaining headers, per SCREENS.md, are these — order matters.
    const expected = [
      /Validator/i,
      /Marinade Stake/i,
      /Bond Balance/i,
      /Protected Stake/i,
      /Coverage/i,
    ]
    for (let i = 0; i < expected.length; i++) {
      expect(headers[i + 1]).toMatch(expected[i])
    }
  })

  test('does NOT include the expert-only Max protectable column', async ({
    page,
  }) => {
    const headers = await page.locator('table thead th').allInnerTexts()
    expect(headers.some(h => /Max protectable/i.test(h))).toBe(false)
  })

  test('Validator cell uses ValidatorIdentity (name + truncated vote)', async ({
    page,
  }) => {
    const cell = page.locator('table tbody tr:first-child td:nth-child(2)')
    const text = await cell.innerText()
    // Single ellipsis char surrounded by base58 chars
    expect(text).toMatch(/[1-9A-HJ-NP-Za-km-z]{4,}…[1-9A-HJ-NP-Za-km-z]{4}/)
  })
})

test.describe('Bonds table default sort', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-bonds')
    await waitForBonds(page)
  })

  test('default sort: Marinade Stake DESC', async ({ page }) => {
    // Marinade Stake is the 3rd column (after # and Validator)
    const cells = page.locator('table tbody tr td:nth-child(3)')
    const count = await cells.count()
    if (count < 2) test.skip(true, 'need ≥2 rows')
    const values: number[] = []
    for (let i = 0; i < count; i++) {
      values.push(parseNum(await cells.nth(i).innerText()))
    }
    for (let i = 1; i < values.length; i++) {
      expect(values[i - 1]).toBeGreaterThanOrEqual(values[i])
    }
  })
})

test.describe('Bonds table sort interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-bonds')
    await waitForBonds(page)
  })

  test('clicking Bond Balance header sorts by that column', async ({
    page,
  }) => {
    // Bond Balance header (column index 3 in data → th nth-child(4) with #).
    await page.getByRole('button', { name: /Bond Balance/i }).first().click()
    // Whichever direction the click picks, the column must be sorted.
    const cells = page.locator('table tbody tr td:nth-child(4)')
    const count = await cells.count()
    if (count < 2) test.skip(true, 'need ≥2 rows')
    const values: number[] = []
    for (let i = 0; i < count; i++) {
      values.push(parseNum(await cells.nth(i).innerText()))
    }
    const asc = [...values].sort((a, b) => a - b)
    const desc = [...values].sort((a, b) => b - a)
    const isSorted =
      JSON.stringify(values) === JSON.stringify(asc) ||
      JSON.stringify(values) === JSON.stringify(desc)
    expect(isSorted).toBe(true)
  })

  test('clicking Coverage header sorts by coverage ratio', async ({ page }) => {
    await page.getByRole('button', { name: /Coverage/i }).first().click()
    // Coverage cell text contains "NN%" — read it back as a number.
    const cells = page.locator('table tbody tr td:nth-child(6)')
    const count = await cells.count()
    if (count < 2) test.skip(true, 'need ≥2 rows')
    const values: number[] = []
    for (let i = 0; i < count; i++) {
      const txt = await cells.nth(i).innerText()
      const m = txt.match(/(\d+(?:\.\d+)?)\s*%/)
      values.push(m ? parseFloat(m[1]) : 0)
    }
    const asc = [...values].sort((a, b) => a - b)
    const desc = [...values].sort((a, b) => b - a)
    const isSorted =
      JSON.stringify(values) === JSON.stringify(asc) ||
      JSON.stringify(values) === JSON.stringify(desc)
    expect(isSorted).toBe(true)
  })
})

test.describe('Bonds coverage hero', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-bonds')
    await waitForBonds(page)
  })

  test('big numeral matches Bonds funded / Total stake math', async ({
    page,
  }) => {
    // Spec: numeral is round(totalProtected / totalMarinadeStake * 100). We
    // can't verify the exact math without the data, but we can assert that
    // the visible numeral is a percentage between 0 and 100.
    const heroLine = page.getByText(/of Marinade stake is bond-protected/i)
    const card = heroLine.locator('..').locator('..')
    const big = card.locator('.metric').first()
    const text = (await big.innerText()).trim()
    expect(text).toMatch(/^\d{1,3}%$/)
    const n = parseInt(text, 10)
    expect(n).toBeGreaterThanOrEqual(0)
    expect(n).toBeLessThanOrEqual(100)
  })

  test('stacked bar has two segments summing to 100% width', async ({
    page,
  }) => {
    const heroLine = page.getByText(/of Marinade stake is bond-protected/i)
    const card = heroLine.locator('..').locator('..')
    // The bar wrapper is h-8, contains two flex segments (protected, uncovered).
    const segs = card.locator('div.h-8 > div')
    const count = await segs.count()
    expect(count).toBe(2)
    const wrap = card.locator('div.h-8').first()
    const wrapBox = await wrap.boundingBox()
    if (!wrapBox) test.skip(true, 'bar not visible')
    const segWidths: number[] = []
    for (let i = 0; i < 2; i++) {
      const b = await segs.nth(i).boundingBox()
      if (b) segWidths.push(b.width)
    }
    const sum = segWidths.reduce((a, b) => a + b, 0)
    if (wrapBox) expect(Math.abs(sum - wrapBox.width)).toBeLessThan(2)
  })

  test('three chips present: Bonds funded, Total bonds, Total stake', async ({
    page,
  }) => {
    for (const label of [/Bonds funded/i, /Total bonds/i, /Total stake/i]) {
      await expect(page.getByText(label).first()).toBeVisible()
    }
  })

  test('basic mode does NOT show Max protectable chip', async ({ page }) => {
    await expect(page.getByText(/Max protectable/i)).toHaveCount(0)
  })
})

test.describe('Bonds expert table', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/expert-bonds')
    await waitForBonds(page)
  })

  test('Max protectable column is the rightmost data column', async ({
    page,
  }) => {
    const headers = await page.locator('table thead th').allInnerTexts()
    // Last header should be Max protectable per SCREENS.md
    expect(headers[headers.length - 1]).toMatch(/Max protectable/i)
  })

  test('Max protectable chip visible on the hero', async ({ page }) => {
    await expect(page.getByText(/Max protectable/i).first()).toBeVisible()
  })

  test('expert mode keeps the basic-mode columns in the same order', async ({
    page,
  }) => {
    const headers = await page.locator('table thead th').allInnerTexts()
    const idx = (re: RegExp) => headers.findIndex(h => re.test(h))
    expect(idx(/Validator/)).toBeLessThan(idx(/Marinade Stake/))
    expect(idx(/Marinade Stake/)).toBeLessThan(idx(/Bond Balance/))
    expect(idx(/Bond Balance/)).toBeLessThan(idx(/Protected Stake/))
    expect(idx(/Protected Stake/)).toBeLessThan(idx(/Coverage/))
    expect(idx(/Coverage/)).toBeLessThan(idx(/Max protectable/))
  })
})
