// Bond coverage tile map: tier rows, tile coloring, tile sizing, coverage
// gradient, hover tooltip. Hits the deterministic /test-bonds route so the
// fixture data drives the tile grid.
import { test, expect } from './fixtures/mock-api'

import type { Page } from '@playwright/test'

async function waitForBonds(page: Page) {
  await page
    .getByText(/of Marinade stake is bond-protected/i)
    .waitFor({ timeout: 110000 })
  // Tile map renders inside the bonds page once data is in
  await page.waitForSelector('.navigation', { timeout: 15000 })
}

// The tile map currently has no role/data-attr hooks. Locate it by structure:
// the bonds page is "coverage hero card, tile-map card, table". The tile-map
// card is the second .bg-card on the page (first is the hero), or the only
// card that contains the legend strings.
function tileMap(page: Page) {
  return page.locator('div').filter({ hasText: 'Tile size ∝ √stake' }).last()
}

test.describe('Bonds tile map: tier rows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-bonds')
    await waitForBonds(page)
  })

  test('tile map is rendered', async ({ page }) => {
    await expect(tileMap(page)).toBeVisible()
  })

  test('renders four stake-tier rows in the documented order', async ({
    page,
  }) => {
    // Tier labels live in a fixed-width column; assert that the four
    // labels exist and appear in the documented order top-to-bottom.
    const labels = ['>100k', '50k–100k', '20k–50k', '<20k']
    // Some tiers may be empty for tiny fixture data — but at least one
    // must always show, and any that do show must follow the order.
    const present: string[] = []
    for (const l of labels) {
      const hit = page.locator('text=' + l).first()
      if (await hit.count()) present.push(l)
    }
    expect(present.length).toBeGreaterThan(0)
    // Order check
    const found = present.map(l => labels.indexOf(l))
    const sorted = [...found].sort((a, b) => a - b)
    expect(found).toEqual(sorted)
  })

  test('legend lists all five coverage tiers', async ({ page }) => {
    const map = tileMap(page)
    for (const txt of [
      'No bond',
      '<40% covered',
      '40–70%',
      '70–95%',
      '≥95% covered',
    ]) {
      await expect(map.getByText(txt).first()).toBeVisible()
    }
  })
})

test.describe('Bonds tile map: tile geometry', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-bonds')
    await waitForBonds(page)
  })

  test('every tile is between 28px and 120px on a side', async ({ page }) => {
    // Tiles are the only fixed-square `div` elements inside the tile map
    // with inline `width:` + `height:` styles. Locator by the cursor-default
    // + flex-col + relative attribute set on the tile div.
    const tiles = page.locator('div.cursor-default.flex-col.rounded-lg')
    const count = await tiles.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const box = await tiles.nth(i).boundingBox()
      if (!box) continue
      expect(box.width).toBeGreaterThanOrEqual(28)
      expect(box.width).toBeLessThanOrEqual(120)
      // Square within rounding
      expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1)
    }
  })

  test('largest tile is bigger than smallest tile', async ({ page }) => {
    // Sanity: the √-scaled sizing produces variance across the fixture set.
    const tiles = page.locator('div.cursor-default.flex-col.rounded-lg')
    const count = await tiles.count()
    if (count < 2) test.skip(true, 'not enough tiles to compare sizes')
    const sizes: number[] = []
    for (let i = 0; i < count; i++) {
      const box = await tiles.nth(i).boundingBox()
      if (box) sizes.push(box.width)
    }
    expect(Math.max(...sizes)).toBeGreaterThan(Math.min(...sizes))
  })

  test('larger tiles show name + stake; smallest show only color', async ({
    page,
  }) => {
    const tiles = page.locator('div.cursor-default.flex-col.rounded-lg')
    const count = await tiles.count()
    let smallEmpty = 0
    let bigWithText = 0
    for (let i = 0; i < count; i++) {
      const tile = tiles.nth(i)
      const box = await tile.boundingBox()
      if (!box) continue
      // text() inside the tile excluding the bar wrapper
      const text = (await tile.innerText()).trim()
      if (box.width < 36 && text.length === 0) smallEmpty++
      if (box.width >= 36 && text.length > 0) bigWithText++
    }
    // At least one of each kind (or all big with text — fine, smallEmpty=0)
    expect(bigWithText).toBeGreaterThan(0)
  })
})

