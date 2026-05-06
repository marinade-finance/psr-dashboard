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

- `src/services/sam.ts` — auction data loading, metric selectors, sensitivity
  analysis (`runAlt` pattern: mutate aggregated data, re-run auction)
- `src/services/breakdowns.ts` — `computeBondCoverageMetrics` (bond coverage
  model), `bondHealthFromAuction` (returns `'healthy'|'watch'|'critical'`),
  `penaltyRiskColor`, `computeSamRevenueMetrics`, `computeBidPenaltyMetrics`
- `src/services/tip-engine.ts` — `getValidatorTip` (urgency + text + constraint),
  `getTipStyle` (color/bg/icon per urgency), `getBondHealthStyle`
- `src/components/sam-table/sam-table.tsx` — main auction table with
  simulation mode (ghost rows, position change grading); rank cell shows
  cutoff-relative rank (+N/-N), severity icon colored by tip urgency;
  bond runway displayed as `(Nep)` with parentheses; horizontally scrollable
- `src/components/table/table.tsx` — generic sortable table; Color enum
  (RED/GREEN/YELLOW/ORANGE/GREY) for cell backgrounds
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

Use **Tailwind + Shadcn/ui** unified design language throughout. All new
components must use Shadcn primitives (`Card`, `Button`, `Badge`, etc.) and
Tailwind utility classes — no custom CSS unless unavoidable. Colour tokens
from `src/index.css` (`--primary`, `--muted-foreground`, `--border`, etc.)
must be used via Tailwind semantic classes (`text-muted-foreground`,
`bg-card`, `border-border`) — never raw hex values inline.

**Typography scale** — minimum readable font is `text-[10px]` (truly
secondary info you don't need to read at a glance). Everything else:
- Secondary / meta labels: `text-xs` (12px) or `text-[13px]`
- Primary row / body text: `text-sm` (14px)
- Headings / emphasis: `text-base` (16px) and up
Avoid `text-[11px]` for anything interactive or primary.

Shared style constants (e.g. `TABLE_BASE`, `CLICKABLE_ROW`, `GHOST_ROW`)
are defined as string constants or helper functions in component files.
CSS var token constants (`CSS_PRIMARY`, `CSS_DESTRUCTIVE`, `CSS_PRIMARY_LIGHT`,
`CSS_DESTRUCTIVE_LIGHT`) are exported from `src/lib/utils.ts`.
No CSS Modules remain — `src/index.css` holds global styles, CSS variables,
and keyframe animations only.
