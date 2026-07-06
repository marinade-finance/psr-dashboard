# Screens — PSR Dashboard

> Visual tokens (colours, typography, component primitives) live in
> `VISUALS.md`. `CLAUDE.md` lists testing / architecture
> rules. **This file lists the SHAPES** — pages, panels, columns,
> badges, tabs.

Live inventory of every page and the major panels inside them. **Keep this
file in sync with the UI** — when you add/remove/rename a column, tile,
metric, tab, or status badge, update the matching row here in the same
commit.

All pages share the same shell: `Navigation` → optional `Banner` → page
content. `level: UserLevel` propagates from the route into the page
component and downstream. `/expert-*` routes still exist in code but are
deprecated and undocumented; Basic-vs-Expert column markers below
describe the surface the `UserLevel` prop gates.

---

## Navigation

`src/components/navigation/navigation.tsx`

Top bar (`h-14`), horizontally scrollable on narrow viewports.

**Left** — Marinade logo (`<Link to="/{prefix}">`) + "PSR Dashboard /
Protected Stake Rewards" wordmark (wordmark hidden below `sm`).

**Tabs**

| Desktop label             | Mobile label | Route               |
| ------------------------- | ------------ | ------------------- |
| Stake Auction Marketplace | SAM          | `/`                 |
| Protected Events          | Events       | `/protected-events` |
| Validator Bonds           | Bonds        | `/bonds`            |

Active tab styled `bg-primary text-primary-foreground`. Hovering Events /
Bonds prefetches the respective query (`staleTime: 5min`).

**Right** — Docs link (→ `/docs`, hidden below `sm`), **Epoch meter**,
`ThemeToggle`, **Notifications bell**.

### Notifications bell

`src/components/navigation/navigation.tsx` · `src/services/notifications.ts`

Bell icon at the far right of the nav bar. Fetches validator-scoped
notifications from the Marinade notifications API (keys
`['notifications-all', 'sam_auction']` and `['notifications-broadcast']`,
refetch every 5 min). A numeric count badge appears when there are unread
items. `notificationTooltip()` in `notifications.ts` renders an HTML
tooltip listing up to 10 notifications in priority order (`critical` /
`warning` / `info`). The Notifications tab in the validator detail sheet
shows the full list.

### Epoch meter

`src/components/epoch-meter/epoch-meter.tsx`. Chip shows `Epoch {auctionEpoch}` (the common case,
`auctionEpoch === networkEpoch`); only when they differ it shows
`{networkEpoch} → {auctionEpoch}`, tinted `text-warning` iff
`auctionEpoch < networkEpoch` (view is stale). A leading `ProgressRing`
shows how far through the live epoch we are. Hovering opens a `Tooltip`
with the `TimelineCard` — payments-settled / auction-settled / live /
next-auction stage dots anchored to their epochs, plus a progress gauge
and `~Nh remaining`. The tooltip is **click-to-pin sticky** (same global
pin singleton as `HelpTip` via `usePinnedTooltip` — pinning one unpins
the other; outside-click / Esc dismiss). Progress + hours-remaining come
solely from the Solana RPC `getEpochInfo` (slot-accurate, `['epoch-info']`
query); progress is never estimated from timestamps. When the RPC does
not resolve, the ring is empty and the card shows `RPC unavailable`.
Auction epoch renders immediately from the
prefetched `['sam', 0]` query; the meter force-populates the
`['protected-events']` query (`staleTime: 5 min`) so the settlement
stages fill in without hovering the Events tab. Never blocks the nav.

---

## SAM Page (`/`)

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

A `grid grid-cols-3` row of three stat tiles. There is no compact /
detailed toggle — the page renders this single view.

Order (left to right): Re-delegation, Winning APY, Total Auction Stake.

When ≥1 simulation is active the whole table is wrapped in a yellow
inset ring with a "Simulation Mode" header strip — `Simulation Mode —
what-if numbers, not live (N validator(s) modified) · strikethrough =
original position` — carrying a **"Reset Simulation"** button at the
right edge.

