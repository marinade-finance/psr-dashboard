// Concentration page (/concentration): the ASO and country splits of SAM
// target stake, each a donut + ranked table. Runs against /test-concentration
// so the auction and cluster-stats fixtures make the shares deterministic.
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const DONUT = 'svg[role="img"]'
const SEGMENT = '.donutSegment'
const LEGEND_ROW = '.splitLegendRow'
const TABLE = '.splitTable'

// Section order on the page: ASO first, country second.
const ASO = 0
const COUNTRY = 1

async function gotoConcentration(page: Page) {
  await page.goto('/test-concentration')
  await page.waitForSelector('tbody tr', { timeout: 30000 })
}

test.describe('concentration page — both dimensions', () => {
  test('renders one donut per dimension, each named', async ({ page }) => {
    await gotoConcentration(page)
    await expect(page.locator(DONUT)).toHaveCount(2)
    await expect(page.locator(DONUT).nth(ASO)).toHaveAttribute(
      'aria-label',
      /split across ASOs/,
    )
    await expect(page.locator(DONUT).nth(COUNTRY)).toHaveAttribute(
      'aria-label',
      /split across countries/,
    )
  })

  test('renders one table per dimension, headed by that dimension', async ({
    page,
  }) => {
    await gotoConcentration(page)
    await expect(page.locator(TABLE)).toHaveCount(2)
    await expect(page.locator(TABLE).nth(ASO).locator('thead')).toContainText(
      'ASO',
    )
    await expect(
      page.locator(TABLE).nth(COUNTRY).locator('thead'),
    ).toContainText('Country')
  })

  test('both splits carry the same column grammar', async ({ page }) => {
    await gotoConcentration(page)
    for (const index of [ASO, COUNTRY]) {
      const table = page.locator(TABLE).nth(index)
      await expect(table).toContainText('SAM target stake')
      await expect(table).toContainText('Share of SAM')
      await expect(table).toContainText('Share of network')
      await expect(table).toContainText('Validators')
    }
  })

  test('the country split names real countries', async ({ page }) => {
    await gotoConcentration(page)
    await expect(
      page.locator(TABLE).nth(COUNTRY).locator('tbody'),
    ).toContainText(/Japan|Germany|Finland|Singapore/)
  })
})

test.describe('concentration page — donut', () => {
  test('neither donut draws more than six segments', async ({ page }) => {
    // Past six a donut stops being readable — the tail must fold into Other.
    await gotoConcentration(page)
    const donuts = page.locator(DONUT)
    for (const index of [ASO, COUNTRY]) {
      const count = await donuts.nth(index).locator(SEGMENT).count()
      expect(count).toBeGreaterThan(1)
      expect(count).toBeLessThanOrEqual(6)
    }
  })

  test('centre reads the total and group count until hovered', async ({
    page,
  }) => {
    await gotoConcentration(page)
    await expect(page.getByText(/across \d+ ASOs/)).toBeVisible()
    await expect(page.getByText(/across \d+ countries/)).toBeVisible()
  })

  test('hovering a legend row swaps that centre readout only', async ({
    page,
  }) => {
    await gotoConcentration(page)
    await page.locator(LEGEND_ROW).first().hover()
    // The hovered (ASO) section swaps; the country section is untouched.
    await expect(page.getByText(/across \d+ ASOs/)).toHaveCount(0)
    await expect(page.getByText(/across \d+ countries/)).toBeVisible()
  })
})

test.describe('concentration page — table', () => {
  test('each table holds at least as many rows as its donut has segments', async ({
    page,
  }) => {
    // The donut folds; the table must not.
    await gotoConcentration(page)
    for (const index of [ASO, COUNTRY]) {
      const segments = await page
        .locator(DONUT)
        .nth(index)
        .locator(SEGMENT)
        .count()
      const rows = await page
        .locator(TABLE)
        .nth(index)
        .locator('tbody tr')
        .count()
      expect(rows).toBeGreaterThanOrEqual(segments)
    }
  })

  test('shows an em-dash where the network has no share for a group', async ({
    page,
  }) => {
    // Some fixture groups are deliberately absent from cluster-stats; a
    // missing share must not render as 0%.
    await gotoConcentration(page)
    await expect(page.locator(TABLE).nth(ASO)).toContainText('—')
    await expect(page.locator(TABLE).nth(COUNTRY)).toContainText('—')
  })
})

test.describe('concentration page — guide link', () => {
  test('the Share of SAM help links to the guide, not back to this page', async ({
    page,
  }) => {
    // Regression: a bare 'concentration' slug is used verbatim as an href, so
    // it resolves relative to the current route and reopens this page instead
    // of reaching the guide anchor.
    await gotoConcentration(page)
    // The HelpTip trigger is a button; clicking pins the tip open.
    await page.locator(TABLE).nth(ASO).locator('thead button').first().click()
    const link = page.getByRole('link', { name: /Learn more/i }).first()
    await expect(link).toHaveAttribute(
      'href',
      /^\/(expert-)?docs#concentration$/,
    )
  })
})

test.describe('concentration page — sorting', () => {
  // Reads [group, network share] per row of the country table.
  const networkColumn = (page: Page) =>
    page
      .locator(TABLE)
      .nth(COUNTRY)
      .locator('tbody tr')
      .evaluateAll(rows =>
        rows.map(r => [
          r.children[0].textContent?.trim() ?? '',
          r.children[3].textContent?.trim() ?? '',
        ]),
      )

  test('sorting by network share actually reverses direction', async ({
    page,
  }) => {
    // Regression: mapping a missing share to -Infinity hit the generic Table's
    // direction-invariant escape hatch (it returns before applying the sort
    // direction), so unknown rows pinned to the same end in BOTH directions.
    await gotoConcentration(page)
    const header = page
      .locator(TABLE)
      .nth(COUNTRY)
      .getByText('Share of network')

    await header.click()
    const asc = await networkColumn(page)
    await header.click()
    const desc = await networkColumn(page)

    // Known shares reverse. Rows without one are excluded here because they
    // all tie, and a tie keeps the default stake order in both directions.
    const known = (rows: string[][]) =>
      rows.filter(([, share]) => share !== '—').map(([group]) => group)
    expect(known(asc).length).toBeGreaterThan(1)
    expect(known(desc)).toEqual([...known(asc)].reverse())
  })

  test('rows with no network share rank below every real share', async ({
    page,
  }) => {
    await gotoConcentration(page)
    const header = page
      .locator(TABLE)
      .nth(COUNTRY)
      .getByText('Share of network')

    // Descending: the largest share leads and the em-dashes fall to the end.
    await header.click()
    await header.click()
    const desc = await networkColumn(page)
    const shares = desc.map(([, share]) => share)
    const firstDash = shares.indexOf('—')

    expect(firstDash).toBeGreaterThan(0)
    // Every row from the first em-dash onward is an em-dash — none stranded
    // above a real share.
    expect(shares.slice(firstDash).every(s => s === '—')).toBe(true)
  })
})

test.describe('concentration page — navigation', () => {
  test('is reachable from the nav tab', async ({ page }) => {
    await page.goto('/test-concentration')
    await expect(
      page.locator('.navigation').getByText('Concentration'),
    ).toBeVisible()
  })
})
