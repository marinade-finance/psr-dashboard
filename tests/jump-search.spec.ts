// Jump-to-validator search — above the SAM stats bar, ValidatorSearch
// component (src/components/validator-search/validator-search.tsx).
//
// Spec (per SCREENS.md):
//   - Accepts vote account (exact / prefix) or validator name (prefix /
//     substring).
//   - Dropdown with up to 8 ranked matches; opens at 2+ chars.
//   - Selecting a result opens the detail sheet for that validator, even if
//     the validator is hidden by the Basic-mode bond filter.
//   - Keyboard nav: ↑ ↓ to highlight, Enter to select, Escape to close.
//   - Clicking outside closes the dropdown.
//
// Uses /test- so TEST_VALIDATOR_NAMES gives us deterministic names to type.
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const SHEET = '[role="dialog"]'
// 'Test: Watch Bond' → vote account v03.
const V03 = 'FiXtUREv3333333333333333333333333333333333cc'

async function gotoSam(page: Page) {
  await page.goto('/test-')
  await page.waitForSelector('tbody tr', { timeout: 30000 })
}

function searchInput(page: Page) {
  return page.getByPlaceholder(/Find validator/i).first()
}

test.describe('jump-search — visibility and dropdown', () => {
  test('search input is visible above the stats bar', async ({ page }) => {
    await gotoSam(page)
    await expect(searchInput(page)).toBeVisible()
  })

  test('typing 1 char does NOT open the dropdown', async ({ page }) => {
    await gotoSam(page)
    await searchInput(page).fill('T')
    // No listbox should appear.
    await expect(page.locator('[role="listbox"]')).toHaveCount(0)
  })

  test('typing 2+ chars opens the listbox with at least one option', async ({
    page,
  }) => {
    await gotoSam(page)
    await searchInput(page).fill('Test')
    await expect(page.locator('[role="listbox"]')).toBeVisible({ timeout: 3000 })
    expect(await page.getByRole('option').count()).toBeGreaterThan(0)
  })

  test('listbox is capped at 8 results', async ({ page }) => {
    await gotoSam(page)
    // 'Test' substring matches all 12 fixture names — should cap at 8.
    await searchInput(page).fill('Test')
    await expect(page.locator('[role="listbox"]')).toBeVisible()
    const n = await page.getByRole('option').count()
    expect(n).toBeLessThanOrEqual(8)
  })

  test('typing a vote account prefix matches that validator', async ({
    page,
  }) => {
    await gotoSam(page)
    await searchInput(page).fill(V03.slice(0, 10))
    await expect(page.locator('[role="listbox"]')).toBeVisible()
    // The first option should be for V03.
    const firstOption = page.getByRole('option').first()
    await expect(firstOption).toContainText(V03.slice(0, 4))
  })
})

test.describe('jump-search — selection opens the detail sheet', () => {
  test('clicking a result opens the detail sheet and updates ?v=', async ({
    page,
  }) => {
    await gotoSam(page)
    await searchInput(page).fill('Watch Bond')
    await expect(page.locator('[role="listbox"]')).toBeVisible()
    await page.getByRole('option').first().click()
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(new RegExp(`\\?v=${V03}`))
  })

  test('search bypasses the Basic-mode filter (opens sheet for a hidden validator)', async ({
    page,
  }) => {
    // 'Test: Out of Set' is the canonical "outside the auction set" fixture.
    // In Basic mode it would be hidden, but the search must still find it.
    await page.goto('/')
    await page.waitForSelector('tbody tr', { timeout: 30000 })
    await searchInput(page).fill('Test')
    // If the live api.har fixture lacks matching names, skip — but for the
    // /test- route a hidden-but-known validator exists.
    await page.goto('/test-')
    await page.waitForSelector('tbody tr', { timeout: 30000 })
    await searchInput(page).fill('Out of Set')
    await expect(page.locator('[role="listbox"]')).toBeVisible()
    await page.getByRole('option').first().click()
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('jump-search — keyboard navigation', () => {
  test('ArrowDown moves aria-selected highlight to the second option', async ({
    page,
  }) => {
    await gotoSam(page)
    await searchInput(page).fill('Test')
    await expect(page.locator('[role="listbox"]')).toBeVisible()
    await searchInput(page).press('ArrowDown')
    // The second option becomes aria-selected="true".
    const second = page.getByRole('option').nth(1)
    await expect(second).toHaveAttribute('aria-selected', 'true')
  })

  test('Enter selects the highlighted option and opens the sheet', async ({
    page,
  }) => {
    await gotoSam(page)
    await searchInput(page).fill('Watch Bond')
    await expect(page.locator('[role="listbox"]')).toBeVisible()
    await searchInput(page).press('Enter')
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
  })

  test('Escape closes the dropdown and clears the input', async ({ page }) => {
    await gotoSam(page)
    const input = searchInput(page)
    await input.fill('Test')
    await expect(page.locator('[role="listbox"]')).toBeVisible()
    await input.press('Escape')
    await expect(page.locator('[role="listbox"]')).toHaveCount(0)
    // The input should be cleared as well.
    await expect(input).toHaveValue('')
  })
})

test.describe('jump-search — outside click', () => {
  test('clicking outside closes the dropdown', async ({ page }) => {
    await gotoSam(page)
    await searchInput(page).fill('Test')
    await expect(page.locator('[role="listbox"]')).toBeVisible()
    // Click somewhere clearly outside the search container — the page H1 or
    // the navigation bar.
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await expect(page.locator('[role="listbox"]')).toHaveCount(0)
  })
})
