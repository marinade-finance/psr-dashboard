# Screens — PSR Dashboard

Live inventory of every page and the major panels inside them. **Keep this
file in sync with the UI** — when you add/remove/rename a column, tile,
metric, tab, or status badge, update the matching row here in the same
commit.

All pages share the same shell: `Navigation` → optional `Banner` → page
content. Routes have a Basic and an Expert variant (`/foo` and
`/expert-foo`); `level: UserLevel` propagates from the route into the page
component and downstream.

---

## Navigation

`src/components/navigation/navigation.tsx`

Top bar (`h-14`), horizontally scrollable on narrow viewports.

**Left** — Marinade logo (`<Link to="/{prefix}">`) + "PSR Dashboard /
Protected Stake Rewards" wordmark (wordmark hidden below `sm`).

**Tabs**

| Desktop label             | Mobile label | Route                       |
| ------------------------- | ------------ | --------------------------- |
| Stake Auction Marketplace | SAM          | `/{prefix}`                 |
| Protected Events          | Events       | `/{prefix}protected-events` |
| Validator Bonds           | Bonds        | `/{prefix}bonds`            |

`prefix = ''` (Basic) or `'expert-'` (Expert). Active tab styled
`bg-primary text-primary-foreground`. Hovering Events / Bonds prefetches the
respective query (`staleTime: 5min`).

**Right** — Docs link (→ `/docs` or `/expert-docs` per `level`, hidden
below `sm`), **Epoch meter**, `ThemeToggle`.

### Epoch meter

`src/components/epoch-meter/epoch-meter.tsx`. Replaces the bare
`Epoch {N}` chip. Chip shows `Epoch {auctionEpoch}` (the common case,
`auctionEpoch === networkEpoch`); only when they differ it shows
`{networkEpoch} → {auctionEpoch}`, tinted `text-warning` iff
`auctionEpoch < networkEpoch` (view is stale). A shared `HelpTip`
exposes up to three sentence-case lines: (1) the epoch the auction
allocates for, (2) the live Solana epoch + whether the view is live /
next epoch / behind the chain (omitted until the protected-events query
resolves), (3) latest protected-events settlement status — "on-chain"
(FACT) or "estimated, not yet on-chain" (ESTIMATE). Auction epoch
renders immediately from the prefetched `['sam', 0]` query; the meter
force-populates the `['protected-events']` query (`staleTime: 5 min`) so
lines 2-3 fill in without hovering the Events tab. Never blocks the nav.

---

## SAM Page (`/`, `/expert-`)

`src/pages/stake-auction-marketplace.tsx` ·
`src/components/sam-table/sam-table.tsx`

Auction data refetches every hour. Auction result is augmented in-place
with `expectedStakeChangeSol`; the table re-runs the auction whenever
`simulationOverrides` mutates (bumped via a monotonic `simulationRunId`).

### Basic vs Expert filter

`passesTableFilter`. Both modes require `bondBalanceSol > 0`. Basic mode
additionally requires the validator to be currently staked or
target-allocated **and** to have `bondGoodForNEpochs ≥
dsSamConfig.minBondEpochs`. Expert mode shows the long tail. The
jump-to-validator search bypasses the filter because the sheet reads
from the full auction set.

### Stats bar

Five `Card` tiles, `flex flex-wrap`. When ≥1 simulation is active the
whole table is wrapped in a yellow inset ring with a "Simulation Mode"
header strip carrying a **"Reset Simulation"** button.

| Tile                | Source                                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| Total Auction Stake | `selectSamDistributedStake(validators)` (SOL)                                  |
| Winning APY         | `selectWinningAPY(auctionResult, epochsPerYear)`                               |
| Projected APY       | `selectProjectedAPY(auctionResult, epochsPerYear)`                             |
| Winning Validators  | `winningCount / totalValidators`                                               |
| Re-delegation       | sum of positive `selectExpectedStakeChange` across the filtered set (SOL)      |

Tooltips via `HelpTip` on each tile.

### Concentration metrics

Two-column grid below the stats bar (`grid-cols-1 sm:grid-cols-2 gap-3`).
Two `<ConcentrationMetric>` cards: **Top Countries** and **Top ASOs**.
The inline (non-hover) view shows only what matters at a glance: every
over-cap entry if any are capped (rank order, tinted `bg-destructive`
with a `(capped)` tag), otherwise just the single #1 entry. Each row is
a stacked bar filled against the per-country / per-ASO cap. Hover
expands a tooltip showing the full ranked list (up to 15 entries) plus a
remaining-count line.

