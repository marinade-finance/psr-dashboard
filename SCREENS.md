# Screens

Three tabs, dark theme, shared sticky nav with tab links and docs buttons.

---

## Stake Auction Marketplace

Default view. Shows auction results and validator rankings.

### Metrics

Total Auction Stake, Winning APY, Projected APY, Winning Validators.
Expert adds: Stake to Move, Active Stake, Productive Stake, Avg Stake,
T. Protected, T. Unprotected, Conc. Risk, Conc. TVL, +/-10% TVL, Ideal APY.

### SAM Table

Columns: #, Validator, Infl., MEV, Block, St. Bid, Bond, Max APY,
SAM Active, SAM Target, Eff. Bid. Default sort: SAM Target desc.

#### Bond cell coloring

The Bond column cell shows bond health:

- **Green** — bond covers >10 epochs of bids
- **Yellow** — bond covers 2-10 epochs
- **Red** — bond covers <=2 epochs
- **Grey** — no funded bond (balance <= 0)
- No color — not winning stake

#### Row tinting (non-productive)

Yellow row tint when validator's bid covers <90% of their bond obligation.

#### Simulation mode

Toggle via "Enter Simulation" button in nav. When active:

- Table has light blue tint, header has blue gradient
- Click any row to edit: commission inputs + bid input appear inline
- Position # cell shows Simulate and X buttons
- Enter runs simulation, Escape cancels
- During calculation: header glows, buttons disabled

After simulation completes:

- **Ghost row** at original position: strikethrough text, purple tint,
  non-interactive, shows original rank
- **Simulated row** at new position: bold italic address, clickable
  - Green background — position improved (moved up)
  - Red background — position worsened (moved down)
  - White/grey background — position unchanged
- Bond health tinting applies on top of position colors

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

---

## Expert vs Basic

Expert mode adds extra metrics, 2 bond table columns, and an
"Expert Guide" docs link. Otherwise identical.

---

## Validator Detail Panel

Right-side Sheet opened by clicking any SAM table row.

Tabs: Overview · Payments · Bond · Bid Penalty · **P&L** (new)

### Overview Tab

- **Tip banner**: one-line action prompt (critical/warning/info/positive)
- **Why Rank #N card**: factors with impact color — bid vs winning APY, bond
  capacity, stake delta, block production
- **Max APY Composition card**: stacked bar chart of inflation/MEV/block/bid
  components with winning threshold marker
- **What-If Simulation card**: editable inputs (bid PMPE, inflation %, MEV %,
  block %), auto-recalculate on 400ms debounce
- **Bond Snapshot**: balance, utilization %, runway epochs → link to Bond tab
- **Stake Overview**: active, target, expected next-epoch delta

### Payments Tab

Table: active stake / target stake / delta / per-component commission PMPE /
effective bid PMPE / SOL cost per epoch on active + activating stake.

### Bond Tab

Bond balance, claimable balance, coverage vs min/ideal thresholds, top-up
amounts to reach min and ideal coverage.

### Bid Penalty Tab

Whether bid-too-low penalty is active, shortfall PMPE, penalty coefficient,
effective penalty PMPE, and SOL impact on current stake.

---

## P&L / Profitability Analysis Tab (new)

**Tab label**: "P&L"  
**5th tab**, after "Bid Penalty"

### User Journeys

**Journey A — "Should I join SAM?"**
1. Validator opens own row → P&L tab
2. Sees break-even stake vs current stake
3. If current > break-even: clear positive ROI signal with net SOL/epoch
4. If current < break-even: callout shows gap and what bid/commission change
   would lower the threshold into reach

**Journey B — "Is my bid/bond sized right?"**
1. Opens detail → P&L tab to see net SOL/epoch at current stake
2. Enables Simulate, changes bid → P&L numbers update live
3. Break-even chart shifts; validator finds bid level that maximises net P&L
   given bond opportunity cost

**Journey C — "I have a penalty, what does it cost me?"**
1. Checks Bid Penalty tab to see penalty PMPE
2. Switches to P&L tab: penalty is already embedded in `auctionEffectiveBidPmpe`
   so it shows up as increased bid cost in the waterfall
3. Callout shows net epoch loss attributable to penalty

---

### Calculations

All figures are per-epoch. Constants:
- `epochsPerYear` ≈ 7.6 (172,800 s/epoch)
- `riskFreeApy` = 0.07 (7% — opportunity cost benchmark for locked SOL)
- `riskFreeRatePerEpoch` = `riskFreeApy / epochsPerYear`

**Validator's own earn rate per SOL of Marinade stake per epoch:**

`revShare.*Pmpe` fields are Marinade's delegator share. Recover gross yield,
then apply validator commission:

```
grossInflPmpe = inflationPmpe / (1 - inflationCommissionDec)   [if commDec < 1]
grossMevPmpe  = mevPmpe       / (1 - mevCommissionDec)
grossBlkPmpe  = blockPmpe     / (1 - blockRewardsCommissionDec)

validatorEarnPmpe = grossInflPmpe * inflationCommissionDec
                  + grossMevPmpe  * mevCommissionDec
                  + grossBlkPmpe  * blockRewardsCommissionDec

validatorEarnRatePerEpoch = validatorEarnPmpe / 1000   [SOL per SOL per epoch]
```

**SAM cost per epoch** (SOL paid to Marinade):
```
costPerEpoch = auctionEffectiveBidPmpe / 1000 * marinadeActivatedStakeSol
```

**Bond opportunity cost per epoch**:
```
bondOpportunityCostPerEpoch = bondBalanceSol * riskFreeRatePerEpoch
```

**Net P&L per epoch**:
```
netPerEpoch = validatorEarnRatePerEpoch * activeStake - costPerEpoch - bondOpportunityCostPerEpoch
```

