---
status: planned
---

# Payment history — Marinade Bill + historical epoch browser

**Why:** the Payments tab in the validator detail panel shows only the upcoming
epoch's estimated costs. Validators who want to reconcile past spending, audit
for anomalies, or budget for future months have no history view in the dashboard.

## User need (from Discord feedback, 2026-05-29)

> "Is there a way to see past payments?" — validator L

Currently the only historical record is the Protected Events table (per-settlement
rows, not a billing summary). No month-level or epoch-level aggregates exist.

## Planned deliverables (far out)

Three separate deliverables, all dependent on historical epoch data being
accessible in the API:

### 1. Marinade Bill (monthly report)

A per-validator downloadable summary (PDF or CSV) covering one calendar month:
- Static bid cost per epoch × stake
- Dynamic bid cost per epoch
- PSR settlements paid from bond
- Bond risk fees charged
- Total bond outflow
- Month total in SOL + USD estimate

Triggered from a "Download bill" button on the Payments tab or validator detail
header. No UI overhaul — output only.

### 2. Historical epoch browser

The dashboard re-rendered for a past epoch: same SAM table, same validator
detail panel, but with frozen historical data. Allows a validator to replay
"what did the auction look like in epoch N?"

Requires: API to serve historical snapshots; route `/epoch/:n` or `?epoch=N`
query param; date picker / epoch selector in the header.

### 3. Historical graphs

Per-validator time-series charts on the validator detail panel:
- Bond balance over epochs
- Bid PMPE over epochs
- Stake over epochs
- Payments (bid cost + settlements) per epoch

Requires: historical epoch data endpoint per validator.

## Scope note

All three deliverables are long-horizon features gated on backend historical
data availability. No dashboard work should start until the API contract for
historical epoch data is defined.

**Where:** `src/components/validator-detail/` — Payments tab; new route `/epoch/:n`
(future).
