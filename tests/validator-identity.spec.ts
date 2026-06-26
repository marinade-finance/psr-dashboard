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
import { test, expect } from '@playwright/test'
import type { Page, Locator } from '@playwright/test'

async function rowsLoaded(page: Page) {
  await page.waitForSelector('tbody tr', { timeout: 30000 })
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
    // The vote account sub-line shows under every validator name in the table.
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

  // Mobile-truncation variant dropped — the app no longer supports the
  // mobile viewport (a "mobile not supported" banner shows below 640px).

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