| Tile                | Source                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| Re-delegation       | `selectRedelegationBudget(auctionResult)` — TVL − Σ active stake (SOL); matches `psr.marinade.finance` |
| Winning APY         | `selectWinningAPY(auctionResult, epochsPerYear)`                                                       |
| Total Auction Stake | `selectSamDistributedStake(validators)` (SOL)                                                          |

Tooltips via `HelpTip` on each tile.

### Jump-to-validator search

`src/components/validator-search/validator-search.tsx`. `max-w-sm` text
input below the metrics row, aligned with the table left edge.
Accepts a vote account (exact / prefix) or a validator name (prefix /
substring) via `findMatches`. Up to 8 ranked matches in a dropdown;
click or `Enter` opens the detail sheet for that validator — even if
the validator is hidden by the Basic-mode filter, because the detail
reads from the full auction set, not from the visible table rows.

### Auction table

7 columns, sortable. **Default sort: target stake descending** (the
Stake header carries the indicator). Column order:
`#` · Validator · **Stake** · Max APY · Bond · Next Step · chevron —
Stake is the primary metric (first after Validator, bold value), Max APY
and Bond are the secondary metrics. Sort indicator `↑`/`↓` next to active
header. The chosen column + direction persist to `localStorage`
(`psr-sort-col` / `psr-sort-dir`, same mechanism as the theme toggle), so
the sort survives a reload. Table sits in a scroll-x card
(`bg-card rounded-xl border border-border shadow-card overflow-x-auto`).

| Column    | Sort key      | What's there                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#`       | `rank`        | Absolute 1-based stake-priority rank from the top of the sorted auction (`#N`, `font-mono text-xs`, muted). Single line — no cutoff sub-label. Ghost rows: muted same `#N`. Simulated rows: `#N` + `✕` clear button. Keyboard-activatable (`role="button"`, `tabIndex`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Validator | `validator`   | `<ValidatorIdentity>` — name with the responsive vote account always shown on the sub-line beneath it (`8…8` on `sm+`, `4…4` below). Trailing red pulsing dot when validator has an alert (`bondRunway ≤ 5` or `bondUtilPct ≥ 85`). `PenaltyBadges` slot for the active penalty icons.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Stake     | `targetStake` | **Primary metric** (bold, first after Validator). Current active SAM stake (`marinadeActivatedStakeSol`) in bold `text-foreground`, followed by the signed gap to the auction target rendered inline as `(+ N SOL)` / `(− N SOL)` — `selectSamTargetStake − active`, tinted `var(--status-green)` when at/above target (gap ≥ 0) or `var(--destructive)` when below. Gap is hidden when `\|gap\| < 1`. **Sort key (`targetStake`) is the sum** `active + gap = selectSamTargetStake` (the target allocation), so the column orders validators by where the auction is steering their stake.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Max APY   | `maxApy`      | Secondary metric, muted like Bond — `selectMaxAPY` as plain `text-sm font-mono text-muted-foreground` (no pill).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Bond      | `bond`        | Bond balance (`selectBondSize`, muted `font-mono`) + a health chip (No bond / Critical / Watch / Healthy — dot + label, see § Bond chip). No gauge, no `(Nep)` runway suffix. **Critical** bonds add a second line: `X epochs to liquidate` in `text-destructive`, where `X = Math.max(1, Math.round(effectiveBondRunway))` — the runway alert is the only place the bond runway surfaces in the table now. Sort key is the bond balance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Next Step | `nextStep`    | One-line tip from `getValidatorTip`, pill capped at `max-w-[260px]` so the column stays rhythmic. **Colour = severity** via `getTipStyle(tip.urgency)`. **Glyph = lever** via `getTipIcon`: `TipConstraint.BOND` → shield glyph, `BID`/`RANK` → ascending-chevrons glyph (same lever — raise the bid), `CAP` → cap glyph; all non-directional and severity-agnostic. Only `TipConstraint.NONE` is directional and keyed off the real signed delta — ↗ gain, ↘ loss, → at target — so an up-arrow can never appear on a losing or blocked row. One escalation: `tip.alert === true` (an estimated bond risk fee this epoch) swaps the glyph for the octagon `ICON_ALERT`. The muted "Bid below winning price." label fires only for `constraint: 'rank'` **and** out-of-set (`marinadeSamTargetSol === 0`) — the contiguous below-cutoff block whose bid genuinely trails the winning price; an expected state, not an alarm, with the full sentence in the detail panel. In-set rank tips (a winning validator below the redelegation priority frontier) keep their real text (`Raise bid to get more stake next epoch.` / `Raise bid to grow stake.`) and normal severity colour — their bid is above winning, not below. Out-of-set validators whose `revShare.totalPmpe` already clears the winning total surface the binding reason directly (`outOfSetCta`): `Blocked from SAM this epoch.`, `Blacklisted — N penalty this epoch.` (or plain `Blacklisted.` when no penalty charges), `Not eligible — check client version and vote credits.`, or a binding-cap cause line (`N at country cap` / `N at ASO cap` / `At per-validator cap` / `At a concentration cap`) suffixed `.`; any other case returns null and `deltaCta` owns the message. Severity is per-branch: samBlocked and an active blacklist penalty are critical-red (alert glyph); the rest read warning when meaningful stake is leaving (`isDefending`), else info. In-set `deltaCta` says ``At your `maxStakeWanted` setting.`` only when the validator's own `maxStakeWanted` is what actually binds — it is `> 0`, sits at/above the auction floor `max(minMaxStakeWanted, active)`, and the target reaches it. A setting under that floor is silently clipped up to it (SDK `buildSamWantConstraints`), so the shown cap is not what binds and the target can exceed it — those rows fall through to `Raise bid to grow stake.` (bid below the priority frontier) or `At target stake.` (frontier already cleared). Otherwise `At target stake.` for zero / cap-bound deltas. |
| (chevron) | —             | Drill-in cue, recolours on row hover.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

