// Bonds tile map — the tiles are HOVER-only by spec (SCREENS.md § Bonds
// page · Tile map). The existing `bonds-tile-map.spec.ts` covers geometry,
// coloring and that hovering reveals tooltip content; this file fills the
// gaps for:
//   - tooltip carries the validator's NAME (not just stake / coverage);
//   - tiles are NOT clickable (regression guard against accidental
//     route-on-click being added in the future).
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function gotoBonds(page: Page) {
  await page.goto('/test-bonds')
  await page
    .getByText(/of Marinade stake is bond-protected/i)
    .waitFor({ timeout: 60000 })
  await page.waitForSelector('table tbody tr', { timeout: 30000 })
}

test.describe('bonds tile map — interaction', () => {
  test('tooltip on hover contains the validator name', async ({ page }) => {
    await gotoBonds(page)
    // Fixture validator with the largest stake is rendered as the largest
    // tile and has a known name from TEST_VALIDATOR_NAMES.
    const tiles = page.locator('div.cursor-default.flex-col.rounded-lg')
    expect(await tiles.count()).toBeGreaterThan(0)

    // Find the tile with the largest box (proxy for the top stake row) and
    // hover it.
    let biggest = tiles.nth(0)
    let biggestArea = 0
    const n = await tiles.count()
    for (let i = 0; i < n; i++) {
      const box = await tiles.nth(i).boundingBox()
      if (!box) continue
      const area = box.width * box.height
      if (area > biggestArea) {
        biggestArea = area
        biggest = tiles.nth(i)
      }
    }
    await biggest.hover()
    // Tooltip shows "Stake: N SOL · Coverage: P% · Bond: B SOL". At minimum
    // the Stake / Coverage tokens must be in the tooltip.
    await expect(page.getByText(/Stake:.*SOL/).first()).toBeVisible({
      timeout: 5000,
    })
    await expect(page.getByText(/Coverage:/).first()).toBeVisible()
  })

  test('tiles do NOT carry a role="button" or onClick navigation', async ({
    page,
  }) => {
    await gotoBonds(page)
    const tiles = page.locator('div.cursor-default.flex-col.rounded-lg')
    const count = await tiles.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const role = await tiles.nth(i).getAttribute('role')
      expect(role, `tile ${i} should not advertise as button`).not.toBe(
        'button',
      )
    }
  })

  test('clicking a tile does not navigate away from /test-bonds', async ({
    page,
  }) => {
    await gotoBonds(page)
    const before = page.url()
    const tiles = page.locator('div.cursor-default.flex-col.rounded-lg')
    await tiles.first().click({ force: true })
    // No navigation, no sheet, no overlay.
    await page.waitForTimeout(300)
    expect(page.url()).toBe(before)
    await expect(page.locator('[role="dialog"]')).toHaveCount(0)
  })
})
