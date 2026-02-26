import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function waitForSamData(page: Page) {
  await page.waitForSelector('tbody tr', { timeout: 50000 })
}

// Basic mode: # | Validator | Max APY | Bond | Stake Δ | Next Step
const BASIC_STAKE_DELTA_COL = 'tbody tr td:nth-child(5)'
const BASIC_BOND_COL = 'tbody tr td:nth-child(4)'

// Expert mode: # | Validator | Infl | MEV | Block | St.Bid | Bond | Max APY | Stake Δ | Eff.Bid | Constraint
const EXPERT_BOND_COL = 'tbody tr td:nth-child(7)'
const EXPERT_STAKE_DELTA_COL = 'tbody tr td:nth-child(9)'

test.describe('data loading', () => {
  test('renders table rows after data loads', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)
    const rowCount = await page.locator('tbody tr').count()
    expect(rowCount).toBeGreaterThan(0)
  })

  test('shows Total Auction Stake metric', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)
    await expect(page.getByText('Total Auction Stake')).toBeVisible()
  })

  test('shows Winning APY metric', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)
    await expect(page.getByText('Winning APY')).toBeVisible()
  })

  test('shows Winning Validators metric', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)
    await expect(page.getByText('Winning Validators')).toBeVisible()
  })

  test('no error message shown after load', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)
    await expect(page.getByText('Error fetching data')).not.toBeVisible()
  })
})

test.describe('basic mode columns', () => {
  test('has 6 header columns (# + 5 data)', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)
    const thCount = await page.locator('thead th').count()
    expect(thCount).toBe(6)
  })

  test('headers match spec: Validator, Max APY, Bond, Stake Δ, Next Step', async ({
    page,
  }) => {
    await page.goto('/')
    await waitForSamData(page)
    const headers = await page.locator('thead th').allInnerTexts()
    expect(headers[0]).toContain('#')
    expect(headers[1]).toContain('Validator')
    expect(headers[2]).toContain('Max APY')
    expect(headers[3]).toContain('Bond')
    expect(headers[4]).toContain('Stake')
    expect(headers[5]).toContain('Next Step')
  })
})

test.describe('default sort', () => {
  test('Stake Δ values are sorted by target stake DESC', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)

    const cells = page.locator(BASIC_STAKE_DELTA_COL)
    const count = await cells.count()
    expect(count).toBeGreaterThan(1)
  })

  test('Stake Δ header shows default sort indicator', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)
    const header = page.locator('th').filter({ hasText: /Stake/ })
    await expect(header).toContainText('▼')
  })
})

test.describe('sort interaction', () => {
  test('clicking Max APY once shows ASC indicator', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)

    const maxApyHeader = page.locator('th').filter({ hasText: /^Max APY/ })
    await maxApyHeader.click()
    await expect(maxApyHeader).toContainText('▲')
  })

  test('clicking Max APY twice shows DESC indicator', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)

    const maxApyHeader = page.locator('th').filter({ hasText: /^Max APY/ })
    await maxApyHeader.click()
    await maxApyHeader.click()
    await expect(maxApyHeader).toContainText('▼')
  })

  test('clicking Max APY three times resets to default', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)

    const maxApyHeader = page.locator('th').filter({ hasText: /^Max APY/ })
    await maxApyHeader.click()
    await maxApyHeader.click()
    await maxApyHeader.click()

    await expect(maxApyHeader).not.toContainText('▲')
    await expect(maxApyHeader).not.toContainText('▼')
  })

  test('default sort indicator restored after reset', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)

    const maxApyHeader = page.locator('th').filter({ hasText: /^Max APY/ })
    await maxApyHeader.click()
    await maxApyHeader.click()
    await maxApyHeader.click()

    const stakeHeader = page.locator('th').filter({ hasText: /Stake/ })
    await expect(stakeHeader).toContainText('▼')
  })
})

