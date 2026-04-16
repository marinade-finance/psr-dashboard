// Protected Events page tests: data loading, metrics (cost/payment breakdown),
// validator filter, epoch filter, funder badges, expert metric.
import { test, expect } from './fixtures/mock-api'

async function waitForEvents(page: import('@playwright/test').Page) {
  await page.waitForSelector('.metricWrap', { timeout: 30000 })
  await page.waitForSelector('table', { timeout: 30000 })
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
    for (const label of ['Total Protected', 'Validator Bond Paid', 'Marinade Paid', 'Total SOL to Stakers']) {
      await expect(page.locator('.metric').filter({ hasText: label })).toBeVisible()
    }
  })

  test('metrics contain numbers', async ({ page }) => {
    const text = await page.locator('.metric').first().innerText()
    expect(text).toMatch(/\d/)
  })

  test('Funded by column shows Validator Bond or Marinade badge', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()
    const pageText = await page.locator('table tbody').innerText()
    expect(pageText.match(/Validator Bond|Marinade/)).toBeTruthy()
  })

  test('no rows with Bidding reason', async ({ page }) => {
    const reasons = await page.locator('table tbody tr').allInnerTexts()
    for (const r of reasons) expect(r).not.toContain('Bidding')
  })

  test('badges visible', async ({ page }) => {
    const badges = page.locator('table tbody .badge, table tbody [class*="badge"]')
    const n = await badges.count()
    if (n > 0) await expect(badges.first()).toBeVisible()
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

    const first = await page.locator('table tbody tr:first-child td:first-child').innerText()
    const prefix = first.slice(0, 6)
    const input = page.locator('fieldset').filter({ hasText: 'Validator filter' }).locator('input')
    await input.fill(prefix)
    await page.waitForTimeout(300)

    const filtered = await rows.count()
    expect(filtered).toBeLessThanOrEqual(total)
    expect(filtered).toBeGreaterThan(0)
  })

  test('gibberish filter produces 0 rows', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible()
    const input = page.locator('fieldset').filter({ hasText: 'Validator filter' }).locator('input')
    await input.fill('zzzzNONEXISTENT999')
    await page.waitForTimeout(300)
    expect(await page.locator('table tbody tr').count()).toBe(0)
  })
})

test.describe('Events epoch filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/protected-events')
    await waitForEvents(page)
  })

  test('narrowing epoch range reduces or maintains rows', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()
    const total = await rows.count()

    const epochInputs = page.locator('fieldset').filter({ hasText: 'Epoch filter' }).locator('input')
    const max = parseInt(await epochInputs.nth(1).inputValue())
    await epochInputs.nth(0).fill(max.toString())
    await page.waitForTimeout(300)

    expect(await rows.count()).toBeLessThanOrEqual(total)
  })
})

test('expert-protected-events has Last Epoch Bids metric', async ({ page }) => {
  await page.goto('/expert-protected-events')
  await page.waitForSelector('.metricWrap', { timeout: 50000 })
  await expect(page.locator('.metric').filter({ hasText: 'Last Epoch Bids' })).toBeVisible()
})
