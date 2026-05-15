// Validator detail sheet — every tab in depth. Uses the deterministic
// /test- route (TestSamPage) which loads TEST_VALIDATORS fixture data.
//
// These tests describe how the dashboard SHOULD work per SCREENS.md.
// If a test fails the test stays — it documents a real spec divergence.
import { test, expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

const SHEET = '[role="dialog"]'

// Fixture validators with bonds (selectBondSize > 0 in test-validators.ts).
// v01 is the canonical healthy in-set row; v06 carries a bid-too-low penalty.
const V01 = 'FiXtUREv1111111111111111111111111111111111aa'
const V06 = 'FiXtUREv6666666666666666666666666666666666ff'

async function gotoSam(page: Page) {
  await page.goto('/test-')
  await page.waitForSelector('tbody tr', { timeout: 30000 })
}

async function openSheet(page: Page, voteAccount: string) {
  // Deep-link via ?v= — bypasses table filtering and survives the first
  // render race where simulation overrides reset the rank index.
  await page.goto(`/test-?v=${voteAccount}`)
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 10000 })
}

function sheetTab(page: Page, label: string): Locator {
  return page.locator(SHEET).getByRole('button', { name: label, exact: true })
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
    await expect(sheet.getByText('Active Marinade stake')).toBeVisible()
    await expect(sheet.getByText('Target Marinade stake')).toBeVisible()
    await expect(sheet.getByText('Expected change next epoch')).toBeVisible()
  })

  test('Bond card shows Balance, Reserve, Bid runway', async ({ page }) => {
    await openSheet(page, V01)
    const sheet = page.locator(SHEET)
    await expect(sheet.getByText('Balance', { exact: true })).toBeVisible()
    await expect(sheet.getByText('Reserve', { exact: true })).toBeVisible()
    await expect(sheet.getByText('Bid runway')).toBeVisible()
    // Runway value should read "N epochs" for a healthy bond
    await expect(sheet.getByText(/\d+\s+epochs/)).toBeVisible()
  })

  test('Bond card "See full bond coverage breakdown →" link is present', async ({
    page,
  }) => {
    await openSheet(page, V01)
    await expect(
      page.locator(SHEET).getByText(/See full bond coverage breakdown/),
    ).toBeVisible()
  })

  test('Expected Payment card shows Active / Activating Stake Cost and Total', async ({
    page,
  }) => {
    await openSheet(page, V01)
    const sheet = page.locator(SHEET)
    await expect(sheet.getByText('Active Stake Cost').first()).toBeVisible()
    await expect(sheet.getByText('Activating Stake Cost').first()).toBeVisible()
    await expect(sheet.getByText('Total', { exact: true })).toBeVisible()
  })

  test('No-penalty validator shows "No penalties" line', async ({ page }) => {
    await openSheet(page, V01)
    await expect(page.locator(SHEET).getByText('No penalties')).toBeVisible()
  })

  test('Validator with active bid-too-low penalty shows itemised penalty row', async ({
    page,
  }) => {
    await openSheet(page, V06)
    // v06 has bidTooLowPenaltyPmpe = 0.8 → itemised "↳ bid-too-low penalty"
    await expect(
      page.locator(SHEET).getByText(/bid-too-low penalty/),
    ).toBeVisible()
  })

  test('APY Composition card lists all four components', async ({ page }) => {
    await openSheet(page, V01)
    const sheet = page.locator(SHEET)
    await expect(sheet.getByText('Max APY Composition')).toBeVisible()
    for (const label of ['Inflation', 'MEV', 'Block rewards', 'Stake bid']) {
      await expect(sheet.getByText(label, { exact: true })).toBeVisible()
    }
  })

  test('APY Composition card shows winning threshold marker label', async ({
    page,
  }) => {
    await openSheet(page, V01)
    // Threshold marker is rendered with text "Winning threshold N.NN%".
    await expect(
      page.locator(SHEET).getByText(/Winning threshold\s+[\d.]+%/),
    ).toBeVisible()
  })

  test('APY Composition card shows "vs winning" delta chip', async ({
    page,
  }) => {
    await openSheet(page, V01)
    await expect(
      page.locator(SHEET).getByText(/[+\-]?[\d.]+%\s*vs winning/),
    ).toBeVisible()
  })

  test('Tip banner CTA is visible (Bond tab → or Simulate →) when constraint active', async ({
    page,
  }) => {
    // v06 has a bid-too-low penalty → tip targets bid → "Simulate →" CTA.
    // v04 has critical bond → tip targets bond → "Bond tab →" CTA.
    await openSheet(page, V06)
    await expect(
      page.locator(SHEET).getByText(/(Bond tab →|Simulate →)/),
    ).toBeVisible()
  })
})

test.describe('detail sheet — tab switching', () => {
  test('clicking each tab switches the active tab and visible content', async ({
    page,
  }) => {
    await openSheet(page, V01)

    // Bidding and Payments are two purpose-built tabs. Bidding owns the
    // cost-PMPE composition + bid gap + the two advisory estimates.
    await clickTab(page, 'Bidding')
    await expect(
      page.locator(SHEET).getByText('Cost-PMPE composition'),
    ).toBeVisible()
    await expect(
      page.locator(SHEET).getByText('Auction effective bid'),
    ).toBeVisible()

    await clickTab(page, 'Payments')
    await expect(page.locator(SHEET).getByText('Bid cost')).toBeVisible()
    await expect(page.locator(SHEET).getByText('Total payment')).toBeVisible()

    await clickTab(page, 'Bond')
    await expect(
      page.locator(SHEET).getByText(/Bond Calculation|Claimable bond balance/),
    ).toBeVisible()

    await clickTab(page, 'Bid Penalty')
    await expect(
      page.locator(SHEET).getByText(/Bid Penalty Calculation|Bid history/),
    ).toBeVisible()

    await clickTab(page, 'Overview')
    await expect(
      page.locator(SHEET).getByText('Max APY Composition'),
    ).toBeVisible()
  })

  test('active tab is visually marked (text-primary)', async ({ page }) => {
    await openSheet(page, V01)
    const overview = sheetTab(page, 'Overview')
    // Default tab is Overview — should carry the active marker class.
    await expect(overview).toHaveClass(/text-primary/)
  })
})

