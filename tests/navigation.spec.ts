// Navigation tests: tab links, route navigation, expert routes load, docs link.
import { test, expect } from './fixtures/mock-api'

const ROUTES = [
  { path: '/', tab: 'Stake Auction Marketplace' },
  { path: '/protected-events', tab: 'Protected Events' },
  { path: '/bonds', tab: 'Validator Bonds' },
] as const

const EXPERT_ROUTES = ['/expert-', '/expert-bonds', '/expert-protected-events']

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
    await expect(page.getByRole('link', { name: /Docs/i }).first()).toBeVisible()
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

  test('Classic UI link visible and navigates to /old', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Classic UI' })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL('/old')
  })

  test('basic mode hides Expert Guide link in nav', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Expert Guide' })).not.toBeVisible()
  })

  test('/expert- shows Expert Guide link and expert Docs link', async ({ page }) => {
    await page.goto('/expert-')
    await waitForNav(page)
    await expect(page.getByRole('link', { name: 'Expert Guide' })).toBeVisible()
    // Expert mode Docs link points to expert docs
    const docsLink = page.getByRole('link', { name: /Expert Guide/ }).first()
    const href = await docsLink.getAttribute('href')
    expect(href).toContain('from=expert')
  })

  test('/expert- Classic UI link goes to /expert-old', async ({ page }) => {
    await page.goto('/expert-')
    await waitForNav(page)
    const link = page.getByRole('link', { name: 'Classic UI' })
    await link.click()
    await expect(page).toHaveURL('/expert-old')
  })
})
