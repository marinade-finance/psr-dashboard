# Architecture — PSR Dashboard

Live, code-grounded inventory of how the codebase is organised. Update in
the same commit as any structural change (new top-level dir, new service
module, new route, new external dependency, react-query key change,
state-shape change that affects data flow).

For the user-visible UI surface, see `SCREENS.md`. For visual tokens and
contributor rules, see `CLAUDE.md`.

---

## Stack

- **Bundler**: Vite 7 (`vite.config.ts`). Dev server on port 3000 (`pnpm
start:dev`), build output to `build/` (`pnpm build`), preview on 8080
  (`pnpm preview`).
- **Language**: TypeScript 4.9. No `tsc` build step — Vite transpiles;
  `npx tsc --noEmit` for type checks. `src` alias → `./src`.
- **UI**: React 18 (`react-dom` legacy `ReactDOM.render`).
- **Routing**: `react-router-dom` v6 (`createBrowserRouter` +
  `RouterProvider`). SPA fallback handled by a custom Vite plugin in
  `vite.config.ts:spaFallback` (rewrites unknown HTML requests to
  `/index.html`); deploy-side fallback in `public/_redirects`
  (`/* /index.html 200`).
- **Styling**: Tailwind v4 via `@tailwindcss/vite`. All design tokens are
  CSS vars in `src/index.css`, exposed to Tailwind through its `@theme`
  block. No CSS Modules in active use (the legacy `sam-table.module.css`
  and `tooltip-table.css` files exist but new code uses utility classes).
- **Primitives**: shadcn-style components in `src/components/ui/*`,
  customised for Marinade. Built on Radix (`@radix-ui/react-slot`,
  `react-switch`, `react-tooltip`). `class-variance-authority` + `clsx` +
  `tailwind-merge` (re-exported as `cn` in `src/lib/utils.ts`).
- **Data**: `react-query` v3.
- **Markdown**: `react-markdown` + `remark-gfm` + `remark-breaks` +
  `rehype-raw` (for the docs page).
- **Auction algorithm**: `@marinade.finance/ds-sam-sdk` 0.0.48
  (`DsSamSDK`, `loadSamConfig`, `runFinalOnly`).
- **Analytics**: `react-gtm-module` initialised in `src/index.tsx`.
- **Testing**: Vitest 3 (unit, `*.test.ts` under `src/`); Playwright 1.58
  (e2e, `tests/`).

---

## Top-level layout

| Path                | Purpose                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `src/pages/`        | Route components — one file per page.                                                              |
| `src/components/`   | All view components, grouped by feature.                                                           |
| `src/services/`     | Data fetching, computation, types. UI-free.                                                        |
| `src/lib/utils.ts`  | `cn` helper + `CSS_*` runtime colour escape hatches + `docsPath`.                                  |
| `src/fixtures/`     | Test fixtures (`test-validators.ts`).                                                              |
| `src/index.css`     | Design tokens, dark-mode overrides, `@theme` Tailwind exposure, global transition rule, keyframes. |
| `src/index.tsx`     | App entry: router, query client, GTM, prefetches.                                                  |
| `src/format.ts`     | Number / SOL / percentage formatters.                                                              |
| `public/docs/*.md`  | `GUIDE.md`, `GUIDE-EXPERT.md` — rendered by the docs page.                                         |
| `public/_redirects` | Netlify-style SPA fallback for the deploy host.                                                    |
| `specs/`            | Design specs — phase-numbered subdirs (`3/`, `5/`), `index.md` is the master index.                |
| `tests/`            | Playwright e2e specs and `__screenshots__/` baselines.                                             |
| `.diary/`           | Date-named milestone notes (YYYYMMDD.md), checked in.                                              |
| `.ship/`            | Ephemeral shipping artifacts, gitignored.                                                          |

`SCREENS.md`, `ARCHITECTURE.md`, `README.md`, `CLAUDE.md`, `TODO.md`,
`IMPROVE.md`, `bugs.md` live at repo root.

---

## Routes & pages

`src/index.tsx` registers the full route table.

| Route                      | Component                                                | Level                      |
| -------------------------- | -------------------------------------------------------- | -------------------------- |
| `/`                        | `SamPage` (`src/pages/sam.tsx`)                          | Basic                      |
| `/expert-`                 | `SamPage`                                                | Expert                     |
| `/bonds`                   | `ValidatorBondsPage` (`src/pages/validator-bonds.tsx`)   | Basic                      |
| `/expert-bonds`            | `ValidatorBondsPage`                                     | Expert                     |
| `/protected-events`        | `ProtectedEventsPage` (`src/pages/protected-events.tsx`) | Basic                      |
| `/expert-protected-events` | `ProtectedEventsPage`                                    | Expert                     |
| `/docs`                    | `DocsPage` (`src/pages/docs.tsx`)                        | Basic (`GUIDE.md`)         |
| `/expert-docs`             | `DocsPage`                                               | Expert (`GUIDE-EXPERT.md`) |
| `/test-`, `/test-expert-`  | `TestSamPage` (`src/pages/test-sam.tsx`)                 | Internal sandbox           |

