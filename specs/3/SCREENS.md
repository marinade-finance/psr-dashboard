---
status: shipped
---

# v2 UI Screen Inventory

Documents the four screens of the PSR Dashboard as they exist in code.
All pages share the same shell: `Navigation` at top, optional `Banner`,
then page-specific content. Routes exist in both Basic and Expert variants
(`/foo` and `/expert-foo`); `level: UserLevel` propagates through to
components.

---

## Navigation

**File:** `src/components/navigation/navigation.tsx`

Fixed top bar (h-14), horizontally scrollable on narrow viewports.

### Left

- Marinade logo SVG + "PSR Dashboard / Protected Stake Rewards" wordmark
  (wordmark hidden on mobile, logo always visible)
- Divider line

### Tabs (center-left)

| Label (desktop) | Label (mobile) | Route |
|---|---|---|
| Stake Auction Marketplace | SAM | `/{prefix}` |
| Protected Events | Events | `/{prefix}protected-events` |
| Validator Bonds | Bonds | `/{prefix}bonds` |

Active tab: `bg-primary text-primary-foreground` pill style.

`prefix` is `""` for Basic, `"expert-"` for Expert. The prefix is computed
from `level === UserLevel.Expert` and prepended to all tab hrefs.

**Prefetch on hover:** hovering "Protected Events" tab calls
`queryClient.prefetchQuery('protected-events', ...)` with `staleTime: 5min`;
hovering "Validator Bonds" does the same for `'bonds'`. Implemented in
`Navigation.prefetch` callback.

### Right

- Docs link → `/docs/` (hidden on mobile)
- Expert Guide link → `/docs/?from=expert#GUIDE-EXPERT` (Expert mode only,
  hidden on mobile)
- `ThemeToggle` (light/dark switch)

---

## SAM Page

**Routes:** `/` (Basic), `/expert-` (Expert)
**Files:** `src/pages/sam.tsx`, `src/components/sam-table/sam-table.tsx`

### Stats Bar

Five `Card` tiles in a `flex flex-wrap` row. Each card shows a label +
large mono value. Cards flex to fill available width (`flex-1 min-w-[140px]`).

| Label | Source |
|---|---|
| Total Auction Stake | `selectSamDistributedStake(validators)` → SOL |
| Winning APY | `selectWinningAPY(auctionResult, epochsPerYear)` |
| Projected APY | `selectProjectedAPY(auctionResult, epochsPerYear)` |
| Winning Validators | `winningCount / totalValidators` |
| Re-delegation | Sum of positive stake changes from `buildExpectedStakeChanges` → SOL |

"Winning APY" and "Re-delegation" have `HelpTip` inline tooltip icons.
"Max APY" column header also has a `HelpTip`.

When `simulatedValidators.size > 0`, a "Reset Simulation (N)" destructive
button appears as a sixth item in this row. Clicking calls
`onResetSimulation`, which clears all overrides and re-fetches.

### Table

Sortable by clicking column headers (toggle asc/desc; sort indicator `↑`/`↓`
shown next to active column). Default sort: Stake / Next Delta descending.

| Column | Sort key | Notes |
|---|---|---|
| # | `rank` / `stakeDelta` | Rank integer; becomes position-change display + ✕ clear button for simulated rows |
| Validator | `validator` | Name (from `nameMap`) + truncated vote account; red pulsing dot if `bondRunway <= 5` or `bondUtilPct >= 85` |
| Max APY | `maxApy` | `selectMaxAPY` result; green pill if in winning set, red pill if not; hover shows `ApyTooltip` breakdown |
| Bond | `bond` | Health badge (Healthy/Watch/Critical with colored dot), SOL amount, mini progress bar showing remaining capacity, runway in epochs |
| Stake / Next Delta | `stakeDelta` | Current active stake SOL + expected change next epoch (green `+X SOL` or red `-X SOL`) from `buildExpectedStakeChanges` |
| Next Step | `nextStep` | Actionable tip from `getValidatorTip` in `tip-engine.ts`; urgency-colored pill with icon |
| (chevron) | — | Chevron button; highlights primary on row hover |

Rows split into two groups separated by a "Winning Set Cutoff" divider row:
winners (`marinadeSamTargetSol > 0`) above, non-winners below. Divider shows
winning APY and winner count.

**Row colors:**
- In-set rows: `bg-card`, hover → `bg-primary-light`
- Out-of-set rows: `bg-destructive/[0.02]`, hover → `bg-destructive/[0.05]`
- Ghost rows (simulation): `opacity-40 line-through bg-muted/30 cursor-default`

Clicking a non-ghost row opens the Validator Detail sheet (in normal mode),
or selects the row for editing (in simulation mode).

### Simulation Mode

