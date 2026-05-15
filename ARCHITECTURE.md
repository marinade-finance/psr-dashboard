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
- **Language**: TypeScript 5.9. No `tsc` build step — Vite transpiles;
  `npx tsc --noEmit` for type checks. `src` alias → `./src`.
- **UI**: React 18 (`createRoot` from `react-dom/client`, `StrictMode`).
- **Routing**: `react-router-dom` 6.30 (`createBrowserRouter` +
  `RouterProvider`). SPA fallback handled by a custom Vite plugin in
  `vite.config.ts:spaFallback` (rewrites unknown HTML requests to
  `/index.html`); deploy-side fallback in `public/_redirects`
  (`/* /index.html 200`).
- **Styling**: Tailwind v4 via `@tailwindcss/vite`. All design tokens are
  CSS vars in `src/index.css`, exposed to Tailwind through its `@theme`
  block. No CSS Modules in active use; a legacy `sam-table.module.css`
  file sits next to `sam-table.tsx` but is not imported.
- **Primitives**: shadcn-style components in `src/components/ui/*`,
  customised for Marinade. Built on Radix (`@radix-ui/react-dialog`,
  `react-switch`, `react-tooltip`). `class-variance-authority` + `clsx` +
  `tailwind-merge` (re-exported as `cn` in `src/class_utils.ts`).
- **Data**: `@tanstack/react-query` 5.100 (object-form API:
  `useQuery({ queryKey, queryFn, ... })`, `keepPreviousData` sentinel
  imported from `@tanstack/react-query`, no `onSettled` callback).
- **Markdown**: `react-markdown` 10 + `remark-gfm` + `remark-breaks` +
  `rehype-raw` (for the docs page).
- **Auction algorithm**: `@marinade.finance/ds-sam-sdk` 0.0.48
  (`DsSamSDK`, `loadSamConfig`, `runFinalOnly`).
- **Analytics**: `react-gtm-module` initialised in `src/index.tsx`.
- **Testing**: Vitest 3 (unit, `*.test.{ts,tsx}` under `src/`);
  Playwright 1.59 (e2e, `tests/`).

---

## Top-level layout

| Path                  | Purpose                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `src/pages/`          | Route components — one file per page.                                                              |
| `src/components/`     | All view components, grouped by feature.                                                           |
| `src/services/`       | Data fetching, computation, types. UI-free.                                                        |
| `src/class_utils.ts`  | `cn` helper (`clsx` + `tailwind-merge`).                                                           |
| `src/css.ts`          | `CSS_*` runtime colour escape hatches (return `var(--…)` strings).                                 |
| `src/format.ts`       | Number / SOL / percentage formatters (`sol`, `stake`, `pct`, `pmpe`, `pay`, `payCta`).             |
| `src/fixtures/`       | Auction fixtures used by `/test-*` routes.                                                         |
| `src/test-bonds.ts`, `src/test-protected-events.ts`, `src/test-validators.ts` | Fixture data for test routes (root-of-src). |
| `src/index.css`       | Design tokens, dark-mode overrides, `@theme` Tailwind exposure, global transition rule, keyframes. |
| `src/index.tsx`       | App entry: router, query client, GTM, prefetches.                                                  |
| `public/docs/*.md`    | `GUIDE.md`, `GUIDE-EXPERT.md` — rendered by the docs page.                                         |
| `public/_redirects`   | Netlify-style SPA fallback for the deploy host.                                                    |
| `specs/`              | Design specs — phase-numbered subdirs, `index.md` is the master index.                             |
| `tests/`              | Playwright e2e specs and `__screenshots__/` baselines.                                             |
| `.diary/`             | Date-named milestone notes (YYYYMMDD.md), checked in.                                              |
| `.ship/`              | Ephemeral shipping artifacts, gitignored.                                                          |

`SCREENS.md`, `ARCHITECTURE.md`, `README.md`, `CLAUDE.md`, `TODO.md`,
`bugs.md` live at repo root.

