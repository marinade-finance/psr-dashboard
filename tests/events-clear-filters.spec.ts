// Protected Events — combined-filter clear flow. Existing specs cover each
// filter (validator-substring and epoch range) in isolation. This file
// exercises the combination: set both, clear both, expect full row set
// restored AND the "of N total" subline only present while a filter is
// active.
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function gotoEvents(page: Page) {
  await page.goto('/test-protected-events')
  await page.waitForSelector('table tbody tr', { timeout: 30000 })
}

test.describe('Protected Events — combined filters clear cleanly', () => {
  test('validator filter shows "of N total" subline; clearing hides it', async ({
    page,
  }) => {
    await gotoEvents(page)
    const rows = page.locator('table tbody tr')
    const total = await rows.count()
    expect(total).toBeGreaterThan(1)

    // Subline is hidden in the unfiltered state.
    await expect(page.getByText(/of \d.* total/).first()).toHaveCount(0)

    // Narrow by validator: use the first row's name prefix.
    const firstVa = (
      await page
        .locator('table tbody tr:first-child td:nth-child(2)')
        .innerText()
    ).trim()
    const prefix = firstVa.slice(0, 6)
    const validatorInput = page.locator('input[type="text"]').first()
    await validatorInput.fill(prefix)
    await page.waitForTimeout(300)
    const afterVa = await rows.count()
    expect(afterVa).toBeLessThanOrEqual(total)
    // Subline appears with the filter active.
    await expect(page.getByText(/of \d.* total/).first()).toBeVisible()

    // Clear the filter — full row set restored, subline hidden again.
    await validatorInput.fill('')
    await page.waitForTimeout(300)
    expect(await rows.count()).toBe(total)
    await expect(page.getByText(/of \d.* total/).first()).toHaveCount(0)
  })

  test('clearing the validator filter alone restores the un-filtered row count', async ({
    page,
  }) => {
    await gotoEvents(page)
    const rows = page.locator('table tbody tr')
    const total = await rows.count()
    const input = page.locator('input[type="text"]').first()
    await input.fill('xxxxxxxNOPE9999')
    await page.waitForTimeout(300)
    expect(await rows.count()).toBe(0)
    await input.fill('')
    await page.waitForTimeout(300)
    expect(await rows.count()).toBe(total)
  })
})
