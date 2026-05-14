// HelpTip — hovering the `?` icon on key labels surfaces the canonical
// HELP_TEXT copy from src/services/help-text.ts. Uses the deterministic
// /test- route.
import { test, expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

const SHEET = '[role="dialog"]'

// Snippets pulled verbatim from src/services/help-text.ts — the test asserts
// the live tooltip's first sentence matches, so a copy change here doubles as
// a reminder to update both files.
const HELP_SNIPPETS = {
  winningApy: 'The lowest yearly return that still won stake this epoch',
  maxApy: 'The yearly return your validator promises stakers',
  bondHealth: 'How well your bond covers the upcoming bid costs',
  bondRunway: 'How many epochs your bond can keep paying your bid',
  bondCoverage: 'Whether your bond is fat enough',
} as const

async function gotoSam(page: Page) {
  await page.goto('/test-')
  await page.waitForSelector('tbody tr', { timeout: 30000 })
}

// Resolves the `?` HelpTip icon adjacent to a given label.
function helpTipNear(scope: Page | Locator, label: string | RegExp): Locator {
  return scope
    .locator(':text-matches("' + (typeof label === 'string' ? label : label.source) + '")')
    .locator('xpath=following::*[normalize-space(.)="?"][1]')
}

async function hoverAndAssertTooltip(
  page: Page,
  trigger: Locator,
  expected: string,
) {
  await trigger.scrollIntoViewIfNeeded()
  await trigger.hover()
  // Radix tooltips render in a portal with role="tooltip".
  const tooltip = page.getByRole('tooltip').first()
  await expect(tooltip).toBeVisible({ timeout: 5000 })
  await expect(tooltip).toContainText(expected)
}

test.describe('HelpTip — stats bar', () => {
  test('Winning APY tile help tip shows the canonical copy', async ({
    page,
  }) => {
    await gotoSam(page)
    // The HelpTip icon (a "?" span) lives inside the stat card next to the
    // label. We can target via the card text + the `?` button next to it.
    const card = page
      .locator('div')
      .filter({ hasText: /^Winning APY/ })
      .first()
    const tip = card.locator('text=?').first()
    await hoverAndAssertTooltip(page, tip, HELP_SNIPPETS.winningApy)
  })

  test('Re-delegation tile help tip is visible (Expert only)', async ({
    page,
  }) => {
    await page.goto('/expert-')
    // Live data may be slow; the test-route is Basic-only, so we keep this
    // on the real expert route but only assert the icon is present rather
    // than waiting for full data.
    const card = page
      .locator('div')
      .filter({ hasText: /^Re-delegation/ })
      .first()
    await expect(card).toBeVisible({ timeout: 30000 })
    const tip = card.locator('text=?').first()
    await expect(tip).toBeVisible()
  })
})

test.describe('HelpTip — column headers', () => {
  test('Max APY header tooltip shows the canonical copy', async ({ page }) => {
    await gotoSam(page)
    const header = page.locator('th').filter({ hasText: /Max APY/ }).first()
    const tip = header.locator('text=?').first()
    await hoverAndAssertTooltip(page, tip, HELP_SNIPPETS.maxApy)
  })

  test('Bond header tooltip exposes the bond-health copy', async ({ page }) => {
    await gotoSam(page)
    const header = page
      .locator('th')
      .filter({ hasText: /^Bond/ })
      .first()
    const tip = header.locator('text=?').first()
    await hoverAndAssertTooltip(page, tip, HELP_SNIPPETS.bondHealth)
  })
})

test.describe('HelpTip — inside detail sheet', () => {
  const V01 = 'FiXtUREv1111111111111111111111111111111111aa'

  test('Bid runway row inside the sheet exposes the bond-runway copy', async ({
    page,
  }) => {
    await page.goto(`/test-?v=${V01}`)
    await page.waitForSelector('tbody tr', { timeout: 30000 })
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 10000 })

    // Locate the "Bid runway" label and its sibling `?` icon.
    const row = page
      .locator(SHEET)
      .locator('span', { hasText: /^Bid runway$/ })
      .first()
    const tip = row.locator('text=?').first()
    await hoverAndAssertTooltip(page, tip, HELP_SNIPPETS.bondRunway)
  })

  test('Reserve row inside the sheet exposes the bond-coverage copy', async ({
    page,
  }) => {
    await page.goto(`/test-?v=${V01}`)
    await page.waitForSelector('tbody tr', { timeout: 30000 })
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 10000 })

    const row = page
      .locator(SHEET)
      .locator('span', { hasText: /^Reserve$/ })
      .first()
    const tip = row.locator('text=?').first()
    await hoverAndAssertTooltip(page, tip, HELP_SNIPPETS.bondCoverage)
  })
})