Simulation state lives in `SamPage` (`src/pages/sam.tsx`):
- `simulationModeActive: boolean`
- `simulationOverrides: SourceDataOverrides | null` — map of voteAccount → override values
- `simulatedValidators: Set<string>`
- `pendingEdits: PendingEdits`
- `originalAuctionResult: AuctionResult | null` — saved on first simulation

Entering simulation: `handleToggleSimulationMode` saves the original result
and sets `simulationModeActive = true`. Clicking a row in simulation mode
opens inline editing (sets `editingValidator`). The inline edit form (rendered
in the calling page, not the table) accepts overrides, then
`handleRunSimulation` calls `mergeOverrides` and increments `simulationRunId`
to re-trigger `useQuery(['sam', simulationRunId], () => loadSam(overrides))`.

After simulation, `insertGhostRows` (`src/services/simulation.ts`) injects
ghost entries at the original positions of changed validators. The `RankCell`
for simulated rows shows rank colored green/red by position change direction
and a ✕ button to clear that validator's override.

### Validator Detail Sheet

**File:** `src/components/validator-detail/validator-detail.tsx`

Opens as a right-side `Sheet` (Radix) when a row is clicked in normal mode
(`selectedValidator` set in `SamPage`). Max width `4xl`, scrollable.

**Header:** rank, name, truncated vote account, "In Set" / "Out of Set" badge.

**Left column (2-column grid on lg+):**

1. **Why Rank #N?** — Four ranked factors with positive/negative/neutral
   impact styling:
   - Max APY (vs winning APY cutoff margin)
   - Bond capacity (utilization %, runway in epochs)
   - Stake target (delta from current to target)
   - Block production (% shared from `blockRewardsCommissionDec`)

2. **Position vs Winning APY** — Progress bar showing `positionPct`
   (rank position within winning set); marker line at winning APY.

3. **APY Composition** — Segmented bar (inflation/MEV/blocks/bid) using
   `--chart-1..4` CSS vars; legend below. Source: `getApyBreakdown` in
   `tip-engine.ts`.

4. **Next Step** — Same urgency-colored tip as the table column.

**Right column:**

1. **What-If Simulation** — Four numeric inputs (Stake Bid PMPE, Inflation
   Commission %, MEV Commission %, Block Rewards Commission %). "Run
   Simulation" button calls `onSimulate` on `SamPage`, which uses
   `mergeOverrides` and re-runs auction. "Restore" button appears if a
   simulation is active for this validator.

2. **Bond Health** — Health label + SOL amount, utilization % and runway in
   a 2-col grid.

3. **Stake Overview** — Active stake, target stake, delta with color from
   `formatStakeDelta`.

---

## Validator Bonds Page

**Routes:** `/bonds` (Basic), `/expert-bonds` (Expert)
**Files:** `src/pages/validator-bonds.tsx`,
`src/components/validator-bonds-table/validator-bonds-table.tsx`

Data source: `fetchValidatorsWithBonds` → `ValidatorWithBond[]`.
Page filters to rows where `totalMarinadeStake > 0 OR bond.effective_amount > 0`.

### Coverage Hero

Full-width card at top (`bg-card rounded-xl border`).

- Large bold `coveredPct%` label (e.g. "73%") + "of Marinade stake is
  bond-protected" subtitle
- Stacked bar (h-8): primary color segment for covered SOL, muted segment for
  uncovered SOL; tooltip shows exact SOL values
- Stat chips row: Bonds funded, Total bonds (SOL), Total stake (SOL)
- Expert only: "Max protectable" chip — `totalMaxProtectedStake / totalMarinadeStake`

`coveredPct = Math.round(totalProtectedStake / totalMarinadeStake * 100)`.
`selectProtectedStake` and `selectMaxProtectedStake` live in
`src/services/validator-with-bond.ts`.

### Tile Map

**Component:** `ValidatorBondsTileMap` (defined in `validator-bonds-table.tsx`)

Validators with active Marinade stake, sorted descending by stake, grouped
into 4 tier rows:

| Row label | Stake range |
|---|---|
| >100k | >= 100,000 SOL |
| 50k–100k | 50,000–100,000 SOL |
| 20k–50k | 20,000–50,000 SOL |
| <20k | < 20,000 SOL |

Empty tiers are omitted. Each tier row: 56px label column + flex-wrap tile
area. Tiles have `gap-px` spacing.

**Tile sizing:** `size = round(MIN_TILE + sqrt(stake / globalMaxStake) * (MAX_TILE - MIN_TILE))`
where `MIN_TILE = 28`, `MAX_TILE = 120`, `globalMaxStake` = largest validator
in the full list. Square tiles.

**Tile content** (thresholds by `size`):
- `size >= 36`: validator name (bold, white, text-shadow)
- `size >= 56`: stake SOL amount
- `size >= 76`: coverage %

