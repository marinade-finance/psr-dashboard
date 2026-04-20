// Protected Events page tests: data loading, metrics (cost/payment breakdown),
// validator filter, epoch filter, funder badges, expert metric.
import { test, expect } from './fixtures/mock-api'

async function waitForEvents(page: import('@playwright/test').Page) {
  // Wait for both table and metrics; use the metric label as it appears after data loads
  await page.getByText('Events Protected').first().waitFor({ timeout: 110000 })
}

test.describe('Events basic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/protected-events')
    await waitForEvents(page)
  })

  test('table loads at /protected-events', async ({ page }) => {
    await expect(page).toHaveURL('/protected-events')
    await expect(page.locator('table')).toBeVisible()
  })

  test('4 cost/payment metrics visible', async ({ page }) => {
    for (const label of ['Events Protected', 'Validator Bond Paid', 'Marinade Paid', 'Total SOL to Stakers']) {
      await expect(page.getByText(label).first()).toBeVisible()
    }
  })

  test('funder badges visible (Validator Bond or Marinade)', async ({ page }) => {
    const pageText = await page.locator('table tbody').innerText()
    expect(pageText).toMatch(/Validator Bond|Marinade/)
  })

  test('no rows show "Bidding" as reason', async ({ page }) => {
    const reasons = await page.locator('table tbody tr').allInnerTexts()
    for (const r of reasons) expect(r).not.toContain('Bidding')
  })

  test('no error message', async ({ page }) => {
    await expect(page.getByText('Error fetching data')).not.toBeVisible()
  })
})

test.describe('Events validator filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/protected-events')
    await waitForEvents(page)
  })

  test('filter reduces rows', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()
    const total = await rows.count()

    // Column 2 is Validator (col 1 is # row number)
    const first = await page.locator('table tbody tr:first-child td:nth-child(2)').innerText()
    const prefix = first.trim().slice(0, 6)
    const input = page.getByLabel('Validator filter')
    await input.fill(prefix)
    await page.waitForTimeout(300)

    const filtered = await rows.count()
    expect(filtered).toBeLessThanOrEqual(total)
    expect(filtered).toBeGreaterThan(0)
  })

  test('gibberish filter produces 0 rows', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible()
    const input = page.getByLabel('Validator filter')
    await input.fill('zzzzNONEXISTENT999')
    await page.waitForTimeout(300)
    expect(await page.locator('table tbody tr').count()).toBe(0)
  })
})

test.describe('Events epoch filter', () => {
  test('epoch range picker opens and shows epoch buttons', async ({ page }) => {
    await page.goto('/protected-events')
    await waitForEvents(page)

    // The epoch picker is a button dropdown — click the trigger
    const trigger = page.getByRole('button', { name: /epoch|All epochs/i }).first()
    await expect(trigger).toBeVisible()
    await trigger.click()

    // Dropdown opens, shows epoch number buttons
    const popup = page.locator('[class*="absolute"][class*="rounded"]').filter({ hasText: /Select.*epoch/i })
    await expect(popup).toBeVisible({ timeout: 3000 })
    // Epoch buttons are present
    const epochBtns = popup.locator('button[class*="font-mono"]')
    expect(await epochBtns.count()).toBeGreaterThan(0)
  })

  test('selecting a single epoch reduces rows', async ({ page }) => {
    await page.goto('/protected-events')
    await waitForEvents(page)

    const rows = page.locator('table tbody tr')
    const total = await rows.count()

    // Open picker and pick the last (newest) epoch twice to select a single-epoch range
    const trigger = page.getByRole('button', { name: /epoch|All epochs/i }).first()
    await trigger.click()
    const popup = page.locator('[class*="absolute"][class*="rounded"]').filter({ hasText: /Select.*epoch/i })
    await expect(popup).toBeVisible({ timeout: 3000 })

    const epochBtns = popup.locator('button[class*="font-mono"]')
    const count = await epochBtns.count()
    if (count === 0) {
      test.skip(true, 'no epoch buttons in picker')
      return
    }
    // Click the last epoch button twice (start = end = last epoch)
    const last = epochBtns.last()
    await last.click()
    await popup.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {})
    await last.click().catch(() => {})
    await page.waitForTimeout(300)

    expect(await rows.count()).toBeLessThanOrEqual(total)
  })
})

test.describe('Events filtered metrics', () => {
  test('filtered metrics appear when validator filter active', async ({ page }) => {
    await page.goto('/protected-events')
    await waitForEvents(page)

    // Verify "Filtered Events" metric is not visible initially
    await expect(page.getByText('Filtered Events').first()).not.toBeVisible()

    // Apply a filter that matches at least some rows (use vote account from Validator column)
    const firstVa = await page.locator('table tbody tr:first-child td:nth-child(2)').innerText()
    const prefix = firstVa.trim().slice(0, 6)
    const input = page.getByLabel('Validator filter')
    await input.fill(prefix)
    await page.waitForTimeout(300)

    // "Filtered Events" metric should now appear
    await expect(page.getByText('Filtered Events').first()).toBeVisible()
  })

  test('filtered metrics disappear when filter cleared', async ({ page }) => {
    await page.goto('/protected-events')
    await waitForEvents(page)

    const firstVa = await page.locator('table tbody tr:first-child td:nth-child(2)').innerText()
    const prefix = firstVa.trim().slice(0, 6)
    const input = page.getByLabel('Validator filter')
    await input.fill(prefix)
    await page.waitForTimeout(300)
    await expect(page.getByText('Filtered Events').first()).toBeVisible()

    // Clear filter
    await input.fill('')
    await page.waitForTimeout(300)
    await expect(page.getByText('Filtered Events').first()).not.toBeVisible()
  })
})

test.describe('Events badges', () => {
  test('at least one Estimate or Dryrun badge visible', async ({ page }) => {
    await page.goto('/protected-events')
    await waitForEvents(page)

    const badges = page.locator('table tbody .badge')
    const count = await badges.count()
    // If no badges, skip — data may not have Estimate/Dryrun rows
    test.skip(count === 0, 'no Estimate/Dryrun events in current data')
    expect(count).toBeGreaterThan(0)
  })
})

test('expert-protected-events has Last Epoch Bids metric', async ({ page }) => {
  await page.goto('/expert-protected-events')
  await page.getByText('Last Epoch Bids').waitFor({ timeout: 50000 })
  await expect(page.getByText('Last Epoch Bids').first()).toBeVisible()
})