### Jump-to-validator search

`src/components/validator-search/validator-search.tsx`. `max-w-sm` text
input below the concentration grid, aligned with the table left edge.
Accepts a vote account (exact / prefix) or a validator name (prefix /
substring) via `findMatches`. Up to 8 ranked matches in a dropdown;
click or `Enter` opens the detail sheet for that validator — even if
the validator is hidden by the Basic-mode filter, because the detail
reads from the full auction set, not from the visible table rows.

### Auction table

7 columns, sortable. **Default sort: Max APY descending.** Sort
indicator `↑`/`↓` next to active header. Table sits in a scroll-x card
(`bg-card rounded-xl border border-border shadow-card overflow-x-auto`).

| Column         | Sort key     | What's there                                                                                                                                                                |
| -------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#`            | `rank`       | Cutoff-relative rank (`validator.values.cutoffRank`) coloured by tip urgency. Ghost rows: muted `#N`. Simulated rows: posColor-tinted `#N` + `✕` clear button. Keyboard-activatable (`role="button"`, `tabIndex`). |
| Validator      | `validator`  | `<ValidatorIdentity>` — name + responsive vote account. Trailing red pulsing dot when validator has an alert (`bondRunway ≤ 5` or `bondUtilPct ≥ 85`). `PenaltyBadges` slot for the active penalty icons. |
| Max APY        | `maxApy`     | `selectMaxAPY` pill. Primary tone if in winning set, destructive-light otherwise.                                                                                           |
| Bond           | `bond`       | Bond chip (Healthy / Adequate / Watch / Critical — see § Bond chip) + dot + balance + utilization bar + `(Nep)` runway suffix.                                              |
| Stake / Next Δ | `stakeDelta` | Active SAM stake on top, expected next-epoch change underneath. Muted `0 SOL` when delta is zero, otherwise tinted `+/−` SOL coloured `var(--status-green)` / `var(--destructive)`. |
| Next Step      | `nextStep`   | One-line tip from `getValidatorTip`. Background tinted by urgency.                                                                                                          |
| (chevron)      | —            | Drill-in cue, recolours on row hover.                                                                                                                                       |

### Cutoff divider

A row spanning all columns separates **bid-eligible** (max APY ≥ winning
APY) from **bid-too-low** validators. Note: bond-blocked but bid-winning
validators stay above the line because they'd win on yield. Label reads
`N bid-eligible · M winning`.

### Row tints

| State                       | Background                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| In set                      | `bg-card`, hover `bg-primary-light`                                                         |
| Out of set (bid-too-low)    | `bg-destructive/[0.02]`, hover `bg-destructive/[0.05]`                                      |
| Ghost (simulation original) | `opacity-40 line-through bg-muted/30` — `cursor-pointer` if the simulated target row exists, otherwise `cursor-default` |
| Simulated (post-edit)       | `ring-2 ring-inset ring-status-yellow`, `borderLeftColor` = posColor (green up, red down)   |
| Scroll-flash                | `bg-status-yellow-light` for 800ms after clicking a ghost row to jump to its new position   |

### Simulation mode

Tracked in `SamPage`: `simulationRunId`, `simulationOverrides`,
`simulatedValidators`, `originalAuctionResult`. Edits flow through
`mergeOverrides` → bump `simulationRunId` → `useQuery({ queryKey:
['sam', simulationRunId], queryFn: () => loadSam(overrides),
placeholderData: keepPreviousData })`. After a re-run, `insertGhostRows`
injects ghost entries at original positions of changed validators.
Detection of refetch completion watches `fetchStatus === 'idle'`
(v5 dropped `onSettled`).

### Bond chip

Four tiers, `BOND_CHIP` record in `sam-table.tsx`:

| Tier                | Style                                   | Meaning                                            |
| ------------------- | --------------------------------------- | -------------------------------------------------- |
| `healthy`           | `bg-primary-light-10 text-primary`      | bond exceeds ideal coverage                        |
| `soft` ("Adequate") | `bg-secondary text-muted-foreground`    | covers current stake but not ideal target          |
| `watch`             | `bg-warning-light text-warning`         | can't keep current stake; some will be undelegated |
| `critical`          | `bg-destructive-light text-destructive` | below penalty threshold; bond risk fee charged     |

### Validator detail sheet

