// Visual-regression snapshots: every screen at desktop 1440x900 and mobile
// 390x844 (iPhone 14 portrait). Test routes (/test-, /test-bonds,
// /test-protected-events) feed deterministic fixtures so snapshots are stable;
// /expert- variants fall back to the live HAR-recorded fixtures because there
// is no UI toggle to flip a test route into expert mode.
//
// First run: `pnpm test:e2e:update tests/visual-responsive.spec.ts` to create
// baselines under tests/__screenshots__/. Subsequent runs compare against them.
// Baselines are gitignored.
import { test, expect } from './fixtures/mock-api'
import type { Page } from '@playwright/test'

const DESKTOP = { width: 1440, height: 900 } as const
const MOBILE = { width: 390, height: 844 } as const

const VIEWPORTS = [
  { name: 'desktop', size: DESKTOP },
  { name: 'mobile', size: MOBILE },
] as const

// Pin theme to dark (the app default) so the first navigation is stable. Tests
// that exercise light mode override this in their own beforeEach.
async function pinTheme(page: Page, theme: 'dark' | 'light') {
  await page.addInitScript(t => {
    localStorage.setItem('theme', t)
  }, theme)
}

// The announcement banner is data-driven (react-query 'notifications-broadcast').
// Test routes hardcode `null` so the banner never renders; the HAR fixture has
// no /v1/notifications response either. No banner tests are needed under the
// current fixture set — the banner state is documented in src/components/banner
// and exercised by component-level tests. If a fixture is added later, layer a
// banner-visible/banner-dismissed test pair on top of this file.

// Replace volatile content (epoch numbers, "last updated" labels) so diffs
// stay stable across deterministic runs. Pulled from elements with attributes
// or text we can target. For the test routes these values are already fixed,
// but we still mask them defensively in case a fixture changes.
function volatileMasks(page: Page) {
  return [
    page.locator('text=/Epoch \\d+/').first(),
  ]
}

async function waitForTable(page: Page) {
  await page.waitForSelector('tbody tr', { timeout: 60000 })
  // give layout, fonts, and any in-flight transitions a beat to settle
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.waitForTimeout(300)
}

async function snap(page: Page, name: string) {
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    mask: volatileMasks(page),
    animations: 'disabled',
    // Allow a tiny pixel budget so anti-aliasing on text doesn't fail runs.
    maxDiffPixelRatio: 0.01,
  })
}

