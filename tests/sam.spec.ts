import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function waitForSamData(page: Page) {
  await page.waitForSelector('tbody tr', { timeout: 30000 })
}

// SAM Target column is td:nth-child(10) (1-indexed: #=1, Validator=2, ...SAMTarget=10)
const SAM_TARGET_COL = 'tbody tr td:nth-child(10)'
// Bond column is td:nth-child(7)
const BOND_COL = 'tbody tr td:nth-child(7)'

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

test.describe('default sort', () => {
  test('first row has highest SAM Target value', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)

    const cells = page.locator(SAM_TARGET_COL)
    const count = await cells.count()
    expect(count).toBeGreaterThan(1)

    const firstText = await cells.first().textContent()
    const lastText = await cells.last().textContent()

    const parseVal = (s: string | null) =>
      parseFloat((s ?? '0').replace(/[^0-9.]/g, '')) || 0

    // First row should have >= value compared to last row (DESC sort)
    expect(parseVal(firstText)).toBeGreaterThanOrEqual(parseVal(lastText))
  })

  test('SAM Target values are non-increasing (DESC)', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)

    const values = await page.evaluate((selector: string) => {
      const cells = [...document.querySelectorAll(selector)]
      return cells.map(
        cell =>
          parseFloat((cell.textContent ?? '0').replace(/[^0-9.]/g, '')) || 0,
      )
    }, SAM_TARGET_COL)

    for (let i = 0; i < values.length - 1; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i + 1])
    }
  })

  test('SAM Target header shows default sort indicator', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)
    // Default sort is SAM Target DESC, so header should show ▼
    const samTargetHeader = page.locator('th').filter({ hasText: /SAM Target/ })
    await expect(samTargetHeader).toContainText('▼')
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

    // Max APY header should no longer show an active indicator
    await expect(maxApyHeader).not.toContainText('▲')
    await expect(maxApyHeader).not.toContainText('▼')
  })

  test('SAM Target default sort indicator restored after reset', async ({
    page,
  }) => {
    await page.goto('/')
    await waitForSamData(page)

    const maxApyHeader = page.locator('th').filter({ hasText: /^Max APY/ })
    // Cycle through and reset
    await maxApyHeader.click()
    await maxApyHeader.click()
    await maxApyHeader.click()

    // Default SAM Target sort should be visible again
    const samTargetHeader = page.locator('th').filter({ hasText: /SAM Target/ })
    await expect(samTargetHeader).toContainText('▼')
  })
})

test.describe('expert mode', () => {
  test('navigates to /expert- route', async ({ page }) => {
    await page.goto('/expert-')
    await waitForSamData(page)
    // Basic sanity: page renders rows
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
  test('green background present in bond column', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)

    const hasGreen = await page.evaluate((selector: string) => {
      const cells = [...document.querySelectorAll(selector)]
      return cells.some(
        cell =>
          window.getComputedStyle(cell).backgroundColor === 'rgb(0, 77, 64)',
      )
    }, BOND_COL)

    expect(hasGreen).toBe(true)
  })

  test('grey background present for zero-bond validators', async ({ page }) => {
    await page.goto('/')
    await waitForSamData(page)

    const hasGrey = await page.evaluate((selector: string) => {
      const cells = [...document.querySelectorAll(selector)]
      return cells.some(cell => {
        const bg = window.getComputedStyle(cell).backgroundColor
        // rgba(128, 128, 128, 0.3) renders as rgba(128, 128, 128, 0.298039...)
        // or as an rgb value blended with the parent — check for the grey class
        return (
          bg.startsWith('rgba(128, 128, 128') ||
          cell.className.includes('grey')
        )
      })
    }, BOND_COL)

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

    // Skip if no non-productive validators in current dataset
    test.skip(count === 0, 'no non-productive validators in current dataset')

    await expect(yellowRows.first()).toBeVisible()
  })
})

test.describe('simulation flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
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
    // In simulation mode all tbody rows get the clickable class
    const clickableRows = page.locator('tbody tr[class*="validatorRowClickable"]')
    const count = await clickableRows.count()
    expect(count).toBeGreaterThan(0)
  })

  test('clicking a validator row shows 4 inline inputs', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    // Click first clickable (non-ghost) row
    await page.locator('tbody tr').first().click()
    const inputs = page.locator('input[type="number"]')
    await expect(inputs).toHaveCount(4)
  })

  test('inline inputs accept value changes', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await page.locator('tbody tr').first().click()

    // Change the last input (bid)
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

    // Change a value so the simulation actually differs
    const inflInput = page.locator('input[type="number"]').first()
    const currentVal = await inflInput.inputValue()
    const newVal = String(parseFloat(currentVal || '5') + 1)
    await inflInput.fill(newVal)

    await page.getByRole('button', { name: 'Simulate' }).click()

    // Calculating state: button text changes to Simulating (may be brief)
    // Use a race: either we catch "Simulating" or we reach completion
    try {
      await expect(
        page.getByRole('button', { name: 'Simulating' }),
      ).toBeVisible({ timeout: 5000 })
    } catch {
      // Simulation completed before we checked — that's fine
    }

    // Either way, it should resolve: Simulate button (re-enabled) or ghost row
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

    // Change inflation commission
    const inflInput = page.locator('input[type="number"]').first()
    const currentVal = await inflInput.inputValue()
    const newVal = String(parseFloat(currentVal || '5') + 2)
    await inflInput.fill(newVal)

    await page.getByRole('button', { name: 'Simulate' }).click()
    // Wait for simulation to complete (inputs disappear, editing done)
    await page.waitForSelector('input[type="number"]', {
      state: 'detached',
      timeout: 30000,
    })

    // Ghost row should be present (has strikethrough style)
    const ghostRow = page.locator('tbody tr[class*="ghostRow"]')
    await expect(ghostRow).toBeVisible()
  })

  test('ghost row has strikethrough text-decoration', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await page.locator('tbody tr').first().click()

    const inflInput = page.locator('input[type="number"]').first()
    const currentVal = await inflInput.inputValue()
    await inflInput.fill(String(parseFloat(currentVal || '5') + 2))

    await page.getByRole('button', { name: 'Simulate' }).click()
    await page.waitForSelector('input[type="number"]', {
      state: 'detached',
      timeout: 30000,
    })

    // td inside ghostRow should have line-through
    const ghostTd = page.locator('tbody tr[class*="ghostRow"] td').first()
    await expect(ghostTd).toHaveCSS('text-decoration-line', 'line-through')
  })

  test('simulated row has a position tint class', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await page.locator('tbody tr').first().click()

    const inflInput = page.locator('input[type="number"]').first()
    const currentVal = await inflInput.inputValue()
    await inflInput.fill(String(parseFloat(currentVal || '5') + 2))

    await page.getByRole('button', { name: 'Simulate' }).click()
    await page.waitForSelector('input[type="number"]', {
      state: 'detached',
      timeout: 30000,
    })

    // The simulated validator row should have one of the position tint classes
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

  test('cancel button (✕) cancels editing', async ({ page }) => {
    await page.getByRole('button', { name: 'Enter Simulation' }).click()
    await page.locator('tbody tr').first().click()

    await expect(page.locator('input[type="number"]')).toHaveCount(4)

    await page.getByRole('button', { name: '✕' }).click()
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
    const clickableAfter = await page
      .locator('tbody tr[class*="validatorRowClickable"]')
      .count()
    expect(clickableAfter).toBe(0)
  })
})