---

## Routes & pages

`src/index.tsx` registers the full route table on a single
`createBrowserRouter` call.

| Route                      | Component                                                          | Level                      |
| -------------------------- | ------------------------------------------------------------------ | -------------------------- |
| `/`                        | `SamPage` (`src/pages/stake-auction-marketplace.tsx`)              | Basic                      |
| `/expert-`                 | `SamPage`                                                          | Expert                     |
| `/bonds`                   | `ValidatorBondsPage` (`src/pages/validator-bonds.tsx`)             | Basic                      |
| `/expert-bonds`            | `ValidatorBondsPage`                                               | Expert                     |
| `/protected-events`        | `ProtectedEventsPage` (`src/pages/protected-events.tsx`)           | Basic                      |
| `/expert-protected-events` | `ProtectedEventsPage`                                              | Expert                     |
| `/docs`                    | `DocsPage` (`src/pages/docs.tsx`)                                  | Basic (`GUIDE.md`)         |
| `/expert-docs`             | `DocsPage`                                                         | Expert (`GUIDE-EXPERT.md`) |
| `/test-`                   | `TestSamPage` (`src/pages/test-stake-auction-marketplace.tsx`)     | Internal sandbox (fixture) |
| `/test-bonds`              | `TestBondsPage` (`src/pages/test-bonds.tsx`)                       | Internal sandbox (fixture) |
| `/test-protected-events`   | `TestProtectedEventsPage` (`src/pages/test-protected-events.tsx`)  | Internal sandbox (fixture) |

`UserLevel` enum lives in `src/components/navigation/navigation.tsx`. The
`level` prop threads from each route into the page and downstream into
tables / detail panels (Expert columns, extra metric tiles, the `expert-`
URL prefix used by Navigation tabs).

`SamPage` synchronises the validator-detail sheet to a `?v=<voteAccount>`
URL parameter (`pushState` on open, `replaceState` on switch, `popstate`
listener restores state).

---

## Components

### `components/ui/` — shadcn primitives

`badge.tsx`, `button.tsx`, `card.tsx`, `epoch-range-picker.tsx`,
`input.tsx`, `label.tsx`, `sheet.tsx`, `switch.tsx`, `table.tsx`,
`tooltip.tsx`. All exported as plain `function` components (no
`forwardRef`). `tooltip.tsx` wraps Radix; `switch.tsx` carries the
Marinade yellow checked state; `epoch-range-picker.tsx` is a custom
dual-select.

### `components/sam-table/` — main auction table

`sam-table.tsx`. Owns `ValidatorMeta`, `BOND_CHIP`, `SortColumn`,
`SortDirection`, `passesTableFilter`, `makeCompareFn`. 7-column table
with simulation mode, ghost rows, cutoff divider, bond chip, keyboard-
activatable rank cell, position-change grading. Embedded helpers
include the local `RankCell`, `PenaltyBadges`. Tests in
`__tests__/`: `bond-chip.test.ts`, `passes-table-filter.test.ts`,
`sam-table-sort.test.ts`.

### `components/validator-detail/` — detail sheet

`validator-detail.tsx` — Right-side `Sheet` (`max-w-4xl`) with tabs
(Overview, Notifications, Payments, Bidding, Bond, Bid Penalty). The
internal `Tab` union uses `'revenue'` as the value for the Bidding tab.
Local `MetricRow` and `PenaltyRow` components are file-private (not
exported). Auto-recalcs the what-if simulation via a 400ms debounce
that funnels through a `useRef` to avoid the `onSimulate` callback
identity churn restarting the timer. Issues `useQuery({ queryKey:
['psrEstimates', voteAccount], ... })` for per-validator PSR estimates.
Mounted by `SamPage` with `key={selectedValidator ?? 'detail'}` so a
new validator gets a fresh component (no mirror-prop-into-state needed).

