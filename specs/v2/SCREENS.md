# Screens

Three tabs, dark theme, shared sticky nav with tab links and docs buttons.

> **See also**: `VISUALS.md` for detailed mockup-derived layouts,
> component specs, shadcn/Tailwind migration plan, and pixel-level
> styling tokens.

---

## Stake Auction Marketplace

Default view. Shows auction results and validator rankings.

### Metrics

Total Auction Stake, Winning APY, Projected APY, Winning Validators.
Basic mode: each card has a one-line muted subtitle explaining the metric.
Expert adds: Stake to Move, Active Stake, Productive Stake, Avg Stake,
T. Protected, T. Unprotected, Conc. Risk, Conc. TVL, +/-10% TVL, Ideal APY.
Expert metrics: no subtitles (density).

### Basic Mode — List View

Card-based list with two density modes. Default sort: target stake desc.
Click any row → validator detail page.

#### Density Toggle

`Compact | Expanded` toggle above the list. Default: Compact.

#### Compact Row

Single-line card. Five elements:

```
┌──────────────────────────────────────────────────────────────┐
│▎ 1   Laine             16.27%    ● Healthy     ↑ +22,549☉   │
└──────────────────────────────────────────────────────────────┘
```

- **#** — rank, muted
- **Name** — validator name, fallback truncated pubkey `Abc1…xyz9`
  (pubkey fallback: click to copy, brief "Copied" toast)
- **Max APY** — bold percentage
- **Bond health** — colored dot + label
- **Stake Δ** — signed SOL delta (target − active), colored arrow

#### Expanded Row

Multi-line card with 3-column detail breakdown:

```
┌──────────────────────────────────────────────────────────────┐
│▎ 1  🇩🇪 Laine                                    ↑ +22,549☉   │
│                                                              │
│  APY BREAKDOWN          BOND HEALTH         STAKE MOVEMENT   │
│  Inflation comm.  0%    315☉  42% used      Current  45,000☉ │
│  MEV comm.        0%    ● Healthy           Target   67,549☉ │
│  Block prod.    100%    ████████████░░░░                      │
│  Stake bid    0.461%                        Delta  ↑+22,549☉ │
│  ──────────────                                              │
│  Max APY     16.27%                                          │
│                                                              │
│  Tip: On track to gain +22,549☉                              │
└──────────────────────────────────────────────────────────────┘
```

**APY Breakdown** (left): commission percentages + stake bid,
separator, Max APY total.

**Bond Health** (center): balance in SOL, utilization badge
(`42% used`), health dot + label, progress bar colored by health.

**Stake Movement** (right): current (active), target, delta
with colored arrow.

**Tip line**: recommendation text at bottom, muted.

#### Bond Health States

- `● Healthy` #4ade80 — >10 epochs coverage
- `● Watch` #fbbf24 — 3-10 epochs
- `● Low` #f87171 — ≤2 epochs
- `● None` #6b7280 — no bond

#### Stake Δ Colors

- `↑ +N☉` #4ade80 — gaining stake
- `↓ -N☉` #f87171 — losing stake
- `— 0☉` #6b7280 — stable

#### Row Style

- Background: rgba(15, 23, 42, 0.6)
- Border: 1px solid rgba(148, 163, 184, 0.1), radius 8px
- Gap: 4px between rows
- Padding: compact 12px 24px, expanded 20px 24px
- Hover: left border 3px solid #3b82f6, bg rgba(59, 130, 246, 0.04), pointer

#### Typography

- Basic list: Inter / system sans-serif, weight 400/500/600
- Expert table: monospace (current), unchanged

#### Copyable Addresses

Anywhere a pubkey is shown: click text to copy via `navigator.clipboard.writeText()`.
No separate button — the address itself is the click target.
Cursor: pointer. Hover: subtle underline.

