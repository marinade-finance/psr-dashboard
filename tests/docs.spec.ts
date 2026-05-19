// Docs page tests at /docs (basic only — expert routes are not tested,
// see CLAUDE.md).
import { expect, test } from '@playwright/test'

test('/docs loads the basic guide', async ({ page }) => {
  await page.goto('/docs')
  await expect(
    page.getByRole('heading', { name: 'PSR Dashboard Guide' }),
  ).toBeVisible()
})

test('/docs guide has Data Sources section', async ({ page }) => {
  await page.goto('/docs')
  await expect(page.getByText('Data Sources')).toBeVisible()
})

test('basic mode: expert-only tab switcher is hidden', async ({ page }) => {
  await page.goto('/docs')
  await expect(
    page.getByRole('button', { name: 'Expert Guide' }),
  ).toHaveCount(0)
})

test('basic-mode Docs link in nav navigates to /docs', async ({ page }) => {
  await page.goto('/test-')
  await page.waitForSelector('.navigation', { timeout: 15000 })
  const docs = page.locator('.docsButton').first()
  await expect(docs).toBeVisible()
  await expect(docs).toHaveAttribute('href', '/docs')
})