### Cutoff divider

A row spanning all columns separates **bid-eligible** (max APY ≥ winning
APY) from **below-winning-price** validators. Note: bond-blocked but bid-winning
validators stay above the line because they'd win on yield. Rendered
whenever there are below-cutoff rows, regardless of the active sort
column — the eligible/below partition is independent of display sort. The
strip carries a "Winning Set Cutoff" star label, the literal `Winning
APY: X%`, and a right-aligned `N bid-eligible · M winning` count.

### Row tints

| State                                | Background                                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| In set                               | `bg-card`, hover `bg-primary-light`                                                                                     |
| Out of set (bid below winning price) | `bg-destructive/[0.02]`, hover `bg-destructive/[0.05]`                                                                  |
| Ghost (simulation original)          | `opacity-40 line-through bg-muted/30` — `cursor-pointer` if the simulated target row exists, otherwise `cursor-default` |
| Simulated (post-edit)                | `ring-2 ring-inset ring-status-yellow`, `borderLeftColor` = posColor (green up, red down)                               |
| Scroll-flash                         | `bg-status-yellow-light` for 800ms after clicking a ghost row to jump to its new position                               |

### Simulation mode

Tracked in `SamPage`: `simulationRunId`, `simulationOverrides`,
`simulatedValidators`, `originalAuctionResult`. Edits flow through
`mergeOverrides` → bump `simulationRunId` → `useQuery({ queryKey:
['sam', simulationRunId], queryFn: () => loadSam(overrides),
placeholderData: keepPreviousData })`. After a re-run, `insertGhostRows`
injects ghost entries at original positions of changed validators.
Detection of refetch completion watches `fetchStatus === 'idle'`.

**Bond fee warnings in simulation:** `values.bondRiskFeeSol` is a
scoring-API input — it is NOT recomputed by the simulation re-run. Bond
fee CTAs therefore persist unchanged through any simulation: if the real
epoch has a fee being charged, the warning continues to show regardless
of bid/commission overrides (correct — the user hasn't topped up the
bond). The "What changes" diff tracks `bondRiskFeeShortfall` (computed
from simulated `marinadeActivatedStakeSol × minBondPmpe − claimable`)
rather than the pinned `bondRiskFeeSol`, so a simulation that changes
stake allocation will surface the resulting shortfall change.