`src/components/validator-detail/validator-detail.tsx`. Right-side
`Sheet`, `max-w-4xl`, mounted by `SamPage` with `key={selectedValidator
?? 'detail'}` so switching validators remounts the component. Opens
when a row is clicked. URL synced via `?v=<voteAccount>`; browser-back
closes the sheet.

**Tabs:** Overview · Notifications (when present) · Payments · Bond ·
Bid Penalty. The Bidding breakdown is no longer its own tab — it is
stacked under the Payments breakdown inside the Payments tab. The
internal `Tab` union is `'overview' | 'notifications' | 'bond' |
'penalty' | 'payments'`.

**Overview** — 2-col grid (`lg:grid-cols-2`, `gap-6`):

- **Stake** — Active, Target, Next epoch (each row a local `MetricRow`
  with `HelpTip`).
- **Bond** — Balance, Reserve / "Top up X" CTA, Bid runway, "See full
  bond coverage breakdown →" link.
- **Expected Payment This Epoch** — Active stake cost, Activating stake
  cost, optional `↳ bid gap` sub-row, Penalty group (single `Penalty:
  No penalties` line OR an itemised list of `↳ bid-too-low / blacklist /
  bond risk fee` `PenaltyRow`s, each clickable to its own breakdown
  tab), Total (separated by horizontal line via `SEPARATOR_DIV_CLASS`
  from `breakdowns/row.tsx`).
- **APY Composition** (right column) — `ApyCompositionCard`. Segmented
  bar showing inflation / MEV / block rewards / stake bid. Bar widths
  use raw PMPE proportions (so they sum to total); the displayed % is
  each component's compounded APY. Threshold marker line + label at the
  winning-APY position.
- **What-If Simulation** (right column, when toggled on) — four numeric
  inputs (Stake bid PMPE, Inflation, MEV, Block rewards). Auto-recalcs
  with 400ms debounce. The `onSimulate` parent callback is routed
  through a `useRef` so callback identity churn does not restart the
  timer. Card has yellow border + `bg-status-yellow-light`.

**Payments tab** — one `PaymentsBreakdown` card
(`breakdowns/payments-merged.tsx`), a SINGLE continuous `<table>`, no
stacked cards. `SectionHeader`-delimited sections run in one narrative:
Stake → Active stake cost PMPE → Bid gap → Cost → Penalties → PSR
settlements (conditional) → Total per epoch → Get into the auction →
Get stake next epoch. One status banner summarises the combined state
(green "no penalties" / red "including Y in penalties"), one tip footer
carries "See bid-too-low penalty calculation →" (when active) and
"Simulate commission or bid changes →". Bidding metrics, the in-auction
estimate and the next-epoch estimate are merged into this one table —
they no longer have their own cards. The last two sections are advisory
estimates: the `SectionHeader` `help` tooltips carry the closed-form /
greedy-heuristic and verify-in-Simulate caveats. The "Total per epoch"
row is black (`text-foreground`, no severity) — it is a conclusion, not
a warning. All rows use the shared 3-column `CalcRow`; the old
4-column `RevRow` is gone — commission rows put the retained-commission
% in the `secondary` slot and the PMPE in `value`.

**Tip banner** — sticky strip below the header. Click target opens the
relevant tab (`Bond tab →`, `Simulate →`).

`MetricRow` and `PenaltyRow` are file-private helpers in
`validator-detail.tsx`; they are not exported as shared primitives.

---

## Validator Bonds Page (`/bonds`, `/expert-bonds`)

`src/pages/validator-bonds.tsx` ·
`src/components/validator-bonds-table/validator-bonds-table.tsx`

Data: `fetchValidatorsWithBonds()` → `ValidatorWithBond[]`. Refetch
every hour. Filtered at the page level to rows where
`selectTotalMarinadeStake(validator) > 0` or
`Number(bond?.effective_amount) > 0`.

### Coverage hero

Full-width card.

- Big `coveredPct%` numeral — `Math.round(totalProtectedStake / totalMarinadeStake × 100)`.
- 8px stacked bar — protected vs uncovered SOL.
- Stat chips — Bonds funded · Total bonds (SOL) · Total stake (SOL).
- Expert only: **Max protectable** chip — `totalMaxProtectedStake / totalMarinadeStake` (zero-guarded).

### Tile map

`<ValidatorBondsTileMap>` inside the bonds table component. 4 tier rows
by total Marinade stake:

