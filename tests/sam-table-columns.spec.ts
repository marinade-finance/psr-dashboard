// SAM table column behaviour — sort defaults, sort toggles, rank-cell anatomy,
// next-step + bond + stake column contents, winning-set tint, penalty
// badges, horizontal scroll on narrow viewports.
//
// Uses the deterministic /test- route so we know which fixtures are present.
// These tests describe how the dashboard SHOULD work per SCREENS.md; failures
// are bugs or unwritten features, not flake.
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function gotoSam(page: Page) {
  await page.goto('/test-')
  await page.waitForSelector('tbody tr', { timeout: 30000 })
}

function stakeHeader(page: Page) {
  return page.locator('thead th').filter({ hasText: /Stake/ }).first()
}

// The Stake cell reads "X SOL (+Y SOL)" — current stake plus the signed gap to
// target. The sort key is the sum (= target). Parse both tokens (the gap uses a
// unicode minus −, so normalise it before parsing).
function parseStakeSum(s: string): number {
  const m = s.match(/[+\-−]?\s*[\d,]+(?:\.\d+)?/g)
  if (!m) return NaN
  const norm = (x: string) =>
    parseFloat(x.replace(/\s/g, '').replace('−', '-').replace(/,/g, ''))
  const current = norm(m[0])
  const gap = m.length > 1 ? norm(m[1]) : 0
  return current + gap
}

test.describe('SAM table — sort defaults', () => {
  test('default sort indicator on Stake is ↓ (descending)', async ({
    page,
  }) => {
    await gotoSam(page)
    const h = stakeHeader(page)
    await expect(h).toContainText('↓')
  })

  test('default Stake column values (current + gap) are descending', async ({
    page,
  }) => {
    await gotoSam(page)
    // Stake is the third visible column (#, Validator, Stake).
    const cells = page.locator('tbody tr:not([data-divider]) td:nth-child(3)')
    const n = await cells.count()
    const vals: number[] = []
    for (let i = 0; i < n; i++) {
      const v = parseStakeSum(await cells.nth(i).innerText())
      if (!isNaN(v)) vals.push(v)
    }
    expect(vals.length).toBeGreaterThan(1)
    // Rows split into above/below-cutoff segments (each sorted independently),
    // so allow at most one ascending step at the segment boundary.
    let breaks = 0
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] > vals[i - 1]) breaks++
    }
    expect(breaks).toBeLessThanOrEqual(1)
  })
})

