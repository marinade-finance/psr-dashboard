---
status: planned
---

# PSR Settlement Pending Status

**Why:** everything auction-emitted shows as ESTIMATE today; the table cannot
distinguish "settlement final, on-chain claim not yet visible" from
"current-epoch projection."

Three states total:

- **ESTIMATE** — current-epoch projection (existing).
- **PENDING** — auction-emitted / settled, on-chain claim not yet visible (new).
- **FINALIZED** — on-chain settlement done, muted badge (existing label, needs
  explicit rendering even when muted so every row has a status).

**Where:**

- `src/services/validator-with-protected_event.ts` — gate between ESTIMATE and
  PENDING based on auction emit flag.
- `src/components/protected-events-table/` — third badge colour for PENDING.