`UserLevel` enum lives in `src/components/navigation/navigation.tsx`. The
`level` prop threads from each route into the page and downstream into
tables / detail panels (`expertOnly` columns, extra metric tiles, the
`expert-` URL prefix used by Navigation tabs).

`SamPage` synchronises the validator-detail sheet to a `?v=<voteAccount>`
URL parameter (`pushState` on open, `replaceState` on switch, `popstate`
listener restores state).

---

## Components

### `components/ui/` — shadcn primitives

`badge.tsx`, `button.tsx`, `card.tsx`, `epoch-range-picker.tsx`,
`input.tsx`, `label.tsx`, `select.tsx`, `sheet.tsx`, `switch.tsx`,
`table.tsx`, `tooltip.tsx`. All exported as plain `function` components
(no `forwardRef`). Tooltip wraps Radix; Switch carries the Marinade
yellow checked state; EpochRangePicker is a custom dual-select.

### `components/sam-table/` — main auction table

`sam-table.tsx` (845 lines). 7-column table with simulation mode,
ghost rows, cutoff divider, bond chip, keyboard-activatable rank cell,
position-change grading. Owns `ValidatorMeta` type. Companion
`sam-table.module.css` is legacy.

### `components/validator-detail/` — detail sheet

`validator-detail.tsx` (847 lines) — Sheet body with tabs (Overview,
Notifications, Payments, Bidding, Bond, Bid Penalty), `MetricRow`,
`PenaltyRow`, what-if simulation form. Issues `useQuery(['psrEstimates',
voteAccount])` for per-validator PSR estimates.

`apy-composition-card.tsx` — segmented APY bar for the Overview tab.

### `components/breakdowns/` — calculation panels

`bid-penalty.tsx`, `bond-coverage.tsx`, `payments.tsx`, `sam-revenue.tsx`
— one card per breakdown tab. `shared.tsx` exports the primitives:
`CalcCard`, `CalcRow`, `RevRow`, `OkRow`, `SectionHeader`, `Marker`, plus
the `SEPARATOR_*` class constants for the conclusion-row divider.

### `components/validator-bonds-table/`

`validator-bonds-table.tsx` (554 lines). Bonds page table + tile-map
component (`ValidatorBondsTileMap`).

### `components/protected-events-table/`

`protected-events-table.tsx` (334 lines). Events page table + filter
strip.

### `components/table/`

`table.tsx` — generic sortable table used by bonds and events. Exports
the `Color` enum (RED/GREEN/YELLOW/ORANGE/GREY) for cell tints. Sets
`TABLE_BASE` styles that apply everywhere — note `[&_th]:uppercase`
affects Playwright assertions.

### `components/navigation/`

`navigation.tsx` — top bar, tab switcher, mobile labels, Docs link,
`ThemeToggle`. Exports `UserLevel` enum and `UserLevelProps`. Hover-
prefetches `bonds` and `protected-events` queries with a 5-min staleTime
override.

### `components/banner/`

`banner.tsx` — dismissible announcement card. Persistence via
`localStorage` keyed by title.

### Smaller components

- `components/help-tip/help-tip.tsx` — Radix `Tooltip` triggered by a `?` icon.
- `components/metric/metric.tsx` — KPI card with label + value + optional `subline` and `extra`.
- `components/validator-identity/validator-identity.tsx` — canonical name + truncated vote-account cell. Use it in every validator-listing table.
- `components/validator-jump/validator-jump.tsx` — search input on the SAM page; matches on vote account or validator name and opens the detail sheet via `onValidatorClick`. Bypasses the Basic-mode bond filter (sheet reads from the full auction set).
- `components/loader/loader.tsx` — full-page spinner.
- `components/theme-toggle/theme-toggle.tsx` — light/dark switch.
- `components/icons/bell-icon.tsx` — notification bell.
- `components/tooltip-table/tooltip-table.ts` — HTML-string builder for legacy `react-tooltip` content.

---

## Services layer (`src/services/`)

UI-free. Pure functions and async fetchers, typed against SDK types
where applicable.

### Auction & SAM