**Break-even stake**:
```
margin = validatorEarnRatePerEpoch - auctionEffectiveBidPmpe / 1000
if margin <= 0:
    breakEvenStake = Infinity   // bid cost >= revenue per SOL
else:
    breakEvenStake = bondOpportunityCostPerEpoch / margin
```

---

### Layout

```
┌─────────────────────────────────────────────────────┐
│  Callout chips (full width flex row)                │
│  [Break-even: X SOL]  [Net: +Y SOL/epoch]  [Bond cost: Z SOL/epoch]  │
├──────────────────────┬──────────────────────────────┤
│  Per-Epoch Waterfall │  Break-even Chart            │
│  (left card)         │  (right card, inline SVG)    │
│                      │                              │
│  Revenue   ████░░░   │  ^                           │
│  Bid cost  ████      │  | net SOL/epoch             │
│  Bond opp  ██        │  |         *current          │
│  ────────────────    │  |    /                      │
│  Net       ███       │  |   /                       │
│                      │  |--*----------- 0           │
│  numeric table below │  | ^ break-even              │
│                      │  +---→ stake SOL             │
├──────────────────────┴──────────────────────────────┤
│  Assumptions (collapsed <details>)                  │
└─────────────────────────────────────────────────────┘
```

#### Callout Chips

Three `Badge`-style chips in a `flex gap-3 flex-wrap` row:

| Chip | Content | Green when | Red when |
|------|---------|------------|----------|
| Break-even | "Break-even: X SOL · you have Y (+Z%)" | activeStake > breakEvenStake | activeStake < breakEvenStake |
| Net | "Net: +X SOL/epoch" | netPerEpoch > 0 | netPerEpoch < 0 |
| Bond | "Bond: X SOL/epoch opportunity cost" | always neutral/info | — |

If `margin <= 0`: single red chip "Bid exceeds revenue per SOL — unprofitable
at any stake level. Lower bid below commission yield to fix."

#### Per-Epoch Waterfall Card

Horizontal bars, each labeled with SOL value (2 dp). Use CSS width % of
card width, not SVG. Same visual language as APY bar in Overview.

| Row | Color | Formula |
|-----|-------|---------|
| Revenue | `var(--primary)` | `validatorEarnRatePerEpoch * activeStake` |
| Bid cost | `var(--destructive)` | `costPerEpoch` |
| Bond opp cost | `var(--warning)` | `bondOpportunityCostPerEpoch` |
| Net | green if positive, red if negative | `netPerEpoch` |

Below bars: three-column table `label / per epoch SOL / per year SOL`.

Annualized = per-epoch value × `epochsPerYear`.

#### Break-even Line Chart (inline SVG)

- x-axis: 0 → `max(activeStake * 2, breakEvenStake * 1.5, 1000)` SOL
- y-axis: `netPerEpoch` at each x (linear: `margin * x - bondOpportunityCost`)
- Zero hairline horizontal
- Break-even dot + vertical dashed line + label "Break-even X SOL"
- Current stake dot + label "Current: +Y SOL/epoch"
- If `breakEvenStake === Infinity`: no break-even marker, line stays negative

Four x-axis ticks: 0, break-even (if finite), current stake, 2× current.

Dimensions: full card width × 140px height. No external charting library.

#### Assumptions (collapsed)

`<details><summary>Assumptions</summary>` block with a table:

| Parameter | Value | Source |
|-----------|-------|--------|
| Risk-free rate | 7.0% APY | hardcoded benchmark |
| Epochs/year | 7.6 | `epochsPerYear` prop |
| Inflation commission | X% | `inflationCommissionDec` |
| MEV commission | X% | `mevCommissionDec` (null → 0%) |
| Block commission | X% | `blockRewardsCommissionDec` (null → 0%) |
| Effective bid | X PMPE | `auctionEffectiveBidPmpe` |
| Bond balance | X SOL | `bondBalanceSol` |
| Active stake | X SOL | `marinadeActivatedStakeSol` |

---

### Edge Cases

| Condition | Behaviour |
|-----------|-----------|
| Margin ≤ 0 (bid ≥ earn rate) | Infinity break-even, all-red callout, downward sloping chart |
| Out-of-set (no active stake) | Waterfall shows hypothetical at target stake, callout says "Not in set — projected P&L if you win target stake" |
| Zero bond | Bond opportunity cost = 0, break-even = 0 (any stake is profitable if margin > 0) |
| Simulation active | All inputs re-derived from override values; "Simulated ·" prefix on card header |
| MEV/block commission null | Treat as 0% (validator earns nothing from those streams on Marinade stake) |

---

### Implementation

New files:
- `src/services/pnl.ts` — `computePnlMetrics(v, epochsPerYear, riskFreeApy?)` pure function, unit-testable
- `src/components/breakdowns/pnl-breakdown.tsx` — tab content component

Changes to existing files:
- `src/components/validator-detail/validator-detail.tsx`:
  - Add `'pnl'` to `Tab` union
  - Add "P&L" tab button after "Bid Penalty"
  - Render `<PnlBreakdown>` when `tab === 'pnl'`

`PnlMetrics` shape (output of `computePnlMetrics`):
```ts
interface PnlMetrics {
  validatorEarnRatePerEpoch: number   // SOL per SOL per epoch
  revenuePerEpoch: number             // SOL
  costPerEpoch: number                // SOL (effective bid × active stake)
  bondOpportunityCostPerEpoch: number // SOL
  netPerEpoch: number                 // SOL
  margin: number                      // earn rate - bid rate (SOL per SOL per epoch)
  breakEvenStake: number              // SOL (Infinity if margin <= 0)
  riskFreeRatePerEpoch: number
  epochsPerYear: number
}
```
