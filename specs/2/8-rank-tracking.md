---
status: planned
---

# Rank tracking — position history in the dashboard

**Why:** operators need trend direction, not just the current rank snapshot.

**What to track per epoch per validator:** rank, in-set status, SAM-active stake.

**Where to surface:**

- Main table: Δ rank vs previous epoch inline in the Rank cell (`▲3` / `▼1`).
- Validator detail / Overview tab: sparkline or table of last N epoch positions.
- Stats bar: count of validators that moved ≥5 places.

**Data source options (in priority order):**

1. Scoring API response adds a `/history` endpoint.
2. SDK exposes `epoch` on `AuctionResult` → accumulate in a new react-query
   `['epochHistory']` key, keyed by `(voteAccount, epoch)`.
3. `localStorage` session accumulation (fallback — zero infra, limited utility).
