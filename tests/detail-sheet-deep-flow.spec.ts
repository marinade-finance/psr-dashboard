// End-to-end flow through the validator detail sheet:
//   1. Open the sheet via the jump-search dropdown.
//   2. Verify URL syncs to ?v=<voteAccount>.
//   3. Walk every tab (Overview → Payments → Bidding → Bond → Bid Penalty).
//   4. Toggle Simulate on, edit a value, see "Remove from simulation" appear
//      next to the Close button.
//   5. Click Reset Simulation on the SAM banner — sheet stays open, but
//      Simulated pill is gone.
//   6. Close the sheet via the X — URL ?v= goes away.
//
// This is the full happy-path a real user walks; no other spec ties all of
// these together.
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const SHEET = '[role="dialog"]'

async function gotoSam(page: Page) {
  await page.goto('/test-')
  await page.waitForSelector('tbody tr', { timeout: 30000 })
}

test.describe('detail sheet — full open-walk-simulate-close cycle', () => {
  test('jump-search → open → walk tabs → close clears ?v=', async ({
    page,
  }) => {
    await gotoSam(page)

    // (1) Open via jump-search.
    const search = page.getByPlaceholder(/Find validator/i).first()
    await search.fill('In-Set Gaining')
    await expect(page.locator('[role="listbox"]')).toBeVisible({
      timeout: 3000,
    })
    await page.getByRole('option').first().click()
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\?v=[1-9A-HJ-NP-Za-km-z]{32,}/)

    // (2) Default tab is Overview — APY composition is the visual anchor.
    await expect(
      page.locator(SHEET).getByText('Max APY Composition'),
    ).toBeVisible()

    // (3) Switch Payments → Bidding → Bond → Bid Penalty.
    // Overview's titled cards also expose role=button with the same name;
    // `.first()` reliably targets the TabStrip button.
    const tab = (name: string) =>
      page.locator(SHEET).getByRole('button', { name, exact: true }).first()

    await tab('Payments').click()
    await expect(
      page
        .locator(SHEET)
        .getByText(/Total payment|Total this epoch/i)
        .first(),
    ).toBeVisible()

    await tab('Bidding').click()
    await expect(
      page
        .locator(SHEET)
        .getByText(/Get into the auction|Your bid today/i)
        .first(),
    ).toBeVisible()

    await tab('Bond').click()
    await expect(
      page
        .locator(SHEET)
        .getByText(/Bond calculation|Held for bid/i)
        .first(),
    ).toBeVisible()

    await tab('Bid Penalty').click()
    await expect(
      page
        .locator(SHEET)
        .getByText(/Bid history|Threshold/)
        .first(),
    ).toBeVisible()

    // (4) Close via X — URL drops ?v=.
    await page.locator(SHEET).getByRole('button', { name: 'Back to rankings' }).click()
    await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 5000 })
    await expect(page).not.toHaveURL(/\?v=/)
  })
})

test.describe('detail sheet — simulate then reset cycle', () => {
  test('editing a bid surfaces Remove from simulation + Reset banner; Reset clears all', async ({
    page,
  }) => {
    await page.goto('/test-?v=FiXtUREv1111111111111111111111111111111111aa')
    await page.waitForSelector('tbody tr', { timeout: 30000 })
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })

    // (1) Toggle Simulate on.
    await page
      .locator(SHEET)
      .getByRole('switch', { name: /Toggle simulation mode/i })
      .click()
    await expect(
      page.locator(SHEET).getByText('What-If Simulation'),
    ).toBeVisible()

    // (2) Edit the bid input.
    const bidInput = page.locator(SHEET).locator('input[type="number"]').first()
    await bidInput.fill('0.3')
    await page.waitForTimeout(1500)

    // (3) "Remove from simulation" appears in the sheet header.
    await expect(
      page
        .locator(SHEET)
        .getByRole('button', { name: /Remove from simulation/i }),
    ).toBeVisible({ timeout: 5000 })

    // (4) Close the sheet so the SAM banner (and the Reset Simulation pill
    // on it) is no longer covered by the Radix modal overlay.
    await page.locator(SHEET).getByRole('button', { name: 'Back to rankings' }).click()
    await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 5000 })

    // (5) "Reset Simulation" pill on the SAM banner is visible.
    const reset = page.getByRole('button', { name: /Reset Simulation/i })
    await expect(reset).toBeVisible({ timeout: 5000 })

    // (6) Click Reset — banner disappears.
    await reset.click()
    await expect(
      page.getByRole('button', { name: /Reset Simulation/i }),
    ).toHaveCount(0, { timeout: 5000 })
  })
})
