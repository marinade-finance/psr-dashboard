// Docs page: markdown rendering, tab switcher, anchor links, code blocks.
import { test, expect } from './fixtures/mock-api'

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
    // The basic guide contains bullet-list copy under most subsections.
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
    // Any <code> not nested in a <pre> is inline; styled with `font-mono`.
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
    // Pick the first non-hash link.
    const links = page.locator('a[href^="http"]')
    if ((await links.count()) === 0) test.skip(true, 'no external links')
    const target = await links.first().getAttribute('target')
    expect(target).toBe('_blank')
  })
})

test.describe('Docs tab switcher', () => {
  test('basic mode: no tab switcher rendered', async ({ page }) => {
    await page.goto('/docs')
    await expect(
      page.getByRole('button', { name: 'Expert Guide' }),
    ).toHaveCount(0)
  })

  test('expert mode: both Guide and Expert Guide tabs present', async ({
    page,
  }) => {
    await page.goto('/expert-docs')
    await expect(
      page.getByRole('button', { name: 'Guide', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Expert Guide' }),
    ).toBeVisible()
  })

  test('expert mode defaults to Expert Guide', async ({ page }) => {
    await page.goto('/expert-docs')
    await expect(
      page.getByRole('heading', { level: 1, name: /Expert View/ }),
    ).toBeVisible()
  })

  test('clicking Guide tab swaps the rendered document', async ({ page }) => {
    await page.goto('/expert-docs')
    await page.getByRole('button', { name: 'Guide', exact: true }).click()
    await expect(
      page.getByRole('heading', { level: 1, name: /PSR Dashboard Guide/i }),
    ).toBeVisible()
  })
})

test.describe('Docs anchor links', () => {
  test('clicking an inline #GUIDE link from expert guide switches tab', async ({
    page,
  }) => {
    await page.goto('/expert-docs')
    // The expert guide contains `[Dashboard Guide](#GUIDE)` rendered as a button.
    await page.getByRole('button', { name: 'Dashboard Guide' }).click()
    await expect(
      page.getByRole('heading', { level: 1, name: /PSR Dashboard Guide/i }),
    ).toBeVisible()
  })

  test('loading /docs#sam scrolls to the section anchor', async ({ page }) => {
    await page.goto('/docs#sam')
    // The anchor is an inline `<a id="sam"></a>` immediately above the
    // section heading. After scroll, the heading "How the Auction Works"
    // should be in view (top of viewport region).
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
      // After the useEffect scroll, the heading should be inside the viewport.
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
    // Per src/pages/docs.tsx the h2 has a `border-t border-border`
    expect(cls || '').toMatch(/border-t/)
  })

  test('blockquotes render with muted background', async ({ page }) => {
    await page.goto('/docs')
    await page
      .getByRole('heading', { name: /PSR Dashboard Guide/i })
      .waitFor()
    const bq = page.locator('blockquote')
    const c = await bq.count()
    if (c === 0) test.skip(true, 'no blockquotes in basic guide')
    const cls = await bq.first().getAttribute('class')
    expect(cls || '').toMatch(/bg-muted/)
  })
})
