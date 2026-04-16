// Classic UI page tests (/old): table loads, expected columns present,
// row count, expert variant (/expert-old), navigation "Classic UI" link.
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

  test('table loads with rows', async ({ page }) => {
    await expect(page).toHaveURL('/old')
    expect(await page.locator('tbody tr').count()).toBeGreaterThan(0)
  })

  test('Validator column header present', async ({ page }) => {
    const headers = await page.locator('thead th').allInnerTexts()
    expect(headers.some(h => h.includes('Validator'))).toBe(true)
  })

  test('inflation commission column present', async ({ page }) => {
    const headers = await page.locator('thead th').allInnerTexts()
    expect(headers.some(h => h.match(/infl/i))).toBe(true)
  })

  test('no error message', async ({ page }) => {
    await expect(page.getByText('Error fetching data')).not.toBeVisible()
  })
})

test.describe('Classic UI expert (/expert-old)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/expert-old')
    await waitForData(page)
  })

  test('table loads with rows', async ({ page }) => {
    await expect(page).toHaveURL('/expert-old')
    expect(await page.locator('tbody tr').count()).toBeGreaterThan(0)
  })

  test('expert has more columns than basic', async ({ page }) => {
    const expertCount = await page.locator('thead th').count()
    await page.goto('/old')
    await waitForData(page)
    const basicCount = await page.locator('thead th').count()
    expect(expertCount).toBeGreaterThanOrEqual(basicCount)
  })
})

test.describe('Classic UI navigation link', () => {
  test('Classic UI link visible in nav on / and navigates to /old', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[class*="navigation"]', { timeout: 15000 })
    const link = page.locator('[class*="navigation"]').getByRole('link', { name: 'Classic UI' })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL('/old')
  })

  test('Classic UI link navigates to /expert-old from /expert-', async ({ page }) => {
    await page.goto('/expert-')
    await page.waitForSelector('[class*="navigation"]', { timeout: 15000 })
    const link = page.locator('[class*="navigation"]').getByRole('link', { name: 'Classic UI' })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL('/expert-old')
  })
})
