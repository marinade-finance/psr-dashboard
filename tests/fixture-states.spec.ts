// Tests that exercise specific fixture validator states surfaced by
// TestSamPage on /test-. Pairs each test with the fixture validator known
// to produce the state (see src/fixtures/test-validators.ts).
import { test, expect } from '@playwright/test'

const V04 = 'FiXtUREv4444444444444444444444444444444444dd' // Critical Bond (Low Epochs)
const V06 = 'FiXtUREv6666666666666666666666666666666666ff' // Bid-Too-Low Penalty
const V08 = 'FiXtUREv8888888888888888888888888888888888hh' // Out of Set
// Out-of-set validator at ASO cap — outOfSetCta surfaces the cap-binding CTA.
const VCAP = 'FiXtUREvoCAPASOhi6666666666666666666666666ff'
const SHEET = '[role="dialog"]'

test.beforeEach(async ({ page }) => {
  await page.goto('/test-')
  await page.waitForSelector('tbody tr', { timeout: 30000 })
})

test('V08 (Out of Set) rank cell shows a "below" cutoff sub-label', async ({
  page,
}) => {
  const row = page.locator(`tbody tr[data-vote-account="${V08}"]`).first()
  await expect(row).toBeVisible()
  const rankText = (await row.locator('td:nth-child(1)').innerText()).trim()
  // Format is "#N\nM below" for out-of-set rows (see RankCell in
  // sam-table.tsx). The "below" sub-label is the contract.
  expect(rankText).toMatch(/below/i)
})

test('V04 (Critical Bond) row carries the Critical chip', async ({ page }) => {
  const row = page.locator(`tbody tr[data-vote-account="${V04}"]`).first()
  await expect(row).toBeVisible()
  const bondText = await row.locator('td:nth-child(4)').innerText()
  expect(bondText).toMatch(/Critical/i)
})

test('V04 detail sheet Bond tab surfaces the critical CTA', async ({
  page,
}) => {
  await page.goto(`/test-?v=${V04}`)
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 10000 })
  await page
    .locator(SHEET)
    .getByRole('button', { name: 'Bond', exact: true })
    .first()
    .click()
  // The critical bond surfaces a Top-up / risk-fee CTA in the breakdown
  // banner. We accept any of the canonical critical strings from
  // bondAdvice() since the exact wording depends on coverage math.
  await expect(
    page
      .locator(SHEET)
      .getByText(
        /Top up.*to.*(avoid the bond risk fee|keep your stake)|bond risk fee/i,
      )
      .first(),
  ).toBeVisible()
})

test('V06 detail sheet Next-Step tip points at the Bidding lever', async ({
  page,
}) => {
  await page.goto(`/test-?v=${V06}`)
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 10000 })
  // Bid-too-low penalty → the canonical tip mentions "Raise bid" or a
  // "Simulate →" path. Either phrasing is acceptable per bondAdvice.
  await expect(
    page
      .locator(SHEET)
      .getByText(/Raise bid|Simulate →|bid/i)
      .first(),
  ).toBeVisible()
})

test('VCAP (out-of-set at ASO cap) row tip names the binding constraint', async ({
  page,
}) => {
  const row = page.locator(`tbody tr[data-vote-account="${VCAP}"]`).first()
  await expect(row).toBeVisible()
  // outOfSetCta fires for out-of-set validators and surfaces the cap-binding
  // cause line: "<ASO name> at ASO cap." — instead of the generic bid/rank
  // message. This confirms the cap constraint overrides the rank CTA.
  await expect(row.getByText(/OVH SAS at ASO cap/i).first()).toBeVisible()
})

test('V08 (Out of Set) row carries the destructive out-of-set tint', async ({
  page,
}) => {
  const row = page.locator(`tbody tr[data-vote-account="${V08}"]`).first()
  const cls = (await row.getAttribute('class')) ?? ''
  // sam-table.tsx tints out-of-set rows with a destructive background.
  expect(cls).toMatch(/destructive|out-of-set|bg-destructive/i)
})