for (const { name: vp, size } of VIEWPORTS) {
  test.describe(`visual ${vp} (${size.width}x${size.height})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(size)
      await pinTheme(page, 'dark')
    })

    test(`sam-basic-${vp}`, async ({ page }) => {
      await page.goto('/test-')
      await waitForTable(page)
      await snap(page, `sam-${vp}-basic.png`)
    })

    test(`sam-expert-${vp}`, async ({ page }) => {
      // No UI toggle exists; expert mode is route-driven and the test route
      // hardcodes Basic. Fall back to the live route, which uses HAR fixtures
      // mounted by ./fixtures/mock-api.
      await page.goto('/expert-')
      await waitForTable(page)
      await snap(page, `sam-${vp}-expert.png`)
    })

    test(`sam-detail-open-${vp}`, async ({ page }) => {
      // Deep-link to a fixture validator: opens the sheet on page load.
      await page.goto(
        '/test-?v=FiXtUREv1111111111111111111111111111111111aa',
      )
      await waitForTable(page)
      await expect(page.locator('[role="dialog"]').first()).toBeVisible({
        timeout: 10000,
      })
      await page.waitForTimeout(300)
      await snap(page, `sam-${vp}-detail-open.png`)
    })

    test(`sam-simulation-active-${vp}`, async ({ page }) => {
      await page.goto(
        '/test-?v=FiXtUREv1111111111111111111111111111111111aa',
      )
      await waitForTable(page)
      const sheet = page.locator('[role="dialog"]').first()
      await expect(sheet).toBeVisible({ timeout: 10000 })
      const sw = sheet.getByRole('switch', {
        name: /Toggle simulation mode/i,
      })
      await sw.click()
      await expect(sheet.getByText('What-If Simulation')).toBeVisible()
      const bid = sheet.locator('input[type="number"]').first()
      await bid.fill('0.5')
      // Allow the auction re-run to complete; the table grades rows after a
      // simulation pass.
      await page.waitForTimeout(800)
      await snap(page, `sam-${vp}-simulation-active.png`)
    })

    test(`bonds-${vp}`, async ({ page }) => {
      await page.goto('/test-bonds')
      await page.waitForSelector('table', { timeout: 60000 })
      await page.waitForLoadState('networkidle').catch(() => undefined)
      await page.waitForTimeout(300)
      await snap(page, `bonds-${vp}-basic.png`)
    })

    test(`bonds-expert-${vp}`, async ({ page }) => {
      await page.goto('/expert-bonds')
      await page.waitForSelector('table', { timeout: 60000 })
      await page.waitForLoadState('networkidle').catch(() => undefined)
      await page.waitForTimeout(300)
      await snap(page, `bonds-${vp}-expert.png`)
    })

    test(`events-${vp}`, async ({ page }) => {
      await page.goto('/test-protected-events')
      await page.waitForSelector('table', { timeout: 60000 })
      await page.waitForLoadState('networkidle').catch(() => undefined)
      await page.waitForTimeout(300)
      await snap(page, `events-${vp}-basic.png`)
    })

    test(`events-expert-${vp}`, async ({ page }) => {
      await page.goto('/expert-protected-events')
      await page.waitForSelector('table', { timeout: 60000 })
      await page.waitForLoadState('networkidle').catch(() => undefined)
      await page.waitForTimeout(300)
      await snap(page, `events-${vp}-expert.png`)
    })

    test(`events-filtered-${vp}`, async ({ page }) => {
      await page.goto('/test-protected-events')
      await page.waitForSelector('table', { timeout: 60000 })
      const input = page.getByLabel('Validator filter')
      await input.fill('FiXt')
      // Debounce / table re-render
      await page.waitForTimeout(500)
      await snap(page, `events-${vp}-filtered.png`)
    })

    test(`docs-${vp}`, async ({ page }) => {
      await page.goto('/docs')
      await expect(
        page.getByRole('heading', { name: 'PSR Dashboard Guide' }),
      ).toBeVisible({ timeout: 30000 })
      await page.waitForLoadState('networkidle').catch(() => undefined)
      await page.waitForTimeout(300)
      await snap(page, `docs-${vp}-first-tab.png`)
    })

    test(`sam-light-${vp}`, async ({ page, context }) => {
      // Override the dark pin set in beforeEach.
      await context.addInitScript(() => {
        localStorage.setItem('theme', 'light')
      })
      await page.goto('/test-')
      await waitForTable(page)
      await snap(page, `sam-${vp}-light.png`)
    })

    test(`bonds-light-${vp}`, async ({ page, context }) => {
      await context.addInitScript(() => {
        localStorage.setItem('theme', 'light')
      })
      await page.goto('/test-bonds')
      await page.waitForSelector('table', { timeout: 60000 })
      await page.waitForLoadState('networkidle').catch(() => undefined)
      await page.waitForTimeout(300)
      await snap(page, `bonds-${vp}-light.png`)
    })

    test(`nav-${vp}`, async ({ page }) => {
      // Snapshot just the top nav bar at this viewport. On mobile the nav
      // shrinks: link labels collapse from "Stake Auction Marketplace" to
      // "SAM", the divider/title block hide, and overflow-x-auto kicks in.
      await page.goto('/test-')
      await waitForTable(page)
      const nav = page.locator('.navigation').first()
      await expect(nav).toBeVisible()
      await expect(nav).toHaveScreenshot(`nav-${vp}.png`, {
        animations: 'disabled',
      })
    })
  })
}
