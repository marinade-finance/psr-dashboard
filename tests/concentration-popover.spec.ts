// Concentration metric cards — Top Country / Top ASO. Inline shows the
// #1 entry + share over a gauge; hovering the card expands a ranked-list
// popover with up to 15 entries. None of the existing specs exercise the
// hover-expand interaction.
//
// Spec source: SCREENS.md § "Concentration metrics (popover)" +
// src/components/concentration-metric/concentration-metric.tsx.
import { test, expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

async function gotoSam(page: Page) {
  await page.goto('/test-')
  await page.waitForSelector('tbody tr', { timeout: 30000 })
}

// The card has the uppercase label as its title. Hover anywhere over the
// card to open the popover.
function cardByLabel(page: Page, label: 'Top Country' | 'Top ASO'): Locator {
  return page.locator('div', { hasText: new RegExp(`^${label}`) }).first()
}

test.describe('concentration popover — hover reveal', () => {
  test('Top Country card is visible inline with name + share', async ({
    page,
  }) => {
    await gotoSam(page)
    const card = cardByLabel(page, 'Top Country')
    await expect(card).toBeVisible()
    const text = await card.innerText()
    // Inline shows "<name>" + "<pct%> / <capPct%>" — match the pct.
    expect(text).toMatch(/\d+%/)
  })

  test('hovering Top Country expands the ranked-list popover', async ({
    page,
  }) => {
    await gotoSam(page)
    const card = cardByLabel(page, 'Top Country')
    await card.hover()
    // Popover renders a <table> with Name / Share / Stake / Cap headers.
    const popover = page.locator('table', {
      hasText: /Name.*Share.*Stake.*Cap/,
    })
    await expect(popover.first()).toBeVisible({ timeout: 3000 })
  })

  test('popover lists ≥1 entry rows', async ({ page }) => {
    await gotoSam(page)
    await cardByLabel(page, 'Top Country').hover()
    const popoverTable = page
      .locator('table', { hasText: /Name.*Share.*Stake.*Cap/ })
      .first()
    await expect(popoverTable).toBeVisible({ timeout: 3000 })
    const rows = popoverTable.locator('tbody tr')
    expect(await rows.count()).toBeGreaterThan(0)
  })

  test('Top ASO card has its own popover (independent of Top Country)', async ({
    page,
  }) => {
    await gotoSam(page)
    await cardByLabel(page, 'Top ASO').hover()
    const popoverTable = page
      .locator('table', { hasText: /Name.*Share.*Stake.*Cap/ })
      .first()
    await expect(popoverTable).toBeVisible({ timeout: 3000 })
  })

  test('popover carries the "Cap: N% of network stake" hint line', async ({
    page,
  }) => {
    await gotoSam(page)
    await cardByLabel(page, 'Top Country').hover()
    await expect(
      page.getByText(/Cap:\s*\d+(?:\.\d+)?%\s*of network stake/i).first(),
    ).toBeVisible({ timeout: 3000 })
  })
})

test.describe('concentration popover — close on mouseleave', () => {
  test('moving the mouse off the card closes the popover', async ({ page }) => {
    await gotoSam(page)
    const card = cardByLabel(page, 'Top Country')
    await card.hover()
    const popoverTable = page
      .locator('table', { hasText: /Name.*Share.*Stake.*Cap/ })
      .first()
    await expect(popoverTable).toBeVisible({ timeout: 3000 })
    // Move the mouse far away (top-left corner of the page).
    await page.mouse.move(2, 2)
    await expect(popoverTable).toHaveCount(0, { timeout: 3000 })
  })
})
