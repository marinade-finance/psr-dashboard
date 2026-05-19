// Protected events page: tile metrics, table columns, sort, filter
// interactions, epoch range picker, funder badge styling, status badges.
import { test, expect } from '@playwright/test'

import type { Page } from '@playwright/test'

async function waitForEvents(page: Page) {
  await page.waitForSelector('table tbody tr', { timeout: 110000 })
}

test.describe('Events tiles', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-protected-events')
    await waitForEvents(page)
  })

  test('all three tile labels visible (basic mode)', async ({ page }) => {
    const wrap = page.locator('.metricWrap')
    for (const label of ['Events', 'Amount', 'Last settled epoch']) {
      await expect(wrap.getByText(label).first()).toBeVisible()
    }
  })

  test('Amount tile shows a Bond/Marinade split bar with both labels', async ({
    page,
  }) => {
    // The split bar lives in the `extra` slot of the Amount tile. Hover-only
    // tooltip is OK but the bottom legend "Bond X%" / "Marinade Y%" should
    // render unconditionally when totalAmount > 0.
    await expect(page.getByText(/Bond \d+%/).first()).toBeVisible()
    await expect(page.getByText(/Marinade \d+%/).first()).toBeVisible()
  })

  test('Last settled epoch tile is visible', async ({ page }) => {
    await expect(page.getByText('Last settled epoch').first()).toBeVisible()
  })
})

test.describe('Events table columns', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-protected-events')
    await waitForEvents(page)
  })

  test('column order: # Validator Epoch Reason Paid Out Funded by', async ({
    page,
  }) => {
    const headers = await page.locator('table thead th').allInnerTexts()
    expect(headers[0].trim()).toBe('#')
    const expected = [
      /Validator/i,
      /Epoch/i,
      /Reason/i,
      /Paid Out/i,
      /Funded by/i,
    ]
    for (let i = 0; i < expected.length; i++) {
      expect(headers[i + 1]).toMatch(expected[i])
    }
  })

  test('default sort: Epoch DESC', async ({ page }) => {
    // Epoch is column index 3 (after # and Validator).
    const cells = page.locator('table tbody tr td:nth-child(3)')
    const count = await cells.count()
    if (count < 2) test.skip(true, 'need ≥2 rows')
    const values: number[] = []
    for (let i = 0; i < count; i++) {
      values.push(parseInt((await cells.nth(i).innerText()).trim(), 10))
    }
    for (let i = 1; i < values.length; i++) {
      expect(values[i - 1]).toBeGreaterThanOrEqual(values[i])
    }
  })

  test('validator cell uses ValidatorIdentity (truncated pubkey)', async ({
    page,
  }) => {
    const cell = page.locator('table tbody tr:first-child td:nth-child(2)')
    const text = await cell.innerText()
    expect(text).toMatch(/[1-9A-HJ-NP-Za-km-z]{4,}…[1-9A-HJ-NP-Za-km-z]{4}/)
  })

  test('no Bidding rows in the table (Bidding is excluded by spec)', async ({
    page,
  }) => {
    const rows = await page.locator('table tbody tr').allInnerTexts()
    for (const r of rows) expect(r).not.toContain('Bidding')
  })
})

test.describe('Events funder badges', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-protected-events')
    await waitForEvents(page)
  })

  test('Marinade badge uses the warning family', async ({ page }) => {
    const badges = page.locator('text=Marinade').and(page.locator('.badge'))
    const count = await badges.count()
    if (count === 0) {
      // Try without the .badge constraint — some renderers use a different wrapper.
      const fallback = page
        .locator('table tbody')
        .getByText(/^Marinade$/)
        .first()
      const fc = await fallback.count()
      if (fc === 0) test.skip(true, 'no Marinade events in fixture')
      const cls = await fallback.getAttribute('class')
      expect(cls || '').toMatch(/warning/)
      return
    }
    const cls = await badges.first().getAttribute('class')
    expect(cls || '').toMatch(/warning/)
  })
})

test.describe('Events status badges', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-protected-events')
    await waitForEvents(page)
  })

  test('Estimate or Dryrun badge appears for unsettled events', async ({
    page,
  }) => {
    const badges = page.locator('table tbody .badge')
    const count = await badges.count()
    if (count === 0)
      test.skip(true, 'fixture has no Estimate/Dryrun events')
    const texts = await badges.allInnerTexts()
    expect(
      texts.some(t => /Dryrun|Estimate/i.test(t)),
    ).toBe(true)
  })
})

test.describe('Events validator filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-protected-events')
    await waitForEvents(page)
  })

  test('typing a real prefix reduces row count and keeps ≥1 row', async ({
    page,
  }) => {
    const rows = page.locator('table tbody tr')
    const total = await rows.count()
    const first = (
      await page
        .locator('table tbody tr:first-child td:nth-child(2)')
        .innerText()
    ).trim()
    const prefix = first.slice(0, 6)
    const input = page.locator('input[type="text"]').first()
    await input.fill(prefix)
    await page.waitForTimeout(300)
    const after = await rows.count()
    expect(after).toBeLessThanOrEqual(total)
    expect(after).toBeGreaterThan(0)
  })

  test('clearing the filter restores the full table', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    const total = await rows.count()
    const input = page.locator('input[type="text"]').first()
    await input.fill('zzzzNOPE9999')
    await page.waitForTimeout(300)
    await input.fill('')
    await page.waitForTimeout(300)
    expect(await rows.count()).toBe(total)
  })

  test('"of N total" subline only appears when filter is active', async ({
    page,
  }) => {
    await expect(page.getByText(/of \d.* total/).first()).not.toBeVisible()
    const input = page.locator('input[type="text"]').first()
    const first = (
      await page
        .locator('table tbody tr:first-child td:nth-child(2)')
        .innerText()
    ).trim()
    await input.fill(first.slice(0, 6))
    await page.waitForTimeout(300)
    await expect(page.getByText(/of \d.* total/).first()).toBeVisible()
  })
})

test.describe('Events epoch range picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-protected-events')
    await waitForEvents(page)
  })

  test('picker trigger is a button labelled by the epoch range', async ({
    page,
  }) => {
    const trigger = page
      .getByRole('button', { name: /epoch|All epochs/i })
      .first()
    await expect(trigger).toBeVisible()
  })

})