### Bond chip

Four tiers, `BOND_CHIP` record in `sam-table.tsx`, keyed by the shared `BondHealthState` enum from `src/services/bond-health.ts` (`NO_BOND` / `CRITICAL` / `WATCH` / `HEALTHY`):

| Tier       | Style                                   | Meaning                                                                                                |
| ---------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `no-bond`  | `bg-destructive-light text-destructive` | no bond posted at all (`bondBalanceSol ≤ 0`); red, label "No bond"                                     |
| `critical` | `bg-destructive-light text-destructive` | below penalty threshold, bond risk fee charged, OR bond below the SDK `minBondBalanceSol` minimum; red |
| `watch`    | `bg-warning-light text-warning`         | can't keep current stake; some will be undelegated                                                     |
| `healthy`  | `bg-primary-light-10 text-primary`      | bond exceeds ideal coverage                                                                            |

Below-minimum bond reads red ONLY when a bond risk fee is pending — `bondHealthFromAuction` returns `critical` when `bondBalanceSol < minBondBalanceSol`, but `bondAdvice`/`bondCta` downgrade to `TipUrgency.NEUTRAL` + grey tone when no fee is charged (eligibility, not urgency: "Top up bond to X to qualify."). Both `no-bond` and `critical` resolve to the same red chip via the shared `DESTRUCTIVE_CHIP` style; only the label differs. `tipBannerTone` (in `breakdowns/card.tsx`) routes the bond-NEUTRAL case to the `grey` banner tone so the header tip banner agrees with the pill colour.

### Validator detail sheet

`src/components/validator-detail/validator-detail.tsx`. Right-side
`Sheet`, `max-w-4xl`, mounted by `SamPage` with `key={selectedValidator
?? 'detail'}` so switching validators remounts the component. Opens
when a row is clicked. URL synced via `?v=<voteAccount>`; browser-back
closes the sheet. A 4px top yellow border (`border-t-status-yellow`)
marks the sheet when the open validator is currently simulated.

**Sticky header** (top of sheet, `sticky top-0 z-10`):

- **Back to rankings** chevron-left button (closes the sheet).
- **Rank glyph** — large mono `#N` (always positive), coloured by tip
  urgency, prefixed with the same `getTipIcon` glyph the sam-table
  Next Step uses. No cutoff sub-label.
- Validator display name + truncated vote account.
- **In Set / Out of Set** pill (primary-light vs destructive-light).
- **Simulated** pill (yellow uppercase) — only when this validator
  has an active override.
- Right side: **Simulate** Switch (tooltip), **Remove from simulation**
  ghost button (when simulated), close `×`.

**Tip banner** — rendered through the shared `StatusBanner` primitive
(from `breakdowns/card.tsx`), the same primitive every `CalcCard` status
slot uses, so card-level and header-level banners stay byte-aligned.
Carries the real `getValidatorTip` text. Tone resolves through
`tipBannerTone(tip, bondHealth)`: bond tips colour off bond-health
(`red / yellow / green`); the bond + `NEUTRAL` exception (below-min, no
fee pending) routes to the `grey` tone so eligibility doesn't masquerade
as urgency. Non-bond tips colour off `tip.urgency`. The right-side action
pill routes to the tab named by the module-scope `TIP_TAB` map (`bond` →
Bond, `bid` → Bid Penalty, `rank` → Bidding), suppressed when the user is
already on that tab. The header rank glyph keeps its own urgency colour
(it tracks overall standing, not bond health).

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

- **Bond** — `critical` when `bondHealth` is `CRITICAL` or `NO_BOND`;
  `warning` when `WATCH`.
- **Bid Penalty** — `critical` when the bid-too-low penalty is > 0.
- **Notifications** — tracks the highest `priority` (`critical` /
  `warning` / `info`) across the notifications summary.
