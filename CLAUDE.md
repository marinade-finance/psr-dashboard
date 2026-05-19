# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Marinade Finance PSR (Protected Staking Rewards) Dashboard — a React SPA
showing Solana validator stake auction results, protected events, and
validator bonds. Uses `@marinade.finance/ds-sam-sdk` for auction computation.

## Commands

```bash
pnpm install              # install deps
pnpm start:dev            # dev server (vite, HMR)
pnpm build                # production build → build/
pnpm preview              # serve build/ on :8080 (used by e2e)
pnpm lint                 # eslint
pnpm format:check         # prettier check
pnpm check                # lint + format check
pnpm test                 # vitest unit tests (src/__tests__)
pnpm test:e2e             # playwright e2e (tests/)
pnpm test:e2e:ui          # playwright UI mode
pnpm test:e2e:update      # update playwright snapshots
npx tsc --noEmit          # type check (no Makefile, run directly)
pnpm vitest run path/to/file.test.ts    # run a single test file
```

Pre-commit hooks run lint-staged (eslint --fix + prettier) via husky.
First run may reformat — retry commit once if it fails.

## Live root docs

Four repo-root files are live documentation. **Each must be updated in
the same commit as the change that affects it.** They are the contract
between code and reviewers; if they drift, neither reviewer nor onboarding
maintainer can trust them.

- **`SCREENS.md`** — every page, panel, table column, badge, status tier,
  tab. Update when: adding / removing / renaming a column, adding a tab
  on the validator detail panel, changing a default sort / tier threshold
  / status label / token, moving a route, replacing a badge style,
  adding a card.
- **`visuals.md`** — the visual-language alphabet: surfaces, status
  families, bond tiers, charts, simulation tokens, typography, component
  primitives, inline-style escape hatch. Update when: adding / removing
  / renaming a token, status family, or shared primitive; changing a
  tier threshold; changing a typography or shadow scale.
- **`ARCHITECTURE.md`** — top-level layout, routes, components, services,
  state and data flow, build/test, conventions. Update when: adding /
  removing a top-level dir, adding a service module or page route,
  adding / removing a react-query key, bumping a major dependency,
  changing the state shape that flows through `SamPage` or the URL.
- **`README.md`** — anything a new contributor needs on day one:
  commands, route list, doc index, deployment notes. Update when the
  command surface or the route table changes, or when a top-level doc
  is added / renamed.

If a section's diff would be larger than rewording, rewrite the whole
section — patches sentence-by-sentence age badly.

## Architecture

Vite + TypeScript 5 + React 18 SPA. Tailwind CSS v4 (`@tailwindcss/vite`,
no CSS Modules). `@tanstack/react-query` v5 for data fetching (object-form
API everywhere — `useQuery({ queryKey, queryFn })`, never the v3 positional
form). react-router-dom v6 for routing (`createBrowserRouter` in
`src/index.tsx`, with a `spaFallback` Vite middleware so dotless paths
resolve to `/index.html`). Unit tests with vitest, e2e + visual regression
with Playwright (which runs against `pnpm preview`, not the dev server).

### Routes

Each user-facing route has Basic and Expert variants (Expert shows extra
metrics/columns and the simulation panel):
- `/` and `/expert-` → SAM auction (`src/pages/stake-auction-marketplace.tsx`)
- `/bonds` and `/expert-bonds` → Validator bonds (`src/pages/validator-bonds.tsx`)
- `/protected-events` and `/expert-protected-events` → Protected events
- `/docs` and `/expert-docs` → In-app guide rendered from
  `public/docs/GUIDE.md` / `GUIDE-EXPERT.md` (`src/pages/docs.tsx`)

There are also `/test-`, `/test-bonds`, `/test-protected-events` routes —
thin wrappers around the real page components that swap in fixture data
so Playwright snapshots stay deterministic. Don't add prod logic to the
test pages; they exist only to feed fixtures.

### Writing rules

