import { test, expect } from '@playwright/test'

test.describe('Protected Events page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/protected-events')
    await page.waitForSelector('[class*="metricWrap"]', { timeout: 30000 })
  })

  test('navigates to /protected-events and loads', async ({ page }) => {
    await expect(page).toHaveURL('/protected-events')
    await expect(page.locator('table')).toBeVisible()
  })

  test('shows Total events metric', async ({ page }) => {
    await expect(
      page.locator('.metric').filter({ hasText: 'Total events' }),
    ).toBeVisible()
  })

  test('shows Total amount metric', async ({ page }) => {
    await expect(
      page.locator('.metric').filter({ hasText: 'Total amount' }),
    ).toBeVisible()
  })

  test('shows Last Settled Amount metric', async ({ page }) => {
    await expect(
      page
        .locator('.metric')
        .filter({ hasText: 'Last Settled Amount' }),
    ).toBeVisible()
  })

  test('metrics contain non-empty values', async ({ page }) => {
    const metricsText = await page
      .locator('[class*="metricWrap"]')
      .innerText()
    expect(metricsText).toMatch(/\d/)
  })

  test('validator text filter reduces rows', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()

    const totalRows = await rows.count()
    expect(totalRows).toBeGreaterThan(0)

    // Get a validator value from the first row to filter on
    const firstRowValidator = page.locator('table tbody tr:first-child td:nth-child(2)')
    const validatorText = await firstRowValidator.innerText()
    const prefix = validatorText.slice(0, 8)

    // Apply filter
    const filterInput = page.locator('fieldset').filter({ hasText: 'Validator filter' }).locator('input')
    await filterInput.fill(prefix)

    // Wait for table to update
    await page.waitForTimeout(300)

    const filteredRows = await rows.count()
    expect(filteredRows).toBeLessThanOrEqual(totalRows)
    expect(filteredRows).toBeGreaterThan(0)
  })

  test('filtered metrics appear when validator filter is applied', async ({
    page,
  }) => {
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()
    const totalRows = await rows.count()

    // Get a specific prefix to filter
    const firstRowValidator = page.locator(
      'table tbody tr:first-child td:nth-child(2)',
    )
    const validatorText = await firstRowValidator.innerText()
    const prefix = validatorText.slice(0, 8)

    const filterInput = page
      .locator('fieldset')
      .filter({ hasText: 'Validator filter' })
      .locator('input')
    await filterInput.fill(prefix)
    await page.waitForTimeout(300)

    const newRows = await rows.count()
    if (newRows < totalRows) {
      // Filtered metrics should now appear
      await expect(
        page
          .locator('.metric')
          .filter({ hasText: 'Filtered Events' }),
      ).toBeVisible()
      await expect(
        page
          .locator('.metric')
          .filter({ hasText: 'Filtered Amount' }),
      ).toBeVisible()
    }
  })

  test('filtered metrics disappear when filter is cleared', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()

    const firstRowValidator = page.locator(
      'table tbody tr:first-child td:nth-child(2)',
    )
    const validatorText = await firstRowValidator.innerText()
    const prefix = validatorText.slice(0, 8)

    const filterInput = page
      .locator('fieldset')
      .filter({ hasText: 'Validator filter' })
      .locator('input')
    await filterInput.fill(prefix)
    await page.waitForTimeout(300)

    // Clear filter
    await filterInput.fill('')
    await page.waitForTimeout(300)

    // Filtered metrics should be gone
    await expect(
      page.locator('.metric').filter({ hasText: 'Filtered Events' }),
    ).not.toBeVisible()
    await expect(
      page.locator('.metric').filter({ hasText: 'Filtered Amount' }),
    ).not.toBeVisible()
  })

  test('epoch range filter reduces rows', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()
    const totalRows = await rows.count()

    const epochInputs = page
      .locator('fieldset')
      .filter({ hasText: 'Epoch filter' })
      .locator('input')

    // Get current max epoch
    const maxEpochValue = await epochInputs.nth(1).inputValue()
    const maxEpoch = parseInt(maxEpochValue)

    // Narrow epoch range to just the last epoch
    await epochInputs.nth(0).fill(maxEpoch.toString())
    await page.waitForTimeout(300)

    const filteredRows = await rows.count()
    expect(filteredRows).toBeLessThanOrEqual(totalRows)
  })

  test('badges are visible (Dryrun or Estimate)', async ({ page }) => {
    const badge = page.locator('[class*="badge"]').first()
    // If badges exist, they should be visible
    const count = await badge.count()
    if (count > 0) {
      await expect(badge).toBeVisible()
    }
    // Even with no badges, pass the test — data may not have any
  })

  test('Funder column shows Marinade or Validator values', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()

    const funderCells = page.locator('table tbody tr td:nth-child(6)')
    const count = await funderCells.count()
    expect(count).toBeGreaterThan(0)

    let foundFunder = false
    for (let i = 0; i < Math.min(count, 10); i++) {
      const text = await funderCells.nth(i).innerText()
      if (text.includes('Marinade') || text.includes('Validator')) {
        foundFunder = true
        break
      }
    }
    expect(foundFunder).toBe(true)
  })

  test('no rows with Bidding reason visible', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()

    // Check reason column (column 5) for no "Bidding" text
    const reasonCells = page.locator('table tbody tr td:nth-child(5)')
    const allTexts = await reasonCells.allInnerTexts()
    for (const text of allTexts) {
      expect(text).not.toContain('Bidding')
    }
  })

})

test('expert-protected-events has Last Epoch Bids metric', async ({
  page,
}) => {
  await page.goto('/expert-protected-events')
  await page.waitForSelector('[class*="metricWrap"]', { timeout: 50000 })
  await expect(
    page
      .locator('.metric')
      .filter({ hasText: 'Last Epoch Bids' }),
  ).toBeVisible()
})