| Row        | Range                |
| ---------- | -------------------- |
| `>100k`    | ≥ 100,000 SOL        |
| `50k–100k` | 50,000 – 100,000 SOL |
| `20k–50k`  | 20,000 – 50,000 SOL  |
| `<20k`     | < 20,000 SOL         |

Empty tiers omitted. Tile size = `MIN_TILE + √(stake / globalMaxStake) × (MAX_TILE − MIN_TILE)` clamped 28..120px.

**Tile content by size** — name (`size ≥ 36`), stake (`size ≥ 56`),
coverage % (`size ≥ 76`).

**Tile colour by coverage tier** (semantic CSS vars):

| Tier     | Token              |
| -------- | ------------------ |
| no bond  | `var(--bond-none)` |
| < 40%    | `var(--bond-low)`  |
| 40 – 70% | `var(--bond-mid)`  |
| 70 – 95% | `var(--bond-high)` |
| ≥ 95%    | `var(--bond-full)` |

Coverage bar fixed at the tile's bottom edge, gradient-filled to
`coveragePct%`. Hover tooltip via Radix `Tooltip`. Legend below.

### Bonds table

Generic `<Table>` inside the shared `<TableShell>` with
`TABLE_SHELL_HOVER` for the muted row-hover. `showRowNumber`. **Default
sort: Marinade Stake DESC.**

| Column                | Notes                                                                                      | Expert only |
| --------------------- | ------------------------------------------------------------------------------------------ | ----------- |
| Validator             | `<ValidatorIdentity>` + bell-icon trailing slot when notifications exist                   |             |
| Marinade Stake [SOL]  | tooltip breaks out native vs liquid                                                        |             |
| Bond Balance [SOL]    | `bond.effective_amount`                                                                    |             |
| Protected Stake [SOL] | `selectProtectedStake`                                                                     |             |
| Coverage              | mini bar (`bg-status-green` ≥90% · `bg-warning` ≥50% · `bg-destructive` <50%) + percentage |             |
| Max protectable [SOL] | `selectMaxProtectedStake`                                                                  | ✓           |

---

## Protected Events Page (`/protected-events`, `/expert-protected-events`)

`src/pages/protected-events.tsx` ·
`src/components/protected-events-table/protected-events-table.tsx`

Data: `fetchProtectedEventsWithValidator()`. Refetch every hour. Rows
where `reason === 'Bidding'` are excluded from the table but contribute
to `Last Epoch Bids` (Expert metric).

### Top tiles

Responsive grid (`grid-cols-1 sm:grid-cols-3`):

| Tile               | Value                                                        | Note        |
| ------------------ | ------------------------------------------------------------ | ----------- |
| Events             | filtered count w/ subline `of N total` when filter active    | always      |
| Amount             | total SOL paid out + Bond/Marinade split bar (hover for SOL) | always      |
| Last settled epoch | most recent fully on-chain epoch                             | always      |
| Last Epoch Bids    | bids collectable from last settled epoch                     | Expert only |

### Filters

Strip above the table.

- **Validator filter** — `<Input>`, case-insensitive substring match
  against `vote_account` and `validator.info_name`.
- **Epoch range** — `<EpochRangePicker>`. Initial bounds seeded from
  data on first non-empty load; user-narrowed selections survive
  subsequent refetches (bounds are not auto-widened).

### Events table

Generic `<Table>` inside `<TableShell>` with `TABLE_SHELL_HOVER`,
`showRowNumber`. **Default sort: Epoch DESC.**

| Column    | Notes                                                   |
| --------- | ------------------------------------------------------- |
| Validator | `<ValidatorIdentity>`                                   |
| Epoch     | integer epoch                                           |
| Reason    | human-readable string from `selectProtectedStakeReason` |
| Paid Out  | SOL amount + status badge                               |
| Funded by | funder badge                                            |

**Status badges** (Paid Out column): `Dryrun` (variant `secondary`) ·
`Estimate` (variant `default`) · no badge for finalised events.

**Funder badges**:

| Badge          | Style                                                            |
| -------------- | ---------------------------------------------------------------- |
| Validator Bond | `bg-status-green-light text-status-green border-status-green/30` |
| Marinade       | `bg-warning-light text-warning border-warning/30`                |

---

## Docs Page (`/docs`, `/expert-docs`)

`src/pages/docs.tsx`