- Plus a subtle `info` hint on whichever tab the header tip points at,
  dispatched through the module-scope `TIP_TAB` exhaustive
  `Record<TipConstraint, Tab | null>` (also drives the banner's
  click target so banner-nav and the tab dot cannot disagree):
  `BOND` → Bond, `BID` → Bid Penalty (the in-set penalty math lives
  there — the static-bid lever in Bidding cannot help once the
  penalty is already accruing), `RANK` → Bidding (out-of-set; raise
  the static bid to qualify), `CAP` and `NONE` → no dedicated tab.
  The info hint only fires when no higher-severity dot is already on
  the target tab — a red Bid Penalty dot from an active penalty is
  the single signal, never paired with a duplicate purple info-dot.
  The banner's jump chip is suppressed entirely when the user is already
  on the target tab.

Active marker stays visually dominant; the dot pulses on the active
tab while the issue is unresolved.

**Overview** — 2-col grid (`lg:grid-cols-2`, `gap-6`). Each card is a
`CalcCard` with its own title + Guide-link chrome. `onTitleClick`
hops to the matching deep-dive tab.

Left column:

- **Stake** card — `MetricRow`s: `Activated Marinade stake`, `Target
Marinade stake`, `Max stake wanted` (conditional — hidden when null
  or 0; 0 means opted out), `Expected change next epoch` (separator).
  When `maxStakeWanted` sits below the auction floor
  `max(minMaxStakeWanted, active)` a muted sub-line reads `Below <floor> —
  auction uses M`, naming whichever floor raised the cap (`N min` when the
  network minimum binds, else `your active stake`) and `M` = the clipped-up
  `effectiveWantCap`. The row's `HelpTip` says the auction never assigns
  below the network minimum or current active stake, so a low setting is
  raised — it no longer claims the setting is a hard ceiling. The Next-epoch
  `HelpTip` notes the delta can be `0 SOL` even when target > active stake.
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
- **Concentration** card (conditional — hidden when the validator is
  not in the auction set) — `MetricRow`s for `Country · {name}` and
  `ASO · {name}`, each valued `X% of Y% cap` where `X` is the group's
  share of the auction's total SAM target stake and `Y` is the
  configured cap (`maxNetworkStakeConcentrationPer{Country,Aso}Dec`).
  When this validator's own binding cap is that country / ASO the value
  gains a `· at cap` suffix and turns `CSS_DESTRUCTIVE`. Source:
  `selectValidatorConcentration`. Keeps the country / ASO limits
  inspectable per-validator after the headline concentration tiles were
  removed.

Right column:

- **Payments** card (title clickable → Payments tab) — `Active stake
cost`, `Activating stake cost`, a `Penalty` summary row (`No
penalties` when total is zero, or the destructive total cost),
  optional sub-rows `↳ bid-too-low penalty` / `↳ blacklist penalty`
  / `↳ bond risk fee` (each a `PenaltyRow` that routes to its own
  breakdown tab), then `Expected payment this epoch` (separator).
- **APY Composition** — `ApyCompositionCard`. Segmented bar showing
  inflation / MEV / block rewards / stake bid. Bar widths use raw
  PMPE proportions (so they sum to total); the displayed % is each
  component's compounded APY. Per-row context line: inflation and MEV
  show `N% commission` (the share the validator keeps); block rewards
  show `N% shared` — the fraction GIVEN to stakers (`1 − commission`,
  and `0%` when the commission is null or ≥ 100%, matching the SDK's
  zeroed `blockPmpe`). Threshold marker line + label at the
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
(`breakdowns/bidding.tsx`), a SINGLE continuous `<table>` (`max-w-[34rem]`)
built from the shared `CalcRow` / `SectionHeader` / `OkRow` primitives.
`SectionHeader`-delimited sections, top to bottom: **Your bid today** →
**Get into the auction** → **Get stake delegated next epoch**. Each
section header carries `unit="PMPE"`. The first section sums non-bid
revenue (inflation + MEV + block rewards) and the static bid; the next
two derive a target static bid by subtracting non-bid revenue from a
threshold — the winning total PMPE for "Get into the auction", the
redelegation priority frontier for "Get stake delegated next epoch".

