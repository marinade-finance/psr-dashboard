import { test, expect, type Page } from '@playwright/test'

async function waitForSamData(page: Page) {
  await page.waitForSelector('[class*="navigation"]', { timeout: 15000 })
  await page.waitForFunction(
    () => document.querySelector('[class*="loader"]') === null,
    { timeout: 30000 },
  )
  await page.waitForTimeout(500)
}

async function waitForPageData(page: Page, selector: string) {
  await page.waitForSelector('[class*="navigation"]', { timeout: 15000 })
  await page.waitForSelector(selector, { timeout: 30000 })
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(1000)
}

test.describe('Visual screenshots', () => {
  test('/ basic full page', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)

    await expect(page).toHaveScreenshot('sam-basic-full.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
      mask: [page.locator('[class*="metricValue"]'), page.locator('td'), page.locator('[class*="subtitle"]')],
    })
  })

  test('/expert- full page', async ({ page }) => {
    await page.goto('/expert-')
    await waitForSamData(page)

    await expect(page).toHaveScreenshot('sam-expert-full.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
      mask: [page.locator('[class*="metricValue"]'), page.locator('td'), page.locator('[class*="subtitle"]')],
    })
  })

  test('/expert- with simulation active', async ({ page }) => {
    await page.goto('/expert-')
    await waitForSamData(page)

    const simulatorBtn = page.locator('[class*="simulatorToggle"]')
    await simulatorBtn.click()
    // Wait for simulation mode to activate (button text changes)
    await expect(simulatorBtn).toContainText('Exit Simulation')
    await page.waitForTimeout(300)

    await expect(page).toHaveScreenshot('sam-expert-simulation-active.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
      mask: [page.locator('[class*="metricValue"]'), page.locator('td'), page.locator('[class*="subtitle"]')],
    })
  })

  test('/expert- with ghost row after simulation run', async ({ page }) => {
    await page.goto('/expert-')
    await waitForSamData(page)

    // Enter simulation mode
    const simulatorBtn = page.locator('[class*="simulatorToggle"]')
    await simulatorBtn.click()
    await expect(simulatorBtn).toContainText('Exit Simulation')

    // Click the first data row to open editing
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.waitFor({ timeout: 10000 })
    await firstRow.click()

    // Wait for edit controls to appear
    await page.waitForTimeout(300)

    // Check if an input is visible for editing (bid or commission)
    const bidInput = page.locator('table input').first()
    const inputCount = await bidInput.count()
    if (inputCount > 0) {
      // Adjust bid slightly to trigger a real simulation
      const currentVal = await bidInput.inputValue()
      const numVal = parseFloat(currentVal)
      if (!isNaN(numVal)) {
        await bidInput.fill(String(Math.max(0, numVal - 0.01)))
      }

      // Run simulation
      const runBtn = page.locator('button').filter({ hasText: /simulate/i })
      const runBtnCount = await runBtn.count()
      if (runBtnCount > 0) {
        await runBtn.click()
        // Wait for calculating to finish
        await page.waitForFunction(
          () => !document.querySelector('[class*="simulatorToggle"][disabled]'),
          { timeout: 15000 },
        )
        await page.waitForTimeout(500)
      }
    }

    await expect(page).toHaveScreenshot('sam-expert-ghost-row.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
      mask: [page.locator('[class*="metricValue"]'), page.locator('td'), page.locator('[class*="subtitle"]')],
    })
  })

  test('/bonds full page', async ({ page }) => {
    await page.goto('/bonds')
    await waitForPageData(page, '[class*="metricWrap"]')

    await expect(page).toHaveScreenshot('bonds-full.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
      mask: [page.locator('[class*="metricValue"]'), page.locator('td')],
    })
  })

  test('/expert-bonds full page', async ({ page }) => {
    await page.goto('/expert-bonds')
    await waitForPageData(page, '[class*="metricWrap"]')

    await expect(page).toHaveScreenshot('bonds-expert-full.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
      mask: [page.locator('[class*="metricValue"]'), page.locator('td')],
    })
  })

  test('/protected-events full page', async ({ page }) => {
    await page.goto('/protected-events')
    await waitForPageData(page, '[class*="metricWrap"]')
    await page.waitForSelector('table tbody tr', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(2000)

    await expect(page).toHaveScreenshot('events-full.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
      timeout: 20000,
      mask: [page.locator('[class*="metricValue"]'), page.locator('td')],
    })
  })

  test('/protected-events with validator filter applied', async ({ page }) => {
    await page.goto('/protected-events')
    await waitForPageData(page, 'table tbody tr')

    // Get a prefix from the first row validator cell
    const firstRowValidator = page.locator('table tbody tr:first-child td:nth-child(2)')
    await firstRowValidator.waitFor({ timeout: 10000 })
    const validatorText = await firstRowValidator.innerText()
    const prefix = validatorText.slice(0, 8)

    // Apply validator filter
    const filterInput = page
      .locator('fieldset')
      .filter({ hasText: 'Validator filter' })
      .locator('input')
    await filterInput.fill(prefix)
    await page.waitForTimeout(400)

    await expect(page).toHaveScreenshot('events-validator-filter.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
      mask: [page.locator('[class*="metricValue"]'), page.locator('td')],
    })
  })

  test('/expert-protected-events full page', async ({ page }) => {
    await page.goto('/expert-protected-events')
    await waitForPageData(page, '[class*="metricWrap"]')
    await page.waitForSelector('table tbody tr', { timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(2000)

    await expect(page).toHaveScreenshot('events-expert-full.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
      timeout: 20000,
      mask: [page.locator('[class*="metricValue"]'), page.locator('td')],
    })
  })

  // Navigation active state screenshots
  test('navigation: SAM tab active on /', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[class*="navigation"]', { timeout: 15000 })
    await page.waitForTimeout(200)

    const nav = page.locator('[class*="navigation"]')
    await expect(nav).toHaveScreenshot('nav-sam-active.png', {
      maxDiffPixelRatio: 0.01,
    })
  })

  test('navigation: Protected Events tab active on /protected-events', async ({ page }) => {
    await page.goto('/protected-events')
    await page.waitForSelector('[class*="navigation"]', { timeout: 15000 })
    await page.waitForTimeout(200)

    const nav = page.locator('[class*="navigation"]')
    await expect(nav).toHaveScreenshot('nav-events-active.png', {
      maxDiffPixelRatio: 0.01,
    })
  })

  test('navigation: Validator Bonds tab active on /bonds', async ({ page }) => {
    await page.goto('/bonds')
    await page.waitForSelector('[class*="navigation"]', { timeout: 15000 })
    await page.waitForTimeout(200)

    const nav = page.locator('[class*="navigation"]')
    await expect(nav).toHaveScreenshot('nav-bonds-active.png', {
      maxDiffPixelRatio: 0.01,
    })
  })
})
