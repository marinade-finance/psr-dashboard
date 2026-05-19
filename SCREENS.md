# Screens — PSR Dashboard

> Visual tokens (colours, typography, component primitives) live in
> `visuals.md`. `CLAUDE.md` lists testing / architecture
> rules. **This file lists the SHAPES** — pages, panels, columns,
> badges, tabs.

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

### Headline metrics row

One `flex flex-wrap items-stretch` row holding five stat tiles followed
by the two concentration cards. Stat tiles take
`flex-1 min-w-[160px]`; concentration cards take `flex-1 min-w-[260px]`
so the gauge has room. Narrow viewports wrap to multiple lines.

Order (left to right): Re-delegation, Winning APY, Projected APY,
Winning Validators, Total Auction Stake, Top Country, Top ASO.

When ≥1 simulation is active the whole table is wrapped in a yellow
inset ring with a "Simulation Mode" header strip — `Simulation Mode —
what-if numbers, not live (N validator(s) modified) · strikethrough =
original position` — carrying a **"Reset Simulation"** button at the
right edge.

| Tile                | Source                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Re-delegation       | sum of positive `selectExpectedStakeChange` across the filtered set (SOL)                   |
| Winning APY         | `selectWinningAPY(auctionResult, epochsPerYear)`                                            |
| Projected APY       | `selectProjectedAPY(auctionResult, epochsPerYear)`                                          |
| Winning Validators  | `winningCount / totalValidators`                                                            |
| Total Auction Stake | `selectSamDistributedStake(validators)` (SOL)                                               |
| Top Country         | `<ConcentrationMetric>` — top entry name (line 1) + `share% / cap%` (line 2, `/cap%` muted) |
| Top ASO             | `<ConcentrationMetric>` — top entry name (line 1) + `share% / cap%` (line 2, `/cap%` muted) |

Tooltips via `HelpTip` on each tile. Concentration cards expand a
hover popover with the full ranked list.

### Concentration metrics (popover)

Two `<ConcentrationMetric>` cards: **Top Countries** and **Top ASOs**.
The inline (non-hover) view shows only what matters at a glance: every
over-cap entry if any are capped (rank order, `text-destructive` with a
`(capped)` tag), otherwise just the single #1 entry. Each entry is a name

- share line over a `<Gauge size="lg">` — the same shared track-and-fill
  graphic the sam-table Bond column uses, larger. The fill scales the
  entry's share against an absolute network-share scale (0 .. max of the
  largest entry or the cap, plus headroom); a `bg-foreground/50` marker
  tick sits at the per-country / per-ASO cap so an over-cap entry visibly
  extends past it, with a `N% cap` label below. Hover expands a tooltip
  showing the full ranked list (up to 15 entries, the fading-tail tint
  palette) plus a remaining-count line.

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

