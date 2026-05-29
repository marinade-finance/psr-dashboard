---
status: planned
---

# Commissions summary — bid + commission inline on table row

**Why:** validators in the old dashboard could see static bid, inflation
commission, MEV commission, and block-rewards commission at a glance on each
row. Currently this data requires clicking into the validator detail →
Bidding tab. High-context users comparing multiple validators have to click
in and out repeatedly.

## Current state

The Bidding tab breakdown already shows all four values clearly:
- Inflation: X% → Y PMPE
- MEV: X% → Y PMPE
- Block rewards: X% → Y PMPE
- Static bid: Y PMPE
- Non-bid revenue (sum): Y PMPE

This is accessible but requires a click. The SAM table row shows only
`Max APY` and `Next Step` — no raw commission figures.

## Options

**A — Tooltip on Max APY cell:** hover on the Max APY cell opens a small
table with the four commission/PMPE values. No new columns; no layout impact.
Works well for casual comparison.

**B — Expanded columns (non-compact mode):** add Inflation %, MEV %,
Bid PMPE as sortable columns in full view. Validators who want to sort by
MEV commission directly can do so. Column count increases from ~10 to ~13 —
only viable if compact mode hides them.

**C — Secondary row (two-row layout):** each validator row gets a collapsed
sub-line with the three commission figures. Denser but preserves column count.
Higher implementation cost.

## Recommendation

Option A first — a tooltip on Max APY showing the PMPE breakdown is low-risk
and covers the comparison use case without layout changes. Option B is a
follow-on if sorting by commission proves valuable.

## Acceptance

- Inflation %, MEV %, Block rewards %, Static bid PMPE visible without
  opening the detail panel.
- No new required columns in compact mode.

**Where:** `src/components/sam-table/sam-table.tsx` — Max APY cell;
`src/components/validator-detail/apy-composition-card.tsx` for reference data.
