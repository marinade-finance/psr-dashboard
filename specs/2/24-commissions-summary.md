---
status: planned
---

# Commissions summary — bid + commissions always visible on row

**Why:** validators in the old dashboard could see static bid, inflation
commission, MEV commission, and block-rewards commission at a glance on each
row. Currently this data requires clicking into the validator detail →
Bidding tab. High-context users comparing multiple validators have to click
in and out repeatedly. The intent is to make these values immediately visible,
not hidden behind hover or a click — we'll experiment with the best layout.

## Current state

The Bidding tab breakdown already shows all four values clearly:
- Inflation: X% → Y PMPE
- MEV: X% → Y PMPE
- Block rewards: X% → Y PMPE
- Static bid: Y PMPE
- Non-bid revenue (sum): Y PMPE

This is accessible but requires a click. The SAM table row shows only
`Max APY` and `Next Step` — no raw commission figures.

## Direction

Values must be **immediately visible** on the row — no hover, no click required.
Exact layout is TBD; experiment on the actual table before deciding:

- **Inline sub-values under Max APY:** small secondary text under the APY figure
  showing Inf X% / MEV X% / Bid Y PMPE in a compact two-line cell.
- **Dedicated columns:** Inflation %, MEV %, Bid PMPE as their own sortable
  columns (full view only; hidden in compact mode). Sortability is a real
  advantage here — filtering by MEV commission is a use case.
- **Secondary row:** a collapsed sub-line per validator row with the three
  commission percentages. Higher implementation cost, avoids column explosion.

The old dashboard used a dedicated column layout — that's the reference point
for what validators already expect to see.

## Acceptance

- Inflation %, MEV %, Block rewards %, Static bid PMPE visible on the row
  without opening the detail panel or hovering.
- Compact mode hides commission columns (or the secondary row) — they are
  secondary context, not primary action signals.
- Columns are sortable if implemented as dedicated columns.

**Where:** `src/components/sam-table/sam-table.tsx` — row layout, column
definitions; `src/components/validator-detail/apy-composition-card.tsx`
for reference on data shape.
