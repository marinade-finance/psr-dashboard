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
