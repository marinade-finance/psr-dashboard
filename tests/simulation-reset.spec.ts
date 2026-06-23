/*
 * Simulation reset — "Reset Simulation" button in the sticky SIMULATION MODE
 * banner immediately restores original data.
 *
 * After reset:
 *   - The SIMULATION MODE banner disappears.
 *   - Ghost rows (strikethrough originals) are gone.
 *   - The ✕ / "Reset Simulation" button itself is gone.
 *
 * Also tests that the banner stays visible while scrolled (sticky top-14).
 *
 * Source: src/pages/stake-auction-marketplace.tsx — handleResetSimulation(),
 * the sticky banner div (simulatedValidators.size > 0), and the
 * "Reset Simulation" <button> inside it.
 *
 * References: SCREENS.md § Simulation banner, ARCHITECTURE.md § Simulation Mode.
 */
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const SHEET = '[role="dialog"]'
const V01 = 'FiXtUREv1111111111111111111111111111111111aa'

async function openSheetAndSimulate(page: Page) {
  await page.goto(`/test-?v=${V01}`)
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 10000 })

  await page
    .locator(SHEET)
    .getByRole('switch', { name: /Toggle simulation mode/i })
    .click()
  await expect(
    page.locator(SHEET).getByText('What-If Simulation'),
  ).toBeVisible()

  // Edit the bid to trigger a recompute and surface the simulation banner.
  const bidInput = page.locator(SHEET).locator('input[type="number"]').first()
  await bidInput.fill('0.1')
  await page.waitForTimeout(1200)

  await expect(page.getByText(/Simulation Mode/i).first()).toBeVisible({
    timeout: 8000,
  })
}

test.describe('simulation reset — banner cleared after reset', () => {
  test('Reset Simulation button removes the SIMULATION MODE banner', async ({
    page,
  }) => {
    await openSheetAndSimulate(page)

    // Close sheet so the banner reset button is clickable (not covered by overlay).
    await page.locator(SHEET).getByText('Back to rankings').click()
    await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 5000 })

    const resetBtn = page.getByRole('button', { name: /Reset Simulation/i })
    await expect(resetBtn).toBeVisible({ timeout: 5000 })
    await resetBtn.click()

    // Banner must disappear.
    await expect(page.getByText(/Simulation Mode/i)).toHaveCount(0, {
      timeout: 5000,
    })
  })

  test('Reset Simulation button removes itself after click', async ({
    page,
  }) => {
    await openSheetAndSimulate(page)

    await page.locator(SHEET).getByText('Back to rankings').click()
    await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 5000 })

    const resetBtn = page.getByRole('button', { name: /Reset Simulation/i })
    await expect(resetBtn).toBeVisible({ timeout: 5000 })
    await resetBtn.click()

    await expect(
      page.getByRole('button', { name: /Reset Simulation/i }),
    ).toHaveCount(0, { timeout: 5000 })
  })

  test('ghost rows are absent after reset', async ({ page }) => {
    await openSheetAndSimulate(page)

    await page.locator(SHEET).getByText('Back to rankings').click()
    await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 5000 })

    const resetBtn = page.getByRole('button', { name: /Reset Simulation/i })
    await expect(resetBtn).toBeVisible({ timeout: 5000 })
    await resetBtn.click()

    // Ghost rows carry a line-through style; none should remain.
    await expect(
      page.locator('tbody tr.line-through, tbody [class*="line-through"]'),
    ).toHaveCount(0, { timeout: 5000 })
  })
})

test.describe('simulation banner stickiness — stays visible on scroll', () => {
  test('banner remains in viewport after scrolling 400px down', async ({
    page,
  }) => {
    await openSheetAndSimulate(page)

    // Close sheet so the banner is not covered.
    await page.locator(SHEET).getByText('Back to rankings').click()
    await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 5000 })

    const banner = page.getByText(/Simulation Mode/i).first()
    await expect(banner).toBeVisible()

    await page.evaluate(() => window.scrollBy(0, 400))

    // sticky top-14 keeps the banner stuck to the top of the viewport.
    await expect(banner).toBeVisible()
  })
})