- **`sam.ts`** — `loadSam(overrides?)` instantiates the SDK and runs
  `runFinalOnly`. Selectors: `selectSamDistributedStake`,
  `selectWinningAPY`, `selectProjectedAPY`, `selectMaxAPY`, `selectBid`,
  `selectEffectiveBid`, `selectEffectiveCost`, `selectBondSize`, etc.
  `augmentAuctionResult` walks the validators once to attach
  `expectedStakeChangeSol` (re-delegation budget allocation +
  paid-undelegation outflow + 0.7%/epoch natural withdrawal pro-rata
  from over-target validators); `selectExpectedStakeChange` reads it.
  `EPOCHS_PER_YEAR = 365.25 × 24 × 3600 / 172800`.
- **`simulation.ts`** — `buildOverrideValues`, `mergeOverrides`,
  `removeFromOverrides` produce SDK `SourceDataOverrides` from form
  edits. `buildOriginalPositionsMap`, `getPositionChange`,
  `detectChangedValidators`, `insertGhostRows` build ghost-row state
  for the simulation UI. `PositionChange` carries `direction` +
  `severity 1|2|3`.
- **`calculations.ts`** — pure math: `compoundApy`, `bondRunwayEpochs`,
  `bondRunwayDays`, `bondUtilizationPct`, `stakeDelta`,
  `selectMaxWantedStake`, `apyBreakdown`, `isNonProductive`.
- **`tip-engine.ts`** — `getValidatorTip` (urgency + text + constraint),
  `getTipStyle`, `getBondHealthStyle`, `bondStatusText`,
  `getApyBreakdown`, `formatStakeDelta`. Drives the rank-cell icon and
  the Next Step column.
- **`breakdowns.ts`** — `computeSamRevenueMetrics`,
  `computeBondCoverageMetrics`, `computeBidPenaltyMetrics`,
  `bondHealthFromAuction` (`'healthy'|'soft'|'watch'|'critical'`),
  `penaltyRiskColor`. `TOL_COEF`/`SCALE_COEF` mirror SDK
  `calcBidTooLowPenalty`.

### Validator data

- **`validators.ts`** — `Validator` shape + `fetchValidatorsWithEpochs(n)`
  from `validators-api.marinade.finance`. In-module `Map` cache keyed by
  epoch count; cache evicts on rejection. Filters out validators with no
  Marinade stake.
- **`bonds.ts`** — `BondRecord` shape + `fetchBonds()` from
  `validator-bonds-api.marinade.finance`.
- **`scoring.ts`** — `fetchScoring()` from `scoring.marinade.finance`.
- **`rewards.ts`** — `fetchRewards()` from validators-api.

### Composite views

- **`validator-with-bond.ts`** — `fetchValidatorsWithBonds()` joins
  validators × bonds × auction (built once into a vote-account map for
  O(1) lookup). `selectMaxProtectedStake`, `selectProtectedStake`.
- **`validator-with-protected_event.ts`** — `fetchProtectedEventsWithValidator()`
  combines on-chain protected events + estimated events from the
  estimator + per-epoch bid/blacklist/bond-risk-fee penalties derived
  from scoring and the live auction. `LAST_DRYRUN_EPOCH = 655` separates
  dryrun from fact entries. `ProtectedEventStatus` enum
  (`DRYRUN | ESTIMATE | FACT`).
- **`protected-events.ts`** — `fetchProtectedEvents()`,
  `selectProtectedStakeReason` (humanises the reason union),
  `selectAmount`. Type definitions for the on-chain event union.
- **`protected-events-estimator.ts`** —
  `calculateProtectedEventEstimates(validators)` derives
  low-credits + commission-increase events for unsettled epochs
  using `fetchRewards` + per-validator stake tables.
  `fetchPsrEstimatesForValidator(voteAccount)` filters down to one
  validator (used by the detail panel).

### Notifications

- **`notifications.ts`** — `fetchAllNotifications(notification_type)`
  paginates `/v1/notifications/all` (page size 200, max 25 pages).
  `fetchLatestSamAuctionBroadcastNotification` for the page banner.
  `notificationTooltip(summary)` renders the bell-tooltip HTML.

### Plumbing

- **`apiUrls.ts`** — four `*_API_URL` constants, all overridable via
  `process.env.*`. Defaults point at `*.marinade.finance`.
- **`fetch-utils.ts`** — `fetchJson<T>(url)`. Throws on non-2xx.
- **`utils.ts`** — `tooltipAttributes(html)` for legacy `react-tooltip`.
- **`types.ts`** — shared `Color` enum.
- **`help-text.ts`** — `HELP_TEXT` map of tooltip strings keyed by metric.
- **`banner.tsx`** — `getBannerData()` returns the current site-wide
  banner content.

### Tests

`src/services/__tests__/` — Vitest unit specs:
`calculations.test.ts`, `protected-events-estimator.test.ts`,
`tip-engine.test.ts`. Discovery is `src/**/*.test.ts` (vite config).

---

## State & data flow

### react-query keys