| Column         | Sort key     | What's there                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#`            | `rank`       | Primary: absolute 1-based stake-priority rank from the top of the sorted auction (`#N`, `text-sm`), coloured by tip urgency, no trend arrow — the `#` appears only here. Sub-label underneath (`text-[10px]`, ~40% smaller): cutoff-relative position from `validator.values.cutoffRank` — `at cutoff`, `N above`, or `N below`; no `#` prefix, NBSP binds count to word. Ghost rows: muted same layout. Simulated rows: posColor-tinted `#N` (no sub) + `✕` clear button. Keyboard-activatable (`role="button"`, `tabIndex`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Validator      | `validator`  | `<ValidatorIdentity>` — name + responsive vote account. Trailing red pulsing dot when validator has an alert (`bondRunway ≤ 5` or `bondUtilPct ≥ 85`). `PenaltyBadges` slot for the active penalty icons.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Max APY        | `maxApy`     | `selectMaxAPY` pill. Primary tone if in winning set, destructive-light otherwise.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Bond           | `bond`       | Bond chip (No bond / Critical / Watch / Adequate / Healthy — see § Bond chip) + dot + balance, then a compact `<Gauge size="sm">` (the shared track-and-fill component, also used larger by the Concentration metrics) + `(Nep)` runway suffix. The gauge fills proportionally to `bondGoodForNEpochs` against a fixed 100-epoch scale (so a 5ep bond reads short and a 90ep bond nearly full; runway over the cap renders a full bar — the old `100 − utilization` encoding was discarded because utilization is ≈0 for almost every validator and rendered every bar full). Fill colour follows the existing bond-health tier (`BOND_CHIP[...].bar`: primary / muted / warning / destructive) so a near-critical bond reads red even when its runway is only a few epochs. A thin `bg-destructive` tick at the danger (left) end marks the `dsSamConfig.minBondEpochs` critical floor (no number label — the `w-14` cell can't fit one without crowding the `(Nep)` token). The bond pill passes `criticalBand={0.25}`, so the leftmost 25% of the track carries a faint `bg-destructive/15` zone drawn behind the value fill — the critical-runway region reads red at a glance. The band is bond-pill-only: the `size="lg"` Concentration gauge does not pass `criticalBand` (its marker is the cap, a different semantic). Track height and fill are a uniform 4px across every row variant (normal, out-of-set, ghost, simulated, alert). The runway number is display-capped: `≥ 100` epochs renders `(>100ep)`, below that the exact rounded value (e.g. `(37ep)`). |
| Stake / Next change | `stakeDelta` | Active SAM stake on top, expected next-epoch change underneath. Muted `0 SOL` when delta is zero, otherwise tinted `+/−` SOL coloured `var(--status-green)` / `var(--destructive)`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Next Step      | `nextStep`   | One-line tip from `getValidatorTip`, pill capped at `max-w-[260px]` so the column stays rhythmic. **Colour = severity** (urgency tint). **Icon = constraint/direction** via `getTipIcon`: bond → shield glyph, bid → bars glyph, rank → list glyph (all non-directional, severity-agnostic); only the in-set `none` case is directional and keyed off the real signed delta (↗ gain, ↘ loss, → at target) so an up-arrow can never appear on a losing/blocked row. The contiguous out-of-set "bid too low" block (`constraint:'rank'`) is an expected state, not an alarm: rendered muted with a 2-word "Bid too low" label (full sentence only in the detail panel).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| (chevron)      | —            | Drill-in cue, recolours on row hover.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

### Cutoff divider

A row spanning all columns separates **bid-eligible** (max APY ≥ winning
APY) from **bid-too-low** validators. Note: bond-blocked but bid-winning
validators stay above the line because they'd win on yield. Only rendered
when sorted by the default `maxApy` rank. The strip carries a "Winning
Set Cutoff" star label, the literal `Winning APY: X%`, and a
right-aligned `N bid-eligible · M winning` count.

### Row tints

| State                       | Background                                                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| In set                      | `bg-card`, hover `bg-primary-light`                                                                                     |
| Out of set (bid-too-low)    | `bg-destructive/[0.02]`, hover `bg-destructive/[0.05]`                                                                  |
| Ghost (simulation original) | `opacity-40 line-through bg-muted/30` — `cursor-pointer` if the simulated target row exists, otherwise `cursor-default` |
| Simulated (post-edit)       | `ring-2 ring-inset ring-status-yellow`, `borderLeftColor` = posColor (green up, red down)                               |
| Scroll-flash                | `bg-status-yellow-light` for 800ms after clicking a ghost row to jump to its new position                               |

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

Five tiers, `BOND_CHIP` record in `sam-table.tsx`, keyed by the shared `BondHealthState` union (`bond-health.ts` — no more local duplicate type):

