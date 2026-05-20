// Cross-link discovery: every Guide / Guide ↗ link on a detail-panel
// breakdown card must point to /docs with an anchor fragment. The existing
// docs-deep.spec.ts covers anchor scrolling once you're already at
// /docs#xxx, but nothing ties the source card → target URL together.
//
// The Guide ↗ link opens in a new tab (target=_blank), so we can't follow
// it — we assert the href shape instead. Basic mode only — expert routes
// are not tested (see CLAUDE.md).
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const SHEET = '[role="dialog"]'
const V01 = 'FiXtUREv1111111111111111111111111111111111aa'

async function openSheet(page: Page) {
  await page.goto(`/test-?v=${V01}`)
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
}

test.describe('docs cross-links — guide link hrefs from detail sheet', () => {
  test('Overview / APY-composition card Guide ↗ points to /docs#...', async ({
    page,
  }) => {
    await openSheet(page)
    // Every CalcCard renders a "Guide ↗" link with href docsPath + anchor.
    const links = page.locator(SHEET).locator('a', { hasText: /Guide ↗/i })
    const count = await links.count()
    expect(
      count,
      'detail sheet should expose at least one Guide ↗ link',
    ).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href')
      expect(href, `link #${i} href`).toMatch(/^\/docs#[a-z0-9-]+$/)
    }
  })

  test('Guide ↗ links open in a new tab (target=_blank)', async ({ page }) => {
    await openSheet(page)
    const link = page
      .locator(SHEET)
      .locator('a', { hasText: /Guide ↗/i })
      .first()
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', /noopener/)
  })

  test('Bidding tab also surfaces a Guide ↗ link to /docs#bidding', async ({
    page,
  }) => {
    await openSheet(page)
    await page
      .locator(SHEET)
      .getByRole('button', { name: 'Bidding', exact: true })
      .click()
    // Overview tab keeps its DOM mounted (just `hidden`), so .first() would
    // hit the overview's Stake-card Guide link. Filter by visibility.
    const link = page
      .locator(SHEET)
      .locator('a:visible', { hasText: /Guide ↗/i })
      .first()
    const href = await link.getAttribute('href')
    expect(href).toBe('/docs#bidding')
  })

  test('Bond tab Guide ↗ link points to /docs#bond', async ({ page }) => {
    await openSheet(page)
    // Overview's Bond card title is ALSO a button with name "Bond" — pick
    // the tab-strip button (first in DOM order).
    await page
      .locator(SHEET)
      .getByRole('button', { name: 'Bond', exact: true })
      .first()
      .click()
    const link = page
      .locator(SHEET)
      .locator('a:visible', { hasText: /Guide ↗/i })
      .first()
    const href = await link.getAttribute('href')
    expect(href).toBe('/docs#bond')
  })

  test('Payments tab Guide ↗ link points to /docs#payments', async ({
    page,
  }) => {
    await openSheet(page)
    await page
      .locator(SHEET)
      .getByRole('button', { name: 'Payments', exact: true })
      .first()
      .click()
    const link = page
      .locator(SHEET)
      .locator('a:visible', { hasText: /Guide ↗/i })
      .first()
    const href = await link.getAttribute('href')
    expect(href).toBe('/docs#payments')
  })

  test('Bid Penalty tab Guide ↗ link points to /docs#bid-penalty', async ({
    page,
  }) => {
    await openSheet(page)
    await page
      .locator(SHEET)
      .getByRole('button', { name: 'Bid Penalty', exact: true })
      .click()
    const link = page
      .locator(SHEET)
      .locator('a:visible', { hasText: /Guide ↗/i })
      .first()
    const href = await link.getAttribute('href')
    expect(href).toBe('/docs#bid-penalty')
  })
})
