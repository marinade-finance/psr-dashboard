# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Marinade Finance PSR (Protected Staking Rewards) Dashboard — a React SPA
showing Solana validator stake auction results, protected events, and
validator bonds. Uses `@marinade.finance/ds-sam-sdk` for auction computation.

## Commands

```bash
pnpm install              # install deps
pnpm start:dev            # dev server (webpack, HMR)
pnpm build                # production build → dist/
pnpm lint                 # eslint
pnpm format:check         # prettier check
pnpm check                # lint + format check
npx tsc --noEmit          # type check (no Makefile, run directly)
```

Pre-commit hooks run lint-staged (eslint --fix + prettier) via husky.
First run may reformat — retry commit once if it fails.

## Architecture

Webpack + TypeScript 4.9 + React 18 SPA. Tailwind CSS utility classes
(no CSS Modules). react-query for data fetching. react-router-dom v6 for routing.

### Routes

Each route has Basic and Expert variants (Expert shows extra metrics/columns):
- `/` and `/expert-` → SAM auction page (`src/pages/sam.tsx`)
- `/bonds` and `/expert-bonds` → Validator bonds (`src/pages/validator-bonds.tsx`)
- `/protected-events` and `/expert-protected-events` → Protected events

### Key Files

- `src/services/sam.ts` — auction data loading, metric selectors (`selectActiveProfit`
  shared helper), sensitivity analysis (`runAlt` pattern: mutate aggregated data, re-run auction)
- `src/components/sam-table/sam-table.tsx` — main auction table with
  simulation mode (ghost rows, position change grading, inline editing);
  metrics rendered in a single `flex flex-wrap` row; horizontally scrollable
- `src/components/table/table.tsx` — generic sortable table component with
  Color enum (RED/GREEN/YELLOW/ORANGE/GREY) for cell backgrounds; exports
  `TRUNCATED_CELL`; `renderHeader`/`renderRow`/`renderRows` are plain functions;
  all `td` have `align-top`; `ValidatorWithBondState` has `bondState?: Color`
  (optional — rows without a bond target show no color)
- `src/components/metric/metric.tsx` — metric card; tooltip shown as a
  `HelpTip` inline icon next to label
- `src/components/help-tip/help-tip.tsx` — shared inline `?` tooltip icon
- `src/components/navigation/navigation.tsx` — top nav with Marinade logo;
  prefetches bonds and protected-events data on tab hover
- `src/components/banner/banner.tsx` — dismissible announcement card;
  dismissed state persisted in localStorage keyed by title
- `src/services/validators.ts` — validator API client
- `src/format.ts` — number formatting utilities

### SDK Integration

`@marinade.finance/ds-sam-sdk` provides: `DsSamSDK`, `Auction`, `Debug`,
`AggregatedData`, `AuctionResult`, `AuctionValidator`. The auction is a
last-price auction where all winners pay the clearing price (effective bid).

Key SDK types: `AggregatedData` has `validators: AggregatedValidator[]`,
`stakeAmounts`, `rewards`, `blacklist`. After `transformValidators()`,
validators gain eligibility fields (`samEligible`, `samBlocked`).

### Simulation Mode

SAM page has a simulation mode where users edit validator commissions/bids.
Produces ghost rows (original position, strikethrough) and simulated rows
(new position, graded green/red by move severity). Uses `SourceDataOverrides`
maps passed to `dsSam.runFinalOnly(overrides)`.

## Styling

Tailwind utility classes throughout. Shared style constants (e.g.
`TABLE_BASE`, `CLICKABLE_ROW`, `GHOST_ROW`, `TRUNCATED_CELL`) are
defined as string constants or helper functions in component files.
No CSS Modules remain — `src/index.css` holds global styles, CSS
variables, and keyframe animations only.
