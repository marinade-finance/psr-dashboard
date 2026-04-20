// Visual smoke tests: verify all pages render with content (no blank/crash).
// Checks structural integrity without repeating functional assertions from
// page-specific test files.
import { test, expect } from './fixtures/mock-api'

test('no console errors on SAM page', async ({ page }) => {
  const errors: string[] = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto('/')
  await page.waitForSelector('tbody tr', { timeout: 50000 })
  // Filter out known non-critical network errors from HAR not found
  const real = errors.filter(e => !e.includes('Failed to load resource') && !e.includes('net::'))
  expect(real).toHaveLength(0)
})

test('all main routes render without crash', async ({ page }) => {
  const routes = [
    { path: '/', wait: 'tbody tr' },
    { path: '/bonds', wait: 'table' },
    { path: '/protected-events', wait: 'table' },
    { path: '/old', wait: 'tbody tr' },
  ]
  for (const { path, wait } of routes) {
    await page.goto(path)
    await page.waitForSelector(wait, { timeout: 90000 })
    await expect(page.getByText('Error fetching data')).not.toBeVisible()
  }
})

test('/docs/ renders guide content', async ({ page }) => {
  await page.goto('/docs/')
  await expect(page.locator('#content')).toBeVisible()
  await expect(page.locator('#content')).toContainText('PSR Dashboard Guide')
})