| Tier                | Style                                   | Meaning                                                                                                |
| ------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `no-bond`           | `bg-destructive-light text-destructive` | no bond posted at all (`bondBalanceSol ≤ 0`); red, label "No bond"                                     |
| `critical`          | `bg-destructive-light text-destructive` | below penalty threshold, bond risk fee charged, OR bond below the SDK `minBondBalanceSol` minimum; red |
| `watch`             | `bg-warning-light text-warning`         | can't keep current stake; some will be undelegated                                                     |
| `soft` ("Adequate") | `bg-secondary text-muted-foreground`    | covers current stake but not ideal target                                                              |
| `healthy`           | `bg-primary-light-10 text-primary`      | bond exceeds ideal coverage                                                                            |

Below-minimum bond reads red, not warning-yellow: `bondHealthFromAuction` returns `critical` when `bondBalanceSol < minBondBalanceSol`, and the out-of-set tip's "Bond below minimum" branch is `urgency: 'critical'`, so chip and tip agree on tone. A validator with no bond at all is `no-bond` ("No bond") — distinct from `soft` ("Adequate"), which it was previously mislabelled as. Both `no-bond` and `critical` resolve to the same red chip via the shared `DESTRUCTIVE_CHIP` style; only the label differs.

### Validator detail sheet

`src/components/validator-detail/validator-detail.tsx`. Right-side
`Sheet`, `max-w-4xl`, mounted by `SamPage` with `key={selectedValidator
?? 'detail'}` so switching validators remounts the component. Opens
when a row is clicked. URL synced via `?v=<voteAccount>`; browser-back
closes the sheet. A 4px top yellow border (`border-t-status-yellow`)
marks the sheet when the open validator is currently simulated.

**Sticky header** (top of sheet, `sticky top-0 z-10`):

- **Back to rankings** chevron-left button (closes the sheet).
- **Rank glyph** — large mono `#N` (or `-#N` when below winning),
  coloured by tip urgency, prefixed with the same `getTipIcon` glyph
  the sam-table Next Step uses. Sub-label underneath: `at winning
  edge` / `N place(s) above winning` / `N place(s) below winning`.
- Validator display name + truncated vote account.
- **In Set / Out of Set** pill (primary-light vs destructive-light).
- **Simulated** pill (yellow uppercase) — only when this validator
  has an active override.
- Right side: **Simulate** Switch (tooltip), **Remove from simulation**
  ghost button (when simulated), close `×`.

**Tip banner** — full-width strip directly below the header, tinted
advisory carrying the real `getValidatorTip` text. Non-bond tips are
coloured by `getTipStyle(tip.urgency)`, with a `Simulate →` chip when
the constraint is `bid` (clicking the strip switches to Overview and
enables the Simulate switch). For `constraint === 'bond'` tips the
strip shows the short canonical bond CTA — the byte-identical string
`bondAdvice()` feeds the sam-table Next Step pill and the Bond tab
status banner — with a `Bond tab →` chip routing to the Bond tab.
Colour comes from `getBondAdviceStyle(bondHealth)` (same red /
status-yellow / green axis the Bond tab uses), never from
`tip.urgency` — so header and Bond banner can never disagree on tone
or wording for one state. The header rank glyph keeps its own urgency
colour (it tracks overall standing, not bond health).

**Tabs:** Overview · Notifications · Payments · Bidding · Bond · Bid
Penalty (in this fixed order, from `TAB_DEFS`). Bidding and Payments
are purpose-built: Payments answers "how much will I pay this
epoch?" (explanatory), Bidding answers "what should I bid to get in
and win stake?" (prescriptive). Payments sits before Bidding — you
read the cost first, then act on it. The internal `Tab` union is
`'overview' | 'notifications' | 'payments' | 'bidding' | 'bond' |
'penalty'`.

An inactive tab whose content needs a look carries a small
severity-toned dot and tinted label, computed once by `tabAttention`:

- **Bond** — `critical` when `bondHealth` is `critical` or `no-bond`;
  `warning` when `watch`.
- **Bid Penalty** — `critical` when the bid-too-low penalty is > 0.
- **Notifications** — tracks the highest `priority` (`critical` /
  `warning` / `info`) across the notifications summary.
