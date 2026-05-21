// HelpTip — hovering the `?` icon on key labels surfaces the canonical
// HELP_TEXT copy from src/services/help-text.ts. Uses the deterministic
// /test- route.
import { test, expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

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
})

test.describe('HelpTip — Learn more link', () => {
  test('clicking Learn more on a pinned stat tooltip opens docs in a new tab', async ({
    page,
    context,
  }) => {
    await gotoSam(page)
    // Column header "Bond ?" has guideTo=#bond. Click to pin the tooltip.
    const header = page.locator('th').filter({ hasText: /^Bond/ }).first()
    const tip = header.locator('button[aria-label="More info"]').first()
    await tip.click()
    const tooltip = page.getByRole('tooltip').first()
    await expect(tooltip).toBeVisible({ timeout: 5000 })
    const learnMore = tooltip.getByText('Learn more')
    await expect(learnMore).toBeVisible()
    // The sticky thead can sit above the tooltip at the "Bond" header's
    // viewport position. Coordinate-based clicks (even force:true) dispatch
    // pointerdown at those coordinates, which land on the <th>, triggering
    // the HelpTip outside-click handler and dismissing the tooltip before
    // the <a> can receive the click. `evaluate` calls HTMLAnchorElement.click()
    // directly on the DOM node, skipping coordinate dispatch entirely.
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      learnMore.evaluate(el => (el as HTMLAnchorElement).click()),
    ])
    await newPage.waitForLoadState('domcontentloaded')
    expect(newPage.url()).toMatch(/\/docs/)
  })
})

test.describe('HelpTip — column headers', () => {
  test('Max APY header tooltip shows the canonical copy', async ({ page }) => {
    await gotoSam(page)
    const header = page
      .locator('th')
      .filter({ hasText: /Max APY/ })
      .first()
    const tip = header.locator('text=?').first()
    await hoverAndAssertTooltip(page, tip, HELP_SNIPPETS.maxApy)
  })

  test('Bond header tooltip exposes the bond-health copy', async ({ page }) => {
    await gotoSam(page)
    const header = page.locator('th').filter({ hasText: /^Bond/ }).first()
    const tip = header.locator('text=?').first()
    await hoverAndAssertTooltip(page, tip, HELP_SNIPPETS.bondHealth)
  })
})
