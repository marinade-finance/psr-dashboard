# Architecture — PSR Dashboard

Live, code-grounded inventory of how the codebase is organised. Update in
the same commit as any structural change (new top-level dir, new service
module, new route, new external dependency, react-query key change,
state-shape change that affects data flow).

For the user-visible UI surface, see `SCREENS.md`. For visual tokens, see
`VISUALS.md`. For agent operating rules, see `CLAUDE.md`.

---

## Stack

- **Bundler**: Vite 8 (`vite.config.ts`). Dev server on port 3000 (`pnpm
start:dev`), build output to `build/` (`pnpm build`), preview on 8080
  (`pnpm preview`).
- **Language**: TypeScript 5.9. No `tsc` build step — Vite transpiles;
  `npx tsc --noEmit` for type checks. `src` alias → `./src`.
- **UI**: React 19 (`createRoot` from `react-dom/client`, `StrictMode`).
- **Routing**: `react-router-dom` 7.15 (`createBrowserRouter` +
  `RouterProvider`). SPA fallback is two-layered: `public/_redirects`
  (`/* /index.html 200`) covers the Netlify CDN in production; the custom
  `spaFallback` Vite plugin in `vite.config.ts` covers `pnpm dev` and
  `pnpm preview` locally. Both must stay in sync — `_redirects` is ignored
  by Vite and `spaFallback` is ignored by Netlify.
- **Styling**: Tailwind v4 via `@tailwindcss/vite`. All design tokens are
  CSS vars in `src/index.css`, exposed to Tailwind through its `@theme`
  block.
- **Primitives**: shadcn-style components in `src/components/ui/*`,
  customised for Marinade. Built on Radix (`@radix-ui/react-dialog`,
  `react-switch`, `react-tooltip`). `class-variance-authority` + `clsx` +
  `tailwind-merge` (re-exported as `cn` in `src/class_utils.ts`).
- **Data**: `@tanstack/react-query` 5.100 (object-form API everywhere).
- **Markdown**: `react-markdown` 10 + `remark-gfm` + `remark-breaks` +
  `rehype-raw` (for the docs page).
- **Auction algorithm**: `@marinade.finance/ds-sam-sdk` 0.0.51
  (`DsSamSDK`, `loadSamConfig`, `runFinalOnly`).
- **Analytics**: `react-gtm-module` initialised in `src/index.tsx`.
- **Testing**: Vitest 4 (unit, `*.test.{ts,tsx}` under `src/`);
  Playwright 1.60 (e2e, `tests/`).

---

## Top-level layout

