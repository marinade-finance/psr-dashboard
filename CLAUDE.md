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

## Live UI inventory — `SCREENS.md`

`SCREENS.md` at the repo root is the authoritative live inventory of every
page, panel, table column, badge, status tier and tab. **Update it in the
same commit whenever the UI changes.** Examples that require an update:

- adding / removing / renaming a column on any data table
- adding / removing a tab on the validator detail panel
- changing a default sort, a tier threshold, a status label, or a token
- moving a route, renaming a section, replacing a status badge style
- adding a new card on a page

If a section's diff would be larger than rewording, rewrite the whole
section — patches sentence-by-sentence age badly. The file is the contract
between code and reviewers; if it drifts, neither reviewer nor onboarding
maintainer can trust it.

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
- `src/components/validator-identity/validator-identity.tsx` — canonical
  "validator name + truncated vote account" cell. Use this in every table
  that lists validators (sam, bonds, protected-events) — don't reinvent
  the truncation/typography locally.
- `src/components/table/table.tsx` — generic sortable table; Color enum
  (RED/GREEN/YELLOW/ORANGE/GREY) for cell backgrounds. ORANGE shares the
  `bg-cell-yellow` token (no distinct orange cell shade).
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

## Visual Language

All colour and layout tokens live in `src/index.css` and are exposed to
Tailwind via the `@theme` block. **Use the semantic class — never inline
`var(...)`, never raw hex/rgb/hsl, never arbitrary `text-[var(--…)]`.**
Adding a new colour means: define the CSS var in `:root`, override in
`.dark` only if the dark value actually differs, then expose it as
`--color-…` inside `@theme`. After that, Tailwind generates `bg-…`,
`text-…`, `border-…` automatically. Don't duplicate byte-identical vars
across `:root` and `.dark` — `.dark` inherits from `:root`.

### Surfaces

| Class                    | Use                                                  |
|--------------------------|------------------------------------------------------|
| `bg-background`          | App background                                       |
| `bg-background-page`     | Outer page wrapper (slightly tinted)                 |
| `bg-card`                | Card / panel surface                                 |
| `bg-muted`               | Muted block (callouts, empty states)                 |
| `bg-secondary` / `accent`| Hover & subtle surfaces                              |
| `text-foreground`        | Primary text                                         |
| `text-muted-foreground`  | Secondary / meta text                                |
| `border-border`          | Standard divider                                     |
| `border-border-grid`     | Internal table grid lines                            |

### Status & intent

Use **one** of these three families consistently. Don't mix `warning` and
`status-yellow` in the same view — they're different shades.

| Family       | Solid                | Tinted background          | Meaning                          |
|--------------|----------------------|----------------------------|----------------------------------|
| Primary      | `text-primary`       | `bg-primary-light(-10)`    | Brand / good / healthy           |
| Destructive  | `text-destructive`   | `bg-destructive-light`     | Critical / error                 |
| Warning      | `text-warning`       | `bg-warning-light`         | Watch / caution (orange-yellow)  |
| Info         | `text-info`          | `bg-info-light`            | Neutral hint (indigo)            |
| Status green | `text-status-green`  | `bg-status-green-light`    | Indicator dot / accent (true green) |
| Status yellow| `text-status-yellow` | `bg-status-yellow-light`   | Indicator dot / "Simulated" pill |

### Bond coverage tiers

`bg-bond-{none,low,mid,high,full}` — used by the bonds heatmap tiles only.

### Charts

`bg-chart-1 … bg-chart-5` — fixed sequence for stacked bars / pie segments.

### Inline style escape hatch

Where colour is chosen at runtime from JS state and a Tailwind class
won't reach, import a `CSS_*` constant from `src/lib/utils.ts`
(`CSS_PRIMARY`, `CSS_DESTRUCTIVE`, `CSS_WARNING`, …). These resolve to
`var(--…)` strings — they never carry a hex fallback.

### Typography scale

- `text-[10px]` — secondary info you don't need to read at a glance
- `text-xs` (12px) — meta labels, table cells
- `text-[13px]` — emphasised secondary
- `text-sm` (14px) — primary body / row text
- `text-base` and up — headings
Avoid `text-[11px]` and other off-scale arbitrary sizes for primary or
interactive content.

### Components

- `src/components/ui/*` — shadcn primitives (`Button`, `Card`, `Switch`,
  `Sheet`, `Input`, `Label`, `Tooltip`, `Select`, `Badge`, `Table`,
  `EpochRangePicker`). Customised primitives (e.g. `Switch` with the
  Marinade yellow checked state) live here as standalone files so they're
  testable in isolation. All primitives are plain `function` exports —
  no `React.forwardRef` (refs aren't needed for the way we compose them).
- `src/components/breakdowns/shared.tsx` — `CalcCard`, `CalcRow`, `OkRow`,
  `SectionHeader`. The summary/total row of a breakdown gets `separator`
  + `bold` + `large` to render as the section conclusion.
- Inline `<button>` styled `text-xs text-primary hover:underline` is the
  "see more →" link pattern — keep raw, don't reach for shadcn `Button`
  for these.

No CSS Modules. `src/index.css` only holds tokens, the global transition
rule, and keyframe animations.