- **Never use "bar" as a UI metaphor** ("winning bar", "priority bar",
  "the bar your bond has to clear"). The word is unknown jargon to
  novice readers. The underlying field is `winningTotalPmpe` /
  `priorityFrontierPmpe` — use "Winning total" / "Priority total" /
  "the level …" / "the threshold …" instead. Applies to labels,
  tooltips, banner copy, breakdown rows, and the GUIDE.md prose.

### Testing rules

- **Use `/test-*` routes for every e2e test that doesn't specifically need
  network data.** Don't invent a parallel mock-API infrastructure;
  `/test-`, `/test-bonds`, `/test-protected-events` already wrap each page
  with a `QueryClient` pre-seeded from `src/fixtures/*`.
- **No expert test routes.** Don't add `/expert-test-*`. Don't write
  Playwright tests that hit any `/expert-*` route. Expert mode is exercised
  by the same fixture data that powers basic — there's nothing route-
  specific to test beyond UI presence, which is covered indirectly.
- **Mobile is not supported.** The app shows a "Mobile view is not supported"
  banner (`src/components/navigation/navigation.tsx`) below 640px. Don't add
  mobile viewport variants in tests; don't ship CSS that tries to make
  pages usable on a phone. If a user opens it on mobile, the banner tells
  them to widen the window.

### Key Files

- `src/services/sam.ts` — auction data loading, metric selectors,
  `selectRedelegationBudget` / `selectRedelegationPriorityFrontierPmpe`
  (shared greedy `allocateRedelegation` pass — no SDK `runAlt`; the only
  rerun path is the async `loadSam(overrides)` simulation flow)
- `src/services/bidding.ts` — `computeBidding` (per-validator stake/bid/cost row)
- `src/services/bond-coverage.ts` — `computeBondCoverage` (keep-stake and
  avoid-fee top-ups)
- `src/services/bond-health.ts` — `bondHealthFromAuction` (returns
  `'healthy'|'soft'|'watch'|'critical'`)
- `src/services/bid-penalty.ts` — `computeBidPenalty`
- `src/services/in-auction-target.ts` — `computeInAuctionTarget` (Table A:
  closed-form bid to clear the winning total + bond floor from memoised
  `BondCoverage`; last-price-coupling caveat, verify in Simulate)
- `src/services/next-epoch-stake.ts` — `computeNextEpochStake` (Table B:
  heuristic bid to clear the redelegation priority frontier; estimate,
  verify in Simulate)
- `src/services/tip-engine.ts` — `getValidatorTip` (urgency + text + constraint),
  `getTipStyle` (color/bg/icon per urgency), `getBondHealthStyle`
- `src/components/sam-table/sam-table.tsx` — main auction table with
  simulation mode (ghost rows, position change grading); rank cell shows
  cutoff-relative rank (+N/-N), severity icon colored by tip urgency;
  bond runway displayed as `(Nep)` with parentheses; horizontally scrollable
- `src/components/validator-detail/` — slide-over panel opened from a
  table row; mounted with `key={voteAccount}` so each opened validator
  remounts fresh (no prop-mirror useEffect — see commit 102a99d9)
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

Visual tokens, status families, typography, and component primitives are
documented in `visuals.md` (the canonical alphabet —
surfaces, status & intent, bond tiers, charts, simulation tokens, inline
escape hatches, components). Defer to that file. The screen-level
inventory (pages, panels, columns, tabs, badges) lives in `SCREENS.md`.

The single rule worth restating here so any code-touching agent can't
miss it: **use the semantic Tailwind class. Never inline `var(...)`,
never raw hex/rgb/hsl, never arbitrary `text-[var(--…)]`.** New colours
go through `src/index.css` (`:root` → `.dark` only if different → expose
as `--color-…` in `@theme`) and Tailwind generates the rest. No CSS
Modules; `src/index.css` only holds tokens, the global transition rule,
and keyframe animations.
