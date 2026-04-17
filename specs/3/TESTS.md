---
status: partial
---

# Playwright E2E Test Spec

End-to-end tests for all screens. Uses `@playwright/test`, chromium only.

## Setup

- Config: `playwright.config.ts` at project root
- baseURL: `http://localhost:8080`
- webServer: `pnpm start:dev` with `reuseExistingServer: true`
- Timeout: 30s per test
- Screenshots on failure
- Test dir: `tests/`
- Visual baselines: `tests/__screenshots__/`

---

## tests/sam.spec.ts — Stake Auction Marketplace

### Data Loading

1. Navigate `/`, wait for table rows to appear (>0 `tbody tr`)
2. Verify metrics section visible with non-empty values
3. Verify no error message displayed

### Default Sort

4. First visible row has highest SAM Target value
5. Values in SAM Target column are in descending order

### Sort Interaction

6. Click "Max APY" column header → rows reorder by APY ascending
7. Click again → descending order
8. Click third time → resets to default (target stake desc)
9. Sort indicator (`▲`/`▼`) visible on active column

### Expert Mode

10. Navigate `/expert-` → page loads with data
11. Extra metric rows visible (assert text "Stake to Move" present)
12. Column count matches expert spec (11 columns including #)
13. "Expert Guide" link visible in nav

### Bond Cell Coloring

14. At least one cell in Bond column has `.green` class
15. Bond cells without bond data have `.grey` class

### Non-Productive Row Tinting

16. If any validator is non-productive, verify `.rowYellow` class present
    (skip if none in current data — use `test.skip` with condition)

### Simulation Mode (Expert)

17. Navigate `/expert-`, click "Enter Simulation" button
18. Verify simulation banner appears (`.simulationBanner` visible)
19. Verify table body has simulation background tint
20. Click a validator row → inline edit fields appear (4 inputs visible)
21. Change Stake Bid value, click "Simulate" button
22. Verify "Calculating..." state (button disabled)
23. Wait for calculation to complete (button re-enables)
24. Verify ghost row appears (`.ghostRow` element exists)
25. Verify position change tint on simulated row
    (one of `.positionImproved1/2/3` or `.positionWorsened1/2/3`)
26. Press Escape → edit fields disappear
27. Click "Exit Simulation" → banner disappears, original data restored

### Validator Detail (SamDetail)

28. Click first data row → detail view appears (list view hidden)
29. Detail shows back button, validator name, rank badge ("# N of M")
30. Detail shows 3 summary cards: MAX APY, BOND, STAKE Δ
31. Detail shows recommendation box with non-empty text
32. Click back button → returns to list view, table visible again
33. Scroll position restored after returning from detail view
    (scroll down first, click row, click back, verify scroll offset > 0)
34. Detail shows country flag emoji if validator has country data
    (skip if first row has no country — use `test.skip` with condition)
35. Pubkey in detail view is click-to-copy (click → text shows "Copied")

### Metric Formatting

36. SOL values contain commas (e.g., "1,234,567")
37. APY values contain "%" sign

---

## tests/bonds.spec.ts — Validator Bonds

### Data Loading

1. Navigate `/bonds`, wait for table rows
2. Verify metrics: "Bonds Funded", "Bonds Balance", "Marinade Stake",
   "Protected Stake" text present with values

### Default Sort

3. Bond balance column values in descending order

### Expert Mode

4. Navigate `/expert-bonds`
5. Verify extra columns: "Max protected stake", "Protected stake %"
6. Verify extra metric: "Max Protectable Stake" visible

### Table Content

7. Validator column shows vote accounts (truncated)
8. Name column shows validator names (not empty for most rows)
9. Bond Comm column shows commission values formatted as bps

---

## tests/events.spec.ts — Protected Events

### Data Loading

1. Navigate `/protected-events`, wait for table rows
2. Verify metrics: "Total events", "Total amount", "Last Settled Amount"

### Validator Filter

3. Type a known validator name in search input
4. Verify row count decreases (fewer rows than total)
5. Verify all visible rows contain the search text (name or account)

### Epoch Range Filter

6. Set min epoch to a value above the minimum in dataset
7. Verify all visible epoch values ≥ min
8. Set max epoch to a value below the maximum
9. Verify all visible epoch values ≤ max

### Filtered Metrics

10. With any filter active, verify "Filtered Events" and "Filtered Amount"
    metrics appear
11. Clear all filters → filtered metrics disappear

### Badges

12. At least one row has `Estimate` or `Dryrun` badge in Settlement column
13. Badge has appropriate styling (background color)

### Funder Column

14. Funder cells show either "Marinade" or "Validator"
15. Hover on funder cell → tooltip appears with explanation

### Bidding Events Excluded

16. No visible row has "Bidding" in the Reason column

### Expert Mode

17. Navigate `/expert-protected-events`
18. Verify "Last Epoch Bids" metric visible

---

## tests/navigation.spec.ts — Navigation & Routing

### Tab Visibility

1. Navigate `/`, verify 3 tab links visible:
   "Stake Auction Marketplace", "Protected Events", "Validator Bonds"
2. Verify "Docs" link present

### Tab Navigation

3. Click "Protected Events" tab → URL changes to `/protected-events`
4. Click "Validator Bonds" tab → URL changes to `/bonds`
5. Click "Stake Auction Marketplace" tab → URL changes to `/`

### Active Tab State

6. On `/`, SAM tab has active CSS class
7. On `/bonds`, Bonds tab has active CSS class
8. On `/protected-events`, Events tab has active CSS class

### Expert URLs

9. Navigate `/expert-` → page loads, "Expert Guide" link visible
10. Navigate `/expert-bonds` → bonds page with expert columns
11. Navigate `/expert-protected-events` → events with expert metric

### Basic Mode

12. On `/`, verify "Expert Guide" link NOT visible

---

## tests/visual.spec.ts — Visual Regression

Screenshot-based tests using `expect(page).toHaveScreenshot()`.
Baselines stored in `tests/__screenshots__/`.

### SAM Page

1. `/` — full page, data loaded (mask dynamic values with stable selectors)
2. `/expert-` — full page with expert metrics and columns

### SAM Simulation

3. `/expert-` with simulation mode active — banner + tinted table
4. Simulation with ghost row visible

### Validator Bonds

5. `/bonds` — full page
6. `/expert-bonds` — full page with extra columns

### Protected Events

7. `/protected-events` — full page
8. `/protected-events` with validator filter active
9. `/expert-protected-events` — full page

### Navigation

10. Each tab active state (3 screenshots)

---

## Test Data Strategy

Tests run against live API data (validators-api.marinade.finance).
No mocks — tests verify structure and behavior, not specific values.

- Row counts: assert > 0, not exact numbers
- Sort order: compare adjacent rows, not absolute values
- Metric presence: check text labels exist, values non-empty
- Visual tests: use `maxDiffPixelRatio: 0.01` for tolerance

## Running

```
pnpm test:e2e              # run all tests
pnpm test:e2e --ui         # interactive mode
pnpm test:e2e --update-snapshots  # update visual baselines
```