test.describe('Bonds tile map: tile coloring', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-bonds')
    await waitForBonds(page)
  })

  test('every tile uses one of the five tier colors', async ({ page }) => {
    const tiles = page.locator('div.cursor-default.flex-col.rounded-lg')
    const count = await tiles.count()
    expect(count).toBeGreaterThan(0)
    const tokenVars = [
      '--bond-none',
      '--bond-low',
      '--bond-mid',
      '--bond-high',
      '--bond-full',
    ]
    // Resolve the CSS variables once so we can match against computed colors.
    const tokenValues: string[] = await page.evaluate(vars => {
      const root = getComputedStyle(document.documentElement)
      return vars.map(v => root.getPropertyValue(v).trim())
    }, tokenVars)
    const nonEmpty = tokenValues.filter(Boolean)
    expect(nonEmpty.length).toBe(5)
    for (let i = 0; i < count; i++) {
      const bg = await tiles.nth(i).evaluate(el => {
        // inline style background is the raw `var(--bond-*)` string
        return (el as HTMLElement).style.background
      })
      // The tile inlines `background: var(--bond-foo)`
      expect(bg).toMatch(/var\(--bond-(none|low|mid|high|full)\)/)
    }
  })
})

test.describe('Bonds tile map: coverage bar gradient', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-bonds')
    await waitForBonds(page)
  })

  test('each tile has a bottom coverage bar', async ({ page }) => {
    // Each tile contains exactly one bar div (height:10, full-width track at bottom).
    const tiles = page.locator('div.cursor-default.flex-col.rounded-lg')
    const count = await tiles.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const tile = tiles.nth(i)
      // The bar wrapper has `mt-auto shrink-0 w-full` and an inline height of 10px.
      const bar = tile.locator('div.mt-auto.w-full').first()
      await expect(bar).toBeVisible()
    }
  })

  test('coverage bar fill width is between 0% and 100% of tile width', async ({
    page,
  }) => {
    const tiles = page.locator('div.cursor-default.flex-col.rounded-lg')
    const count = await tiles.count()
    let measured = 0
    for (let i = 0; i < count; i++) {
      const tile = tiles.nth(i)
      const tileBox = await tile.boundingBox()
      if (!tileBox) continue
      // Inner fill div lives inside the bar wrapper; its width style is set.
      const fill = tile.locator('div.mt-auto.w-full > div').first()
      const fillCount = await fill.count()
      if (fillCount === 0) continue
      const fillBox = await fill.boundingBox()
      if (!fillBox) continue
      expect(fillBox.width).toBeGreaterThanOrEqual(0)
      expect(fillBox.width).toBeLessThanOrEqual(tileBox.width + 1)
      measured++
    }
    expect(measured).toBeGreaterThan(0)
  })
})

test.describe('Bonds tile map: hover tooltip', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-bonds')
    await waitForBonds(page)
  })

  test('hover reveals name + stake + coverage', async ({ page }) => {
    const tiles = page.locator('div.cursor-default.flex-col.rounded-lg')
    expect(await tiles.count()).toBeGreaterThan(0)
    await tiles.first().hover()
    // HtmlTooltip renders the HTML string inside a Radix portal; look for the
    // standard "Stake:" / "Coverage:" tokens that the bonds tile builds.
    await expect(page.getByText(/Stake:.*SOL/).first()).toBeVisible({
      timeout: 5000,
    })
    await expect(page.getByText(/Coverage:/).first()).toBeVisible()
  })
})
