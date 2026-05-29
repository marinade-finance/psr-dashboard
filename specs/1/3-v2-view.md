---
status: shipped
---

# v2 View

## Problem

v2 (feature/my-feature) had the target UI but ran on Webpack + CSS Modules + SDK 0.0.44 and could not be deployed.

## Approach

Ported v2 onto Vite + Tailwind as a styling migration — logic and UX kept intact. CSS Modules replaced with Tailwind utility classes; SDK updated to 0.0.48 simulation API.

shadcn/ui used throughout for consistent primitives (Sheet, Button, Input, etc.) rather than custom one-off components.

## Code pointers

- `src/components/sam-table/sam-table.tsx` — main auction table with StatsBar, HelpTip tooltips on all columns, Bond column, winning-set divider
- `src/components/navigation/navigation.tsx` — EpochRangePicker, tab hover prefetch
- `src/pages/sam.tsx` — wires `onRowClick` → ValidatorDetail Sheet → simulation overrides → re-fetch
- `src/components/banner/banner.tsx` — dismissible announcement card, dismissed state in localStorage
