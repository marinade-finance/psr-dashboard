// Validator Bonds page tests: data loading, coverage hero bar, tile map,
// table, expert mode (extra columns).
import { test, expect } from './fixtures/mock-api'

async function waitForBonds(page: import('@playwright/test').Page) {
  // Wait for data load: coverage hero appears only after bonds data is ready
  await page.getByText(/of Marinade stake is bond-protected/i).waitFor({ timeout: 110000 })
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

  test('coverage hero bar visible with percentage', async ({ page }) => {
    // Headline metric: "X% of Marinade stake is bond-protected"
    const hero = page.getByText(/of Marinade stake is bond-protected/i).first()
    await expect(hero).toBeVisible()
  })

  test('coverage stats chips visible (Bonds funded, Total bonds, Total stake)', async ({ page }) => {
    for (const label of ['Bonds funded', 'Total bonds', 'Total stake']) {
      await expect(page.getByText(new RegExp(label, 'i')).first()).toBeVisible()
    }
  })

  test('Coverage Ratio chip shows percentage', async ({ page }) => {
    // The hero metric shows coverage ratio as "X%"
    const metricText = await page.locator('.metricWrap').first().innerText()
    expect(metricText).toMatch(/\d+%/)
  })

  test('table has bond-related column header', async ({ page }) => {
    const headers = await page.locator('table th').allInnerTexts()
    expect(headers.some(h => /bond/i.test(h))).toBe(true)
  })

  test('table has rows', async ({ page }) => {
    expect(await page.locator('table tbody tr').count()).toBeGreaterThan(0)
  })

  test('no error message', async ({ page }) => {
    await expect(page.getByText('Error fetching data')).not.toBeVisible()
  })

  test('marinade stake column sorted descending by default (first ≥ second)', async ({ page }) => {
    // Default sort is Marinade Stake DESC (column index 1 in columns array = nth-child(3) with # prefix)
    // cols: #(1), Validator(2), Marinade Stake(3), Bond Balance(4), Protected Stake(5), Coverage(6)
    const cells = page.locator('table tbody tr td:nth-child(3)')
    const count = await cells.count()
    if (count < 2) return
    const parseVal = (s: string) => parseFloat(s.replace(/[^0-9.,]/g, '').replace(/,/g, '')) || 0
    const first = parseVal(await cells.nth(0).innerText())
    const second = parseVal(await cells.nth(1).innerText())
    expect(first).toBeGreaterThanOrEqual(second)
  })

  test('validator column shows truncated vote accounts', async ({ page }) => {
    const cells = page.locator('table tbody tr td:nth-child(2)')
    const count = await cells.count()
    expect(count).toBeGreaterThan(0)
    // Validator column shows truncated pubkeys like "XXXXXXXX...XXXX"
    const text = await cells.first().innerText()
    expect(text).toMatch(/[1-9A-HJ-NP-Za-km-z]{4,}\.{3}[1-9A-HJ-NP-Za-km-z]{4}/)
  })
})

test.describe('Bonds expert', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/expert-bonds')
    await waitForBonds(page)
  })

  test('expert has more columns than basic', async ({ page }) => {
    const expertCount = await page.locator('table th').count()
    // Navigate to basic to compare — use a longer timeout since we're doing two page loads
    await page.goto('/bonds')
    await page.waitForSelector('table', { timeout: 60000 })
    await page.getByText(/of Marinade stake is bond-protected/i).waitFor({ timeout: 60000 })
    const basicCount = await page.locator('table th').count()
    expect(expertCount).toBeGreaterThan(basicCount)
  })

  test('expert has max protectable stat chip', async ({ page }) => {
    await expect(page.getByText(/Max protectable/i).first()).toBeVisible()
  })
})