| Path                 | Purpose                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/pages/`         | Route components — one file per page.                                                                               |
| `src/components/`    | All view components, grouped by feature.                                                                            |
| `src/services/`      | Data fetching, computation, types. UI-free.                                                                         |
| `src/utils/`         | Tiny pure helpers shared across services + components (`assert-never.ts`).                                          |
| `src/class_utils.ts` | `cn` helper (`clsx` + `tailwind-merge`).                                                                            |
| `src/css.ts`         | `CSS_*` runtime colour escape hatches (return `var(--…)` strings).                                                  |
| `src/format.ts`      | Number / SOL / percentage formatters (`sol`, `stake`, `pct`, `pmpe`, `pay`, `penalty`, `cost`, `bondSol`, `topUp`). |
| `src/fixtures/`      | Auction fixtures used by `/test-*` routes.                                                                          |
| `src/index.css`      | Design tokens, dark-mode overrides, `@theme` Tailwind exposure, global transition rule, keyframes.                  |
| `src/index.tsx`      | App entry: router, query client, GTM, prefetches.                                                                   |
| `public/docs/*.md`   | `GUIDE.md` — rendered by the docs page.                                                                             |
| `public/_redirects`  | Netlify-style SPA fallback for the deploy host.                                                                     |
| `specs/`             | Design specs — phase-numbered subdirs, `index.md` is the master index.                                              |
| `tests/`             | Playwright e2e specs and `__screenshots__/` baselines.                                                              |
| `.diary/`            | Date-named milestone notes (YYYYMMDD.md), checked in.                                                               |

`SCREENS.md`, `ARCHITECTURE.md`, `README.md`, `CLAUDE.md`, `VISUALS.md`
live at repo root. `bugs.md`, `ISSUES.md`, `differences.md`, `docs/` are
local-only scratch (untracked).

---

## Routes & pages

`src/index.tsx` registers the full route table on a single
`createBrowserRouter` call.

| Route                    | Component                                                         | Notes                      |
| ------------------------ | ----------------------------------------------------------------- | -------------------------- |
| `/`                      | `SamPage` (`src/pages/stake-auction-marketplace.tsx`)             | SAM auction                |
| `/bonds`                 | `ValidatorBondsPage` (`src/pages/validator-bonds.tsx`)            | Validator bonds            |
| `/protected-events`      | `ProtectedEventsPage` (`src/pages/protected-events.tsx`)          | Protected events           |
| `/docs`                  | `DocsPage` (`src/pages/docs.tsx`)                                 | In-app guide (`GUIDE.md`)  |
| `/test-`                 | `TestSamPage` (`src/pages/test-stake-auction-marketplace.tsx`)    | Internal sandbox (fixture) |
| `/test-bonds`            | `TestBondsPage` (`src/pages/test-bonds.tsx`)                      | Internal sandbox (fixture) |
| `/test-protected-events` | `TestProtectedEventsPage` (`src/pages/test-protected-events.tsx`) | Internal sandbox (fixture) |

`/expert-*` routes still exist in `src/index.tsx` but are deprecated
and scheduled for removal — see `specs/2/1-remove-expert-routes.md`. Don't add new
expert-only behaviour or document the expert variants here.

---

## Components

| Path                                 | Purpose                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `components/ui/`                     | shadcn-style primitives (badge, button, card, input, sheet, switch, tooltip, etc.).               |
| `components/sam-table/`              | Main auction table: 7-column sortable table with simulation mode, ghost rows, bond chip.          |
| `components/validator-detail/`       | Slide-over detail sheet with tabs: Overview, Notifications, Bidding, Payments, Bond, Bid Penalty. |
| `components/breakdowns/`             | Calculation panels inside the detail sheet. Shared `CalcCard` / `CalcRow` primitives.             |
| `components/validator-bonds-table/`  | Bonds page table + tile-map.                                                                      |
| `components/protected-events-table/` | Protected events table + filter strip.                                                            |
| `components/table/`                  | Generic sortable table used by bonds and events pages.                                            |
| `components/navigation/`             | Top bar, tab switcher, epoch meter, theme toggle.                                                 |
| `components/epoch-meter/`            | Epoch chip in the nav; pure render over `services/epoch.ts` logic.                                |
| `components/concentration-metric/`   | Stacked-bar country / ASO concentration tile on the SAM page.                                     |
| `components/validator-search/`       | Vote-account / name search input on the SAM page.                                                 |
| `components/banner/`                 | Dismissible announcement card (localStorage-persisted dismiss).                                   |
| `components/help-tip/`               | Shared inline `?` tooltip icon.                                                                   |
| `components/metric/`                 | KPI card with label + value + optional subline.                                                   |
| `components/validator-identity/`     | Canonical name + truncated vote-account cell — use in every validator-listing table.              |
| `components/icons/`                  | SVG icons: Marinade logo, bell, penalty glyphs.                                                   |

---

## Services layer (`src/services/`)

UI-free. Pure functions and async fetchers, typed against SDK types where applicable.

### Auction & SAM

| File                   | What it does                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sam.ts`               | Loads and runs the SDK auction (`loadSam`). Augments results with per-validator expected stake change. Selectors for APY, stake, bid, budget, priority frontier, concentration. |
| `simulation.ts`        | Builds `SourceDataOverrides` from form edits; produces ghost-row state for the simulation UI.                                                                                   |
| `calculations.ts`      | Pure math: APY compounding (`annualize`, `compoundApy`, `apyBreakdown`) and bond-gauge geometry (`bondGaugeScaleMax`, `bondCriticalFrac`).                                      |
| `tip-engine.ts`        | Drives the rank-cell colour and Next Step column. Assembles a `ValidatorTip` from five orthogonal lever helpers sorted by severity then lever priority.                         |
| `bidding.ts`           | Per-validator stake / bid / cost row.                                                                                                                                           |
| `bond-coverage.ts`     | Bond top-up calculations for keep-stake and avoid-fee thresholds.                                                                                                               |
| `bond-health.ts`       | Four-tier bond health state (`NO_BOND → CRITICAL → WATCH → HEALTHY`); also exports `effectiveBondRunway(v, config)` and `bondUtilizationPct`.                                   |
| `bid-penalty.ts`       | Bid-too-low penalty recompute, mirroring SDK `calcBidTooLowPenalty`.                                                                                                            |
| `in-auction-target.ts` | Closed-form static bid to clear the winning total (estimate — verify in Simulate).                                                                                              |
| `next-epoch-stake.ts`  | Heuristic bid to clear the redelegation priority frontier (estimate — verify in Simulate).                                                                                      |
| `payment-total.ts`     | `computePaymentTotal({biddingTotalSol, ...penalties, psrEstimates})` → `{psrTotal, penaltyTotal, total}`.                                                                       |

### Validator data

| File                                | What it does                                                                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `validators.ts`                     | Fetches validators from `validators-api.marinade.finance`.                                                                                                                           |
| `bonds.ts`                          | Fetches bond records from `validator-bonds-api.marinade.finance`.                                                                                                                    |
| `scoring.ts`                        | Fetches scoring data from `scoring.marinade.finance`.                                                                                                                                |
| `rewards.ts`                        | Fetches per-validator reward data from validators-api.                                                                                                                               |
| `validator-with-bond.ts`            | Joins validators × bonds × auction; computes max / actual protected stake.                                                                                                           |
| `validator-with-protected_event.ts` | Joins protected events + estimated events + per-epoch penalties into a unified event list.                                                                                           |
| `protected-events.ts`               | Fetches on-chain protected events; humanises reason strings.                                                                                                                         |
| `protected-events-estimator.ts`     | Derives low-credits / commission-increase estimates for unsettled epochs.                                                                                                            |
| `epoch.ts`                          | Epoch-meter logic: network epoch, settlement status, chip / tooltip copy. Also `fetchEpochInfo` — best-effort Solana RPC `getEpochInfo` for slot-accurate progress, null on failure. |
| `notifications.ts`                  | Fetches and paginates the notifications API; `notificationTooltip()` renders HTML for the nav bell tooltip.                                                                          |

### Plumbing

| File             | What it does                                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiUrls.ts`     | Four `*_API_URL` constants plus `RPC_URL` (Solana RPC, default mainnet-beta), each env-overridable.                                                         |
| `fetch-utils.ts` | `fetchJson<T>(url)` — throws on non-2xx.                                                                                                                    |
| `types.ts`       | Shared `Color` enum.                                                                                                                                        |
| `help-text.ts`   | `HELP_TEXT` map of tooltip strings keyed by metric.                                                                                                         |
| `constants.ts`   | `EPOCH_DURATION_MS`, `EPOCHS_PER_YEAR`, `LAST_DRYRUN_EPOCH`.                                                                                                |
| `pmpe.ts`        | `pmpeToSol(pmpe, stakeSol)` — single conversion site.                                                                                                       |
| `units.ts`       | `solToLamports(sol)` — SOL → lamports.                                                                                                                      |
| `card-status.ts` | `CardStatus`, `CardStatusTone`, `CardStatusAction` types — live in services (not `components/`) so `tip-engine.ts` can build status values without a cycle. |
| `sdk-rerun.ts`   | Wraps SDK `Auction.evaluate()` for the live simulation path; applies bond patches that `SourceDataOverrides` does not yet model.                            |

---

## SDK integration

`@marinade.finance/ds-sam-sdk` provides `DsSamSDK`, `Auction`, `Debug`,
`AggregatedData`, `AuctionResult`, `AuctionValidator`. SAM is a
last-price auction — every winner pays the clearing price (effective
bid). Key types: `AggregatedData` carries `validators:
AggregatedValidator[]`, `stakeAmounts`, `rewards`, `blacklist`; after
`transformValidators()` validators gain eligibility fields
(`samEligible`, `samBlocked`).

`src/services/sam.ts:loadSam()` runs the live auction (no overrides).
Simulation reruns go through `src/services/sdk-rerun.ts` — the single
source of truth for applying `SourceDataOverrides` plus bond patches.
Redelegation allocation runs locally via the shared greedy
`allocateRedelegation` pass (no SDK `runAlt`).

---

## Simulation mode

`SamPage` lets users edit a validator's commissions, static bid, and
bond balance. The local `AppOverrides` type (`src/services/simulation.ts`)
wraps SDK `SourceDataOverrides` and carries a `bondBalanceSol:
Map<string, number>` for bond overrides. All simulation reruns go
through `src/services/sdk-rerun.ts` (`runSdkRerun`); bond overrides
are applied post-rerun in live mode and as a pre-evaluate mutation in
test mode.

Output: ghost rows (original position, strikethrough) plus simulated
rows (new position, green/red grading by move severity).
`PositionChange` and `buildOriginalPositionsMap`
(`src/services/simulation.ts`) drive the grading.

---

## State & data flow

### react-query keys

| Key                                    | Owner                                                                                  | Notes                                                                                                                                                                                                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `['sam']`                              | `SamPage`, `EpochMeter`, `validator-with-bond.ts`, `validator-with-protected_event.ts` | Single key, canonical live auction — read-only for all consumers. Simulation output never written here; it lives in `SamPage` state (see below). `placeholderData: keepPreviousData`. `staleTime: 5 min` default.                                                          |
| `['validator-names']`                  | `SamPage`                                                                              | `staleTime: Infinity`.                                                                                                                                                                                                                                                     |
| `['validators-with-epochs', 3]`        | `ValidatorDetail`, `validator-with-protected_event.ts`                                 | 3-epoch window; shared via `ensureQueryData` so the multi-MB payload is fetched at most once.                                                                                                                                                                              |
| `['notifications-all', 'sam_auction']` | `SamPage`, `ValidatorBondsPage`                                                        | Refetch every 5 min.                                                                                                                                                                                                                                                       |
| `['notifications-broadcast']`          | All three top pages                                                                    | Refetch every 5 min.                                                                                                                                                                                                                                                       |
| `['bonds']`                            | `ValidatorBondsPage` + `Navigation` hover-prefetch                                     | Refetch every hour; nav-hover uses `staleTime: 5 min`.                                                                                                                                                                                                                     |
| `['protected-events']`                 | `ProtectedEventsPage` + `Navigation` hover-prefetch                                    | Refetch every hour; nav-hover uses `staleTime: 5 min`. The heavy 3-epoch payload is observed only by the Events page (GC-eligible 30 min after leaving it); the nav's `EpochMeter` no longer observes it directly.                                                         |
| `['epoch-meter']`                      | `EpochMeter` (nav, all pages)                                                          | Lean scalars (network epoch, settlement epochs) via `fetchEpochMeterData`, which reuses the shared `['protected-events']` cache but retains only the scalars — so the always-mounted nav never pins the full payload. `staleTime` 5 min, refetch hourly. |
| `['psr-estimates-all']`                | `ValidatorDetail`                                                                      | All PSR estimates in one query; `staleTime: 5 min`.                                                                                                                                                                                                                        |
| `['doc', activeDoc]`                   | `DocsPage`                                                                             | `staleTime: Infinity`.                                                                                                                                                                                                                                                     |
| `['epoch-info']`                       | `EpochMeter`                                                                           | Solana RPC `getEpochInfo` for slot-accurate epoch progress; `staleTime` / `refetchInterval` 10 min. Sole progress source — when it does not resolve the meter shows `RPC unavailable` rather than estimating from timestamps.                                               |

### SAM page state

Tracked entirely in `SamPage` (`src/pages/stake-auction-marketplace.tsx`):

- `selectedValidator` (URL-synced via `?v=`).
- `simulationOverrides`, `simulatedValidators`, `simResult`, `isCalculating`.
- Edits flow detail-panel inputs → `mergeOverrides` → `useMutation`
  reruns the SDK against the live `['sam']` auction → result stored in the
  `simResult` state, never the cache. The page renders `simResult ?? liveData`,
  so the live cache is never clobbered and other `['sam']` consumers stay
  live. `originalAuctionResult` (the live auction, surfaced only while a sim is
  active) feeds `insertGhostRows` to inject originals at their pre-simulation
  positions.

### URL ↔ sheet sync

`SamPage` pushes `?v=<voteAccount>` on open and replaces on switch so the
browser back button closes the sheet without creating a history entry per
validator switch.

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
on staged `src/**/*.{ts,tsx,js,jsx}`. First run may reformat — retry once.

CI (`.github/workflows/ci.yml`): `pnpm install --frozen-lockfile` →
`pnpm check` → `npx tsc --noEmit` → `pnpm test` → `pnpm build` →
`playwright install` → `pnpm test:e2e`. Failure artifact: `playwright-report/`.

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
- Specs land in `specs/<phase>/<n>-name.md`, indexed in `specs/index.md`.
- `.diary/YYYYMMDD.md` for milestone notes.
- `tmp/` for ephemeral artifacts; gitignored.
