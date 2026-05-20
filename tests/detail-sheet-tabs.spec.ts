// Validator detail sheet — open/close cycle + key content rows per tab.
// Uses the deterministic /test- route (TestSamPage) which loads
// TEST_VALIDATORS fixture data. Content-text assertions stay loose
// (regex / non-exact) so cosmetic copy drift doesn't break the suite.
import { test, expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

const SHEET = '[role="dialog"]'

const V01 = 'FiXtUREv1111111111111111111111111111111111aa'

async function gotoSam(page: Page) {
  await page.goto('/test-')
  await page.waitForSelector('tbody tr', { timeout: 30000 })
}

async function openSheet(page: Page, voteAccount: string) {
  await page.goto(`/test-?v=${voteAccount}`)
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 10000 })
}

function sheetTab(page: Page, label: string): Locator {
  return page
    .locator(SHEET)
    .getByRole('button', { name: label, exact: true })
    .first()
}

async function clickTab(page: Page, label: string) {
  await sheetTab(page, label).click()
}

test.describe('detail sheet — open & close', () => {
  test('clicking a row opens the sheet and pushes ?v= to URL', async ({
    page,
  }) => {
    await gotoSam(page)
    await page.locator('tbody tr').first().click()
    await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\?v=[1-9A-HJ-NP-Za-km-z]{32,}/)
  })

  test('opening via deep link ?v=... renders the sheet on load', async ({
    page,
  }) => {
    await openSheet(page, V01)
    const text = await page.locator(SHEET).first().innerText()
    expect(text).toContain(V01)
  })

  test('Escape closes the sheet and strips ?v= from the URL', async ({
    page,
  }) => {
    await openSheet(page, V01)
    await page.keyboard.press('Escape')
    await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 5000 })
    await expect(page).not.toHaveURL(/\?v=/)
  })

  test('clicking the × close button dismisses the sheet', async ({ page }) => {
    await openSheet(page, V01)
    await page.locator(SHEET).getByRole('button', { name: 'Close' }).click()
    await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 5000 })
  })

  test('browser back closes the sheet (popstate)', async ({ page }) => {
    await gotoSam(page)
    await page.locator('tbody tr').first().click()
    await expect(page.locator(SHEET).first()).toBeVisible()
    await page.goBack()
    await expect(page.locator(SHEET)).toHaveCount(0, { timeout: 5000 })
  })
})

test.describe('detail sheet — overview tab', () => {
  test('Stake card shows Active / Target / Expected change rows', async ({
    page,
  }) => {
    await openSheet(page, V01)
    const sheet = page.locator(SHEET)
    await expect(sheet.getByText('Activated Marinade stake')).toBeVisible()
    await expect(sheet.getByText('Target Marinade stake')).toBeVisible()
    await expect(sheet.getByText('Expected change next epoch')).toBeVisible()
  })

  test('Expected Payment card shows Active / Activating Stake Cost', async ({
    page,
  }) => {
    await openSheet(page, V01)
    const sheet = page.locator(SHEET)
    await expect(sheet.getByText(/Activated Stake Cost/i).first()).toBeVisible()
    await expect(
      sheet.getByText(/Activating Stake Cost/i).first(),
    ).toBeVisible()
  })

  test('APY Composition card lists all four components', async ({ page }) => {
    await openSheet(page, V01)
    const sheet = page.locator(SHEET)
    await expect(sheet.getByText('Max APY Composition')).toBeVisible()
    for (const label of ['Inflation', 'MEV', 'Block rewards', 'Static bid']) {
      await expect(sheet.getByText(label, { exact: true }).first()).toBeVisible()
    }
  })
})

test.describe('detail sheet — tab switching', () => {
  test('each tab can be activated and is visually marked', async ({ page }) => {
    await openSheet(page, V01)
    for (const tab of ['Payments', 'Bidding', 'Bond', 'Bid Penalty']) {
      await clickTab(page, tab)
      await expect(sheetTab(page, tab)).toHaveClass(/text-primary/)
    }
    // Default tab is Overview — visible when we open without selecting another
    await clickTab(page, 'Overview')
    await expect(sheetTab(page, 'Overview')).toHaveClass(/text-primary/)
  })
})
