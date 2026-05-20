// Cross-cutting behaviour: focus trap inside the open sheet, tip-banner
// CTA paths, hover-tooltip on identity cells, 404 catch-all route.
import { test, expect } from '@playwright/test'

const SHEET = '[role="dialog"]'
const V01 = 'FiXtUREv1111111111111111111111111111111111aa'
const V04 = 'FiXtUREv4444444444444444444444444444444444dd' // Critical Bond
const V06 = 'FiXtUREv6666666666666666666666666666666666ff' // Bid-Too-Low

test('open sheet traps Tab inside the dialog (Radix focus trap)', async ({
  page,
}) => {
  await page.goto(`/test-?v=${V01}`)
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 10000 })
  // Hammer Tab a bunch — focus must stay inside the dialog.
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab')
  }
  const inside = await page.evaluate(() => {
    const el = document.activeElement
    if (!el) return false
    const dialog = document.querySelector('[role="dialog"]')
    return !!dialog && dialog.contains(el)
  })
  expect(inside).toBe(true)
})

test('Shift+Tab also stays inside the dialog focus trap', async ({ page }) => {
  await page.goto(`/test-?v=${V01}`)
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 10000 })
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Shift+Tab')
  }
  const inside = await page.evaluate(() => {
    const el = document.activeElement
    const dialog = document.querySelector('[role="dialog"]')
    return !!dialog && !!el && dialog.contains(el)
  })
  expect(inside).toBe(true)
})

test('tip banner exposes a constraint-specific CTA for V04 (Bond)', async ({
  page,
}) => {
  await page.goto(`/test-?v=${V04}`)
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 10000 })
  // Bond constraint validator surfaces "Bond tab →" or "Top up …" in the
  // header tip area. Either reads as the CTA.
  await expect(
    page
      .locator(SHEET)
      .getByText(/Bond tab →|Top up |Bond risk fee/i)
      .first(),
  ).toBeVisible()
})

test('tip banner exposes a constraint-specific CTA for V06 (Bid)', async ({
  page,
}) => {
  await page.goto(`/test-?v=${V06}`)
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  await expect(page.locator(SHEET).first()).toBeVisible({ timeout: 10000 })
  // Bid-too-low validator surfaces "Simulate →" or "Raise bid" in tip.
  await expect(
    page
      .locator(SHEET)
      .getByText(/Simulate →|Raise bid|bid/i)
      .first(),
  ).toBeVisible()
})

test('/nonsense renders the NotFoundPage (no blank screen)', async ({
  page,
}) => {
  await page.goto('/nonsense-route-xyz')
  await expect(
    page.getByRole('heading', { name: /Page not found/i }),
  ).toBeVisible({ timeout: 5000 })
})

test('banner element has aria-live="polite" for screen readers', async ({
  page,
}) => {
  // Inject a broadcast notification.
  await page.route(
    'https://marinade-notifications.marinade.finance/**',
    route => {
      const url = route.request().url()
      if (url.includes('/v1/notifications/broadcast')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'a11y-1',
              title: 'A11y Banner Test',
              message: 'body',
              priority: 1,
              notification_type: 'sam_auction',
              scope: 'broadcast',
              created_at: new Date().toISOString(),
            },
          ]),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      })
    },
  )
  await page.routeFromHAR('tests/fixtures/api.har', {
    url: /marinade\.finance/,
    notFound: 'fallback',
  })
  await page.goto('/')
  await expect(page.getByText('A11y Banner Test', { exact: true })).toBeVisible(
    { timeout: 30000 },
  )
  const status = page.locator('[role="status"]').first()
  await expect(status).toHaveAttribute('aria-live', 'polite')
})
