// Visual smoke tests: verify all pages render with content (no blank/crash).
// Full screenshot regression tests can be added after baselines are captured.
import { test, expect } from './fixtures/mock-api'

async function waitForNav(page: import('@playwright/test').Page) {
  await page.waitForSelector('.navigation', { timeout: 15000 })
}

test.describe('Visual smoke', () => {
  test('/ renders SAM table', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('tbody tr', { timeout: 50000 })
    await expect(page.locator('.navigation')).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
    expect(await page.locator('tbody tr').count()).toBeGreaterThan(0)
  })

  test('/expert- renders table', async ({ page }) => {
    await page.goto('/expert-')
    await page.waitForSelector('tbody tr', { timeout: 50000 })
    await expect(page.locator('table')).toBeVisible()
  })

  test('/bonds renders tile map and table', async ({ page }) => {
    await page.goto('/bonds')
    await page.waitForSelector('.metric', { timeout: 30000 })
    await page.waitForSelector('table', { timeout: 30000 })
    await expect(page.locator('.metric').first()).toBeVisible()
    await expect(page.locator('table')).toBeVisible()
  })

  test('/protected-events renders table', async ({ page }) => {
    await page.goto('/protected-events')
    await page.waitForSelector('.metricWrap', { timeout: 30000 })
    await page.waitForSelector('table', { timeout: 30000 })
    await expect(page.locator('table')).toBeVisible()
  })

  test('/old renders classic table', async ({ page }) => {
    await page.goto('/old')
    await page.waitForSelector('tbody tr', { timeout: 90000 })
    await expect(page.locator('table')).toBeVisible()
  })

  test('/docs/ renders guide content', async ({ page }) => {
    await page.goto('/docs/')
    await expect(page.locator('#content')).toBeVisible()
  })

  test('all pages have navigation bar', async ({ page }) => {
    for (const path of ['/', '/bonds', '/protected-events']) {
      await page.goto(path)
      await waitForNav(page)
      await expect(page.locator('.navigation')).toBeVisible()
    }
  })

  test('no console errors on SAM page', async ({ page }) => {
    const errors: string[] = []
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    await page.goto('/')
    await page.waitForSelector('tbody tr', { timeout: 50000 })
    // Filter out known non-critical network errors from HAR not found
    const real = errors.filter(e => !e.includes('Failed to load resource') && !e.includes('net::'))
    expect(real).toHaveLength(0)
  })
})
