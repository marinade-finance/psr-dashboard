// Docs page: markdown rendering, anchor links, code blocks. Basic mode
// only — expert routes are not tested (see CLAUDE.md).
import { test, expect } from '@playwright/test'

test.describe('Docs markdown rendering', () => {
  test('basic guide renders a top-level heading', async ({ page }) => {
    await page.goto('/docs')
    await expect(
      page.getByRole('heading', { level: 1, name: /PSR Dashboard Guide/i }),
    ).toBeVisible()
  })

  test('section heading "Data Sources" is rendered as a heading', async ({
    page,
  }) => {
    await page.goto('/docs')
    await expect(
      page.getByRole('heading', { name: 'Data Sources' }),
    ).toBeVisible()
  })

  test('markdown unordered lists render as <ul><li>', async ({ page }) => {
    await page.goto('/docs')
    await page
      .getByRole('heading', { name: /PSR Dashboard Guide/i })
      .waitFor()
    const lists = page.locator('main ul li, ul li')
    expect(await lists.count()).toBeGreaterThan(0)
  })

  test('inline code spans render with monospaced styling', async ({
    page,
  }) => {
    await page.goto('/docs')
    await page
      .getByRole('heading', { name: /PSR Dashboard Guide/i })
      .waitFor()
    const inline = page.locator('code').first()
    expect(await inline.count()).toBeGreaterThan(0)
    const cls = await inline.getAttribute('class')
    expect(cls || '').toMatch(/font-mono/)
  })

  test('external links open in new tab (target="_blank")', async ({
    page,
  }) => {
    await page.goto('/docs')
    await page
      .getByRole('heading', { name: /PSR Dashboard Guide/i })
      .waitFor()
    const links = page.locator('a[href^="http"]')
    if ((await links.count()) === 0) test.skip(true, 'no external links')
    const target = await links.first().getAttribute('target')
    expect(target).toBe('_blank')
  })
})

test.describe('Docs anchor links', () => {
  test('loading /docs#sam scrolls to the section anchor', async ({ page }) => {
    await page.goto('/docs#sam')
    await page
      .getByRole('heading', { level: 2, name: /How the Auction Works/i })
      .waitFor()
    const heading = page.getByRole('heading', {
      level: 2,
      name: /How the Auction Works/i,
    })
    const box = await heading.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      const viewport = page.viewportSize()
      expect(viewport).not.toBeNull()
      if (viewport) {
        expect(box.y).toBeGreaterThanOrEqual(-5)
        expect(box.y).toBeLessThanOrEqual(viewport.height)
      }
    }
  })

  test('loading /docs#bid-penalty scrolls to the Bid-Too-Low Penalty section', async ({
    page,
  }) => {
    await page.goto('/docs#bid-penalty')
    await page
      .getByRole('heading', { level: 3, name: /Bid-Too-Low Penalty/i })
      .waitFor()
    const heading = page.getByRole('heading', {
      level: 3,
      name: /Bid-Too-Low Penalty/i,
    })
    const box = await heading.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      const viewport = page.viewportSize()
      if (viewport) {
        expect(box.y).toBeGreaterThanOrEqual(-5)
        expect(box.y).toBeLessThanOrEqual(viewport.height)
      }
    }
  })
})

test.describe('Docs typography', () => {
  test('h2 sections use a top border divider', async ({ page }) => {
    await page.goto('/docs')
    await page
      .getByRole('heading', { name: /PSR Dashboard Guide/i })
      .waitFor()
    const h2 = page.locator('h2').first()
    const cls = await h2.getAttribute('class')
    expect(cls || '').toMatch(/border-t/)
  })
})
