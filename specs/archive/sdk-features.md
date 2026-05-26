---
status: shipped
---

# SDK-level features — shipped

Open SDK-blocked items moved to `1/0-next.md`.

## PSR estimate query — share all-validator fetch across detail opens

`fetchPsrEstimatesForValidator` used to fetch all validators (3 epochs) and
filter client-side per detail open; opening N detail sheets made N full calls.
Split into a single `['psr-estimates-all']` query (5-min `staleTime`) with the
per-validator filter computed in `useMemo` against the cached result.

**Where:** `src/components/validator-detail/validator-detail.tsx:583-598`.
