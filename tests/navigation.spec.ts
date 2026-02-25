import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[class*="navigation"]', { timeout: 15000 })
  })

  test('3 tab links are visible', async ({ page }) => {
    const nav = page.locator('[class*="navigation"]')
    await expect(nav.getByRole('link', { name: 'Stake Auction Marketplace' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Protected Events' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Validator Bonds' })).toBeVisible()
  })

  test('docs link is visible', async ({ page }) => {
    const docsLink = page.locator('[class*="docsButton"]').first()
    await expect(docsLink).toBeVisible()
    await expect(docsLink).toHaveText('Docs')
  })

  test('clicking Stake Auction Marketplace tab changes URL to /', async ({
    page,
  }) => {
    // Navigate away first
    await page.goto('/bonds')
    await page.waitForSelector('[class*="navigation"]')

    await page.locator('[class*="navigation"]').getByRole('link', { name: 'Stake Auction Marketplace' }).click()
    await expect(page).toHaveURL('/')
  })

  test('clicking Protected Events tab changes URL to /protected-events', async ({
    page,
  }) => {
    await page.locator('[class*="navigation"]').getByRole('link', { name: 'Protected Events' }).click()
    await expect(page).toHaveURL('/protected-events')
  })

  test('clicking Validator Bonds tab changes URL to /bonds', async ({
    page,
  }) => {
    await page.locator('[class*="navigation"]').getByRole('link', { name: 'Validator Bonds' }).click()
    await expect(page).toHaveURL('/bonds')
  })

  test('active CSS class is applied to current tab on /', async ({ page }) => {
    const samLink = page
      .locator('[class*="navigation"] a')
      .filter({ hasText: 'Stake Auction Marketplace' })
    const className = await samLink.getAttribute('class')
    expect(className).toMatch(/active/)
  })

  test('active CSS class is applied to Protected Events on /protected-events', async ({
    page,
  }) => {
    await page.goto('/protected-events')
    await page.waitForSelector('[class*="navigation"]')

    const link = page
      .locator('[class*="navigation"] a')
      .filter({ hasText: 'Protected Events' })
    const className = await link.getAttribute('class')
    expect(className).toMatch(/active/)
  })

  test('active CSS class is applied to Validator Bonds on /bonds', async ({
    page,
  }) => {
    await page.goto('/bonds')
    await page.waitForSelector('[class*="navigation"]')

    const link = page
      .locator('[class*="navigation"] a')
      .filter({ hasText: 'Validator Bonds' })
    const className = await link.getAttribute('class')
    expect(className).toMatch(/active/)
  })

  test('/expert- loads correctly', async ({ page }) => {
    await page.goto('/expert-')
    await page.waitForSelector('[class*="navigation"]', { timeout: 15000 })
    await expect(page).toHaveURL('/expert-')
    // Navigation should still be present
    await expect(page.locator('[class*="navigation"]')).toBeVisible()
  })

  test('/expert-bonds loads correctly', async ({ page }) => {
    await page.goto('/expert-bonds')
    await page.waitForSelector('[class*="navigation"]', { timeout: 15000 })
    await expect(page).toHaveURL('/expert-bonds')
    await expect(page.locator('[class*="navigation"]')).toBeVisible()
  })

  test('/expert-protected-events loads correctly', async ({ page }) => {
    await page.goto('/expert-protected-events')
    await page.waitForSelector('[class*="navigation"]', { timeout: 15000 })
    await expect(page).toHaveURL('/expert-protected-events')
    await expect(page.locator('[class*="navigation"]')).toBeVisible()
  })

  test('basic mode does not show Expert Guide link', async ({ page }) => {
    const expertGuideLink = page
      .locator('[class*="navigation"] a')
      .filter({ hasText: 'Expert Guide' })
    await expect(expertGuideLink).not.toBeVisible()
  })

  test('expert mode shows Expert Guide link', async ({ page }) => {
    await page.goto('/expert-')
    await page.waitForSelector('[class*="navigation"]')

    const expertGuideLink = page
      .locator('[class*="navigation"] a')
      .filter({ hasText: 'Expert Guide' })
    await expect(expertGuideLink).toBeVisible()
  })
})
