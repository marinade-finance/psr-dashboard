// Navigation tests: tab links, route navigation, expert routes load, docs link.
import { test, expect } from './fixtures/mock-api'

const ROUTES = [
  { path: '/', tab: 'Stake Auction Marketplace' },
  { path: '/protected-events', tab: 'Protected Events' },
  { path: '/bonds', tab: 'Validator Bonds' },
] as const

const EXPERT_ROUTES = [
  '/expert-',
  '/expert-bonds',
  '/expert-protected-events',
  '/expert-docs',
]

async function waitForNav(page: import('@playwright/test').Page) {
  await page.waitForSelector('nav, [class*="navigation"]', { timeout: 15000 })
}

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForNav(page)
  })

  test('3 tab links and docs link visible', async ({ page }) => {
    for (const { tab } of ROUTES) {
      await expect(page.getByRole('link', { name: tab })).toBeVisible()
    }
    // Docs link — match by text, not class name
    await expect(
      page.getByRole('link', { name: /Docs/i }).first(),
    ).toBeVisible()
  })

  for (const { path, tab } of ROUTES) {
    test(`clicking ${tab} navigates to ${path}`, async ({ page }) => {
      if (path !== '/') {
        await page.getByRole('link', { name: tab }).click()
      } else {
        await page.goto('/bonds')
        await waitForNav(page)
        await page.getByRole('link', { name: tab }).click()
      }
      await expect(page).toHaveURL(path)
    })
  }

  for (const path of EXPERT_ROUTES) {
    test(`${path} loads with navigation`, async ({ page }) => {
      await page.goto(path)
      await waitForNav(page)
      await expect(page).toHaveURL(path)
    })
  }

  test('/expert- Docs link points to /expert-docs', async ({ page }) => {
    await page.goto('/expert-')
    await waitForNav(page)
    const docsLink = page.locator('.docsButton').first()
    await expect(docsLink).toHaveAttribute('href', '/expert-docs')
  })

  test('basic mode Docs link points to /docs', async ({ page }) => {
    const docsLink = page.locator('.docsButton').first()
    await expect(docsLink).toHaveAttribute('href', '/docs')
  })

  test('active tab: SAM NavLink has aria-current=page on /', async ({
    page,
  }) => {
    // React Router NavLink adds aria-current="page" to the active link.
    // The logo also links to '/' (no aria-current); pick the NavLink by class.
    const samLink = page.locator('.navigation a[href="/"].active')
    await expect(samLink).toHaveAttribute('aria-current', 'page')
  })

  test('active tab: Bonds NavLink has aria-current=page on /bonds', async ({
    page,
  }) => {
    await page.goto('/bonds')
    await waitForNav(page)
    const bondsLink = page.locator('.navigation a[href="/bonds"]')
    await expect(bondsLink).toHaveAttribute('aria-current', 'page')
  })

  test('active tab: Events NavLink has aria-current=page on /protected-events', async ({
    page,
  }) => {
    await page.goto('/protected-events')
    await waitForNav(page)
    const eventsLink = page.locator('.navigation a[href="/protected-events"]')
    await expect(eventsLink).toHaveAttribute('aria-current', 'page')
  })

  test('active tab: SAM NavLink has aria-current=page on /expert-', async ({
    page,
  }) => {
    await page.goto('/expert-')
    await waitForNav(page)
    // On /expert-, the nav SAM link href is /expert-
    const samLink = page.locator('.navigation a[href="/expert-"].active')
    await expect(samLink).toHaveAttribute('aria-current', 'page')
  })

  test('active tab: Bonds NavLink has aria-current=page on /expert-bonds', async ({
    page,
  }) => {
    await page.goto('/expert-bonds')
    await waitForNav(page)
    const bondsLink = page.locator('.navigation a[href="/expert-bonds"]')
    await expect(bondsLink).toHaveAttribute('aria-current', 'page')
  })

  test('active tab: Events NavLink has aria-current=page on /expert-protected-events', async ({
    page,
  }) => {
    await page.goto('/expert-protected-events')
    await waitForNav(page)
    const eventsLink = page.locator('.navigation a[href="/expert-protected-events"]')
    await expect(eventsLink).toHaveAttribute('aria-current', 'page')
  })
})

test.describe('Navigation expert mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/expert-')
    await waitForNav(page)
  })

  test('all 3 tab links present on /expert-', async ({ page }) => {
    // On expert routes the nav links use expert- prefixed hrefs
    const links = page.locator('.navigation a')
    const hrefs = await links.evaluateAll(els =>
      els.map(el => el.getAttribute('href')),
    )
    expect(hrefs).toContain('/expert-')
    expect(hrefs.some(h => h?.includes('expert-bonds'))).toBe(true)
    expect(hrefs.some(h => h?.includes('expert-protected-events'))).toBe(true)
  })

  test('expert Docs link points to /expert-docs', async ({ page }) => {
    const docsLink = page.locator('.docsButton').first()
    await expect(docsLink).toHaveAttribute('href', '/expert-docs')
  })

  for (const path of EXPERT_ROUTES) {
    test(`${path} loads without error`, async ({ page }) => {
      await page.goto(path)
      await waitForNav(page)
      await expect(page).toHaveURL(path)
      await expect(page.getByText('Error fetching data')).not.toBeVisible()
    })
  }
})
