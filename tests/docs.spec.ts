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

  test('back button links to dashboard', async ({ page }) => {
    await page.goto('/docs/')
    const back = page.locator('#back')
    await expect(back).toBeVisible()
    await expect(back).toHaveAttribute('href', '../')
  })

  test('Guide tab is active by default', async ({ page }) => {
    await page.goto('/docs/')
    const guideTab = page.locator('.tab[data-doc="GUIDE"]')
    await expect(guideTab).toHaveClass(/active/)
  })

  test('guide content has Data Sources section', async ({ page }) => {
    await page.goto('/docs/')
    await expect(page.locator('#content')).toContainText('Data Sources')
  })

  test('guide content has table with API endpoints', async ({ page }) => {
    await page.goto('/docs/')
    await expect(page.locator('#content table').first()).toBeVisible()
    await expect(page.locator('#content table').first()).toContainText(
      'Validators API',
    )
  })

  test('expert guide tab appears with ?from=expert', async ({ page }) => {
    await page.goto('/docs/?from=expert')
    const expertTab = page.locator('.tab[data-doc="GUIDE-EXPERT"]')
    await expect(expertTab).toBeVisible()
    await expect(expertTab).toHaveText('Expert Guide')
  })

  test('expert guide tab is not visible without ?from=expert', async ({
    page,
  }) => {
    await page.goto('/docs/')
    const expertTab = page.locator('.tab[data-doc="GUIDE-EXPERT"]')
    await expect(expertTab).toHaveCount(0)
  })

  test('clicking Expert Guide tab loads expert content', async ({ page }) => {
    await page.goto('/docs/?from=expert')
    const expertTab = page.locator('.tab[data-doc="GUIDE-EXPERT"]')
    await expertTab.click()
    await expect(expertTab).toHaveClass(/active/)
    await expect(page.locator('#content')).toContainText('Expert View Guide')
  })

  test('back button links to /expert- when from=expert', async ({ page }) => {
    await page.goto('/docs/?from=expert')
    const back = page.locator('#back')
    await expect(back).toHaveAttribute('href', '/expert-')
  })

  test('hash navigation loads correct doc', async ({ page }) => {
    await page.goto('/docs/?from=expert#GUIDE-EXPERT')
    await expect(page.locator('#content')).toContainText('Expert View Guide')
    const expertTab = page.locator('.tab[data-doc="GUIDE-EXPERT"]')
    await expect(expertTab).toHaveClass(/active/)
  })
})

test.describe('Docs link from navigation', () => {
  test('basic mode Docs link navigates to /docs/', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.navigation', { timeout: 15000 })
    const docsLink = page.locator('.docsButton').first()
    await expect(docsLink).toBeVisible()
    await expect(docsLink).toHaveAttribute('href', '/docs/')
  })

  test('expert mode has Expert Guide link to /docs/?from=expert', async ({
    page,
  }) => {
    await page.goto('/expert-')
    await page.waitForSelector('.navigation', { timeout: 15000 })
    const expertGuideLink = page
      .locator('.navigation a')
      .filter({ hasText: 'Expert Guide' })
    await expect(expertGuideLink).toBeVisible()
    await expect(expertGuideLink).toHaveAttribute(
      'href',
      '/docs/?from=expert#GUIDE-EXPERT',
    )
  })
})
