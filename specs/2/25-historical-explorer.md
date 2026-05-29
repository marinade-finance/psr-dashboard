---
status: planned
---

# Historical explorer — epoch browser + per-validator time-series

**Why:** the dashboard is frozen at the current epoch. Validators who want to
understand how their position, stake, or costs evolved over time have no view
into past epochs. Two related surfaces are needed: a full-dashboard replay for
any past epoch, and per-validator trend charts.

## Part A — Epoch browser

The dashboard re-rendered with frozen historical data for a past epoch.
Same SAM table, same validator detail panel, same breakdown cards — but
showing what the auction looked like in epoch N.

**UX entry points:**
- Epoch selector / date picker in the global header (replaces "current epoch" display)
- Direct URL: `?epoch=N` (or `/epoch/N`) — linkable, shareable

**What changes:**
- All data fetches parameterised with `?epoch=N`
- "ESTIMATE" / "FINALIZED" badges reflect the historical epoch's state
- Read-only: simulation mode disabled for past epochs
- Clear visual indicator that the user is viewing a historical epoch (banner or
  muted header tint)

**Preconditions:** validators API, protected events API, and bonds API must
all support `?epoch=N` pagination or historical snapshots.

## Part B — Time-series charts

Per-validator trend charts on the validator detail panel, covering the last
N epochs:

| Chart                     | Data source                            |
| ------------------------- | -------------------------------------- |
| Bond balance over epochs  | bonds API per-validator history        |
| Bid PMPE over epochs      | validators API historical revShare     |
| Stake (active) over epochs| validators API historical stake fields |
| Payments per epoch        | protected events API + bid cost history|

Charts are compact sparkline-style by default; click to expand to full view.

**Preconditions:** same as Part A — historical data endpoints required.

## Scope note

Both parts are long-horizon features gated on backend historical data
availability. No dashboard work starts until the API contract for historical
epoch data is defined and stable. Part B can ship incrementally — bond
history may be available before full epoch snapshots.

**Where:** global header (epoch selector); new route `?epoch=N`;
`src/components/validator-detail/` — new Charts tab or inline sparklines;
`src/services/` — parameterised fetch wrappers.
