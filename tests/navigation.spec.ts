// Navigation tests: tab links, route navigation, expert routes load, docs link.
import { test, expect } from './fixtures/mock-api'

const ROUTES = [
  { path: '/', tab: 'Stake Auction Marketplace' },
  { path: '/protected-events', tab: 'Protected Events' },
  { path: '/bonds', tab: 'Validator Bonds' },
] as const

const EXPERT_ROUTES = ['/expert-', '/expert-bonds', '/expert-protected-events']

async function waitForNav(page: Parameters<typeof expect>[0]) {
  await (page as import('@playwright/test').Page).waitForSelector('.navigation', { timeout: 15000 })
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
    await expect(page.locator('.docsButton').first()).toBeVisible()
    await expect(page.locator('.docsButton').first()).toContainText('Docs')
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
      await expect(page.locator('.navigation')).toBeVisible()
    })
  }

  test('Classic UI link visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Classic UI' })).toBeVisible()
  })

  test('basic mode hides Expert Guide link in nav', async ({ page }) => {
    await expect(page.locator('.navigation').getByRole('link', { name: 'Expert Guide' })).not.toBeVisible()
  })

  test('/expert- shows Expert Guide link', async ({ page }) => {
    await page.goto('/expert-')
    await waitForNav(page)
    await expect(page.locator('.navigation').getByRole('link', { name: 'Expert Guide' })).toBeVisible()
  })
})
