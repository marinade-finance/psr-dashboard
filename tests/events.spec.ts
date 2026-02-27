// Protected Events page tests: data loading, metrics (3 basic + values),
// validator filter (reduces rows, shows/hides filtered metrics, no-match),
// epoch filter (narrows range, single-epoch), both filters combined,
// badges, funder column, no Bidding reason, expert metric.
import { test, expect } from './fixtures/mock-api'

test.describe('Events basic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/protected-events')
    await page.waitForSelector('[class*="metricWrap"]', { timeout: 30000 })
  })

  test('table loads at /protected-events', async ({ page }) => {
    await expect(page).toHaveURL('/protected-events')
    await expect(page.locator('table')).toBeVisible()
  })

  test('all 3 metrics visible with values', async ({ page }) => {
    for (const label of ['Total events', 'Total amount', 'Last Settled Amount']) {
      await expect(page.locator('.metric').filter({ hasText: label })).toBeVisible()
    }
    const text = await page.locator('[class*="metricWrap"]').innerText()
    expect(text).toMatch(/\d/)
  })

  test('Funder column shows Marinade or Validator', async ({ page }) => {
    const cells = page.locator('table tbody tr td:nth-child(6)')
    const n = await cells.count()
    expect(n).toBeGreaterThan(0)
    let found = false
    for (let i = 0; i < Math.min(n, 10); i++) {
      const t = await cells.nth(i).innerText()
      if (t.includes('Marinade') || t.includes('Validator')) { found = true; break }
    }
    expect(found).toBe(true)
  })

  test('no rows with Bidding reason', async ({ page }) => {
    const reasons = await page.locator('table tbody tr td:nth-child(5)').allInnerTexts()
    for (const r of reasons) expect(r).not.toContain('Bidding')
  })

  test('badges visible when present', async ({ page }) => {
    const n = await page.locator('[class*="badge"]').count()
    if (n > 0) await expect(page.locator('[class*="badge"]').first()).toBeVisible()
  })
})

test.describe('Events validator filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/protected-events')
    await page.waitForSelector('[class*="metricWrap"]', { timeout: 30000 })
  })

  test('filter reduces rows and shows filtered metrics', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()
    const total = await rows.count()

    const first = await page.locator('table tbody tr:first-child td:nth-child(2)').innerText()
    const prefix = first.slice(0, 8)
    const input = page.locator('fieldset').filter({ hasText: 'Validator filter' }).locator('input')
    await input.fill(prefix)
    await page.waitForTimeout(300)

    const filtered = await rows.count()
    expect(filtered).toBeLessThanOrEqual(total)
    expect(filtered).toBeGreaterThan(0)

    // filtered metrics appear
    await expect(
      page.locator('.metric').filter({ hasText: 'Filtered Events' }),
    ).toBeVisible()
    await expect(
      page.locator('.metric').filter({ hasText: 'Filtered Amount' }),
    ).toBeVisible()
  })

  test('clearing filter hides filtered metrics', async ({ page }) => {
    const first = await page.locator('table tbody tr:first-child td:nth-child(2)').innerText()
    const input = page.locator('fieldset').filter({ hasText: 'Validator filter' }).locator('input')
    await input.fill(first.slice(0, 8))
    await page.waitForTimeout(300)
    await input.fill('')
    await page.waitForTimeout(300)

    await expect(
      page.locator('.metric').filter({ hasText: 'Filtered Events' }),
    ).not.toBeVisible()
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
    await page.waitForSelector('[class*="metricWrap"]', { timeout: 30000 })
  })

  test('narrowing epoch range reduces rows', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()
    const total = await rows.count()

    const epochInputs = page.locator('fieldset').filter({ hasText: 'Epoch filter' }).locator('input')
    const max = parseInt(await epochInputs.nth(1).inputValue())
    await epochInputs.nth(0).fill(max.toString())
    await page.waitForTimeout(300)

    expect(await rows.count()).toBeLessThanOrEqual(total)
  })

  test('single-epoch range (min = max)', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()

    const epochInputs = page.locator('fieldset').filter({ hasText: 'Epoch filter' }).locator('input')
    const max = await epochInputs.nth(1).inputValue()
    await epochInputs.nth(0).fill(max)
    await epochInputs.nth(1).fill(max)
    await page.waitForTimeout(300)

    // should have some rows for the latest epoch
    expect(await rows.count()).toBeGreaterThan(0)
  })
})

test.describe('Events combined filters', () => {
  test('validator + epoch filter together', async ({ page }) => {
    await page.goto('/protected-events')
    await page.waitForSelector('[class*="metricWrap"]', { timeout: 30000 })
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()
    const total = await rows.count()

    // set epoch to max only
    const epochInputs = page.locator('fieldset').filter({ hasText: 'Epoch filter' }).locator('input')
    const max = await epochInputs.nth(1).inputValue()
    await epochInputs.nth(0).fill(max)
    await page.waitForTimeout(300)

    // also set validator prefix
    const first = await page.locator('table tbody tr:first-child td:nth-child(2)').innerText()
    const vInput = page.locator('fieldset').filter({ hasText: 'Validator filter' }).locator('input')
    await vInput.fill(first.slice(0, 8))
    await page.waitForTimeout(300)

    expect(await rows.count()).toBeLessThanOrEqual(total)
  })
})

test('expert-protected-events has Last Epoch Bids metric', async ({ page }) => {
  await page.goto('/expert-protected-events')
  await page.waitForSelector('[class*="metricWrap"]', { timeout: 50000 })
  await expect(
    page.locator('.metric').filter({ hasText: 'Last Epoch Bids' }),
  ).toBeVisible()
})
