/*
 * max-w-[1920px] constraint on bonds and protected-events table root divs.
 *
 * Both tables wrap their content in a `max-w-[1920px] mx-auto relative` div
 * so the layout doesn't stretch absurdly wide on ultra-wide monitors while
 * still using all available space up to 1920px.
 *
 * Sources:
 *   - src/components/validator-bonds-table/validator-bonds-table.tsx line ~113
 *   - src/components/protected-events-table/protected-events-table.tsx line ~193
 *
 * References: SCREENS.md § Validator Bonds, § Protected Events.
 */
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function waitForTable(page: Page) {
  await page.waitForSelector('table tbody tr', { timeout: 30000 })
}

/** Return the className of the first div that contains 'max-w-[1920px]'. */
async function findMaxWClass(page: Page): Promise<string> {
  return page.evaluate(() => {
    // CSS attribute selectors cannot contain unescaped `[` inside the value.
    // Walk all divs instead.
    const divs = Array.from(document.querySelectorAll('div'))
    const match = divs.find(d => d.className.includes('max-w-[1920px]'))
    return match?.className ?? ''
  })
}

test.describe('page-width constraint — bonds table', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-bonds')
    await waitForTable(page)
  })

  test('bonds table root div has max-w-[1920px] in its class', async ({
    page,
  }) => {
    const cls = await findMaxWClass(page)
    expect(cls).toContain('max-w-[1920px]')
  })

  test('bonds table root div also has mx-auto', async ({ page }) => {
    const cls = await findMaxWClass(page)
    expect(cls).toContain('mx-auto')
  })

  test('bonds table rendered width does not exceed 1920px', async ({
    page,
  }) => {
    // Viewport is 1280px by default — the div should fit within that.
    const width = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'))
      const match = divs.find(d => d.className.includes('max-w-[1920px]'))
      return match ? match.getBoundingClientRect().width : -1
    })
    expect(width).toBeGreaterThan(0)
    expect(width).toBeLessThanOrEqual(1920)
  })
})

test.describe('page-width constraint — protected events table', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-protected-events')
    await waitForTable(page)
  })

  test('events table root div has max-w-[1920px] in its class', async ({
    page,
  }) => {
    const cls = await findMaxWClass(page)
    expect(cls).toContain('max-w-[1920px]')
  })

  test('events table root div also has mx-auto', async ({ page }) => {
    const cls = await findMaxWClass(page)
    expect(cls).toContain('mx-auto')
  })

  test('events table rendered width does not exceed 1920px', async ({
    page,
  }) => {
    const width = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'))
      const match = divs.find(d => d.className.includes('max-w-[1920px]'))
      return match ? match.getBoundingClientRect().width : -1
    })
    expect(width).toBeGreaterThan(0)
    expect(width).toBeLessThanOrEqual(1920)
  })
})
