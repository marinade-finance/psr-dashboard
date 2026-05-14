// ValidatorIdentity — canonical "validator name + truncated vote account"
// cell used everywhere a validator is listed (SAM, Bonds, Events tables and
// the jump-search dropdown).
//
// Spec (per SCREENS.md):
//   - Every table that lists validators uses the same identity cell.
//   - Vote account is truncated `xxxx…xxxx` (4 left + 4 right) on mobile,
//     `xxxxxxxx…xxxxxxxx` (8 left + 8 right) on `sm+` viewports when
//     responsive=true.
//   - Hovering reveals the full vote account in a tooltip (title attribute
//     or Radix tooltip).
//
// The truncation should be CONSISTENT — same chars-left, same chars-right,
// across every place the identity cell appears.
import { test, expect } from './fixtures/mock-api'
import type { Page, Locator } from '@playwright/test'

async function rowsLoaded(page: Page) {
  await page.waitForSelector('tbody tr', { timeout: 30000 })
}

function truncated8(va: string) {
  return `${va.slice(0, 8)}…${va.slice(-8)}`
}

async function readVoteCells(scope: Locator): Promise<string[]> {
  // Each ValidatorIdentity renders an internal "font-mono" element for the
  // truncated vote account. We pull all of them inside `scope`.
  const cells = scope.locator('.font-mono')
  const n = await cells.count()
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const t = (await cells.nth(i).innerText()).trim()
    if (t.includes('…')) out.push(t)
  }
  return out
}

test.describe('ValidatorIdentity — truncation format', () => {
  test('SAM rows truncate vote account as 8…8 on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/test-')
    await rowsLoaded(page)
    const tbody = page.locator('tbody').first()
    const truncs = await readVoteCells(tbody)
    expect(truncs.length).toBeGreaterThan(0)
    // Every truncated string follows the LEFT…RIGHT pattern with consistent
    // segment lengths (8 chars on each side at desktop width).
    for (const t of truncs) {
      const [left, right] = t.split('…')
      expect(left.length, `left segment of "${t}"`).toBe(8)
      expect(right.length, `right segment of "${t}"`).toBe(8)
    }
  })

  test('SAM rows truncate vote account as 4…4 on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/test-')
    await rowsLoaded(page)
    const tbody = page.locator('tbody').first()
    const truncs = await readVoteCells(tbody)
    expect(truncs.length).toBeGreaterThan(0)
    for (const t of truncs) {
      const [left, right] = t.split('…')
      expect(left.length, `left segment of "${t}"`).toBe(4)
      expect(right.length, `right segment of "${t}"`).toBe(4)
    }
  })

  test('Bonds page rows use the same ValidatorIdentity truncation', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/test-bonds')
    await page.waitForSelector('table', { timeout: 30000 })
    const tbody = page.locator('table tbody').first()
    const truncs = await readVoteCells(tbody)
    expect(truncs.length).toBeGreaterThan(0)
    // All truncations consistent (each entry has a left + right segment).
    for (const t of truncs) {
      const parts = t.split('…')
      expect(parts.length).toBe(2)
      expect(parts[0].length).toBeGreaterThanOrEqual(4)
      expect(parts[1].length).toBeGreaterThanOrEqual(4)
    }
  })

  test('Events page rows use the same ValidatorIdentity truncation', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/test-protected-events')
    await page.waitForSelector('table', { timeout: 30000 })
    const tbody = page.locator('table tbody').first()
    const truncs = await readVoteCells(tbody)
    expect(truncs.length).toBeGreaterThan(0)
    for (const t of truncs) {
      const parts = t.split('…')
      expect(parts.length).toBe(2)
    }
  })
})

test.describe('ValidatorIdentity — full vote account on hover', () => {
  test('hovering an identity cell exposes the full vote account', async ({
    page,
  }) => {
    await page.goto('/test-')
    await rowsLoaded(page)
    // First identity cell on the SAM table.
    const idCell = page.locator('tbody tr td:nth-child(2)').first()
    await idCell.hover()
    // The full vote account should surface via title attribute or a Radix
    // tooltip (role="tooltip"). At least one must be present.
    const fullVote = await page
      .locator('tbody tr[role="button"]')
      .first()
      .getAttribute('data-vote-account')
    expect(fullVote).toBeTruthy()
    const tooltipText = await page
      .getByRole('tooltip')
      .first()
      .textContent()
      .catch(() => null)
    const titleAttr = await idCell.locator('[title]').first().getAttribute('title').catch(() => null)
    const surfaced =
      (tooltipText && fullVote && tooltipText.includes(fullVote)) ||
      (titleAttr && fullVote && titleAttr.includes(fullVote))
    expect(
      surfaced,
      'hover should reveal the full vote account (tooltip or title attr)',
    ).toBe(true)
  })
})

test.describe('ValidatorIdentity — consistency across pages', () => {
  test('a validator that appears on both SAM and Bonds has the same identity format', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })

    // Collect truncated vote accounts from SAM.
    await page.goto('/test-')
    await rowsLoaded(page)
    const samTruncs = new Set(await readVoteCells(page.locator('tbody').first()))

    // And from Bonds.
    await page.goto('/test-bonds')
    await page.waitForSelector('table', { timeout: 30000 })
    const bondsTruncs = await readVoteCells(
      page.locator('table tbody').first(),
    )

    // At least one vote account should appear on both pages, in the same
    // truncation format.
    const overlap = bondsTruncs.filter(t => samTruncs.has(t))
    expect(
      overlap.length,
      'expected at least one validator listed in both SAM and Bonds with identical truncation',
    ).toBeGreaterThan(0)
  })
})
