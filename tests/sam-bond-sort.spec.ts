// SAM table sort correctness — beyond the existing ↑ / ↓ indicator-flip
// tests, this spec asserts that clicking Bond and Stake/Δ headers actually
// reorders the visible rows. Uses the deterministic /test- route so the
// underlying values are known.
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function gotoSam(page: Page) {
  await page.goto('/test-')
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  // Default view is compact, which hides the stake-delta numeric text in
  // favour of arrow icons. Switch to detailed so column-text sort assertions
  // can read both the active stake AND the delta.
  const toggle = page.getByRole('button', { name: 'Switch to detailed view' })
  if (await toggle.isVisible().catch(() => false)) await toggle.click()
}

function parseNum(s: string): number {
  // First numeric token in the cell text — handles "(12ep)" suffix etc.
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

// The Stake header sorts by target stake, which is not a displayed column
// value (the cell shows active stake + signed delta). So Stake-sort tests
// detect a reorder via the validator-name order rather than column values.
async function readValidatorOrder(page: Page) {
  const cells = page.locator(
    'tbody tr:not([data-divider]):not([data-ghost="true"]) td:nth-child(2)',
  )
  const n = await cells.count()
  const names: string[] = []
  for (let i = 0; i < n; i++) {
    names.push((await cells.nth(i).innerText()).trim())
  }
  return names
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
    // Bond cell shows "<tier> <balance> SOL …" — the bond *balance* is the
    // numeric the sort uses (see selectBondSize in services).
    const vals = await readColumn(page, 4)
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
    // Header has a HelpTip whose onClick stopPropagations — click on the
    // text area at the left of the cell so the TableHead's handleSort fires.
    await h.click({ position: { x: 10, y: 10 } })
    const firstOrder = (await readColumn(page, 4)).join(',')
    const firstIndicator = (await h.innerText()).includes('↑') ? '↑' : '↓'
    await h.click({ position: { x: 10, y: 10 } })
    const secondOrder = (await readColumn(page, 4)).join(',')
    const secondIndicator = (await h.innerText()).includes('↑') ? '↑' : '↓'
    // Toggle proof: order AND indicator both flip.
    expect(firstOrder).not.toBe(secondOrder)
    expect(firstIndicator).not.toBe(secondIndicator)
  })
})

test.describe('SAM table — Stake / Next change column sort', () => {
  /**
   * Clicks the "Stake / Next change" header on a loaded SAM table.
   * Assumes the table has rendered rows (gotoSam waits for them).
   * Verifies the header then shows a ↑/↓ sort indicator.
   */
  test('clicking Stake header sets a sort indicator', async ({ page }) => {
    await gotoSam(page)
    const h = page
      .locator('thead th')
      .filter({ hasText: /Stake \/ Next/ })
      .first()
    await h.click({ position: { x: 10, y: 10 } })
    await expect(h).toContainText(/[↑↓]/, { timeout: 5000 })
  })

  /**
   * Clicks the "Stake / Next change" header twice on a loaded SAM table.
   * Assumes the table has rendered rows and the column toggles direction.
   * Verifies both the row order and the indicator direction differ between
   * the two clicks (sort flips, not just re-applies).
   */
  test('Stake sort indicator and row order flip together on repeated clicks', async ({
    page,
  }) => {
    await gotoSam(page)
    const h = page
      .locator('thead th')
      .filter({ hasText: /Stake \/ Next/ })
      .first()
    await h.click({ position: { x: 10, y: 10 } })
    const firstOrder = (await readValidatorOrder(page)).join(',')
    const firstIndicator = (await h.innerText()).includes('↑') ? '↑' : '↓'
    await h.click({ position: { x: 10, y: 10 } })
    const secondOrder = (await readValidatorOrder(page)).join(',')
    const secondIndicator = (await h.innerText()).includes('↑') ? '↑' : '↓'
    expect(firstOrder).not.toBe(secondOrder)
    expect(firstIndicator).not.toBe(secondIndicator)
  })
})

test.describe('SAM table — sort choice persists across reload', () => {
  /**
   * Selects Max APY and flips it to ascending, then reloads the page.
   * Assumes the sort choice is persisted to localStorage.
   * Verifies Max APY is still the active ascending sort after reload.
   */
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
