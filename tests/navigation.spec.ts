// Navigation tests: tab links + Docs link visible on the SAM page.
// Basic mode only — expert routes are not tested (see CLAUDE.md).
import { test, expect } from '@playwright/test'

const TABS = [
  'Stake Auction Marketplace',
  'Protected Events',
  'Validator Bonds',
] as const

test('navigation: 3 tab links and Docs link visible', async ({ page }) => {
  await page.goto('/test-')
  await page.waitForSelector('nav, [class*="navigation"]', { timeout: 15000 })
  for (const tab of TABS) {
    await expect(page.getByRole('link', { name: tab })).toBeVisible()
  }
  await expect(page.getByRole('link', { name: /Docs/i }).first()).toBeVisible()
})

test('navigation: Docs link points to /docs in basic mode', async ({
  page,
}) => {
  await page.goto('/test-')
  await page.waitForSelector('nav, [class*="navigation"]', { timeout: 15000 })
  const docsLink = page.locator('.docsButton').first()
  await expect(docsLink).toHaveAttribute('href', '/docs')
})
