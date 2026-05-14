// Expert vs Basic mode — route prefix toggles, expert exposes hidden rows on
// SAM, exposes extra "Last Epoch Bids" subline on Events, exposes
// "Max protectable" chip + column on Bonds.
//
// Uses deterministic /test- routes so we can compare row counts on the same
// dataset, and the live api.har for routes that don't have a /test- variant.
import { test, expect } from '@playwright/test'
import { test as testMocked } from './fixtures/mock-api'
import type { Page } from '@playwright/test'

async function waitForTableRows(page: Page) {
  await page.waitForSelector('tbody tr', { timeout: 30000 })
}

test.describe('expert toggle — SAM filter exposes long tail', () => {
  test('expert /expert-/ shows ≥ basic / row count on the same dataset', async ({
    page,
  }) => {
    // Use the live api.har route (/ vs /expert-) because /test- has only one
    // level. We're comparing the same underlying dataset across two URLs.
    await page.routeFromHAR('tests/fixtures/api.har', {
      url: /marinade\.finance/,
      notFound: 'fallback',
    })

    await page.goto('/expert-')
    await waitForTableRows(page)
    const expertCount = await page.locator('tbody tr[role="button"]').count()

    await page.goto('/')
    await waitForTableRows(page)
    const basicCount = await page.locator('tbody tr[role="button"]').count()

    // Expert keeps the long tail; basic hides validators with no marinade
    // stake or with bond runway below minBondEpochs.
    expect(expertCount).toBeGreaterThanOrEqual(basicCount)
  })

  test('basic mode strictly fewer rows than expert on a live fixture', async ({
    page,
  }) => {
    // Stronger assertion: there should *exist* at least one validator that
    // expert reveals but basic hides. If this fails on the api.har dataset,
    // either the fixture has no filter-eligible validators or the filter is
    // broken.
    await page.routeFromHAR('tests/fixtures/api.har', {
      url: /marinade\.finance/,
      notFound: 'fallback',
    })
    await page.goto('/expert-')
    await waitForTableRows(page)
    const expertCount = await page.locator('tbody tr[role="button"]').count()

    await page.goto('/')
    await waitForTableRows(page)
    const basicCount = await page.locator('tbody tr[role="button"]').count()

    expect(expertCount).toBeGreaterThan(basicCount)
  })
})

test.describe('expert toggle — Bonds Max protectable chip and column', () => {
  testMocked('expert bonds page shows the "Max protectable" stat chip', async ({
    page,
  }) => {
    await page.goto('/expert-bonds')
    // Either inside the hero or in the bonds table — the label should appear.
    await expect(page.getByText(/Max protectable/i).first()).toBeVisible({
      timeout: 30000,
    })
  })

  testMocked('basic bonds page does NOT show "Max protectable" chip', async ({
    page,
  }) => {
    await page.goto('/bonds')
    // Wait for hero/table to render.
    await page.waitForSelector('table', { timeout: 30000 })
    await expect(page.getByText(/Max protectable/i)).toHaveCount(0)
  })

  testMocked('expert bonds table has the "Max protectable [SOL]" column', async ({
    page,
  }) => {
    await page.goto('/expert-bonds')
    await page.waitForSelector('table', { timeout: 30000 })
    const headers = await page.locator('thead th').allInnerTexts()
    expect(headers.some(h => /Max protectable/i.test(h))).toBe(true)
  })

  testMocked('basic bonds table does NOT have the "Max protectable" column', async ({
    page,
  }) => {
    await page.goto('/bonds')
    await page.waitForSelector('table', { timeout: 30000 })
    const headers = await page.locator('thead th').allInnerTexts()
    expect(headers.some(h => /Max protectable/i.test(h))).toBe(false)
  })
})

test.describe('expert toggle — Events "Last Epoch Bids" subline', () => {
  testMocked('expert events page surfaces "Last Epoch Bids" subline when bids > 0', async ({
    page,
  }) => {
    await page.goto('/expert-protected-events')
    // The Events page has a Last settled epoch tile with an optional bids subline.
    await page.waitForSelector('table', { timeout: 30000 })
    // Bids subline is conditional on the data. If the api.har fixture has no
    // last-epoch bids, this test should be a no-op skip — but per the spec,
    // expert mode must at least make the "Last settled epoch" tile visible.
    await expect(page.getByText(/Last settled epoch/i).first()).toBeVisible()
    // Aspirational: the bids subline should be visible somewhere on the page.
    await expect(page.getByText(/SOL bids/i).first()).toBeVisible({
      timeout: 5000,
    })
  })

  testMocked('basic events page does NOT show "SOL bids" subline', async ({
    page,
  }) => {
    await page.goto('/protected-events')
    await page.waitForSelector('table', { timeout: 30000 })
    await expect(page.getByText(/SOL bids/i)).toHaveCount(0)
  })
})

test.describe('expert toggle — Navigation Docs link tracks level', () => {
  testMocked('expert nav Docs link points to /expert-docs', async ({ page }) => {
    await page.goto('/expert-')
    const docsLink = page.getByRole('link', { name: 'Docs', exact: true }).first()
    await expect(docsLink).toBeVisible()
    const href = await docsLink.getAttribute('href')
    expect(href).toBe('/expert-docs')
  })

  testMocked('basic nav Docs link points to /docs', async ({ page }) => {
    await page.goto('/')
    const docsLink = page.getByRole('link', { name: 'Docs', exact: true }).first()
    await expect(docsLink).toBeVisible()
    const href = await docsLink.getAttribute('href')
    expect(href).toBe('/docs')
  })
})
