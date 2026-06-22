---
status: shipped
---

# v2 Code Audit

## Problem

feature/my-feature was developed independently and contained unnecessary complexity alongside stale v1 artifacts that needed removal before shipping.

## Approach

Read all ported v2 files and eliminated: epoch estimation (replaced with constant `EPOCHS_PER_YEAR`), CSS Modules remnants, stale columns (Staker Loss), dead selectors (`selectEprLossBps`), and duplicated bond health logic.

Bond health centralized in `calculations.ts` rather than scattered across components.

## Code pointers

- `src/services/calculations.ts` — bond health logic consolidated here (`bondHealthColor`, `getBondHealth`), removing duplication
- `src/services/sam.ts` — `selectEprLossBps` removed; epoch duration is now a constant, not estimated
- `src/index.css` — CSS Modules fully removed; global styles, CSS variables, and keyframe animations only
