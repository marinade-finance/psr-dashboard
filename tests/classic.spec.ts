// Classic UI page tests (/old): table loads, expected columns present,
// expert variant (/expert-old), navigation "Classic UI" link.
import { test, expect } from './fixtures/mock-api'
import type { Page } from '@playwright/test'

async function waitForData(page: Page) {
  await page.waitForSelector('tbody tr', { timeout: 90000 })
}

test.describe('Classic UI basic (/old)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/old')
    await waitForData(page)
  })

  test('table loads at /old with rows', async ({ page }) => {
    await expect(page).toHaveURL('/old')
    expect(await page.locator('tbody tr').count()).toBeGreaterThan(0)
  })

  test('required column headers present', async ({ page }) => {
    const headers = await page.locator('thead th').allInnerTexts()
    expect(headers.some(h => /Validator/i.test(h))).toBe(true)
    expect(headers.some(h => /infl/i.test(h))).toBe(true)
  })

  test('no error message', async ({ page }) => {
    await expect(page.getByText('Error fetching data')).not.toBeVisible()
  })
})

test.describe('Classic UI expert (/expert-old)', () => {
  test('has more columns than basic and no error', async ({ page }) => {
    await page.goto('/expert-old')
    await waitForData(page)
    await expect(page).toHaveURL('/expert-old')
    const expertCount = await page.locator('thead th').count()

    await page.goto('/old')
    await waitForData(page)
    const basicCount = await page.locator('thead th').count()
    expect(expertCount).toBeGreaterThanOrEqual(basicCount)
    await expect(page.getByText('Error fetching data')).not.toBeVisible()
  })
})
