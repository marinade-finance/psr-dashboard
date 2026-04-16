// Validator Bonds page tests: data loading, metrics, tile map, table,
// expert mode (extra metrics + columns).
import { test, expect } from './fixtures/mock-api'

function parseNum(s: string): number {
  return parseFloat(s.replace(/[^0-9.\-]/g, ''))
}

async function waitForBonds(page: import('@playwright/test').Page) {
  await page.waitForSelector('.metric', { timeout: 30000 })
  await page.waitForSelector('table', { timeout: 30000 })
}

test.describe('Bonds basic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bonds')
    await waitForBonds(page)
  })

  test('table loads at /bonds', async ({ page }) => {
    await expect(page).toHaveURL('/bonds')
    await expect(page.locator('table')).toBeVisible()
  })

  test('all 4 metrics visible', async ({ page }) => {
    for (const label of ['Bonds Funded', 'Bonds Balance', 'Marinade Stake', 'Protected Stake']) {
      await expect(page.locator('.metric').filter({ hasText: label })).toBeVisible()
    }
  })

  test('Coverage Ratio metric visible', async ({ page }) => {
    await expect(page.locator('.metric').filter({ hasText: 'Coverage Ratio' })).toBeVisible()
  })

  test('metrics contain numbers', async ({ page }) => {
    const text = await page.locator('.metric').first().innerText()
    expect(text).toMatch(/\d/)
  })

  test('tile map visible with colored tiles', async ({ page }) => {
    // Tile map renders between metrics and table
    const tiles = page.locator('[title]').filter({ hasText: /SOL/ })
    expect(await tiles.count()).toBeGreaterThan(0)
  })

  test('table has Bond balance column header', async ({ page }) => {
    const headers = await page.locator('table th').allInnerTexts()
    expect(headers.some(h => h.toLowerCase().includes('bond'))).toBe(true)
  })
})

test.describe('Bonds expert', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/expert-bonds')
    await waitForBonds(page)
  })

  test('expert has more columns than basic', async ({ page }) => {
    const expertCount = await page.locator('table th').count()
    await page.goto('/bonds')
    await waitForBonds(page)
    const basicCount = await page.locator('table th').count()
    expect(expertCount).toBeGreaterThan(basicCount)
  })

  test('Max protected stake column present', async ({ page }) => {
    const headers = await page.locator('table th').allInnerTexts()
    expect(headers.some(h => h.toLowerCase().includes('protected'))).toBe(true)
  })
})
