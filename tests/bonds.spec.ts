// Validator Bonds page tests: data loading, metrics (4 basic + values),
// default sort (indicator + value ordering), expert mode (extra metric,
// extra columns, column count comparison).
import { test, expect } from './fixtures/mock-api'

function parseNum(s: string): number {
  return parseFloat(s.replace(/[^0-9.\-]/g, ''))
}

test.describe('Bonds basic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bonds')
    await page.waitForSelector('[class*="metricWrap"]', { timeout: 30000 })
  })

  test('table loads at /bonds', async ({ page }) => {
    await expect(page).toHaveURL('/bonds')
    await expect(page.locator('table')).toBeVisible()
  })

  test('all 4 metrics visible with values', async ({ page }) => {
    for (const label of [
      'Bonds Funded',
      'Bonds Balance',
      'Marinade Stake',
      'Protected Stake',
    ]) {
      await expect(page.locator('.metric').filter({ hasText: label })).toBeVisible()
    }
    const text = await page.locator('[class*="metricWrap"]').innerText()
    expect(text).toMatch(/\d/)
  })

  test('Bond balance sorted descending with correct values', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()

    const h = page.locator('table th').filter({ hasText: 'Bond balance' })
    await expect(h).toBeVisible()

    const cells = page.locator('table tbody tr td:nth-child(3)')
    const n = await cells.count()
    const vals: number[] = []
    for (let i = 0; i < Math.min(n, 20); i++) {
      const v = parseNum(await cells.nth(i).innerText())
      if (!isNaN(v)) vals.push(v)
    }
    expect(vals.length).toBeGreaterThan(1)
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeLessThanOrEqual(vals[i - 1])
    }
  })
})

test.describe('Bonds expert', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/expert-bonds')
    await page.waitForSelector('[class*="metricWrap"]', { timeout: 30000 })
  })

  test('Max Protectable Stake metric visible', async ({ page }) => {
    await expect(
      page.locator('.metric').filter({ hasText: 'Max Protectable Stake' }),
    ).toBeVisible()
  })

  test('expert has extra columns (Max protected stake, Protected stake)', async ({
    page,
  }) => {
    const headers = await page.locator('table th').allInnerTexts()
    expect(headers.some(h => h.includes('Max protected stake'))).toBe(true)
    expect(headers.some(h => h.includes('Protected stake'))).toBe(true)
  })

  test('expert has more columns than basic', async ({ page }) => {
    const expertCount = await page.locator('table th').count()
    await page.goto('/bonds')
    await page.waitForSelector('table', { timeout: 30000 })
    const basicCount = await page.locator('table th').count()
    expect(expertCount).toBeGreaterThan(basicCount)
  })
})
