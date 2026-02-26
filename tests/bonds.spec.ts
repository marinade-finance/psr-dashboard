import { test, expect } from './fixtures/mock-api'

test.describe('Validator Bonds page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bonds')
    await page.waitForSelector('[class*="metricWrap"]', { timeout: 30000 })
  })

  test('navigates to /bonds and table loads', async ({ page }) => {
    await expect(page).toHaveURL('/bonds')
    await expect(page.locator('table')).toBeVisible()
  })

  test('shows Bonds Funded metric', async ({ page }) => {
    await expect(
      page.locator('.metric').filter({ hasText: 'Bonds Funded' }),
    ).toBeVisible()
  })

  test('shows Bonds Balance metric', async ({ page }) => {
    await expect(
      page.locator('.metric').filter({ hasText: 'Bonds Balance' }),
    ).toBeVisible()
  })

  test('shows Marinade Stake metric', async ({ page }) => {
    await expect(
      page.locator('.metric').filter({ hasText: 'Marinade Stake' }),
    ).toBeVisible()
  })

  test('shows Protected Stake metric', async ({ page }) => {
    await expect(
      page.locator('.metric').filter({ hasText: 'Protected Stake' }),
    ).toBeVisible()
  })

  test('metrics contain non-empty values', async ({ page }) => {
    const metricsText = await page
      .locator('[class*="metricWrap"]')
      .innerText()
    expect(metricsText).toMatch(/\d/)
  })

  test('table has Bond balance column sorted descending by default', async ({
    page,
  }) => {
    // Wait for rows to appear
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()

    // Get all bond balance values from the table
    const bondBalanceHeader = page.locator('table th').filter({
      hasText: 'Bond balance',
    })
    await expect(bondBalanceHeader).toBeVisible()

    // Verify the column exists with data
    const cells = page.locator('table tbody tr td:nth-child(3)')
    const count = await cells.count()
    expect(count).toBeGreaterThan(0)

    // Collect numeric values (skip rows with '-')
    const values: number[] = []
    for (let i = 0; i < Math.min(count, 20); i++) {
      const text = await cells.nth(i).innerText()
      const num = parseFloat(text.replace(/,/g, ''))
      if (!isNaN(num)) {
        values.push(num)
      }
    }

    // Check descending order for rows with values
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1])
    }
  })

  test('expert-bonds has Max Protectable Stake metric', async ({ page }) => {
    await page.goto('/expert-bonds')
    await page.waitForSelector('[class*="metricWrap"]', { timeout: 30000 })
    await expect(
      page
        .locator('.metric')
        .filter({ hasText: 'Max Protectable Stake' }),
    ).toBeVisible()
  })

  test('expert-bonds has extra columns', async ({ page }) => {
    await page.goto('/expert-bonds')
    await page.waitForSelector('table', { timeout: 30000 })
    const headers = page.locator('table th')
    const headerTexts = await headers.allInnerTexts()
    expect(headerTexts.some(h => h.includes('Max protected stake'))).toBe(true)
    expect(headerTexts.some(h => h.includes('Protected stake'))).toBe(true)
  })
})