**Tile background color** (`coverageColor` function):
| Condition | HSL |
|---|---|
| No bond | `hsl(220, 8%, 28%)` — grey |
| coverage < 40% | `hsl(0, 50%, 30%)` — red |
| 40–70% | `hsl(38, 65%, 30%)` — amber |
| 70–95% | `hsl(172, 45%, 28%)` — teal-green |
| >= 95% | `hsl(168, 55%, 32%)` — green |

**Coverage bar:** Always 10px tall at tile bottom, dark background
(`rgba(0,0,0,0.40)`); colored gradient fill at `coveragePct%` width.
No fill if no bond.

**Legend** below map: colored squares for each band + tile size note.

Tile hover: `tooltipAttributes` shows name, stake, coverage %, "No bond" if
applicable.

### Bonds Table

Generic `Table` component (`src/components/table/table.tsx`) with `showRowNumber`.
Default sort: Marinade Stake DESC (column index 1).

| Column | Header tooltip | Notes |
|---|---|---|
| Validator | — | Name + truncated vote account |
| Marinade Stake [SOL] | "Total SOL delegated..." | Hover shows native + liquid breakdown |
| Bond Balance [SOL] | "Effective SOL deposited..." | `bond.effective_amount` via `lamportsToSol` |
| Protected Stake [SOL] | "How much of this validator's Marinade stake is currently covered..." | `selectProtectedStake` |
| Coverage | "Ratio of protected stake to total Marinade stake..." | Mini progress bar (green ≥90%, yellow ≥50%, red <50%) + percentage |
| Max protectable [SOL] | "Maximum Marinade stake that could be protected..." | Expert mode only |

`selectEffectiveAmount` lives in `src/services/bonds.ts`.

---

## Protected Events Page

**Routes:** `/protected-events` (Basic), `/expert-protected-events` (Expert)
**Files:** `src/pages/protected-events.tsx`,
`src/components/protected-events-table/protected-events-table.tsx`

Data source: `fetchProtectedEventsWithValidator` → `ProtectedEventWithValidator[]`.
Events with `reason === 'Bidding'` are filtered out from the table (but
included in `lastEpochBids` metric calculation).

### Summary Metrics

Responsive grid (2 cols mobile, 3 sm, 4 lg). `Metric` cards:

| Metric | Value | Tooltip |
|---|---|---|
| Events Protected | total event count | "Total number of protected events paid out to stakers" |
| Validator Bond Paid | SOL sum where `funder === 'ValidatorBond'` | "SOL paid from validators' own bonds" |
| Marinade Paid | SOL sum where `funder === 'Marinade'` | "SOL paid by Marinade's backstop" |
| Total SOL to Stakers | sum of both | "Total SOL paid out to stakers" |
| Filtered Events | count after filters | Only shown when filters are active |
| Last Epoch Bids | SOL from Bidding reason in last settled epoch | Expert mode only |

### Filters

Rendered as a `flex-col sm:flex-row` strip above the table.

- **Validator filter** — text `Input`, matches against `vote_account` or
  `validator.info_name` (case-insensitive substring)
- **Epoch range** — `EpochRangePicker` component; initialized to full
  min/max epoch range found in data

Both filters are controlled state in `ProtectedEventsTable`. Filter state is
not persisted between page navigations.

### Events Table

Generic `Table` with `showRowNumber`. Default sort: Epoch DESC (column index 1).

| Column | Header tooltip | Notes |
|---|---|---|
| Validator | — | Name + truncated vote account |
| Epoch | "Solana epoch (~2 days) in which this event occurred" | Integer epoch number |
| Reason | "Why the protection was triggered — commission increase, low uptime, or downtime" | Human-readable string from `selectProtectedStakeReason` |
| Paid Out | "SOL paid to compensate stakers..." | SOL amount + optional status badge |
| Funded by | "Validator Bond = validator's own collateral... Marinade = backstop..." | Funder badge |

### Status Badges (Paid Out column)

| Badge | Variant | Condition | Tooltip |
|---|---|---|---|
| Dryrun | `secondary` | `ProtectedEventStatus.DRYRUN` | "Not claimable — created during testing period" |
| Estimate | `default` | `ProtectedEventStatus.ESTIMATE` | "Based on live data, may change before epoch settles" |
| (none) | — | `ProtectedEventStatus.FACT` | Settled, no badge |

`ProtectedEventStatus` enum and `fetchProtectedEventsWithValidator` live in
`src/services/validator-with-protected_event.ts`.

### Funder Badges (Funded by column)

| Badge text | Color scheme | Funder value | Tooltip |
|---|---|---|---|
| Validator Bond | green (`bg-green-500/10 text-green-700 dark:text-green-400`) | `'ValidatorBond'` | "Validator paid" |
| Marinade | amber (`bg-amber-500/10 text-amber-700 dark:text-amber-400`) | `'Marinade'` | "Validator bond was insufficient" |

Rendered by `renderFunderBadge` in `protected-events-table.tsx`.