`apy-composition-card.tsx` — segmented APY bar for the Overview tab.

### `components/breakdowns/` — calculation panels

- `card.tsx` — `CalcCard` (title + optional guide link + optional
  status pill + optional tip footer).
- `row.tsx` — `CalcRow`, `OkRow`, `SectionHeader`, `Marker`, plus the
  `SEPARATOR_TR_CLASS` / `SEPARATOR_DIV_CLASS` / `SEPARATOR_CELL_PAD`
  / `NORMAL_CELL_PAD` constants. `CalcRow` accepts `total` to imply
  `separator + bold + large` in one prop; `value` defaults to `''`.
- `docs-path.ts` — `docsPath(level)` returns `/docs` or `/expert-docs`.
- `bid-penalty.tsx`, `bidding.tsx`, `bond-coverage.tsx`, `payments.tsx`
  — one card per breakdown tab. `RevRow` is a 4-column row local to
  `bidding.tsx` (not exported).

### `components/validator-bonds-table/`

`validator-bonds-table.tsx`. Bonds page table (sits inside the shared
`TableShell`) + tile-map component (`ValidatorBondsTileMap`).

### `components/protected-events-table/`

`protected-events-table.tsx`. Events page table (inside `TableShell`)
+ filter strip.

### `components/table/`

`table.tsx` — generic sortable table used by bonds and events. Exports
the `Color` enum (re-exported from `services/types`,
`RED/GREEN/YELLOW/ORANGE/GREY` for cell tints), the `Alignment` enum,
the `OrderDirection` const enum, `Order` type, the `TableShell`
component (canonical card chrome — `bg-card rounded-xl border
border-border shadow-card overflow-hidden overflow-x-auto`), and the
`TABLE_SHELL_HOVER` string for the muted `bg-secondary` row-hover.

### `components/navigation/`

`navigation.tsx` — top bar, tab switcher, mobile labels, Docs link,
`ThemeToggle`. Exports `UserLevel` enum and `UserLevelProps`. Hover-
prefetches `bonds` and `protected-events` queries with a 5-min
`staleTime` override.

### `components/banner/`

`banner.tsx` — dismissible announcement card. Persistence via
`localStorage` keyed by title.

### `components/concentration-metric/`

`concentration-metric.tsx` — stacked-bar metric for stake concentration
by country / ASO. Two instances rendered on the SAM page.

### `components/validator-search/`

`validator-search.tsx` — search input on the SAM page; exports
`ValidatorSearch` and the pure `findMatches` helper (tested in
`__tests__/validator-search.test.ts`). Matches on vote account
(exact / prefix) or validator name (prefix / substring), up to 8 ranked
matches, opens the detail sheet via `onSelect`. Bypasses the Basic-mode
bond filter because the sheet reads from the full auction set.

### Smaller components

- `components/help-tip/help-tip.tsx` — Radix `Tooltip` triggered by a `?` icon.
- `components/metric/metric.tsx` — KPI card with label + value + optional `subline` and `extra`.
- `components/validator-identity/validator-identity.tsx` — canonical name + truncated vote-account cell. Use it in every validator-listing table.
- `components/loader/loader.tsx` — full-page spinner.
- `components/theme-toggle/theme-toggle.tsx` — light/dark switch.
- `components/icons/` — `marinade-logo`, `bell-icon`, `penalty-bid-low`, `penalty-blacklist`, `penalty-risk`.

---

## Services layer (`src/services/`)

UI-free. Pure functions and async fetchers, typed against SDK types
where applicable.

### Auction & SAM

