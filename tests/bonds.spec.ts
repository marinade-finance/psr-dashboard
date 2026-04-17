// Validator Bonds page tests: data loading, coverage hero bar, tile map,
// table, expert mode (extra columns).
import { test, expect } from './fixtures/mock-api'

async function waitForBonds(page: import('@playwright/test').Page) {
  await page.waitForSelector('table', { timeout: 90000 })
  // Coverage hero bar contains "% of Marinade stake is bond-protected"
  await page.getByText(/of Marinade stake is bond-protected/i).waitFor({ timeout: 90000 })
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
