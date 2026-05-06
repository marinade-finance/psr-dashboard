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

Columns: #, Validator, Max APY, Bond, Stake/Next Δ, Next Step.
Default sort: rank (cutoff-relative).

#### Rank cell (#)

Displays cutoff-relative rank as `+N` (above cutoff) or `-N` (below cutoff).
Colored by tip urgency (critical=destructive, warning=warning, positive=primary,
neutral=muted). Urgency icon (⚠/↗/✓/→) shown before the number.

When simulated: shows position-change color (green improved / red worsened)
and a ✕ button to remove the override. Ghost rows show absolute position number.

#### Bond health chip

Three states, computed by `bondHealthFromAuction` → `computeBondCoverageMetrics`:

- **Healthy** (green chip) — `claimableBond >= minUnprotectedReserve + exposed * minBondPmpe/1000`
  AND `bondBalance >= requiredIdeal`
- **Watch** (yellow chip) — min coverage met but ideal not met (`topUpToIdeal > 0`)
- **Critical** (red chip) — below min coverage floor (`topUpToMin > 0`)

Bond runway shown as `(Nep)` with parentheses (no `~` prefix). Colored by
bond health when runway ≤ 10 epochs, otherwise muted.

Alert dot (pulsing red) appears on validator name when runway ≤ 5 or
bond utilization ≥ 85%.

#### Next Step column

Tip text colored by urgency, same icon as rank cell. Tip is derived from
`getValidatorTip` which checks: in-set status, bond health (critical before
watch), bid PMPE, stake delta.

#### Simulation mode

Toggle via "Enter Simulation" button in nav. When active:

- Table has light blue tint, header has blue gradient
- Click any row to edit: commission inputs + bid input appear inline
- Position # cell shows Simulate and X buttons
- Enter runs simulation, Escape cancels
- During calculation: header glows, buttons disabled

After simulation completes:

- **Ghost row** at original position: strikethrough text, purple tint,
  non-interactive, shows original rank number
- **Simulated row** at new position: bold italic address, clickable
  - Green border — position improved (moved up)
  - Red border — position worsened (moved down)
  - No color — position unchanged

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

Tabs: Overview · Payments · Bond · Bid Penalty

### Header

- Rank displayed as cutoff-relative (`+N above cutoff` / `N below cutoff`)
  with tip urgency icon and color. Absolute rank shown as subtitle line.
- In Set / Out of Set badge.
- Simulate toggle (yellow when on). Reset button when simulation is active.

### Tip Banner

Full-width bar below the header, colored by urgency (critical/warning/info/positive/neutral).
Clicking the banner navigates to the relevant tab when `constraint` is `'bond'`
or `'bid'`. A pill button ("Bond tab →" or "Simulate →") with white background
and colored border appears when the banner is actionable.

### Overview Tab

- **Why Rank #N card**: factors with impact color — Max APY vs winning APY,
  bond capacity (balance + utilization + runway), stake delta, block production
- **Max APY Composition card**: stacked bar chart of inflation/MEV/block/bid
  components with winning threshold marker
- **What-If Simulation card**: editable inputs (bid PMPE, inflation %, MEV %,
  block %), auto-recalculate on 400ms debounce; toggle in header enables editing
- **Bond Snapshot**: balance, coverage status (colored by health), runway epochs
  → link to Bond tab
- **Stake Overview**: active, target, expected next-epoch delta

### Payments Tab

Table: active stake / target stake / delta / per-component commission PMPE /
effective bid PMPE / SOL cost per epoch on active + activating stake.

### Bond Tab

Bond balance, claimable balance, coverage vs min/ideal thresholds, top-up
amounts to reach min and ideal coverage. Health state: Critical/Watch/Healthy
from `bondHealthFromAuction` → `computeBondCoverageMetrics`.

### Bid Penalty Tab

Whether bid-too-low penalty is active, shortfall PMPE, penalty coefficient,
effective penalty PMPE, and SOL impact on current stake.