test.describe('detail sheet — Bidding tab', () => {
  test('shows the stake-position, cost-PMPE and bid-gap supporting sections', async ({
    page,
  }) => {
    await openSheet(page, V01)
    await clickTab(page, 'Bidding')
    const sheet = page.locator(SHEET)
    await expect(sheet.getByText('Stake position')).toBeVisible()
    await expect(sheet.getByText('Cost-PMPE composition')).toBeVisible()
    await expect(sheet.getByText('Inflation', { exact: true })).toBeVisible()
    await expect(sheet.getByText('MEV', { exact: true })).toBeVisible()
    await expect(sheet.getByText('Bid gap')).toBeVisible()
    await expect(sheet.getByText('Auction effective bid')).toBeVisible()
  })

  test('the two advisory estimates are the centerpiece', async ({ page }) => {
    await openSheet(page, V01)
    await clickTab(page, 'Bidding')
    const sheet = page.locator(SHEET)
    await expect(sheet.getByText('Get into the auction')).toBeVisible()
    await expect(sheet.getByText('Winning total')).toBeVisible()
    await expect(sheet.getByText('Minimum bond required')).toBeVisible()
    await expect(sheet.getByText('Get stake next epoch')).toBeVisible()
    await expect(sheet.getByText('Redelegation budget this run')).toBeVisible()
  })

  test('carries the Simulate-to-confirm action link', async ({ page }) => {
    await openSheet(page, V01)
    await clickTab(page, 'Bidding')
    await expect(
      page
        .locator(SHEET)
        .getByText('Simulate this bid to confirm the exact figure →'),
    ).toBeVisible()
  })
})

test.describe('detail sheet — Payments tab', () => {
  test('lists the Bid cost section and the black Total payment row', async ({
    page,
  }) => {
    await openSheet(page, V01)
    await clickTab(page, 'Payments')
    const sheet = page.locator(SHEET)
    await expect(sheet.getByText('Bid cost').first()).toBeVisible()
    await expect(sheet.getByText('Active stake cost')).toBeVisible()
    await expect(sheet.getByText('Activating stake cost')).toBeVisible()
    await expect(sheet.getByText('Total payment')).toBeVisible()
  })

  test('shows penalty rows (Bid-too-low / Blacklist / Bond risk fee)', async ({
    page,
  }) => {
    await openSheet(page, V01)
    await clickTab(page, 'Payments')
    const sheet = page.locator(SHEET)
    await expect(sheet.getByText('Bid-too-low penalty')).toBeVisible()
    await expect(sheet.getByText('Blacklist penalty')).toBeVisible()
    await expect(sheet.getByText('Bond risk fee')).toBeVisible()
  })

  test('carries both the Simulate and bid-penalty action links', async ({
    page,
  }) => {
    await openSheet(page, V06)
    await clickTab(page, 'Payments')
    const sheet = page.locator(SHEET)
    await expect(
      sheet.getByText('Simulate commission or bid changes →'),
    ).toBeVisible()
    await expect(
      sheet.getByText('See bid-too-low penalty calculation →'),
    ).toBeVisible()
  })
})

test.describe('detail sheet — Bond tab', () => {
  test('shows Minimum required and Ideal required rows', async ({ page }) => {
    await openSheet(page, V01)
    await clickTab(page, 'Bond')
    const sheet = page.locator(SHEET)
    await expect(sheet.getByText('Minimum required')).toBeVisible()
    await expect(sheet.getByText('Ideal required')).toBeVisible()
  })

  test('critical-bond validator surfaces "Top up to avoid the fee" row', async ({
    page,
  }) => {
    // v04: bondGoodForNEpochs = 3 (below penalty threshold). The Bond
    // Coverage breakdown should expose the Bond Risk section.
    await openSheet(page, 'FiXtUREv4444444444444444444444444444444444dd')
    await clickTab(page, 'Bond')
    await expect(
      page.locator(SHEET).getByText(/Bond Risk|Top up to avoid the fee/),
    ).toBeVisible()
  })
})

test.describe('detail sheet — Bid Penalty tab', () => {
  test('shows the Bid history → Threshold → Penalty sections', async ({
    page,
  }) => {
    await openSheet(page, V06)
    await clickTab(page, 'Bid Penalty')
    const sheet = page.locator(SHEET)
    await expect(sheet.getByText('Bid history')).toBeVisible()
    await expect(sheet.getByText('Threshold')).toBeVisible()
    await expect(sheet.getByText('Penalty', { exact: true })).toBeVisible()
    await expect(sheet.getByText('Shortfall')).toBeVisible()
  })
})

test.describe('detail sheet — Notifications tab', () => {
  // SCREENS.md spec: "Notifications tab — appears only when notifications
  // exist". The fixture data has no notifications, so the tab button SHOULD
  // NOT render. If this fails, it documents a real divergence.
  test('Notifications tab button is hidden when no notifications exist', async ({
    page,
  }) => {
    await openSheet(page, V01)
    await expect(sheetTab(page, 'Notifications')).toHaveCount(0)
  })
})
