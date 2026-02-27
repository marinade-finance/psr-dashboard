// Navigation tests: tab links, route navigation, active class per route,
// expert routes load, docs link, expert guide link, deep link active state.
import { test, expect } from './fixtures/mock-api'

const ROUTES = [
  { path: '/', tab: 'Stake Auction Marketplace' },
  { path: '/protected-events', tab: 'Protected Events' },
  { path: '/bonds', tab: 'Validator Bonds' },
] as const

const EXPERT_ROUTES = ['/expert-', '/expert-bonds', '/expert-protected-events']

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[class*="navigation"]', { timeout: 15000 })
  })

  test('3 tab links and docs link visible', async ({ page }) => {
    const nav = page.locator('[class*="navigation"]')
    for (const { tab } of ROUTES) {
      await expect(nav.getByRole('link', { name: tab })).toBeVisible()
    }
    const docs = page.locator('[class*="docsButton"]').first()
    await expect(docs).toBeVisible()
    await expect(docs).toHaveText('Docs')
  })

  for (const { path, tab } of ROUTES) {
    test(`clicking ${tab} navigates to ${path}`, async ({ page }) => {
      if (path !== '/') {
        // already on /, click the tab
        await page.locator('[class*="navigation"]').getByRole('link', { name: tab }).click()
      } else {
        // navigate away first, then click back
        await page.goto('/bonds')
        await page.waitForSelector('[class*="navigation"]')
        await page.locator('[class*="navigation"]').getByRole('link', { name: tab }).click()
      }
      await expect(page).toHaveURL(path)
    })
  }

  for (const { path, tab } of ROUTES) {
    test(`active class on ${tab} when at ${path}`, async ({ page }) => {
      await page.goto(path)
      await page.waitForSelector('[class*="navigation"]')
      const link = page.locator('[class*="navigation"] a').filter({ hasText: tab })
      const cls = await link.getAttribute('class')
      expect(cls).toMatch(/active/)
    })
  }

  for (const path of EXPERT_ROUTES) {
    test(`${path} loads with navigation`, async ({ page }) => {
      await page.goto(path)
      await page.waitForSelector('[class*="navigation"]', { timeout: 15000 })
      await expect(page).toHaveURL(path)
      await expect(page.locator('[class*="navigation"]')).toBeVisible()
    })
  }

  test('basic mode hides Expert Guide, expert mode shows it', async ({ page }) => {
    const expert = page.locator('[class*="navigation"] a').filter({ hasText: 'Expert Guide' })
    await expect(expert).not.toBeVisible()

    await page.goto('/expert-')
    await page.waitForSelector('[class*="navigation"]')
    await expect(
      page.locator('[class*="navigation"] a').filter({ hasText: 'Expert Guide' }),
    ).toBeVisible()
  })

  test('deep link /bonds has Validator Bonds tab active', async ({ page }) => {
    await page.goto('/bonds')
    await page.waitForSelector('[class*="navigation"]')
    const link = page.locator('[class*="navigation"] a').filter({ hasText: 'Validator Bonds' })
    const cls = await link.getAttribute('class')
    expect(cls).toMatch(/active/)
  })
})