- Plus a subtle `info` hint on whichever tab the header tip points at
  (Bond for `constraint:'bond'`, Bidding for `constraint:'bid'`).

Active marker stays visually dominant; the dot pulses on the active
tab while the issue is unresolved.

**Overview** — 2-col grid (`lg:grid-cols-2`, `gap-6`). Each card is a
`CalcCard` with its own title + Guide-link chrome. `onTitleClick`
hops to the matching deep-dive tab.

Left column:

- **Stake** card — `MetricRow`s: `Active Marinade stake`, `Target
  Marinade stake`, `Expected change next epoch` (separator). The
  Next-epoch `HelpTip` notes the delta can be `0 SOL` even when
  target > active stake.
- **Bond** card (title clickable → Bond tab) — `Balance`, `Reserve`
  (value = `bondCoverageLabel()` — `Fully covered` / `Adequate` /
  `Top up X to grow stake` / `Top up X to keep your stake` / `Top
  up X to avoid the fee` / `Critical` / `No bond`, coloured by
  `bondCoverageColor`), `Bid runway` (value = `Depleted` or `N
  epochs`). Balance renders 3-decimal `cost()` precision for a
  sub-1 SOL positive bond so a tiny Critical-driving bond never
  reads as "0 SOL". Bid runway is forced to `Depleted` when
  bond-health is `no-bond` or `critical` so Balance, Reserve and
  Bid runway always tell one coherent story.
- **Payments** card (title clickable → Payments tab) — `Active stake
  cost`, `Activating stake cost`, a `Penalty` summary row (`No
  penalties` when total is zero, or the destructive total cost),
  optional sub-rows `↳ bid-too-low penalty` / `↳ blacklist penalty`
  / `↳ bond risk fee` (each a `PenaltyRow` that routes to its own
  breakdown tab), then `Expected payment this epoch` (separator).

Right column:

- **APY Composition** — `ApyCompositionCard`. Segmented bar showing
  inflation / MEV / block rewards / stake bid. Bar widths use raw
  PMPE proportions (so they sum to total); the displayed % is each
  component's compounded APY. Threshold marker line + label at the
  winning-APY position. The `±X% vs winning` pill is green above
  the winning threshold; below it the pill becomes a button reading
  `-X% vs winning → Bidding` that switches the panel to the
  Bidding tab so the validator sees the concrete target bid.
- **What-If Simulation** (only when the Simulate switch is on) —
  four numeric inputs: Stake Bid (PMPE), Inflation Commission %,
  MEV Commission %, Block Rewards Commission %. Auto-recalcs with
  a 400ms debounce; the parent's `onSimulate` callback is routed
  through a `useRef` so callback identity churn doesn't restart
  the timer. Card carries yellow border + `bg-status-yellow-light`
  and a small status footer (`Recalculating…` / `Auto-recalc on
  change`).

**Bidding tab** — one `BiddingBreakdown` card
(`breakdowns/bidding.tsx`), a SINGLE continuous 4-column `<table>`. The
two advisory estimates are the centerpiece; the sections above feed the
target-bid math. `SectionHeader`-delimited sections, top to bottom:
Stake position → Cost-PMPE composition → Bid gap → Get into the auction
→ Get stake next epoch. The status banner is a verdict — green "Your
bid clears the winning bar — you are in the auction", red "Raise your
static bid to X PMPE …", yellow when a concentration cap is binding.
Tip footer carries "Simulate this bid to confirm the exact figure →".
The two estimate sections' `SectionHeader` `help` tooltips carry the
closed-form last-price / greedy-heuristic and verify-in-Simulate
caveats. The "Expected change next epoch" row renders `0 SOL` (never a
dash) on a real zero and carries a `HelpTip` explaining why it can be
zero even when target > active.