- **`sam.ts`** — `loadSam(overrides?)` instantiates the SDK and runs
  `runFinalOnly`. Exports `fetchValidatorNames` (vote → name map),
  `SourceDataOverrides` re-export, and the selector family
  (`selectSamDistributedStake`, `selectWinningAPY`, `selectProjectedAPY`,
  `selectMaxAPY`, `selectBid`, `selectEffectiveBid`, `selectEffectiveCost`,
  `selectBondSize`, `selectVoteAccount`, `selectExpectedStakeChange`,
  `buildConcentrationBreakdown`, …). `augmentAuctionResult` walks the
  validators once to attach `expectedStakeChangeSol` (re-delegation
  budget allocation + paid-undelegation outflow + 0.7%/epoch natural
  withdrawal pro-rata from over-target validators); `selectExpectedStakeChange`
  reads it. `EPOCHS_PER_YEAR = 365.25 × 24 × 3600 / 172800`.
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
  `getTipStyle`, `getBondHealthStyle`, `getApyBreakdown`,
  `nextStakeDeltaCell`, `calculateBondUtilization`. Drives the rank-cell
  icon and the Next Step column.
- **`bidding.ts`** — `computeBidding` (per-validator stake/bid/cost row).
- **`bond-coverage.ts`** — `computeBondCoverage` (keep-stake and avoid-fee
  top-ups on current vs projected exposed stake).
- **`bond-health.ts`** — `bondHealthFromAuction`
  (`'healthy'|'soft'|'watch'|'critical'`).
- **`bid-penalty.ts`** — `computeBidPenalty`; local `TOL_COEF`/`SCALE_COEF`
  mirror SDK `calcBidTooLowPenalty`.

### Validator data

- **`validators.ts`** — `Validator` shape + `fetchValidatorsWithEpochs(n)`
  from `validators-api.marinade.finance`. In-module `Map` cache keyed by
  epoch count; cache evicts on rejection. Filters out validators with no
  Marinade stake. Exports `selectTotalMarinadeStake`.
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
  from scoring and the live auction. `LAST_DRYRUN_EPOCH` separates
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
  paginates the notifications API (page size 200, max 25 pages).
  `fetchLatestSamAuctionBroadcastNotification` for the page banner.
  `notificationTooltip(summary)` renders the bell-tooltip HTML.

### Plumbing

- **`apiUrls.ts`** — four `*_API_URL` constants
  (`VALIDATORS_API_URL`, `VALIDATOR_BONDS_API_URL`, `SCORING_API_URL`,
  `NOTIFICATIONS_API_URL`), each overridable via `process.env.*`.
  Defaults point at `*.marinade.finance`.
- **`fetch-utils.ts`** — `fetchJson<T>(url)`. Throws on non-2xx.
- **`types.ts`** — shared `Color` enum.
- **`help-text.ts`** — `HELP_TEXT` map of tooltip strings keyed by metric.

### Tests

`src/services/__tests__/` — Vitest unit specs:
`calculations.test.ts`, `protected-events-estimator.test.ts`,
`tip-engine.test.ts`. Additional tests live next to their components
(`components/sam-table/__tests__`, `components/validator-search/__tests__`)
and at `src/__tests__/format.test.ts`. Discovery is
`src/**/*.test.{ts,tsx}` (vite config).

---

## State & data flow

### react-query keys

Created at module scope in `src/index.tsx` (prefetched on mount inside
`Root.useEffect` so rejections bubble to a route error boundary instead
of being swallowed before React mounts) and inside individual pages /
components.

| Key                                    | Owner                                                | Notes                                                                                                                  |
| -------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `['sam', simulationRunId]`             | `SamPage`                                            | `simulationRunId` increments on every simulate/reset → re-runs with `simulationOverrides`. `placeholderData: keepPreviousData`. Refetch every hour. |
| `['sam', 0]`                           | `index.tsx` prefetch                                 | Warms the cache on cold load.                                                                                          |
| `['validator-names']`                  | `SamPage`                                            | `staleTime: Infinity`.                                                                                                 |
| `['notifications-all', 'sam_auction']` | `SamPage`, `ValidatorBondsPage`                      | Refetch every 5 min.                                                                                                   |
| `['notifications-broadcast']`          | All three top pages                                  | Refetch every 5 min.                                                                                                   |
| `['bonds']`                            | `ValidatorBondsPage` + `Navigation` hover-prefetch + `index.tsx` prefetch | Refetch every hour; nav-hover uses `staleTime: 5 min`.                          |
| `['protected-events']`                 | `ProtectedEventsPage` + `Navigation` hover-prefetch + `index.tsx` prefetch | Refetch every hour; nav-hover uses `staleTime: 5 min`.                         |
| `['psrEstimates', voteAccount]`        | `ValidatorDetail`                                    | `staleTime: 5 min`, per-validator.                                                                                     |
| `['doc', activeDoc]`                   | `DocsPage`                                           | `staleTime: Infinity`.                                                                                                 |

