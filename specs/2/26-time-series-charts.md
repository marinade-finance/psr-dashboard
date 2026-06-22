---
status: draft
---

# Time-series charts — per-validator trend history

**Why:** the validator detail panel shows only the current epoch's snapshot.
Validators who want to track their bond balance trajectory, monitor how their
bid PMPE shifted over time, or see their stake history have no chart view.
Spotting gradual drift (bond erosion, stake decline) requires manually noting
numbers across sessions.

## Design

Compact per-validator trend charts on the validator detail panel, covering
the last N epochs (N configurable, default ~30).

| Chart | Data source |
|---|---|
| Bond balance over epochs | bonds API per-validator history |
| Bid PMPE over epochs | validators API historical `revShare` |
| Stake (active) over epochs | validators API historical stake fields |
| Payments per epoch | protected events API + bid cost history |

Charts are sparkline-style by default; click to expand to a full chart with
axis labels and epoch tooltips.

A new **Charts tab** on the validator detail panel is the primary entry point.
Alternatively, small sparklines inline on each breakdown card.

**Preconditions:** same historical data endpoints required as spec 25
(epoch browser). Bond history may be available before full epoch snapshots —
bond + stake charts could ship before bid/payments charts.

**Where:** `src/components/validator-detail/` — new Charts tab;
`src/services/` — per-validator historical data fetchers.
