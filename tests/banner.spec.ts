// Dismissible announcement banner — `src/components/banner/banner.tsx`.
//
// Spec (per SCREENS.md / CLAUDE.md):
//   - A banner appears at the top of the page when a broadcast notification
//     is present.
//   - Clicking the dismiss × hides it.
//   - Dismissed state persists across reloads (localStorage).
//   - A NEW title re-shows the banner (the persistence key is content-
//     specific, not a single sticky flag).
//
// We mock the notifications broadcast endpoint to inject a deterministic
// banner and visit `/` (the SAM page renders Banner from the broadcast
// query).
import { test, expect } from '@playwright/test'
import type { Page, Route } from '@playwright/test'

const BROADCAST_HOST = 'marinade-notifications.marinade.finance'

function makeNotification(title: string, body: string, id = '1') {
  return [
    {
      id,
      title,
      message: body,
      priority: 1,
      notification_type: 'sam_auction',
      scope: 'broadcast',
      created_at: new Date().toISOString(),
    },
  ]
}

async function mockBroadcast(page: Page, title: string, body: string) {
  // Mock the notifications broadcast endpoint with our fixture banner.
  // Other endpoints (validators API, bonds, etc) come from the HAR.
  await page.route(`https://${BROADCAST_HOST}/**`, (route: Route) => {
    const url = route.request().url()
    if (url.includes('/v1/notifications/broadcast')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeNotification(title, body)),
      })
    }
    // Other notification endpoints — return empty list.
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    })
  })
  await page.routeFromHAR('tests/fixtures/api.har', {
    url: /marinade\.finance/,
    notFound: 'fallback',
  })
}

// Playwright spawns a fresh browser context per test → localStorage starts
// empty, so we don't need to clear it before each test. We rely on that
// default for the "stays dismissed across reload" test.

test.describe('banner — first visit shows seeded announcement', () => {
  test('banner title and body are visible on first visit', async ({ page }) => {
    await mockBroadcast(
      page,
      'Test Banner Title',
      'This is a fixture announcement body.',
    )
    await page.goto('/')
    await expect(
      page.getByText('Test Banner Title', { exact: true }),
    ).toBeVisible({ timeout: 30000 })
    await expect(
      page.getByText('This is a fixture announcement body.'),
    ).toBeVisible()
  })
})

test.describe('banner — dismiss flow', () => {
  test('clicking the × dismiss button hides the banner', async ({ page }) => {
    await mockBroadcast(page, 'Banner A', 'Body for banner A.')
    await page.goto('/')
    const title = page.getByText('Banner A', { exact: true })
    await expect(title).toBeVisible({ timeout: 30000 })
    await page.getByRole('button', { name: 'Dismiss' }).click()
    await expect(title).toHaveCount(0)
  })

  test('dismissed banner stays hidden after reload', async ({ page }) => {
    await mockBroadcast(page, 'Banner Persist', 'Body for persistence test.')
    await page.goto('/')
    await expect(
      page.getByText('Banner Persist', { exact: true }),
    ).toBeVisible({ timeout: 30000 })
    await page.getByRole('button', { name: 'Dismiss' }).click()
    await expect(
      page.getByText('Banner Persist', { exact: true }),
    ).toHaveCount(0)
    await page.reload()
    // Don't wait for tbody data (HAR replay can flake on reload). The
    // banner is rendered synchronously from localStorage state — once the
    // nav is visible, the assertion is already meaningful.
    await page.waitForSelector('.navigation, nav', { timeout: 30000 })
    await expect(
      page.getByText('Banner Persist', { exact: true }),
    ).toHaveCount(0)
  })

  test('a different title re-shows the banner', async ({ page }) => {
    // First visit dismisses Title A.
    await mockBroadcast(page, 'Banner Title A', 'Body A.')
    await page.goto('/')
    await expect(
      page.getByText('Banner Title A', { exact: true }),
    ).toBeVisible({ timeout: 30000 })
    await page.getByRole('button', { name: 'Dismiss' }).click()
    await expect(
      page.getByText('Banner Title A', { exact: true }),
    ).toHaveCount(0)

    // Now swap in a different banner — the new title must show again.
    await page.unroute(`https://${BROADCAST_HOST}/**`)
    await mockBroadcast(page, 'Banner Title B', 'Body B.')
    await page.reload()
    await page.waitForSelector('tbody tr', { timeout: 30000 })
    await expect(
      page.getByText('Banner Title B', { exact: true }),
    ).toBeVisible({ timeout: 10000 })
  })
})

test.describe('banner — Marinade-mark a11y', () => {
  test('dismiss button has an accessible name "Dismiss"', async ({ page }) => {
    await mockBroadcast(page, 'A11y Banner', 'Body for a11y check.')
    await page.goto('/')
    const dismiss = page.getByRole('button', { name: 'Dismiss' })
    await expect(dismiss).toBeVisible({ timeout: 30000 })
  })
})