### SAM page state

Tracked entirely in `SamPage` (`src/pages/stake-auction-marketplace.tsx`):

- `selectedValidator` (URL-synced via `?v=`).
- `simulationRunId`, `simulationOverrides`, `simulatedValidators`,
  `originalAuctionResult`, `isCalculating`.
- Edits flow detail-panel inputs → `mergeOverrides` → bump
  `simulationRunId` → react-query refetch. After refetch settles
  (watched via `fetchStatus === 'idle'`, since v5 removed `onSettled`),
  `insertGhostRows` injects originals at their pre-simulation
  positions.

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
| `pnpm start:dev` (or `pnpm dev`)    | Vite dev server with HMR (port 3000).         |
| `pnpm build`                        | Production build → `build/`.                  |
| `pnpm preview`                      | Serve `build/` on :8080 (used by Playwright). |
| `pnpm lint` / `pnpm lint:fix`       | ESLint over `./src/**/*.{ts,tsx,js,jsx}`.     |
| `pnpm format` / `pnpm format:check` | Prettier write / check.                       |
| `pnpm check`                        | `pnpm lint && pnpm format:check`.             |
| `pnpm fix`                          | `pnpm format && pnpm lint:fix`.               |
| `pnpm test`                         | Vitest run.                                   |
| `pnpm test:e2e`                     | Playwright e2e (auto-starts `vite preview`).  |
| `pnpm test:e2e:ui`                  | Playwright UI mode.                           |
| `pnpm test:e2e:update`              | Update Playwright snapshots.                  |
| `npx tsc --noEmit`                  | Type check (no Makefile).                     |

Pre-commit (husky + lint-staged) runs `eslint --fix` + `prettier --write`
on staged `src/**/*.{ts,tsx,js,jsx}`. First run may reformat — retry
once.

CI (`.github/workflows/ci.yml`, runs on PR and pushes to `master`):
`pnpm install --frozen-lockfile` → `pnpm check` → `npx tsc --noEmit` →
`pnpm test` → `pnpm build` → `playwright install --with-deps chromium`
(cached by `pnpm-lock.yaml` hash) → `pnpm test:e2e`. On failure,
`playwright-report/` is uploaded as an artifact (7-day retention).

Playwright (`playwright.config.ts`) targets only the `chromium` project,
1 worker, retries 2, snapshots in `tests/__screenshots__/`, screenshots
on failure only, `webServer` auto-runs `npx vite preview --port 8080`
with `reuseExistingServer: true`.

---

## Conventions

- Top-level functions use the `function` keyword; arrow functions only
  for callbacks and inline lambdas.
- ESLint config from `@marinade.finance/eslint-config` (flat config
  in `eslint.config.cjs`).
- Imports: one per line, `src/...` aliased path inside the project.
- 100 char soft, 120 hard wrap.
- Commit format: `[section] Message` — examples in `git log`:
  `[fix]`, `[chore]`, `[refactor]`, `[specs]`, `[test]`, `[docs]`.
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
  major, react-query major) → update **Stack**.
- Move a file referenced by name above → grep the document and update
  every reference.

Prefer rewriting a section over patching it sentence-by-sentence — keeps
the inventory readable.