test.describe('SAM table — sort toggles per column', () => {
  const SORTABLE = [
    { label: /^#/, expect: '#' },
    { label: /Validator/, expect: 'Validator' },
    { label: /Max APY/, expect: 'Max APY' },
    { label: /^Bond/, expect: 'Bond' },
    { label: /Stake/, expect: 'Stake' },
    { label: /Next Step/, expect: 'Next Step' },
  ]

  for (const col of SORTABLE) {
    test(`clicking "${col.expect}" header sets ↓ or ↑ indicator`, async ({
      page,
    }) => {
      await gotoSam(page)
      const h = page.locator('thead th').filter({ hasText: col.label }).first()
      await h.click()
      // After clicking we expect *some* indicator on this header.
      await expect(h).toContainText(/[↑↓]/, { timeout: 5000 })
    })

    test(`clicking "${col.expect}" header twice toggles direction`, async ({
      page,
    }) => {
      await gotoSam(page)
      const h = page.locator('thead th').filter({ hasText: col.label }).first()
      // Click at top-left to avoid any HelpTip button in the header (which
      // stops propagation and would swallow the sort click).
      await h.click({ position: { x: 10, y: 10 } })
      const after1 = (await h.innerText()).includes('↑') ? '↑' : '↓'
      const flipped = after1 === '↑' ? '↓' : '↑'
      await h.click({ position: { x: 10, y: 10 } })
      await expect(h).toContainText(flipped, { timeout: 5000 })
    })
  }
})

test.describe('SAM table — rank cell', () => {
  test('rank cell uses #N (positive) for in-set rows', async ({ page }) => {
    await gotoSam(page)
    // First in-set row should have a positive #N label.
    const firstRank = page
      .locator('tbody tr:not([data-divider]) td:nth-child(1)')
      .first()
    const txt = await firstRank.innerText()
    expect(txt).toMatch(/#\d+/)
    // No leading dash for in-set rows (rank is a plain positive #N).
    expect(txt.trim().startsWith('-')).toBe(false)
  })
})

test.describe('SAM table — bond column', () => {
  test('bond cell shows tier chip label (Healthy / Adequate / Watch / Critical)', async ({
    page,
  }) => {
    await gotoSam(page)
    // Bond is the fifth column (#, Validator, Stake, Max APY, Bond).
    const cells = page.locator('tbody tr:not([data-divider]) td:nth-child(5)')
    const n = await cells.count()
    const texts: string[] = []
    for (let i = 0; i < n; i++) texts.push(await cells.nth(i).innerText())
    expect(texts.some(t => /Healthy|Adequate|Watch|Critical/.test(t))).toBe(
      true,
    )
  })

  test('critical bond rows carry an "X epochs to liquidate" alert', async ({
    page,
  }) => {
    await gotoSam(page)
    // Bond is the fifth column (#, Validator, Stake, Max APY, Bond).
    const cells = page.locator('tbody tr:not([data-divider]) td:nth-child(5)')
    const n = await cells.count()
    let foundCritical = false
    for (let i = 0; i < n; i++) {
      const t = await cells.nth(i).innerText()
      if (/Critical/.test(t)) {
        foundCritical = true
        // Every critical bond cell surfaces the runway alert.
        expect(t).toMatch(/\d+\s+epochs?\s+to\s+liquidate/i)
      }
    }
    expect(foundCritical, 'expected a Critical bond row in the fixture').toBe(
      true,
    )
  })
})

test.describe('SAM table — stake column', () => {
  test('column shows a signed gap "(+/− SOL)" for at least one row', async ({
    page,
  }) => {
    await gotoSam(page)
    // Stake is the third column (#, Validator, Stake).
    const cells = page.locator('tbody tr:not([data-divider]) td:nth-child(3)')
    const n = await cells.count()
    let foundSigned = false
    for (let i = 0; i < n; i++) {
      const t = await cells.nth(i).innerText()
      if (/[+\-−]\s*\d/.test(t)) {
        foundSigned = true
        break
      }
    }
    expect(foundSigned, 'expected at least one signed gap in fixture').toBe(
      true,
    )
  })
})

test.describe('SAM table — winning set tint', () => {
  test('in-set rows do not carry the destructive tint class', async ({
    page,
  }) => {
    await gotoSam(page)
    // Use the first row (default sort is target stake DESC, so the top row is
    // the highest-target validator — necessarily in-set).
    const first = page.locator('tbody tr').first()
    const cls = (await first.getAttribute('class')) ?? ''
    // Out-of-set marker class — must NOT be on an in-set row.
    expect(cls).not.toMatch(/bg-destructive/)
  })

  test('at least one row carries the out-of-set destructive tint', async ({
    page,
  }) => {
    await gotoSam(page)
    const rows = page.locator('tbody tr')
    const n = await rows.count()
    let found = false
    for (let i = 0; i < n; i++) {
      const cls = (await rows.nth(i).getAttribute('class')) ?? ''
      if (/bg-destructive/.test(cls)) {
        found = true
        break
      }
    }
    expect(
      found,
      'expected at least one out-of-set row with destructive tint',
    ).toBe(true)
  })
})

test.describe('SAM table — horizontal scroll on narrow viewports', () => {
  test('table is inside an x-scrollable container at 700px width', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 700, height: 900 })
    await gotoSam(page)
    // The wrapper carries overflow-x-auto and the inner table is wider than viewport.
    const wrap = page
      .locator('div.overflow-x-auto')
      .filter({ has: page.locator('table') })
      .first()
    await expect(wrap).toBeVisible()
    const scrollMetrics = await wrap.evaluate((el: HTMLElement) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }))
    expect(scrollMetrics.scrollWidth).toBeGreaterThan(scrollMetrics.clientWidth)
  })
})
