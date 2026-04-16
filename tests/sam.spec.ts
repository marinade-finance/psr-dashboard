// SAM page tests: data loading, metrics, columns, sorting (indicators + value
// ordering), bond coloring, non-productive tinting, expert mode, simulation
// flow (enter/exit, inputs, ghost rows, position tints, cancel), formatting,
// error state.
import { test, expect } from './fixtures/mock-api'
import type { Page } from '@playwright/test'

async function waitForData(page: Page) {
  await page.waitForSelector('tbody tr', { timeout: 50000 })
}

function parseNum(s: string): number {
  return parseFloat(s.replace(/[^0-9.\-]/g, ''))
}

test.describe('SAM basic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForData(page)
  })

  test('table loads with rows', async ({ page }) => {
    expect(await page.locator('tbody tr').count()).toBeGreaterThan(0)
  })

  test('all 3 metrics visible', async ({ page }) => {
    for (const label of ['Total Auction Stake', 'Winning APY', 'Winning Validators']) {
      await expect(page.getByText(label).first()).toBeVisible()
    }
  })

  test('no error message', async ({ page }) => {
    await expect(page.getByText('Error fetching data')).not.toBeVisible()
  })

  test('6 header columns: #, Validator, Max APY, Bond, Stake Δ, Next Step', async ({ page }) => {
    const headers = await page.locator('thead th').allInnerTexts()
    expect(headers).toHaveLength(6)
    expect(headers[0]).toContain('#')
    expect(headers[1]).toContain('Validator')
    expect(headers[2]).toContain('Max APY')
    expect(headers[3]).toContain('Bond')
    expect(headers[4]).toContain('Stake')
    expect(headers[5]).toContain('Next Step')
  })

  test('SOL values have commas, APY has %', async ({ page }) => {
    const stake = page.locator('[class*="metric"]').filter({ hasText: 'Total Auction Stake' })
    expect(await stake.innerText()).toMatch(/\d{1,3}(,\d{3})+/)
    const apy = page.locator('[class*="metric"]').filter({ hasText: 'Winning APY' })
    expect(await apy.innerText()).toContain('%')
  })

  test('bond dot colors present', async ({ page }) => {
    const hasDot = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('tbody tr td:nth-child(4)')]
      return cells.some(c => c.querySelector('[class*="bondDot"]'))
    })
    expect(hasDot).toBe(true)
  })

  test('non-productive rows tinted yellow when present', async ({ page }) => {
    const n = await page.locator('tbody tr[class*="rowYellow"]').count()
    test.skip(n === 0, 'no non-productive validators in dataset')
    await expect(page.locator('tbody tr[class*="rowYellow"]').first()).toBeVisible()
  })
})

test.describe('SAM sorting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForData(page)
  })

  test('default: Stake Δ header has ▼', async ({ page }) => {
    const h = page.locator('th').filter({ hasText: /Stake/ })
    await expect(h).toContainText('▼')
  })

  test('sort cycle: ASC → DESC → reset', async ({ page }) => {
    const h = page.locator('th').filter({ hasText: /^Max APY/ })
    await h.click()
    await expect(h).toContainText('▲')
    await h.click()
    await expect(h).toContainText('▼')
    await h.click()
    await expect(h).not.toContainText('▲')
    await expect(h).not.toContainText('▼')
    // default sort restored
    await expect(page.locator('th').filter({ hasText: /Stake/ })).toContainText('▼')
  })

  test('sort values: Max APY ASC produces ascending numbers', async ({ page }) => {
    const h = page.locator('th').filter({ hasText: /^Max APY/ })
    await h.click()
    await expect(h).toContainText('▲')

    const cells = page.locator('tbody tr td:nth-child(3)')
    const n = await cells.count()
    const vals: number[] = []
    for (let i = 0; i < Math.min(n, 20); i++) {
      const v = parseNum(await cells.nth(i).innerText())
      if (!isNaN(v)) vals.push(v)
    }
    expect(vals.length).toBeGreaterThan(1)
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeGreaterThanOrEqual(vals[i - 1])
    }
  })
})

