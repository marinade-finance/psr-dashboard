// SAM table column behaviour — sort defaults, sort toggles, rank-cell anatomy,
// next-step + bond + stake-delta column contents, winning-set tint, penalty
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

function parseNum(s: string): number {
  return parseFloat(s.replace(/[^0-9.\-]/g, ''))
}

async function maxApyHeader(page: Page) {
  return page.locator('thead th').filter({ hasText: /Max APY/ }).first()
}

test.describe('SAM table — sort defaults', () => {
  test('default sort indicator on Max APY is ↓ (descending)', async ({
    page,
  }) => {
    await gotoSam(page)
    const h = await maxApyHeader(page)
    await expect(h).toContainText('↓')
  })

  test('default Max APY column values are descending', async ({ page }) => {
    await gotoSam(page)
    // Max APY is the third visible column (#, Validator, Max APY)
    const cells = page.locator('tbody tr:not([data-divider]) td:nth-child(3)')
    const n = await cells.count()
    const vals: number[] = []
    for (let i = 0; i < n; i++) {
      const t = await cells.nth(i).innerText()
      const v = parseNum(t)
      if (!isNaN(v)) vals.push(v)
    }
    expect(vals.length).toBeGreaterThan(1)
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeLessThanOrEqual(vals[i - 1])
    }
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
      await h.click()
      const after1 = (await h.innerText()).includes('↑') ? '↑' : '↓'
      const flipped = after1 === '↑' ? '↓' : '↑'
      await h.click()
      await expect(h).toContainText(flipped, { timeout: 5000 })
    })
  }
})

test.describe('SAM table — rank cell', () => {
  test('rank cell uses #N (positive) for in-set rows', async ({ page }) => {
    await gotoSam(page)
    // First in-set row should have a positive #N label.
    const firstRank = page.locator('tbody tr:not([data-divider]) td:nth-child(1)').first()
    const txt = await firstRank.innerText()
    expect(txt).toMatch(/#\d+/)
    // No leading dash for in-set rows (cutoff rank is positive above the line).
    expect(txt.trim().startsWith('-')).toBe(false)
  })

  test('rank cell uses -#N (negative) for at least one out-of-set row', async ({
    page,
  }) => {
    await gotoSam(page)
    const cells = page.locator('tbody tr:not([data-divider]) td:nth-child(1)')
    const n = await cells.count()
    let foundNegative = false
    for (let i = 0; i < n; i++) {
      const t = await cells.nth(i).innerText()
      if (/-#\d+/.test(t)) {
        foundNegative = true
        break
      }
    }
    expect(
      foundNegative,
      'expected at least one out-of-set row in fixture data',
    ).toBe(true)
  })

  test('Winning Set Cutoff divider sits between in-set and out-of-set rows', async ({
    page,
  }) => {
    await gotoSam(page)
    await expect(page.getByText(/Winning Set Cutoff|bid-eligible/i).first()).toBeVisible()
  })

  test('rank cell shows a tip-urgency icon for non-ghost rows', async ({
    page,
  }) => {
    await gotoSam(page)
    // The rank cell contains a tip icon — at least one row should render an
    // <svg> inside its rank cell (the icon).
    const iconInRank = page
      .locator('tbody tr td:nth-child(1) svg')
      .first()
    await expect(iconInRank).toBeVisible({ timeout: 5000 })
  })
})

test.describe('SAM table — bond column', () => {
  test('bond cell shows tier chip label (Healthy / Adequate / Watch / Critical)', async ({
    page,
  }) => {
    await gotoSam(page)
    const cells = page.locator('tbody tr:not([data-divider]) td:nth-child(4)')
    const n = await cells.count()
    const texts: string[] = []
    for (let i = 0; i < n; i++) texts.push(await cells.nth(i).innerText())
    expect(texts.some(t => /Healthy|Adequate|Watch|Critical/.test(t))).toBe(true)
  })

  test('bond cell renders runway as parenthesised "(Nep)" suffix', async ({
    page,
  }) => {
    await gotoSam(page)
    const cells = page.locator('tbody tr:not([data-divider]) td:nth-child(4)')
    const n = await cells.count()
    let anyParen = false
    for (let i = 0; i < n; i++) {
      const t = await cells.nth(i).innerText()
      if (/\(\s*\d+\s*ep\s*\)/i.test(t)) {
        anyParen = true
        break
      }
    }
    expect(anyParen, '"(Nep)" runway suffix should appear on bonded rows').toBe(
      true,
    )
  })
})

test.describe('SAM table — stake / next change column', () => {
  test('column contains a +/- prefix for at least one non-zero delta row', async ({
    page,
  }) => {
    await gotoSam(page)
    const cells = page.locator('tbody tr:not([data-divider]) td:nth-child(5)')
    const n = await cells.count()
    let foundSigned = false
    for (let i = 0; i < n; i++) {
      const t = await cells.nth(i).innerText()
      if (/[+-]\s*\d/.test(t)) {
        foundSigned = true
        break
      }
    }
    expect(foundSigned, 'expected at least one signed delta in fixture').toBe(
      true,
    )
  })
})

test.describe('SAM table — penalty badges', () => {
  test('at least one validator row exposes a penalty badge with aria-label', async ({
    page,
  }) => {
    await gotoSam(page)
    // Penalty badges are inline-flex spans with aria-label BidTooLow / Blacklist / BondRiskFee.
    const badge = page
      .locator('tbody [aria-label="BidTooLow"], tbody [aria-label="Blacklist"], tbody [aria-label="BondRiskFee"]')
      .first()
    await expect(badge).toBeVisible({ timeout: 5000 })
  })

  test('penalty badge group exposes SOL-per-kind in the title attribute', async ({
    page,
  }) => {
    await gotoSam(page)
    // The wrapping <span title="..."> carries the per-kind SOL breakdown.
    const wrap = page
      .locator('tbody span[title*="SOL"]')
      .first()
    await expect(wrap).toHaveCount(1, { timeout: 5000 })
    const title = await wrap.getAttribute('title')
    expect(title).toMatch(/(BidTooLow|Blacklist|BondRiskFee).*SOL/)
  })
})

test.describe('SAM table — winning set tint', () => {
  test('in-set rows do not carry the destructive tint class', async ({
    page,
  }) => {
    await gotoSam(page)
    // Use the first row (default sort is Max APY DESC, so #1 is in-set).
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
    expect(found, 'expected at least one out-of-set row with destructive tint').toBe(
      true,
    )
  })
})

test.describe('SAM table — horizontal scroll on narrow viewports', () => {
  test('table is inside an x-scrollable container at 700px width', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 700, height: 900 })
    await gotoSam(page)
    // The wrapper carries overflow-x-auto and the inner table is wider than viewport.
    const wrap = page.locator('div.overflow-x-auto').filter({ has: page.locator('table') }).first()
    await expect(wrap).toBeVisible()
    const scrollMetrics = await wrap.evaluate((el: HTMLElement) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }))
    expect(scrollMetrics.scrollWidth).toBeGreaterThan(scrollMetrics.clientWidth)
  })
})
