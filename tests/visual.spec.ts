// Visual smoke tests: each basic route renders without crash and without
// console errors. Expert routes are not tested (see CLAUDE.md).
import { test, expect } from '@playwright/test'

const ROUTES = [
  { path: '/test-', wait: 'tbody tr' },
  { path: '/test-bonds', wait: 'table' },
  { path: '/test-protected-events', wait: 'table' },
] as const

test('basic routes render without crash', async ({ page }) => {
  for (const { path, wait } of ROUTES) {
    await page.goto(path)
    await page.waitForSelector(wait, { timeout: 60000 })
    await expect(page.getByText('Error fetching data')).not.toBeVisible()
  }
})

test('no console errors across basic routes', async ({ page }) => {
  const errors: string[] = []
  page.on('console', m => {
    if (m.type() === 'error') errors.push(m.text())
  })
  for (const { path, wait } of ROUTES) {
    await page.goto(path)
    await page.waitForSelector(wait, { timeout: 60000 })
  }
  // Resource-load errors aren't surfaced via test routes (no network calls)
  // but filter defensively for any environment quirks.
  const real = errors.filter(
    e => !e.includes('Failed to load resource') && !e.includes('net::'),
  )
  expect(real).toHaveLength(0)
})

test('/docs renders the guide content', async ({ page }) => {
  await page.goto('/docs')
  await expect(
    page.getByRole('heading', { name: 'PSR Dashboard Guide' }),
  ).toBeVisible()
})