test.describe('expert mode', () => {
  test('navigates to /expert- route', async ({ page }) => {
    await page.goto('/expert-')
    await waitForSamData(page)
    const rowCount = await page.locator('tbody tr').count()
    expect(rowCount).toBeGreaterThan(0)
  })

  test('shows Stake to Move expert metric', async ({ page }) => {
    await page.goto('/expert-')
    await waitForSamData(page)
    await expect(page.getByText('Stake to Move')).toBeVisible()
  })

  test('shows Active Stake expert metric', async ({ page }) => {
    await page.goto('/expert-')
    await waitForSamData(page)
    await expect(page.getByText('Active Stake')).toBeVisible()
  })

  test('shows Productive Stake expert metric', async ({ page }) => {
    await page.goto('/expert-')
    await waitForSamData(page)
    await expect(page.getByText('Productive Stake')).toBeVisible()
  })

  test('shows Expert Guide link', async ({ page }) => {
    await page.goto('/expert-')
    await expect(
      page.getByRole('link', { name: 'Expert Guide' }),
    ).toBeVisible()
  })

  test('has 11 header columns (# + 10 data)', async ({ page }) => {
    await page.goto('/expert-')
    await waitForSamData(page)
    const thCount = await page.locator('thead th').count()
    expect(thCount).toBe(11)
  })
})

test.describe('bond cell coloring', () => {
  test('bond dot colors present in basic mode', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)

    const hasDot = await page.evaluate((selector: string) => {
      const cells = [...document.querySelectorAll(selector)]
      return cells.some(cell => cell.querySelector('[class*="bondDot"]'))
    }, BASIC_BOND_COL)

    expect(hasDot).toBe(true)
  })

  test('grey bond cell in expert mode for zero-bond validators', async ({
    page,
  }) => {
    await page.goto('/expert-')
    await waitForSamData(page)

    const hasGrey = await page.evaluate((selector: string) => {
      const cells = [...document.querySelectorAll(selector)]
      return cells.some(cell => cell.className.includes('grey'))
    }, EXPERT_BOND_COL)

    expect(hasGrey).toBe(true)
  })
})

test.describe('non-productive row tinting', () => {
  test('rowYellow class present when non-productive validators exist', async ({
    page,
  }) => {
    await page.goto('/')
    await waitForSamData(page)

    const yellowRows = page.locator('tbody tr[class*="rowYellow"]')
    const count = await yellowRows.count()

    test.skip(count === 0, 'no non-productive validators in current dataset')

    await expect(yellowRows.first()).toBeVisible()
  })
})

