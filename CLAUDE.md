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

## Scratch files (untracked)

`bugs.md`, `ISSUES.md`, `differences.md`, `docs/` are local-only review
queues / audit notes — untracked, not part of the doc contract below.
Append findings here during audits; the user prioritises and prunes.

## Planned and queued work

All planned work lives in `specs/` — see `specs/index.md` for the master list.
`TODO.md` is a redirect stub; do NOT accumulate a queue there.

**New item:** open the relevant spec file in `specs/1/` (or create a new
`specs/1/N-topic.md`) and add the item as a named section. If no existing spec
fits, create a new file. Add a row to `specs/index.md`.

**Shipped item:** set `status: shipped` in the spec frontmatter, trim the
section to WHY + code pointers (drop HOW), update `specs/index.md` status.

Lifecycle: `planned` → `partial` → `shipped`.

During audits, record bugs in `bugs.md`; record design intent and queued
features in the relevant spec file.

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
- **`VISUALS.md`** — the visual-language alphabet: surfaces, status
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
  `priorityFrontierPmpe` — use "Winning total" / "Priority frontier" /
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
  `'healthy'|'watch'|'critical'|'no-bond'`)
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
- `src/format.ts` — number formatting utilities. `pay()` always **rounds up** (ceil) — fee and penalty amounts shown to users are never understated. On-chain values are exact to the lamport; the ceiling is display-only.

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

Visual language — tokens, status families, typography, component primitives — is documented in `VISUALS.md`. Key rules for code-touching agents:

### Two orthogonal axes: severity vs lever

Two independent encodings, never collapsed into one. Enforced at the
source — one CTA helper per lever in `src/services/tip-engine.ts`
(`bondCta`, `bidCta`, `outOfSetCta`, `capCta`, `deltaCta`); `selectTip`
picks the highest-severity candidate, with `LEVER_ORDER` (bond →
bid/rank → cap → none) breaking ties at the same severity.

- **Colour = severity.** `getTipStyle(urgency)` maps
  `TipUrgency.CRITICAL`→destructive, `WARNING`→warning, `INFO`→info,
  `POSITIVE`→primary, `NEUTRAL`→muted. Same axis the breakdown banner
  uses (`tone: red|yellow|green`); `bondAdvice()` emits both so they
  agree by construction.
- **Glyph = the lever** (which knob to turn).
  `TipConstraint.BOND`→ICON_BOND, `BID`→ICON_BID, `RANK`→ICON_BID (same
  lever — raise the bid, so same glyph), `CAP`→ICON_CAP. Only
  `TipConstraint.NONE` (in-set, no binding constraint) gets a
  directional glyph — up/down/right keyed off the real signed `delta`
  so it cannot lie. `getTipIcon` in `src/services/tip-engine.ts`.
- **Octagon alert is the ONLY severity-driven glyph.** `ICON_ALERT`
  (stop-sign octagon) overrides the lever glyph for exactly one state:
  an estimated bond risk fee this epoch (`tip.alert === true`). Plain
  below-min / no-bond stay critical-red but keep their constraint glyph
  — no escalation. `src/components/icons/icon-alert.tsx`.

### Tip glyph set

7 glyphs, all `viewBox 0 0 12 12`, uniform **14.4px**: bond, bid, cap,
alert, up, down, right. `src/components/icons/icon-*.tsx`. No `rank`
glyph — `TipConstraint.RANK` reuses ICON_BID (same lever).

### Phantom icon slot

Every tip pill renders its glyph inside a fixed `w-4 h-4` centred box
(`shrink-0 inline-flex items-center justify-center`) so glyph variance
never shifts pill margins or breaks column alignment.
`src/components/sam-table/sam-table.tsx` (Next Step cell).

### Bond gauge

`scaleMax = bondGaugeScaleMax(config) = 4 × idealBondEpochs`.
`marker = criticalBand = bondCriticalFrac(config) = minBondEpochs /
bondGaugeScaleMax(config)` (fraction where penalty threshold sits).
Health ladder: `NO_BOND` → no balance; `CRITICAL` → coverage shortfall > 0
OR estimated fee this epoch (`bondRiskFeeSol > 0`) OR runway ≤
`minBondEpochs + BOND_URGENT_EPOCHS` (3); `WATCH` →
runway < `idealBondEpochs`; `HEALTHY` → runway ≥ `idealBondEpochs`.
4 tiers — no `SOFT`. `src/services/calculations.ts`,
`src/services/bond-health.ts`.

### CTA message rules

Every CTA string must be: **imperative verb phrase, sentence-case,
period-terminated, ≤ 60 chars, no parentheses, no em-dash in the
middle**. It carries either the decisive SOL figure OR a clear
consequence — never vague ("Bond too thin", "can be charged").
Pattern: `"Verb [object] to [outcome]."` or `"Verb [object]."`.

Good: `"Top up 12 SOL to avoid undelegation and fee."`
Good: `"Raise bid to get more stake."`
Good: `"Raise bid to qualify for stake."`
Bad: `"Bond too thin — a bond risk fee can be charged."` (no amount, vague future)
Bad: `"Stake won't change next epoch."` (symptom without lever)

### Breakdown table grammar — one 3-col model

One uniform column model per `<table>`; never mix `CalcRow` (3-col) and
`RevRow` (4-col). Unit rules: PMPE / epochs → declared once in
`SectionHeader` `unit`, no suffix on rows; SOL → inline suffix, NEVER a
header; % → inline annotation, NEVER a header. A column never mixes
value kinds. `src/components/breakdowns/row.tsx`.

### Attention dot persistence

Per-tab attention dot (`w-1.5 h-1.5 rounded-full`) **persists on the
active tab and pulses** (`active && 'animate-pulse'`).
`src/components/validator-detail/validator-detail.tsx`.

### Decorative borders

NEVER `border-l` / left-border accent bands on any element. Status is
carried by colour token + dot + glyph, not by a coloured edge.