Created at module scope in `src/index.tsx` (prefetched immediately) and
inside individual pages:

| Key                                    | Owner                                        | Notes                                                                                                                                 |
| -------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `['sam', simulationRunId]`             | `SamPage`                                    | `simulationRunId` increments on every simulate/reset → re-runs with `simulationOverrides`. `keepPreviousData` smooths the transition. |
| `'sam'` (prefetch with `0`)            | `index.tsx`                                  | Warms the cache on cold load.                                                                                                         |
| `['validator-names']`                  | `SamPage`                                    | `staleTime: Infinity`.                                                                                                                |
| `['notifications-all', 'sam_auction']` | SAM + bonds                                  | Refetch every 5 min.                                                                                                                  |
| `'notifications-broadcast'`            | SAM, bonds, events                           | Refetch every 5 min.                                                                                                                  |
| `'bonds'`                              | `ValidatorBondsPage` + `index.tsx` prefetch  |                                                                                                                                       |
| `'protected-events'`                   | `ProtectedEventsPage` + `index.tsx` prefetch |                                                                                                                                       |
| `['psrEstimates', voteAccount]`        | `ValidatorDetail`                            | `staleTime: 5 min`, per-validator.                                                                                                    |
| `['doc', activeDoc]`                   | `DocsPage`                                   | `staleTime: Infinity`.                                                                                                                |

### SAM page state

Tracked entirely in `SamPage`:

- `selectedValidator` (URL-synced via `?v=`).
- `simulationModeActive`, `simulationOverrides`, `simulatedValidators`,
  `pendingEdits`, `editingValidator`, `originalAuctionResult`,
  `simulationRunId`, `isCalculating`.
- Edits flow `pendingEdits` → `buildOverrideValues` →
  `mergeOverrides` → bump `simulationRunId` → react-query refetch.
  After refetch settles, `insertGhostRows` injects originals.

### URL ↔ sheet sync

`SamPage` pushes `?v=<voteAccount>` on first open and replaces on switch
so the browser back button closes the sheet (one history entry per
session, not per validator switch). A `popstate` listener in
`SamPage` mirrors changes back into state.

---

## Visual language pointer

Surfaces, status families, bond tiers, charts, typography scale,
primitives, and the `CSS_*` runtime escape hatches are documented in
`CLAUDE.md` under "Visual Language". Use semantic Tailwind classes
backed by `src/index.css` tokens — never raw colours.

---

## Build & test

| Command                             | Purpose                                       |
| ----------------------------------- | --------------------------------------------- |
| `pnpm install`                      | Install (pnpm 9.12).                          |
| `pnpm start:dev`                    | Vite dev server with HMR.                     |
| `pnpm build`                        | Production build → `build/`.                  |
| `pnpm preview`                      | Serve `build/` on :8080 (used by Playwright). |
| `pnpm lint` / `pnpm lint:fix`       | ESLint over `./src/**/*.{ts,tsx,js,jsx}`.     |
| `pnpm format:check` / `pnpm format` | Prettier check / write.                       |
| `pnpm check`                        | `lint && format:check`.                       |
| `pnpm test`                         | Vitest unit tests.                            |
| `pnpm test:e2e`                     | Playwright e2e.                               |
| `npx tsc --noEmit`                  | Type check (no Makefile).                     |

Pre-commit (husky + lint-staged) runs `eslint --fix` + `prettier --write`
on staged TS/TSX. First run may reformat — retry once.

---

## Conventions

- Top-level functions use the `function` keyword; arrow functions only
  for callbacks and inline lambdas.
- ESLint config from `@marinade.finance/eslint-config` (`eslint.config.cjs`).
- Imports: one per line, `src/...` aliased path inside the project.
- 100 char soft, 120 hard wrap.
- Commit format: `[section] Message` — examples in `git log`:
  `[fix]`, `[a11y][perf]`, `[specs]`, `[test]`, `[docs]`.
- Specs land in `specs/<phase>/<n>-name.md`, indexed in
  `specs/index.md`.
- `.diary/YYYYMMDD.md` for milestone notes.
- `tmp/` and `.ship/` for ephemeral artifacts; gitignored.

---

## Maintenance

When the architecture changes, update this file in the same commit:

- Add / remove / rename a top-level dir → update **Top-level layout**.
- Add a new service module → describe it under **Services layer**, list
  its public exports.
- Add a new route file → update **Routes & pages** and the `index.tsx`
  registration callout.
- Add or remove a react-query key → update **State & data flow**.
- Bump a major dependency or replace a tool (Vite version, Tailwind
  major, swap react-query for TanStack v5) → update **Stack**.
- Move a file referenced by name above → grep the document and update
  every reference.

Prefer rewriting a section over patching it sentence-by-sentence — keeps
the inventory readable.