Status banner verdicts (`baseStatus` in `bidding.tsx`):

- `clears` (green, `Already clears — keep your static bid at or above N
PMPE.`) when `inAuction.bidIncrease ≤ 0` and no cap binds.
- Increase needed (red, `Bid X → Y PMPE to clear the winning total
PMPE.`) when the current bid is short.
- Cap binding (yellow, `<capLabel> — raising your bid alone will not
get you in.`) where `capLabel` resolves to the country / ASO / per-
  validator / want / generic phrasing in `bidding.tsx:84-94`.

The right-side action pill is the shared `withSimAction` yellow
`Simulate →` chip; no tip footer. The `IN_AUCTION_HELP` and
`NEXT_EPOCH_HELP` strings carry the closed-form / greedy-heuristic
verify-in-Simulate caveats. When the priority frontier is zero
(`noFrontier`) or already cleared, the third section collapses to a
single green `OkRow` plus the priority-rank and bid-gap context rows.

**Payments tab** — one `PaymentsBreakdown` card
(`breakdowns/payments.tsx`), purely the cost story. The table uses the
shared `CalcRow` / `SectionHeader` primitives (`max-w-[34rem]`); col1
carries PMPE rates only, col2 SOL amounts only, so units never mix in a
column. `SectionHeader`-delimited sections, top to bottom: **Active
stake cost** (Active stake → × Effective bid → = Active stake cost) →
**Activating stake cost** (Activating stake → × Activating-stake bid →
= Activating stake cost) → **Penalties** (Bid-too-low, Blacklist, Bond
risk fee — each `—` when zero) → **PSR settlements — estimated**
(conditional, one row per estimate with funder in col1) → **Total
payment** (`total` styling — separator + bold + large, no severity
colour). Status banner summarises the combined state from
`baseStatus`: green `You will pay X SOL in total this epoch — no
penalties.` or red `You will pay X SOL in total this epoch —
including Y SOL in penalties.`. The right-side action pill is the
shared yellow `Simulate →` chip via `withSimAction`. Only the
bid-too-low penalty link remains as a `tip` slot under the banner — a
destructive cross-tab affordance, not a sim action — rendered as `See
bid-too-low penalty calculation →` when `bidTooLowPenaltySol > 0`.

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

**Shared row model** — Bidding and Payments use the same primitives
from `breakdowns/row.tsx`: `CalcRow` (label | col1 | col2),
`SectionHeader` (title + optional `unit` / `col1Unit` slots),
`OkRow` (green confirmation), and `Marker`. Column units live in the
`SectionHeader` `unit` slot, stated once per section instead of
suffixed on every row label. Paddings, dividers and weight derive from
one shared `rowStyle()` helper inside `row.tsx`. Conclusion rows pass
`total` to get `separator + bold + large` in one prop.

`MetricRow` and `PenaltyRow` are file-private helpers in
`validator-detail.tsx`; they are not exported as shared primitives.

---

## Validator Bonds Page (`/bonds`)

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

## Protected Events Page (`/protected-events`)

`src/pages/protected-events.tsx` ·
`src/components/protected-events-table/protected-events-table.tsx`

Data: `fetchProtectedEventsWithValidator()`. Refetch every hour. Rows
where `reason === 'Bidding'` are excluded from the table (they
contribute to the Expert `Last Epoch Bids` subline instead); rows where
`reason === 'PriorityFee'` and `amount < 0.01 SOL` are also dropped as
sub-penny noise.

### Top tiles

Responsive grid (`grid-cols-1 sm:grid-cols-3`) of three `<Metric>` tiles:

| Tile               | Value                                                                                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Events             | filtered count, subline `of N total` when filter active                                                                                                                       |
| Amount             | total SOL paid out, subline `of N SOL total` when filtered, `extra` slot = Bond/Marinade split bar with `Bond X% / Marinade Y%` legend (only when not filtered and total > 0) |
| Last settled epoch | most recent fully on-chain epoch, Expert-only subline `X SOL bids` (collectable from last settled epoch)                                                                      |

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

