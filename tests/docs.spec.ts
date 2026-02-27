// Docs page tests: content rendering, title, tabs (Guide default, Expert
// Guide with ?from=expert), hash navigation, back button links (basic →
// ../, expert → /expert-), docs link from navigation.
import { test, expect } from '@playwright/test'

test.describe('Docs page', () => {
  test('loads /docs/ and renders guide content', async ({ page }) => {
    await page.goto('/docs/')
    await expect(page.locator('#content')).toBeVisible()
    await expect(page.locator('#content')).toContainText('PSR Dashboard Guide')
  })

  test('has page title', async ({ page }) => {
    await page.goto('/docs/')
    await expect(page).toHaveTitle('Docs | PSR Dashboard')
  })

  test('back button: basic links to ../, expert links to /expert-', async ({ page }) => {
    await page.goto('/docs/')
    await expect(page.locator('#back')).toHaveAttribute('href', '../')

    await page.goto('/docs/?from=expert')
    await expect(page.locator('#back')).toHaveAttribute('href', '/expert-')
  })

  test('Guide tab is active by default', async ({ page }) => {
    await page.goto('/docs/')
    await expect(page.locator('.tab[data-doc="GUIDE"]')).toHaveClass(/active/)
  })

  test('guide content has Data Sources section', async ({ page }) => {
    await page.goto('/docs/')
    await expect(page.locator('#content')).toContainText('Data Sources')
  })

  test('guide content has table with API endpoints', async ({ page }) => {
    await page.goto('/docs/')
    await expect(page.locator('#content table').first()).toBeVisible()
    await expect(page.locator('#content table').first()).toContainText('Validators API')
  })

  test('expert guide tab appears with ?from=expert', async ({ page }) => {
    await page.goto('/docs/?from=expert')
    const tab = page.locator('.tab[data-doc="GUIDE-EXPERT"]')
    await expect(tab).toBeVisible()
    await expect(tab).toHaveText('Expert Guide')
  })

  test('expert guide tab is not visible without ?from=expert', async ({ page }) => {
    await page.goto('/docs/')
    await expect(page.locator('.tab[data-doc="GUIDE-EXPERT"]')).toHaveCount(0)
  })

  test('clicking Expert Guide tab loads expert content', async ({ page }) => {
    await page.goto('/docs/?from=expert')
    const tab = page.locator('.tab[data-doc="GUIDE-EXPERT"]')
    await tab.click()
    await expect(tab).toHaveClass(/active/)
    await expect(page.locator('#content')).toContainText('Expert View Guide')
  })

  test('hash navigation loads correct doc', async ({ page }) => {
    await page.goto('/docs/?from=expert#GUIDE-EXPERT')
    await expect(page.locator('#content')).toContainText('Expert View Guide')
    await expect(page.locator('.tab[data-doc="GUIDE-EXPERT"]')).toHaveClass(/active/)
  })
})

test.describe('Docs link from navigation', () => {
  test('basic mode Docs link navigates to /docs/', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.navigation', { timeout: 15000 })
    const docs = page.locator('.docsButton').first()
    await expect(docs).toBeVisible()
    await expect(docs).toHaveAttribute('href', '/docs/')
  })

  test('expert mode has Expert Guide link to /docs/?from=expert', async ({ page }) => {
    await page.goto('/expert-')
    await page.waitForSelector('.navigation', { timeout: 15000 })
    const link = page.locator('.navigation a').filter({ hasText: 'Expert Guide' })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/docs/?from=expert#GUIDE-EXPERT')
  })
})