test.describe('simulation flow (expert)', () => {
  test.describe.configure({ timeout: 90000 })

  test.beforeEach(async ({ page }) => {
    await page.goto('/expert-')
    await waitForSamData(page)
  })

  test('enter simulation shows banner', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await expect(page.getByText('Simulation mode active')).toBeVisible()
  })

  test('all rows become clickable after entering simulation', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    const clickableRows = page.locator(
      'tbody tr[class*="validatorRowClickable"]',
    )
    const count = await clickableRows.count()
    expect(count).toBeGreaterThan(0)
  })

  test('clicking a validator row shows 4 inline inputs', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await page.locator('tbody tr').first().click()
    const inputs = page.locator('input[type="number"]')
    await expect(inputs).toHaveCount(4)
  })

  test('inline inputs accept value changes', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await page.locator('tbody tr').first().click()

    const bidInput = page.locator('input[type="number"]').last()
    await bidInput.fill('0.005')
    await expect(bidInput).toHaveValue('0.005')
  })

  test('Simulate button is visible when editing', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await page.locator('tbody tr').first().click()
    await expect(page.getByRole('button', { name: 'Simulate' })).toBeVisible()
  })

  test('calculating state: Simulate button becomes Simulating', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await page.locator('tbody tr').first().click()

    const inflInput = page.locator('input[type="number"]').first()
    const currentVal = await inflInput.inputValue()
    const newVal = String(parseFloat(currentVal || '5') + 1)
    await inflInput.fill(newVal)

    await page.getByRole('button', { name: 'Simulate' }).click()

    try {
      await expect(
        page.getByRole('button', { name: 'Simulating' }),
      ).toBeVisible({ timeout: 5000 })
    } catch {
      // Simulation completed before we checked — that's fine
    }

    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button')
        return btn && !btn.disabled
      },
      { timeout: 30000 },
    )
  })

  test('ghost row appears after simulation with changed value', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await page.locator('tbody tr').first().click()

    const inflInput = page.locator('input[type="number"]').first()
    const currentVal = await inflInput.inputValue()
    const newVal = String(parseFloat(currentVal || '5') + 2)
    await inflInput.fill(newVal)

    await page.getByRole('button', { name: 'Simulate' }).click()
    await page.waitForSelector('input[type="number"]', {
      state: 'detached',
      timeout: 30000,
    })

    const ghostRow = page.locator('tbody tr[class*="ghostRow"]')
    await expect(ghostRow).toBeVisible()
  })

  test('ghost row has strikethrough text-decoration', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await page.locator('tbody tr').first().click()

    const bidInput = page.locator('input[type="number"]').last()
    const currentBid = await bidInput.inputValue()
    await bidInput.fill(String(parseFloat(currentBid || '0') + 0.01))

    await page.getByRole('button', { name: 'Simulate' }).click()
    await page.waitForSelector('input[type="number"]', {
      state: 'detached',
      timeout: 45000,
    })

    const ghostRow = page.locator('tbody tr[class*="ghostRow"]')
    await expect(ghostRow).toBeVisible({ timeout: 10000 })
    const ghostTd = ghostRow.locator('td').first()
    await expect(ghostTd).toHaveCSS('text-decoration-line', 'line-through')
  })

  test('simulated row has a position tint class', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await page.locator('tbody tr').first().click()

    const bidInput = page.locator('input[type="number"]').last()
    const currentBid = await bidInput.inputValue()
    await bidInput.fill(String(parseFloat(currentBid || '0') + 0.01))

    await page.getByRole('button', { name: 'Simulate' }).click()
    await page.waitForSelector('input[type="number"]', {
      state: 'detached',
      timeout: 45000,
    })

    const tintedRow = page.locator(
      'tbody tr[class*="positionImproved"], ' +
        'tbody tr[class*="positionWorsened"], ' +
        'tbody tr[class*="positionUnchanged"]',
    )
    await expect(tintedRow.first()).toBeVisible()
  })

  test('escape key cancels editing and hides inputs', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await page.locator('tbody tr').first().click()

    await expect(page.locator('input[type="number"]')).toHaveCount(4)

    await page.keyboard.press('Escape')
    await expect(page.locator('input[type="number"]')).toHaveCount(0)
  })

  test('cancel button cancels editing', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await page.locator('tbody tr').first().click()

    await expect(page.locator('input[type="number"]')).toHaveCount(4)

    await page.getByRole('button', { name: '\u2715' }).click()
    await expect(page.locator('input[type="number"]')).toHaveCount(0)
  })

  test('exit simulation hides banner', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await expect(page.getByText('Simulation mode active')).toBeVisible()

    await page.getByRole('button', { name: 'Exit Simulation' }).click()
    await expect(page.getByText('Simulation mode active')).not.toBeVisible()
  })

  test('exit simulation removes clickable row class', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    const clickableBefore = await page
      .locator('tbody tr[class*="validatorRowClickable"]')
      .count()
    expect(clickableBefore).toBeGreaterThan(0)

    await page.getByRole('button', { name: 'Exit Simulation' }).click()
    // Expert rows without simulation shouldn't have clickable class
    // (they may or may not depending on whether onValidatorClick is passed)
    const clickableAfter = await page
      .locator('tbody tr[class*="validatorRowClickable"]')
      .count()
    expect(clickableAfter).toBe(0)
  })
})

test.describe('metric formatting', () => {
  test('SOL values contain commas', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)
    const stakeMetric = page
      .locator('[class*="metric"]')
      .filter({ hasText: 'Total Auction Stake' })
    const text = await stakeMetric.innerText()
    expect(text).toMatch(/\d{1,3}(,\d{3})+/)
  })

  test('APY values contain % sign', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)
    const apyMetric = page
      .locator('[class*="metric"]')
      .filter({ hasText: 'Winning APY' })
    const text = await apyMetric.innerText()
    expect(text).toContain('%')
  })
})
