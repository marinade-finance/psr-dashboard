// SAM page smoke: page loads, headline metrics + columns visible, bond
// health labels render. Sort behaviour lives in sam-bond-sort.spec.ts,
// simulation in simulation-cycle.spec.ts.
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/test-')
  await page.waitForSelector('tbody tr', { timeout: 50000 })
})

test('table loads with rows', async ({ page }) => {
  expect(await page.locator('tbody tr').count()).toBeGreaterThan(0)
})

test('all headline metrics visible', async ({ page }) => {
  for (const label of ['Re-delegation', 'Winning APY', 'Total Auction Stake']) {
    await expect(page.getByText(label).first()).toBeVisible()
  }
})

test('header columns present (#, Validator, Max APY, Bond, Stake, Next Step)', async ({
  page,
}) => {
  const headers = await page.locator('thead th').allInnerTexts()
  for (const col of [
    '#',
    'Validator',
    'Max APY',
    'Bond',
    'Stake',
    'Next Step',
  ]) {
    expect(
      headers.some(h => h.includes(col)),
      `column "${col}" missing`,
    ).toBe(true)
  }
})

test('Total Auction Stake renders with comma-formatted SOL', async ({
  page,
}) => {
  const card = page
    .locator('div')
    .filter({ hasText: /^Total Auction Stake/ })
    .first()
  await expect(card).toBeVisible()
  expect(await card.innerText()).toMatch(/\d{1,3}(,\d{3})+/)
})

test('Winning APY contains a valid percentage', async ({ page }) => {
  const card = page
    .locator('div')
    .filter({ hasText: /^Winning APY/ })
    .first()
  const text = await card.innerText()
  expect(text).toContain('%')
  expect(text).not.toContain('NaN')
})

test('bond column carries Healthy / Watch / Critical labels', async ({
  page,
}) => {
  // Column order: # · Validator · Stake · Max APY · Bond — Bond is 5th.
  const bondCells = page.locator('tbody tr td:nth-child(5)')
  const count = await bondCells.count()
  const texts: string[] = []
  for (let i = 0; i < Math.min(count, 30); i++) {
    texts.push(await bondCells.nth(i).innerText())
  }
  expect(texts.some(t => /Healthy|Watch|Critical/.test(t))).toBe(true)
})

test('winning-set divider appears when sorted by Max APY', async ({ page }) => {
  // The cutoff divider partitions by winning APY, so it only renders under the
  // Max APY sort. Default sort is Stake, so sort by Max APY first.
  await page
    .locator('thead th')
    .filter({ hasText: /Max APY/ })
    .first()
    .click({ position: { x: 10, y: 10 } })
  await expect(page.getByText(/Winning Set Cutoff/i).first()).toBeVisible()
})
