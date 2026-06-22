/*
 * Compact / detailed view toggle — button in the SAM page nav bar.
 *
 * Source: src/pages/stake-auction-marketplace.tsx (Button with title=
 * "Detailed view" / "Compact view") and sam-table.tsx (isCompact prop
 * gates sub-line content: bond chip, gauge, stake next-change sub-rows,
 * concentration cards).
 *
 * The button lives inside <Navigation> as a child slot, so it is present
 * only on the SAM page (/test-).
 *
 * References: SCREENS.md § SAM table, ARCHITECTURE.md § SamPage.
 */
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function gotoSam(page: Page) {
  await page.goto('/test-')
  await page.waitForSelector('tbody tr', { timeout: 30000 })
}

function compactBtn(page: Page) {
  // Button title alternates: "Detailed view" when compact, "Compact view" when detailed.
  return page
    .locator('button[title="Detailed view"], button[title="Compact view"]')
    .first()
}

test.describe('compact/detailed toggle — initial state', () => {
  test.beforeEach(async ({ page }) => {
    await gotoSam(page)
  })

  test('toggle button is visible in the nav bar', async ({ page }) => {
    await expect(compactBtn(page)).toBeVisible()
  })

  test('default state is compact: button title is "Detailed view"', async ({
    page,
  }) => {
    await expect(compactBtn(page)).toHaveAttribute('title', 'Detailed view')
  })

  test('compact mode: bond chip spans are NOT rendered in table cells', async ({
    page,
  }) => {
    // In compact mode sam-table replaces the chip+gauge block with a plain
    // SOL amount span. The chip span carries `rounded-md` and `px-2 py-[3px]`
    // classes (line ~893 sam-table.tsx). None of those spans should appear.
    await expect(page.locator('tbody td span.rounded-md').first()).toHaveCount(
      0,
    )
  })
})

test.describe('compact/detailed toggle — switching to detailed', () => {
  test.beforeEach(async ({ page }) => {
    await gotoSam(page)
  })

  test('clicking the button switches title to "Compact view"', async ({
    page,
  }) => {
    await compactBtn(page).click()
    await expect(compactBtn(page)).toHaveAttribute('title', 'Compact view')
  })

  test('detailed mode: bond health chip appears in at least one cell', async ({
    page,
  }) => {
    await compactBtn(page).click()
    // sam-table.tsx renders the chip span only when !isCompact.
    await expect(
      page
        .locator('tbody')
        .getByText(/Critical|Watch|Healthy/)
        .first(),
    ).toBeVisible({ timeout: 3000 })
  })

  test('clicking again returns to compact: title reverts to "Detailed view"', async ({
    page,
  }) => {
    await compactBtn(page).click()
    await expect(compactBtn(page)).toHaveAttribute('title', 'Compact view')
    await compactBtn(page).click()
    await expect(compactBtn(page)).toHaveAttribute('title', 'Detailed view')
  })
})
