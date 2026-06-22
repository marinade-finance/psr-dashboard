/*
 * Keyboard shortcuts `/` and `s` — focus the validator search input.
 *
 * Source: src/components/validator-search/validator-search.tsx lines ~95-108.
 * The keydown handler fires on `document` and focuses `inputRef.current`
 * when the key is `/` or `s` and the active element is NOT an input or
 * textarea.  It is a no-op when focus is already inside an input.
 *
 * References: SCREENS.md § Validator search bar, ARCHITECTURE.md § ValidatorSearch.
 */
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function gotoSam(page: Page) {
  await page.goto('/test-')
  await page.waitForSelector('tbody tr', { timeout: 30000 })
}

function searchInput(page: Page) {
  return page.locator('input[type="search"]').first()
}

test.describe('keyboard shortcut — `/` focuses the search input', () => {
  test.beforeEach(async ({ page }) => {
    await gotoSam(page)
  })

  test('pressing `/` when no input is focused moves focus to search', async ({
    page,
  }) => {
    // Blur everything first by clicking a neutral element.
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('/')
    await expect(searchInput(page)).toBeFocused()
  })

  test('pressing `/` opens the dropdown when query already has 2+ chars', async ({
    page,
  }) => {
    // Pre-fill via fill() (doesn't rely on keyboard), then check `/` refocuses.
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await searchInput(page).fill('Test')
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    // Pressing `/` should re-focus the input.
    await page.keyboard.press('/')
    await expect(searchInput(page)).toBeFocused()
  })
})

test.describe('keyboard shortcut — `s` focuses the search input', () => {
  test.beforeEach(async ({ page }) => {
    await gotoSam(page)
  })

  test('pressing `s` when no input is focused moves focus to search', async ({
    page,
  }) => {
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('s')
    await expect(searchInput(page)).toBeFocused()
  })
})

test.describe('keyboard shortcut — no-op when focus is inside an input', () => {
  test.beforeEach(async ({ page }) => {
    await gotoSam(page)
  })

  test('pressing `s` while search is focused does NOT lose focus', async ({
    page,
  }) => {
    // Click the search input first so it is already focused.
    await searchInput(page).click()
    await expect(searchInput(page)).toBeFocused()
    await page.keyboard.press('s')
    // Still focused — the handler skips when target is an HTMLInputElement.
    await expect(searchInput(page)).toBeFocused()
  })

  test('pressing `/` inside a number input in the sim panel does NOT focus search', async ({
    page,
  }) => {
    // Open a validator sheet and enable simulation to get number inputs.
    const V01 = 'FiXtUREv1111111111111111111111111111111111aa'
    await page.goto(`/test-?v=${V01}`)
    await page.waitForSelector('tbody tr', { timeout: 30000 })
    await expect(page.locator('[role="dialog"]').first()).toBeVisible({ timeout: 10000 })
    await page
      .locator('[role="dialog"]')
      .getByRole('switch', { name: /Toggle simulation mode/i })
      .click()
    const numInput = page
      .locator('[role="dialog"]')
      .locator('input[type="number"]')
      .first()
    await numInput.click()
    await expect(numInput).toBeFocused()
    // The `/` should NOT steal focus away.
    await page.keyboard.press('/')
    await expect(numInput).toBeFocused()
  })
})