**Payments tab** — one `PaymentsBreakdown` card
(`breakdowns/payments.tsx`), a SINGLE continuous 4-column `<table>`,
purely the cost story. `SectionHeader`-delimited sections: Bid cost
(Active stake cost, Activating stake cost, Bid cost subtotal) →
Penalties → PSR settlements (conditional) → **Total payment**. One
status banner summarises the combined state (green "no penalties" / red
"including Y in penalties"), one tip footer carries "See bid-too-low
penalty calculation →" (when active) and "Simulate commission or bid
changes →". The "Total payment" row is black (`text-foreground`, no
severity) — it is a conclusion, not a warning.

**Bond tab** — one `BondCoverageBreakdown` `CalcCard`
(`breakdowns/bond-coverage.tsx`). Rates section → "Minimum bond to keep
stake — N epochs" → "Ideal bond to grow stake — N epochs" → "Bond risk
fee" (when active). Status banner derives from `bondHealth` via
`getBondAdviceStyle`; tone matches the header banner for bond tips.

**Bid Penalty tab** — one `BidPenaltyBreakdown` `CalcCard`
(`breakdowns/bid-penalty.tsx`). Sections: Bid history → Historical
baseline → Threshold → Penalty coefficient → Penalty rate → Penalty
this epoch. Each `SectionHeader` carries the PMPE / unit-less unit.

**Notifications tab** — one `CalcCard` listing each
`NotificationSummary` entry, with a priority pill (`critical` /
`warning` / `info`) in the family colour, then title / body / footer.
"No notifications for this validator." when empty.

**Shared row model** — Bidding and Payments use the shared 4-column
`RevRow` from `breakdowns/row.tsx` (`label | pct | pmpe | value`);
rows that don't use a column leave it blank, never mixed with
`CalcRow` in the same table. The column unit (`PMPE` / `SOL`) lives in
the `SectionHeader` `unit` slot, stated once per section instead of
suffixed on every row label. `CalcRow` and `RevRow` derive paddings,
dividers and weight from one shared `rowStyle()` helper.

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
where `reason === 'Bidding'` are excluded from the table (they
contribute to the Expert `Last Epoch Bids` subline instead); rows where
`reason === 'PriorityFee'` and `amount < 0.01 SOL` are also dropped as
sub-penny noise.

### Top tiles

Responsive grid (`grid-cols-1 sm:grid-cols-3`) of three `<Metric>` tiles:

| Tile               | Value                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| Events             | filtered count, subline `of N total` when filter active                                          |
| Amount             | total SOL paid out, subline `of N SOL total` when filtered, `extra` slot = Bond/Marinade split bar with `Bond X% / Marinade Y%` legend (only when not filtered and total > 0) |
| Last settled epoch | most recent fully on-chain epoch, Expert-only subline `X SOL bids` (collectable from last settled epoch) |

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

| Route                    | Component                                                         | Wraps                 |
| ------------------------ | ----------------------------------------------------------------- | --------------------- |
| `/test-`                 | `TestSamPage` (`src/pages/test-stake-auction-marketplace.tsx`)    | `SamPage`             |
| `/test-bonds`            | `TestBondsPage` (`src/pages/test-bonds.tsx`)                      | `ValidatorBondsPage`  |
| `/test-protected-events` | `TestProtectedEventsPage` (`src/pages/test-protected-events.tsx`) | `ProtectedEventsPage` |

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
- **`<Gauge>`** (`src/components/gauge/gauge.tsx`) — shared track-and-fill bar: `value`/`scaleMax` fill, optional `marker` tick (0..1), semantic `tone`/`markerTone`, `size` `sm` (Bond column) / `lg` (Concentration metrics). Dumb/presentational.
- **`<Banner>`** (`src/components/banner/banner.tsx`) — dismissible announcement, persistence in `localStorage`.
- **`<ConcentrationMetric>`** (`src/components/concentration-metric/concentration-metric.tsx`) — top-N concentration card; inline name+share over a `lg` `<Gauge>` with cap marker, hover-expanded tooltip table.

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
