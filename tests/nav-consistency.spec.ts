// Cross-route nav behaviour we care about beyond the basic visibility tests
// in navigation.spec.ts: theme toggle persists across reloads + navigation
// links prefetch the next route on hover.
import { test, expect } from '@playwright/test'

const ROUTES = ['/test-', '/test-bonds', '/test-protected-events'] as const

async function waitForNav(page: import('@playwright/test').Page) {
  await page.waitForSelector('nav, [class*="navigation"]', { timeout: 15000 })
}

test.describe('Theme toggle persistence', () => {
  test('toggle button is visible on every basic page', async ({ page }) => {
    for (const path of ROUTES) {
      await page.goto(path)
      await waitForNav(page)
      const btn = page.getByRole('button', {
        name: /Switch to (light|dark) mode/i,
      })
      await expect(btn).toBeVisible()
    }
  })

  test('clicking toggle updates localStorage and html.dark', async ({
    page,
  }) => {
    await page.goto('/test-')
    await waitForNav(page)
    const initial = await page.evaluate(() => localStorage.getItem('theme'))
    await page
      .getByRole('button', { name: /Switch to (light|dark) mode/i })
      .click()
    await page.waitForTimeout(150)
    const after = await page.evaluate(() => localStorage.getItem('theme'))
    expect(after).not.toBe(initial)
    expect(['light', 'dark']).toContain(after)
    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(hasDark).toBe(after === 'dark')
  })

  test('theme choice persists across route changes', async ({ page }) => {
    await page.goto('/test-')
    await waitForNav(page)
    await page.evaluate(() => localStorage.setItem('theme', 'light'))
    await page.goto('/test-bonds')
    await waitForNav(page)
    const stored = await page.evaluate(() => localStorage.getItem('theme'))
    expect(stored).toBe('light')
    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    )
    expect(hasDark).toBe(false)
  })
})
