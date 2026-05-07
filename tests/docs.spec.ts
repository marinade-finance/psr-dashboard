// Docs page tests: React DocsPage at /docs (basic) and /expert-docs (expert).
// Tab switcher visible only in expert mode; default doc differs by level;
// in-doc anchor links (e.g. #GUIDE) switch the active doc.
import { expect, test } from './fixtures/mock-api'

test.describe('Docs page', () => {
  test('/docs loads basic guide', async ({ page }) => {
    await page.goto('/docs')
    await expect(
      page.getByRole('heading', { name: 'PSR Dashboard Guide' }),
    ).toBeVisible()
  })

  test('/docs guide has Data Sources section', async ({ page }) => {
    await page.goto('/docs')
    await expect(page.getByText('Data Sources')).toBeVisible()
  })

  test('/expert-docs defaults to expert guide', async ({ page }) => {
    await page.goto('/expert-docs')
    await expect(
      page.getByRole('heading', { name: /Expert View/ }),
    ).toBeVisible()
  })

  test('basic mode: tab switcher is hidden', async ({ page }) => {
    await page.goto('/docs')
    await expect(
      page.getByRole('button', { name: 'Expert Guide' }),
    ).toHaveCount(0)
  })

  test('expert mode: both tabs are visible', async ({ page }) => {
    await page.goto('/expert-docs')
    await expect(
      page.getByRole('button', { name: 'Guide', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Expert Guide' }),
    ).toBeVisible()
  })

  test('expert mode: clicking Guide tab loads basic guide', async ({
    page,
  }) => {
    await page.goto('/expert-docs')
    await page.getByRole('button', { name: 'Guide', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'PSR Dashboard Guide' }),
    ).toBeVisible()
  })

  test('expert guide #GUIDE link switches to basic guide', async ({ page }) => {
    await page.goto('/expert-docs')
    // Markdown body link "[Dashboard Guide](#GUIDE)" rendered as a button.
    await page.getByRole('button', { name: 'Dashboard Guide' }).click()
    await expect(
      page.getByRole('heading', { name: 'PSR Dashboard Guide' }),
    ).toBeVisible()
  })
})

test.describe('Docs link from navigation', () => {
  test('basic mode Docs link navigates to /docs', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.navigation', { timeout: 15000 })
    const docs = page.locator('.docsButton').first()
    await expect(docs).toBeVisible()
    await expect(docs).toHaveAttribute('href', '/docs')
  })

  test('expert mode Docs link navigates to /expert-docs', async ({ page }) => {
    await page.goto('/expert-')
    await page.waitForSelector('.navigation', { timeout: 15000 })
    const docs = page.locator('.docsButton').first()
    await expect(docs).toHaveAttribute('href', '/expert-docs')
  })
})
