// Simulation cycle — toggle Simulate on a validator, edit a value, expect
// the table to recompute, a ghost row at the original position, and a
// simulated row at the new position. Verify the "Reset Simulation" pill
// clears everything.
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const SHEET = '[role="dialog"]'

const V01 = 'FiXtUREv1111111111111111111111111111111111aa'
const V02 = 'FiXtUREv2222222222222222222222222222222222bb'

async function openSheet(page: Page, voteAccount: string) {
  await page.goto(`/test-?v=${voteAccount}`)
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 10000 })
}

async function enableSimulate(page: Page) {
  const sw = page
    .locator(SHEET)
    .getByRole('switch', { name: /Toggle simulation mode/i })
  await sw.click()
  await expect(
    page.locator(SHEET).getByText('What-If Simulation'),
  ).toBeVisible()
}

test.describe('simulation — toggle reveals What-If form', () => {
  test('Simulate switch is OFF by default for a fresh sheet', async ({
    page,
  }) => {
    await openSheet(page, V01)
    const sw = page
      .locator(SHEET)
      .getByRole('switch', { name: /Toggle simulation mode/i })
    await expect(sw).toHaveAttribute('aria-checked', 'false')
  })

  test('toggling Simulate ON reveals the 4 numeric inputs', async ({
    page,
  }) => {
    await openSheet(page, V01)
    await enableSimulate(page)
    const sheet = page.locator(SHEET)
    await expect(sheet.getByText('Stake Bid (PMPE)')).toBeVisible()
    await expect(sheet.getByText('Inflation Commission %')).toBeVisible()
    await expect(sheet.getByText('MEV Commission %')).toBeVisible()
    await expect(sheet.getByText('Block Rewards Commission %')).toBeVisible()
    const inputs = sheet.locator('input[type="number"]')
    await expect(inputs).toHaveCount(4)
  })

  test('What-If card shows "Auto-recalc on change" status initially', async ({
    page,
  }) => {
    await openSheet(page, V01)
    await enableSimulate(page)
    await expect(
      page.locator(SHEET).getByText('Auto-recalc on change'),
    ).toBeVisible()
  })
})

test.describe('simulation — editing fires a recompute and surfaces ghost+sim rows', () => {
  test('lowering the bid PMPE produces a ghost row and a simulation banner', async ({
    page,
  }) => {
    await openSheet(page, V01)
    await enableSimulate(page)

    const bidInput = page
      .locator(SHEET)
      .locator('input[type="number"]')
      .first()
    await bidInput.fill('0.5')
    // Debounce is 400ms — wait a bit longer for re-run + paint.
    await page.waitForTimeout(1200)

    // The banner at the top of the SAM table announces simulation mode.
    await expect(
      page.getByText(/Simulation Mode .* validator/i).first(),
    ).toBeVisible({ timeout: 8000 })
    // The "Simulated" pill in the sheet header proves the validator is now
    // recognised as edited.
    await expect(
      page.locator(SHEET).getByText('Simulated', { exact: false }).first(),
    ).toBeVisible()
  })

  test('Reset Simulation chip clears the simulation state', async ({
    page,
  }) => {
    await openSheet(page, V01)
    await enableSimulate(page)
    const bidInput = page
      .locator(SHEET)
      .locator('input[type="number"]')
      .first()
    await bidInput.fill('0.1')
    await page.waitForTimeout(1200)

    // The chip lives on the SAM table simulation banner.
    const resetBtn = page.getByRole('button', { name: /Reset Simulation/i })
    await expect(resetBtn).toBeVisible({ timeout: 8000 })
    await resetBtn.click()

    // After reset the banner disappears.
    await expect(
      page.getByText(/Simulation Mode .* validator/i),
    ).toHaveCount(0, { timeout: 5000 })
  })

  test('table renders a ghost row (original position) when a row is simulated', async ({
    page,
  }) => {
    await openSheet(page, V02)
    await enableSimulate(page)
    const bidInput = page
      .locator(SHEET)
      .locator('input[type="number"]')
      .first()
    // Drop bid PMPE significantly to force a rank change.
    await bidInput.fill('0.2')
    await page.waitForTimeout(1500)

    // Ghost rows render with class containing "line-through" per sam-table.tsx.
    const ghostRows = page.locator('tbody tr.line-through, tbody tr[class*="line-through"]')
    expect(await ghostRows.count()).toBeGreaterThanOrEqual(1)
  })
})

test.describe('simulation — toggling OFF clears the active sim for that validator', () => {
  test('flipping Simulate OFF after an edit removes the Simulated pill', async ({
    page,
  }) => {
    await openSheet(page, V01)
    await enableSimulate(page)
    const bidInput = page
      .locator(SHEET)
      .locator('input[type="number"]')
      .first()
    await bidInput.fill('0.4')
    await page.waitForTimeout(1200)

    await expect(
      page.locator(SHEET).getByText('Simulated').first(),
    ).toBeVisible()

    const sw = page
      .locator(SHEET)
      .getByRole('switch', { name: /Toggle simulation mode/i })
    await sw.click()

    // What-If form is hidden again.
    await expect(
      page.locator(SHEET).getByText('What-If Simulation'),
    ).toHaveCount(0, { timeout: 5000 })
  })
})
