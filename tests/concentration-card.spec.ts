// Per-validator Concentration card in the detail Overview: country + ASO
// group share vs cap, with an "at cap" state when that group is the binding
// constraint. Deep-links the sheet via /test-?v= (deterministic fixtures).
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const SHEET = '[role="dialog"]'

// ASO-capped fixture validator (France / Hetzner — Hetzner carries
// lastCapConstraint = ASO for this row).
const CAPPED_VOTE = 'FiXtUREv2222222222222222222222222222222222bb'

async function openSheet(page: Page, vote: string) {
  await page.goto(`/test-?v=${vote}`)
  await page.waitForSelector(SHEET, { timeout: 30000 })
}

test.describe('validator detail — Concentration card', () => {
  test('shows country + ASO group share against the cap', async ({ page }) => {
    await openSheet(page, CAPPED_VOTE)
    const sheet = page.locator(SHEET)
    await expect(sheet).toContainText('Concentration')
    await expect(sheet).toContainText('Country')
    await expect(sheet).toContainText('ASO')
    // Each row reads "X% of Y% cap".
    await expect(sheet).toContainText(/of\s+\d+% cap/)
  })

  test('measures the share on the network-stake basis, not Marinade TVL', async ({
    page,
  }) => {
    await openSheet(page, CAPPED_VOTE)
    const sheet = page.locator(SHEET)
    // Hetzner holds 4_950_000 SOL of the fixture's 2e9 networkTotalSol
    // (0.2%) and 1_450_000 of its 6e6 marinadeSamTvlSol (24.2%). Pinning the
    // network figure is what stops the card silently reverting to the
    // Marinade basis — both dimensions are on ConcentrationContext, so the
    // looser "of N% cap" match above passes either way.
    await expect(sheet).toContainText('0.2% of 30% cap')
    await expect(sheet).not.toContainText('24.2% of 30% cap')
  })

  test('does not claim "at cap" while the network share is below its cap', async ({
    page,
  }) => {
    await openSheet(page, CAPPED_VOTE)
    // This fixture row carries lastCapConstraint = ASO, but its binding cap
    // ledger is the Marinade one (`binding: 'marinade'`) — the network share
    // shown is 0.2% of a 30% cap. Annotating that with "at cap" would
    // contradict the number beside it, so the marker is withheld.
    await expect(page.locator(SHEET)).not.toContainText('· at cap')
  })
})
