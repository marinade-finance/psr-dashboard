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
  // truncated vote account. The responsive variant renders BOTH a desktop
  // and a mobile node and toggles them with CSS `hidden`. We pull every
  // font-mono node, then filter to the ones that are actually visible.
  const cells = scope.locator('.font-mono')
  const n = await cells.count()
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const node = cells.nth(i)
    const visible = await node.isVisible().catch(() => false)
    if (!visible) continue
    const t = (await node.innerText()).trim()
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
    test.setTimeout(20_000)
    await page.goto('/test-')
    await rowsLoaded(page)
    const row = page.locator('tbody tr[role="button"]').first()
    const fullVote = await row.getAttribute('data-vote-account')
    expect(fullVote).toBeTruthy()

    // First identity cell on the SAM table.
    const idCell = row.locator('td').nth(1)
    await idCell.hover()

    // The full vote account should surface via title attribute or a Radix
    // tooltip (role="tooltip"). At least one must be present.
    let surfaced = false
    try {
      const tooltipText = await page
        .getByRole('tooltip')
        .first()
        .textContent({ timeout: 1500 })
      if (tooltipText && fullVote && tooltipText.includes(fullVote)) {
        surfaced = true
      }
    } catch {
      /* no tooltip rendered */
    }
    const titleAttr = await idCell
      .locator('[title]')
      .first()
      .getAttribute('title')
      .catch(() => null)
    if (titleAttr && fullVote && titleAttr.includes(fullVote)) {
      surfaced = true
    }
    expect(
      surfaced,
      'hover should reveal the full vote account (tooltip or title attr)',
    ).toBe(true)
  })
})

test.describe('ValidatorIdentity — consistency across pages', () => {
  test('SAM, Bonds and Events tables all use the same chars-left/chars-right truncation shape', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })

    async function segmentLengths(url: string, selector: string) {
      await page.goto(url)
      await page.waitForSelector(selector, { timeout: 30000 })
      const truncs = await readVoteCells(page.locator(selector).first())
      expect(truncs.length, `${url} should expose truncated vote accounts`).toBeGreaterThan(0)
      return truncs.map(t => {
        const [l, r] = t.split('…')
        return { left: l.length, right: r.length }
      })
    }

    const sam = await segmentLengths('/test-', 'tbody')
    const bonds = await segmentLengths('/test-bonds', 'table tbody')
    const events = await segmentLengths('/test-protected-events', 'table tbody')

    // Every page must use the SAME (left, right) shape across all rows on
    // that page AND the same shape between pages.
    const allShapes = new Set(
      [...sam, ...bonds, ...events].map(s => `${s.left}/${s.right}`),
    )
    expect(
      allShapes.size,
      `expected one consistent truncation shape; got ${[...allShapes].join(', ')}`,
    ).toBe(1)
  })
})