**Duplicate badge** (Reason column): rows sharing an identical
`(vote_account, epoch, reason, amount)` tuple get a warning-style `Duplicate`
chip flagging a known backend double-settlement (e.g. epoch 977). Rows are
never silently deduplicated — both are shown, flagged.

---

## Docs Page (`/docs`)

`src/pages/docs.tsx`

Centered `max-w-3xl` column. Renders `public/docs/GUIDE.md` through
`react-markdown` with `remark-gfm` + `rehype-raw`. Fetched as plain text
via `useQuery({ queryKey: ['doc', activeDoc], staleTime: Infinity })`.

- Hash anchors work: `<a id="...">` markers in the markdown are
  honoured (via `rehype-raw`) and a `useEffect` scrolls to
  `window.location.hash` after the markdown DOM mounts (deferred one
  frame via `requestAnimationFrame`). External `a` elements open in a
  new tab.
- Card "Guide →" links from breakdown cards route to `/docs` plus the
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

Fixtures: `src/fixtures/test-validators.ts`,
`src/fixtures/test-bonds.ts`, `src/fixtures/test-protected-events.ts`,
`src/fixtures/test-notifications.ts`. Test pages set
`refetchInterval: false` on the wrapped `QueryClient` queries.

---

## Shared visual primitives

Pointer list — for the full design language see `VISUALS.md`.

- **`<Card>`** (`src/components/ui/card.tsx`) — `rounded-xl border border-border bg-card shadow-card`.
- **`<TableShell>` + `TABLE_SHELL_HOVER`** (`src/components/table/table.tsx`) — canonical outer card chrome for any page that drops a generic `<Table>` into a content section. Wraps the table in `bg-card rounded-xl border border-border shadow-card overflow-hidden overflow-x-auto`. Both the bonds and protected-events tables sit inside one. Pair with `TABLE_SHELL_HOVER` on the `<Table>`'s `className` to get the muted `bg-secondary` row-hover (the default `<Table>` hover, `bg-primary-light`, is reserved for SAM, which has its own bespoke wrapper).
- **`<Metric>`** (`src/components/metric/metric.tsx`) — KPI tile with optional `subline` + `extra` slots.
- **`<ValidatorIdentity>`** (`src/components/validator-identity/validator-identity.tsx`) — canonical "name + truncated vote account" cell.
- **`<CalcCard>`** (`src/components/breakdowns/card.tsx`) — breakdown panel chrome with optional `guideTo` link, `status` pill, and `tip` footer. Pair with `CalcRow` / `OkRow` / `SectionHeader` / `Marker` from `src/components/breakdowns/row.tsx`. Pass `total` on the conclusion row to get `separator + bold + large` in one prop; `value` defaults to `''`. The separator border is exposed for flex layouts via `SEPARATOR_DIV_CLASS`.
- **`<HelpTip>`** (`src/components/help-tip/help-tip.tsx`) — small `?` icon, Radix-based tooltip.
- **`<Gauge>`** (`src/components/gauge/gauge.tsx`) — shared track-and-fill bar: `value`/`scaleMax` fill, optional `marker` tick (0..1), semantic `tone`/`markerTone`, `size` `sm` / `lg`. Used by the epoch-meter. Dumb/presentational.
- **`<Banner>`** (`src/components/banner/banner.tsx`) — dismissible announcement, persistence in `localStorage`.

---

## Maintenance

When you change the UI in any way that's user-visible, update this file in
the same commit:

- Add / remove / rename a column → update the corresponding column table.
- Add a new tab on the validator detail panel → list it under
  "Validator detail sheet → Tabs" and add the per-tab section below.
- Change a default sort, a tier threshold, a status label, or a token →
  update the relevant row.
- Move a route → update Navigation + the affected page section.

If the diff to a section is bigger than rewording, prefer rewriting the
whole section rather than patching it sentence-by-sentence — keeps the
inventory readable.