Toast: inline "Copied" text replaces the address for 1.5s, then reverts.
No toast library — use local React state + `setTimeout`. The address
element briefly shows "Copied" in muted green (#4ade80), then fades back.

### Validator Detail Page

Navigate by clicking any row. No URL routing — detail view is React state
(`viewMode: 'detail'`, `selectedValidator: voteAccount`). No browser URL
change, no routing library needed. Back button top-left sets
`viewMode: 'list'`, preserving scroll position and sort via refs.

#### Layout

```
← Back

Laine                                              #1 of 211
Abc1...xyz9  (click to copy)

┌──────────┐  ┌──────────┐  ┌──────────┐
│ MAX APY  │  │ BOND     │  │ STAKE Δ  │
│ 16.27%   │  │ 315☉     │  │ ↑+22,549 │
│          │  │ Healthy   │  │ next ep  │
│          │  │ 42% used  │  │          │
└──────────┘  └──────────┘  └──────────┘

APY BREAKDOWN            BOND HEALTH           STAKE MOVEMENT
──────────────           ───────────           ──────────────
Inflation comm.    0%    250☉  72% used        Current 337,282☉
MEV comm.          0%    ████████░░░░░░        Target  360,341☉
Block prod.      100%    Bond low — top up
Stake bid      0.461%                          Delta  ↑+23,059☉

┌─ RECOMMENDATION ─────────────────────────────────────────┐
│ Top up bond to unlock higher stake cap (+23,059☉)        │
└──────────────────────────────────────────────────────────┘

┌─ SIMULATION ─────────────────────────────────────────────┐
│ What if I change my bid? → Enter Simulation              │
└──────────────────────────────────────────────────────────┘
```

**Header**: name (large), pubkey below (muted, click to copy),
rank badge `#1 of 211` top-right.

**Summary cards** (3 across): Max APY, Bond (health + utilization),
Stake Δ (signed delta + "next epoch").

**Detail columns** (3 across): APY breakdown, Bond health with
progress bar and advice, Stake movement with current/target/delta.

**Recommendation box**: faint blue bg rgba(59, 130, 246, 0.08),
left border 2px solid #3b82f6, actionable tip text.

**Simulation box**: CTA to enter simulation mode.

#### Recommendation Logic

Priority order (first match wins):
1. No bond → "Fund bond to enter auction"
2. Bond ≤2 epochs → "Top up bond — stake at risk"
3. Bond 3-10 epochs → "Bond covers N epochs — consider topping up"
4. Bond constraint → "Bond limits max stake — top up to unlock"
5. Country/ASO constraint → "Capped by [name] concentration"
6. Validator/Want constraint → "At [constraint] cap"
7. Non-productive bid → "Raise bid — below obligation threshold"
8. Target = 0 → "Raise bid to win stake"
9. Delta > 0 → "On track to gain +Δ☉"
10. Delta < 0 → "Losing Δ☉ — others outbid you"
11. Stable → "Stable position"

Reuses existing functions (all in `src/services/sam.ts`):
- `bondHealthColor()` — maps bond epochs to Color enum
- `bondTooltip()` — generates bond health tooltip text
- `selectConstraintText()` — formats `lastCapConstraint` into display string
  (calls `lastCapConstraintDescription()` internally)
- `selectIsNonProductive()` — checks if bid < 90% effective bid

### Expert Mode — Table View

Traditional sortable table, mostly unchanged from current.

**Column changes**:
- SAM Active + SAM Target → **Stake Δ** (delta display, tooltip
  shows active/target, sorts by target stake)
- New **Constraint** column showing `lastCapConstraint` or "—"

Expert columns:
```
# | Validator | Infl | MEV | Block | St. Bid | Bond | Max APY | Stake Δ | Eff. Bid | Constraint
```

Bond cell coloring unchanged (GREEN/YELLOW/RED/GREY).
Row tinting unchanged (yellow for non-productive).

#### Simulation Mode (Expert)

Same as current: inline editing, ghost rows, position grading.

### Operations

#### Data Loading

react-query key `['sam', simulationRunId]` → `loadSam(overrides?)` runs
DS-SAM SDK auction. Loading spinner while pending. Error state shows
message. Data refreshes when `simulationRunId` increments (simulation).

#### Sorting

Default: SAM Target DESC. Click column header cycles: ASC → DESC → reset
to default. Multi-level sort: user click prepended to default order array.
Sort indicators: `▲`/`▼` on active column, dimmed on default.

#### Expert Toggle

URL-based: `/` (basic) vs `/expert-` (expert). Navigation links swap
between variants. Expert shows additional metrics rows and table columns.
Toggle preserves no other state (fresh page load).

#### Simulation Flow (Expert Only)

1. Click "Enter Simulation" in nav → `simulationModeActive = true`,
   current result snapshot saved as `originalAuctionResult`
2. Table header glows blue, body tinted with simulation background
3. Click any validator row → inline edit opens (4 fields: Inflation
   Commission, MEV Commission, Block Rewards Commission, Stake Bid)
4. Edit values → click "Simulate" or press Enter → builds
   `SourceDataOverrides` map, increments `simulationRunId`, SDK re-runs
5. During calculation: header pulses (CSS animation), Simulate button
   disabled and shows "Calculating..."
6. Result: ghost row at original position (greyed, strikethrough,
   non-interactive), simulated row at new position with tint:
   - 1-2 positions moved: light green/red (12% opacity)
   - 3-4 positions: medium (22% opacity)
   - ≥5 positions: strong (35% opacity)
   - Unchanged: white tint (12% opacity)
7. Cancel: Escape key or Cancel button → clears edits, closes fields
8. Click outside table → cancels editing (mousedown listener)
9. Exit Simulation → resets all overrides, restores original data

#### Row Coloring

- Non-productive validators (bid < 90% effective bid): row tinted yellow
- Bond column cell: background colored by `bondHealthColor()`:
  GREEN (>10 epochs), YELLOW (3-10), RED (≤2), GREY (no bond)

#### Metrics Display

Basic: single row of 4 metric cards with subtitles.
Expert: 3 rows — basic metrics + Stake to Move / Active Stake /
Productive Stake / Avg Stake (row 2) + T. Protected / T. Unprotected /
Conc. Risk / Conc. TVL / +/-10% TVL / Ideal APY (row 3).
All values formatted with tooltips showing full precision.

---

## Protected Events

History of protected staking events per epoch.

### Metrics

Total events, Total amount, Last Settled Amount.
Expert adds: Last Epoch Bids.
When filtered: Filtered Events, Filtered Amount.

### Filters

Validator text search (vote account or name) + epoch range (min/max).

### Table

Columns: Epoch, Validator, Name, Settlement, Reason, Funder.
Default sort: Epoch desc, Settlement desc, Reason desc.

Badges in Settlement column:
- **Estimate** (green) — pending settlement, may change
- **Dryrun** (dark) — test event, not claimable

Funder shows "Marinade" or "Validator" with explanatory tooltip.

### Operations

#### Data Loading

react-query key `'protected-events'` → `fetchProtectedEventsWithValidator()`.
Joins events with validator names. Loading spinner while pending.

#### Filtering (Local State)

- **Validator search**: text input, case-insensitive substring match on
  vote account or validator name. Filters rows client-side.
- **Epoch range**: min/max number inputs, initialized to dataset bounds.
  Filters rows where epoch is within [min, max].
- Events with `reason === 'Bidding'` always excluded from table display
  (their amounts feed the Last Epoch Bids expert metric instead).

#### Filtered Metrics

When any filter is active, two additional metrics appear alongside totals:
Filtered Events (count) and Filtered Amount (SOL sum of filtered rows).
When filters cleared, these metrics disappear.

#### Sorting

Default: Epoch DESC, Settlement DESC, Reason DESC (multi-level).
Column click cycling same as SAM table.

#### Badges

Settlement column renders status badges:
- `Estimate` (green background) — live data, may change before settlement
- `Dryrun` (dark background) — test event, not claimable

#### Funder Logic

Shows `Marinade` (DAO-funded, beyond validator's expected coverage) or
`Validator` (within bond coverage). Tooltip explains the distinction.

---

## Validator Bonds

All validator bonds and protection coverage.

### Metrics

Bonds Funded, Bonds Balance, Marinade Stake, Protected Stake.
Expert adds: Max Protectable Stake.

### Table

Columns: Validator, Name, Bond balance, Max Stake Wanted, Bond Comm.,
Marinade stake, Eff. Cost.
Expert adds: Max protected stake, Protected stake %.
Default sort: Bond Commission asc, Bond balance desc.

### Operations

#### Data Loading

react-query key `'bonds'` → `fetchValidatorsWithBonds()`. Pre-filtered:
only validators with Marinade stake > 0 OR bond effective_amount > 0.

#### Sorting

Default: Bond balance DESC, Bond Comm DESC. Column click cycling same
as other tables. Null handling: nulls pushed to end regardless of sort
direction (uses Infinity/-Infinity sentinel).

#### No Interactive Filters

Static display — no search, no range filters. All qualifying validators
shown.

---

## Navigation

### Layout

Sticky horizontal bar at top. Contains:
- Tab links: SAM, Protected Events, Validator Bonds
- Docs button (external `/docs/` link)
- Expert Guide button (expert mode only, links to `/docs/?from=expert#GUIDE-EXPERT`)
- Children slot (used for simulation toggle button on SAM page)

### Operations

- Active tab highlighted via React Router NavLink `isActive`
- Expert mode: routes prefixed with `/expert-` (e.g. `/expert-bonds`)
- Basic ↔ Expert: separate URL paths, not a toggle. User navigates via
  bookmarks or direct URL. No in-app toggle button.
- Tab click triggers React Router navigation (no full page reload)

---

## Expert vs Basic

Expert mode adds extra metrics, 2 bond table columns, and an
"Expert Guide" docs link. Otherwise identical.