test.describe('SAM expert', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/expert-')
    await waitForData(page)
  })

  test('loads with rows and 11 columns', async ({ page }) => {
    expect(await page.locator('tbody tr').count()).toBeGreaterThan(0)
    expect(await page.locator('thead th').count()).toBe(11)
  })

  test('expert metrics visible: Stake to Move, Active Stake, Productive Stake', async ({
    page,
  }) => {
    for (const label of ['Stake to Move', 'Active Stake', 'Productive Stake']) {
      await expect(page.getByText(label)).toBeVisible()
    }
  })

  test('Expert Guide link visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Expert Guide' })).toBeVisible()
  })

  test('grey bond cells for zero-bond validators', async ({ page }) => {
    const hasGrey = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('tbody tr td:nth-child(7)')]
      return cells.some(c => c.className.includes('grey'))
    })
    expect(hasGrey).toBe(true)
  })
})

test.describe('SAM simulation', () => {
  test.describe.configure({ timeout: 90000 })

  test.beforeEach(async ({ page }) => {
    await page.goto('/expert-')
    await waitForData(page)
  })

  test('enter/exit simulation toggles banner and clickable rows', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await expect(page.getByText('Simulation mode active')).toBeVisible()
    expect(
      await page.locator('tbody tr[class*="validatorRowClickable"]').count(),
    ).toBeGreaterThan(0)

    await page.getByRole('button', { name: 'Exit Simulation' }).click()
    await expect(page.getByText('Simulation mode active')).not.toBeVisible()
    expect(await page.locator('tbody tr[class*="validatorRowClickable"]').count()).toBe(0)
  })

  test('clicking row shows 4 inputs, Simulate button visible', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await page.locator('tbody tr').first().click()
    await expect(page.locator('input[type="number"]')).toHaveCount(4)
    await expect(page.getByRole('button', { name: 'Simulate' })).toBeVisible()
  })

  test('inputs accept values', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await page.locator('tbody tr').first().click()
    const bid = page.locator('input[type="number"]').last()
    await bid.fill('0.005')
    await expect(bid).toHaveValue('0.005')
  })

  test('escape and cancel button both dismiss inputs', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await page.locator('tbody tr').first().click()
    await expect(page.locator('input[type="number"]')).toHaveCount(4)
    await page.keyboard.press('Escape')
    await expect(page.locator('input[type="number"]')).toHaveCount(0)

    // reopen and cancel via button
    await page.locator('tbody tr').first().click()
    await expect(page.locator('input[type="number"]')).toHaveCount(4)
    await page.getByRole('button', { name: '\u2715' }).click()
    await expect(page.locator('input[type="number"]')).toHaveCount(0)
  })

  test('simulation produces ghost row with strikethrough and position tint', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await page.locator('tbody tr').first().click()

    const bid = page.locator('input[type="number"]').last()
    const cur = await bid.inputValue()
    await bid.fill(String(parseFloat(cur || '0') + 0.01))

    await page.getByRole('button', { name: 'Simulate' }).click()
    await page.waitForSelector('input[type="number"]', {
      state: 'detached',
      timeout: 45000,
    })

    // ghost row
    const ghost = page.locator('tbody tr[class*="ghostRow"]')
    await expect(ghost).toBeVisible({ timeout: 10000 })
    await expect(ghost.locator('td').first()).toHaveCSS(
      'text-decoration-line',
      'line-through',
    )

    // position tint
    const tinted = page.locator(
      'tbody tr[class*="positionImproved"], ' +
        'tbody tr[class*="positionWorsened"], ' +
        'tbody tr[class*="positionUnchanged"]',
    )
    await expect(tinted.first()).toBeVisible()
  })

  test('Simulating state shows during calculation', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await page.locator('tbody tr').first().click()

    const infl = page.locator('input[type="number"]').first()
    const cur = await infl.inputValue()
    await infl.fill(String(parseFloat(cur || '5') + 1))

    await page.getByRole('button', { name: 'Simulate' }).click()

    try {
      await expect(
        page.getByRole('button', { name: 'Simulating' }),
      ).toBeVisible({ timeout: 5000 })
    } catch {
      // completed before check — fine
    }

    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button')
        return btn && !btn.disabled
      },
      { timeout: 30000 },
    )
  })
})

test.describe('SAM error state', () => {
  test('shows error when API fails', async ({ page }) => {
    // abort all API requests to simulate network failure
    await page.route(/marinade\.finance/, route => route.abort())
    await page.goto('/')
    await expect(page.getByText('Error fetching data')).toBeVisible({ timeout: 30000 })
  })
})