Centered `max-w-3xl` column. Renders `public/docs/GUIDE.md` (Basic) or
`public/docs/GUIDE-EXPERT.md` (Expert) through `react-markdown` with
`remark-gfm` + `rehype-raw`. Fetched as plain text via `useQuery({
queryKey: ['doc', activeDoc], staleTime: Infinity })`.

- Expert mode shows a tab strip ("Guide" / "Expert Guide") to switch
  between the two. When entering the route via a hash (e.g. from a
  breakdown "Guide →" link), the Expert page still defaults to `GUIDE`
  so the section anchor exists.
- Hash anchors work: `<a id="...">` markers in the markdown are
  honoured (via `rehype-raw`) and a `useEffect` scrolls to
  `window.location.hash` after the markdown DOM mounts (deferred one
  frame via `requestAnimationFrame`). Re-runs on tab switch.
- Links beginning with `#GUIDE` / `#GUIDE-EXPERT` switch the active doc
  instead of scrolling. All other external `a` elements open in a new
  tab.
- Card "Guide →" links from breakdown cards use
  `docsPath(level)` to pick `/docs` vs `/expert-docs`, then append a
  section anchor.

---

## Internal sandbox routes

Hidden from navigation. Each is served by a `*Page` wrapper that
injects fixture data into the corresponding production page, keeping
the full UI and interaction surface but bypassing live APIs.

| Route                    | Component                                                          | Wraps                |
| ------------------------ | ------------------------------------------------------------------ | -------------------- |
| `/test-`                 | `TestSamPage` (`src/pages/test-stake-auction-marketplace.tsx`)     | `SamPage`            |
| `/test-bonds`            | `TestBondsPage` (`src/pages/test-bonds.tsx`)                       | `ValidatorBondsPage` |
| `/test-protected-events` | `TestProtectedEventsPage` (`src/pages/test-protected-events.tsx`)  | `ProtectedEventsPage` |

Fixtures: `src/fixtures/`, `src/test-validators.ts`, `src/test-bonds.ts`,
`src/test-protected-events.ts`. Test pages set `refetchInterval: false`
on the wrapped `QueryClient` queries.

---

## Shared visual primitives

Pointer list — for the full design language see CLAUDE.md.

- **`<Card>`** (`src/components/ui/card.tsx`) — `rounded-xl border border-border bg-card shadow-card`.
- **`<TableShell>` + `TABLE_SHELL_HOVER`** (`src/components/table/table.tsx`) — canonical outer card chrome for any page that drops a generic `<Table>` into a content section. Wraps the table in `bg-card rounded-xl border border-border shadow-card overflow-hidden overflow-x-auto`. Both the bonds and protected-events tables sit inside one. Pair with `TABLE_SHELL_HOVER` on the `<Table>`'s `className` to get the muted `bg-secondary` row-hover (the default `<Table>` hover, `bg-primary-light`, is reserved for SAM, which has its own bespoke wrapper).
- **`<Metric>`** (`src/components/metric/metric.tsx`) — KPI tile with optional `subline` + `extra` slots.
- **`<ValidatorIdentity>`** (`src/components/validator-identity/validator-identity.tsx`) — canonical "name + truncated vote account" cell.
- **`<CalcCard>`** (`src/components/breakdowns/card.tsx`) — breakdown panel chrome with optional `guideTo` link, `status` pill, and `tip` footer. Pair with `CalcRow` / `OkRow` / `SectionHeader` / `Marker` from `src/components/breakdowns/row.tsx`. Pass `total` on the conclusion row to get `separator + bold + large` in one prop; `value` defaults to `''`. The separator border is exposed for flex layouts via `SEPARATOR_DIV_CLASS`.
- **`<HelpTip>`** (`src/components/help-tip/help-tip.tsx`) — small `?` icon, Radix-based tooltip.
- **`<Banner>`** (`src/components/banner/banner.tsx`) — dismissible announcement, persistence in `localStorage`.
- **`<ConcentrationMetric>`** (`src/components/concentration-metric/concentration-metric.tsx`) — top-N stacked-bar concentration card with hover-expanded tooltip table.

---

## Maintenance

When you change the UI in any way that's user-visible, update this file in
the same commit:

- Add / remove / rename a column → update the corresponding column table.
- Add a new tab on the validator detail panel → list it under "Overview"
  or as its own section.
- Change a default sort, a tier threshold, a status label, or a token →
  update the relevant row.
- Move a route → update Navigation + the affected page section.

If the diff to a section is bigger than rewording, prefer rewriting the
whole section rather than patching it sentence-by-sentence — keeps the
inventory readable.
