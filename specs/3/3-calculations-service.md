---
status: shipped
---

# Calculations Service

## Problem

APY, bond runway, utilization, and stake delta were duplicated inline across `sam.ts` and `tip-engine.ts` — untested pure math scattered in service files.

## Approach

Extracted into a single module with all functions taking explicit scalar/SDK-type arguments and no module-level state. Unit tests written first as the stable foundation before v2 UI porting began.

`EPOCHS_PER_YEAR` is a constant (not estimated from clock) — epoch duration is exactly 48h.

## Code pointers

- `src/services/calculations.ts` — all pure math: `compoundApy`, `bondHealthColor`, `bondRunwayEpochs`, `bondRunwayDays`, `bondUtilizationPct`, `getBondHealth`, `stakeDelta`, `apyBreakdown`, `isNonProductive`
- `src/services/__tests__/calculations.test.ts` — unit tests (≥3 cases per function, boundary + zero/null)
