// SAM table sort correctness — beyond the ↑ / ↓ indicator-flip tests, this
// spec asserts that clicking the Bond and Stake headers actually reorders the
// visible rows, and that the chosen sort persists across reloads. Uses the
// deterministic /test- route so the underlying values are known.
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function gotoSam(page: Page) {
  await page.goto('/test-')
  await page.waitForSelector('tbody tr', { timeout: 30000 })
}

function parseNum(s: string): number {
  // First numeric token in the cell text — the Bond cell's leading balance,
  // ahead of any "X epochs to liquidate" alert on critical rows.
  const m = s.match(/-?[\d,]+(?:\.\d+)?/)
  if (!m) return NaN
  return parseFloat(m[0].replace(/,/g, ''))
}

async function readColumn(page: Page, nthChild: number) {
  const cells = page.locator(
    `tbody tr:not([data-divider]):not([data-ghost="true"]) td:nth-child(${nthChild})`,
  )
  const n = await cells.count()
  const vals: number[] = []
  for (let i = 0; i < n; i++) {
    const v = parseNum(await cells.nth(i).innerText())
    if (!isNaN(v)) vals.push(v)
  }
  return vals
}

// The Stake cell reads "X SOL (+Y SOL)": current stake plus the signed gap to
// target. The Stake header sorts by the SUM (current + gap = target), so the
// monotonicity check needs that sum, not either token alone. The gap uses a
// unicode minus −, so normalise it before parsing.
async function readStakeSortValues(page: Page) {
  const cells = page.locator(
    'tbody tr:not([data-divider]):not([data-ghost="true"]) td:nth-child(3)',
  )
  const n = await cells.count()
  const norm = (x: string) =>
    parseFloat(x.replace(/\s/g, '').replace('−', '-').replace(/,/g, ''))
  const vals: number[] = []
  for (let i = 0; i < n; i++) {
    const text = await cells.nth(i).innerText()
    const matches = text.match(/[+\-−]?\s*[\d,]+(?:\.\d+)?/g)
    if (!matches) continue
    const current = norm(matches[0])
    const gap = matches.length > 1 ? norm(matches[1]) : 0
    if (!isNaN(current)) vals.push(current + gap)
  }
  return vals
}

// The SAM table renders two segments by default: above-cutoff (winners +
// blocked-but-high-APY) and below-cutoff. Sort applies to each segment
// independently, so the overall value list has at most ONE direction break
// at the boundary. The helpers accept that.
function isMonotonic(vals: number[], dir: 'asc' | 'desc'): boolean {
  let breaks = 0
  for (let i = 1; i < vals.length; i++) {
    const ok = dir === 'asc' ? vals[i] >= vals[i - 1] : vals[i] <= vals[i - 1]
    if (!ok) {
      breaks++
      if (breaks > 1) return false
    }
  }
  return true
}
const isSortedAsc = (v: number[]) => isMonotonic(v, 'asc')
const isSortedDesc = (v: number[]) => isMonotonic(v, 'desc')

test.describe('SAM table — Bond column sort', () => {
  test('clicking Bond header reorders rows by bond balance', async ({
    page,
  }) => {
    await gotoSam(page)
    const h = page.locator('thead th').filter({ hasText: /^Bond/ }).first()
    // Header has a HelpTip whose onClick stopPropagations — click on the
    // text area at the left of the cell so the TableHead's handleSort fires.
    await h.click({ position: { x: 10, y: 10 } })
    // Bond is the 5th column (#, Validator, Stake, Max APY, Bond); the bond
    // *balance* is the leading numeric the sort uses (see selectBondSize).
    const vals = await readColumn(page, 5)
    expect(vals.length, 'need ≥2 bond rows to test ordering').toBeGreaterThan(1)
    const sorted = isSortedAsc(vals) || isSortedDesc(vals)
    expect(
      sorted,
      `Bond column should be monotonically sorted; got ${JSON.stringify(vals)}`,
    ).toBe(true)
  })

  test('Bond column sort toggles between asc and desc on repeated clicks', async ({
    page,
  }) => {
    await gotoSam(page)
    const h = page.locator('thead th').filter({ hasText: /^Bond/ }).first()
    await h.click({ position: { x: 10, y: 10 } })
    const firstOrder = (await readColumn(page, 5)).join(',')
    const firstIndicator = (await h.innerText()).includes('↑') ? '↑' : '↓'
    await h.click({ position: { x: 10, y: 10 } })
    const secondOrder = (await readColumn(page, 5)).join(',')
    const secondIndicator = (await h.innerText()).includes('↑') ? '↑' : '↓'
    // Toggle proof: order AND indicator both flip.
    expect(firstOrder).not.toBe(secondOrder)
    expect(firstIndicator).not.toBe(secondIndicator)
  })
})

test.describe('SAM table — Stake column sort', () => {
  test('clicking Stake header reorders rows by stake (current + gap)', async ({
    page,
  }) => {
    await gotoSam(page)
    const h = page.locator('thead th').filter({ hasText: /Stake/ }).first()
    await h.click({ position: { x: 10, y: 10 } })
    const vals = await readStakeSortValues(page)
    expect(vals.length).toBeGreaterThan(1)
    const sorted = isSortedAsc(vals) || isSortedDesc(vals)
    expect(sorted).toBe(true)
  })

  test('Stake sort indicator and row order flip together on repeated clicks', async ({
    page,
  }) => {
    await gotoSam(page)
    const h = page.locator('thead th').filter({ hasText: /Stake/ }).first()
    await h.click({ position: { x: 10, y: 10 } })
    const firstOrder = (await readStakeSortValues(page)).join(',')
    const firstIndicator = (await h.innerText()).includes('↑') ? '↑' : '↓'
    await h.click({ position: { x: 10, y: 10 } })
    const secondOrder = (await readStakeSortValues(page)).join(',')
    const secondIndicator = (await h.innerText()).includes('↑') ? '↑' : '↓'
    expect(firstOrder).not.toBe(secondOrder)
    expect(firstIndicator).not.toBe(secondIndicator)
  })
})

test.describe('SAM table — sort choice persists across reload', () => {
  test('a chosen sort survives a page reload (sticky via localStorage)', async ({
    page,
  }) => {
    await gotoSam(page)
    // Select Max APY and flip it to ASC (two clicks: desc then asc).
    const apyH = page
      .locator('thead th')
      .filter({ hasText: /Max APY/ })
      .first()
    await apyH.click({ position: { x: 10, y: 10 } })
    await apyH.click({ position: { x: 10, y: 10 } })
    await expect(apyH).toContainText('↑')
    // Reload — the choice is persisted, so Max APY ASC should still be active.
    await page.reload()
    await page.waitForSelector('tbody tr', { timeout: 30000 })
    const reloaded = page
      .locator('thead th')
      .filter({ hasText: /Max APY/ })
      .first()
    await expect(reloaded).toContainText('↑')
  })
})
