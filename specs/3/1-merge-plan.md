---
status: shipped
---

# v3 Merge Plan

## Problem

Three diverged source trees needed to become one deployable codebase: origin/master (production, CSS Modules + Webpack), a Tailwind/Vite scaffolding branch, and feature/my-feature (target v2 UX, old Webpack + SDK 0.0.44).

## Approach

Used the Tailwind/Vite branch only for its build system and token definitions — discarded its UI entirely. Ported the v2 UX (feature/my-feature) onto Vite + Tailwind with minimal changes, then audited and simplified. SDK bumped to 0.0.48 during merge.

Key decisions:
- **Winning-set divider**: `border-t` on the first non-winner row keyed by cutoff index — no sentinel rows, no union types.
- **Bond health**: v2's 3-tier (`getBondHealth`) used throughout; origin/master's 4-tier `bondHealthColor` kept only for classic cell backgrounds.
- **Epoch duration**: corrected v2's `EPOCH_HOURS=52` to 48 (Solana epoch = 2 days).

## Code pointers

- `src/services/calculations.ts` — pure math extracted as the stable foundation before any UI porting
- `src/components/sam-table/sam-table.tsx` — v2 table on Tailwind, winning-set divider via cutoff index
