---
status: planned
---

# Precise APY from real epoch timestamps

**Why:** `EPOCHS_PER_YEAR = (365.25 × 24 × 3600) / 172800` (theoretical 48h)
overestimates APY during slow epochs and underestimates during fast ones.
Extended validator halts can push real epoch duration ±5%.

**Design:** derive `epochsPerYear` from the observed average over at least 10
epochs using `epoch_start_at` / `epoch_end_at` timestamps already available on
`epoch_stats` per validator in `fetchValidatorsWithEpochs`. Falls back to the
constant if the sample window is too narrow.

**Where:** `src/services/sam.ts` — replace the constant with the derived value.
