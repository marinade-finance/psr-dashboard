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

**Right** — Docs link (→ `/docs` or `/expert-docs` per `level`),
`ThemeToggle`.

---

## SAM Page (`/`, `/expert-`)

`src/pages/sam.tsx` · `src/components/sam-table/sam-table.tsx`

### Jump-to-validator search

Above the stats bar, a `max-w-md` text input
(`src/components/validator-jump/validator-jump.tsx`).
Accepts a vote account (exact / prefix) or a validator name (prefix /
substring). Up to 8 ranked matches in a dropdown; click or `Enter` opens
the detail sheet for that validator — even if the validator is hidden by
the Basic-mode bond filter, because the detail reads from the full
auction set, not from the visible table rows.

### Basic vs Expert filter

Basic mode hides validators whose bond runway (`bondGoodForNEpochs`) is
below `dsSamConfig.minBondEpochs`, on top of the existing "must have
some marinade stake" rule. Expert mode shows the long tail. The
jump-to-validator search bypasses the filter, so a deep link still
works.

### Stats bar

Five `Card` tiles, `flex flex-wrap`. When ≥1 simulation is active a sixth
tile is the destructive **"Reset Simulation (N)"** chip-button.

| Tile                | Source                                                      |
| ------------------- | ----------------------------------------------------------- |
| Total Auction Stake | `selectSamDistributedStake(validators)`                     |
| Winning APY         | `selectWinningAPY(auctionResult, epochsPerYear)`            |
| Projected APY       | `selectProjectedAPY(auctionResult, epochsPerYear)`          |
| Winning Validators  | `winningCount / totalValidators`                            |
| Re-delegation       | sum of positive `expectedStakeChangeSol` (capped per epoch) |

Tooltips via `HelpTip` on Winning APY, Re-delegation, and Max APY column
header.

### Auction table

7 columns, sortable. **Default sort: Max APY descending.** Sort indicator
`↑`/`↓` next to active header.

| Column         | Sort key     | What's there                                                                                                                                                                |
| -------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#`            | `rank`       | `{tipIcon}#N` coloured by tip urgency. Ghost rows: muted `#N`. Simulated rows: posColor-tinted `#N` + `✕` clear button. Keyboard-activatable (`role="button"`, `tabIndex`). |
| Validator      | `validator`  | `<ValidatorIdentity>` — name + responsive vote account. Trailing red pulsing dot when validator has a notification (`hasAlert`).                                            |
| Max APY        | `maxApy`     | `selectMaxAPY` pill. Primary tone if in winning set, destructive if not.                                                                                                    |
| Bond           | `bond`       | `<BondChip>` (Healthy / Adequate / Watch / Critical, see § Bond chip below) + balance + utilization bar + `(Nep)` runway suffix.                                            |
| Stake / Next Δ | `stakeDelta` | Active SAM stake on top, expected next-epoch change underneath. `0 SOL` (muted) when delta is zero, otherwise tinted +/− SOL.                                               |
| Next Step      | `nextStep`   | One-line tip from `getValidatorTip`. Background tinted by urgency.                                                                                                          |
| (chevron)      | —            | Drill-in cue, recolours on row hover.                                                                                                                                       |

### Cutoff divider

A row spanning all columns separates **bid-eligible** (max APY ≥ winning
APY) from **bid-too-low** validators. Note: bond-blocked but bid-winning
validators stay above the line because they'd win on yield. Label reads
`N bid-eligible · M winning`.

### Row tints

| State                       | Background                                                                  |
| --------------------------- | --------------------------------------------------------------------------- |
| In set                      | `bg-card`, hover `bg-primary-light`                                         |
| Out of set (bid-too-low)    | `bg-destructive/[0.02]`, hover `bg-destructive/[0.05]`                      |
| Ghost (simulation original) | `opacity-40 line-through bg-muted/30 cursor-default`                        |
| Simulated (post-edit)       | `ring-1 ring-current/20`, `borderLeftColor` = posColor (green up, red down) |

### Simulation mode

Tracked in `SamPage`: `simulationModeActive`, `simulationOverrides`,
`simulatedValidators`, `pendingEdits`, `originalAuctionResult`. Edits route
through `mergeOverrides` → `useQuery(['sam', simulationRunId], () => loadSam(overrides))`.
After a re-run, `insertGhostRows` injects ghost entries at original
positions of changed validators.

### Bond chip

Four tiers, `BOND_CHIP` record in `sam-table.tsx`:

| Tier                | Style                                   | Meaning                                            |
| ------------------- | --------------------------------------- | -------------------------------------------------- |
| `healthy`           | `bg-primary-light-10 text-primary`      | bond exceeds ideal coverage                        |
| `soft` ("Adequate") | `bg-secondary text-muted-foreground`    | covers current stake but not ideal target          |
| `watch`             | `bg-warning-light text-warning`         | can't keep current stake; some will be undelegated |
| `critical`          | `bg-destructive-light text-destructive` | below penalty threshold; bond risk fee charged     |

### Validator detail sheet

Right-side `Sheet`, `max-w-4xl`. Opens when a row is clicked. URL synced
via `?v=<voteAccount>`; browser-back closes the sheet.

**Tabs:** Overview · Notifications (when present) · Payments · Bidding ·
Bond · Bid Penalty.

**Overview** — 2-col grid (`lg:grid-cols-2`, `gap-6`):

- **Stake** — Active, Target, Next epoch (each row a `MetricRow` with
  `HelpTip`).
- **Bond** — Balance, Reserve / "Top up X" CTA, Bid runway, "See full bond
  coverage breakdown →" link.
- **Expected Payment This Epoch** — Active stake cost, Activating stake
  cost, optional `↳ bid gap` sub-row, Penalty group (single `Penalty: No
penalties` line OR an itemised list of `↳ bid-too-low / blacklist / bond
risk fee` `PenaltyRow`s, each clickable to its own breakdown tab),
  Total (separated by horizontal line via `SEPARATOR_DIV_CLASS`).
- **APY Composition** (right column) — segmented bar showing inflation /
  MEV / block rewards / stake bid. Bar widths use raw PMPE proportions
  (so they sum to total); the displayed % is each component's compounded
  APY. Threshold marker line + label at the winning-APY position.
- **What-If Simulation** (right column, when toggled on) — four numeric
  inputs (Stake bid PMPE, Inflation, MEV, Block rewards). Auto-recalcs
  with 400ms debounce. Card has yellow border + `bg-status-yellow-light`.

**Tip banner** — sticky strip below the header. Click target opens
the relevant tab (`Bond tab →`, `Simulate →`).

---

## Validator Bonds Page (`/bonds`, `/expert-bonds`)

`src/pages/validator-bonds.tsx` · `src/components/validator-bonds-table/validator-bonds-table.tsx`

Data: `fetchValidatorsWithBonds()` → `ValidatorWithBond[]`. Filtered to
rows where `totalMarinadeStake > 0` or `bond.effective_amount > 0`.

### Coverage hero

Full-width card.

- Big `coveredPct%` numeral — `Math.round(totalProtectedStake / totalMarinadeStake × 100)`.
- 8px stacked bar — protected vs uncovered SOL.
- Stat chips — Bonds funded · Total bonds (SOL) · Total stake (SOL).
- Expert only: **Max protectable** chip — `totalMaxProtectedStake / totalMarinadeStake` (zero-guarded).

### Tile map

`<ValidatorBondsTileMap>` inside the bonds table component. 4 tier rows by
total Marinade stake:

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
`coveragePct%`. Hover tooltip via `tooltipAttributes`. Legend below.

### Bonds table

Generic `<Table>` with `showRowNumber`. **Default sort: Marinade Stake
DESC.**

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

`src/pages/protected-events.tsx` · `src/components/protected-events-table/protected-events-table.tsx`

Data: `fetchProtectedEventsWithValidator()`. Rows where
`reason === 'Bidding'` are excluded from the table but contribute to
`Last Epoch Bids` (Expert metric).

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
- **Epoch range** — `<EpochRangePicker>`. Initial bounds seeded from data
  on first non-empty load; user-narrowed selections survive subsequent
  refetches (bounds are not auto-widened).

### Events table

Generic `<Table>`, `showRowNumber`. **Default sort: Epoch DESC.**

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
`public/docs/GUIDE-EXPERT.md` (Expert).

- Expert mode shows a tab strip ("Guide" / "Expert Guide") to switch
  between the two.
- Hash anchors work: `<a id="...">` markers in the markdown are honoured
  (via `rehype-raw`) and `useEffect` scrolls to `window.location.hash`
  on load and on tab switch.
- Links beginning with `#GUIDE` / `#GUIDE-EXPERT` switch the active doc
  instead of scrolling. All other links open in a new tab.
- Card "Guide →" links from breakdown cards point at section anchors
  (`/docs#bid-penalty`, `/docs#bond`, `/docs#cpmpe`, `/docs#detail-panel`).

---

## Shared visual primitives

Pointer list — for the full design language see CLAUDE.md.

- **`<Card>`** (`src/components/ui/card.tsx`) — `rounded-xl border border-border bg-card shadow-card`.
- **`<TableShell>`** (`src/components/table/table.tsx`) — canonical outer card chrome for any page that drops a generic `<Table>` into a content section. Wraps the table in `bg-card rounded-xl border border-border shadow-card overflow-hidden overflow-x-auto`. Both the bonds and protected-events tables sit inside one. Pair with `TABLE_SHELL_HOVER` on the `<Table>`'s `className` to get the muted `bg-secondary` row-hover (the default `<Table>` hover, `bg-primary-light`, is reserved for SAM, which has its own bespoke wrapper).
- **`<Metric>`** (`src/components/metric/metric.tsx`) — KPI tile with optional `subline` + `extra` slots.
- **`<ValidatorIdentity>`** (`src/components/validator-identity/validator-identity.tsx`) — canonical "name + truncated vote account" cell.
- **`<CalcCard>` / `<CalcRow>` / `<RevRow>` / `<OkRow>` / `<SectionHeader>` / `<Marker>`** (`src/components/breakdowns/shared.tsx`) — calculation breakdown primitives. Total/result rows use `separator` + `SEPARATOR_TR_CLASS` / `SEPARATOR_CELL_PAD`. The same separator visual is exposed for flex layouts via `SEPARATOR_DIV_CLASS`.
- **`<MetricRow>` / `<PenaltyRow>`** (`src/components/validator-detail/validator-detail.tsx`) — overview-card row primitives. `MetricRow` accepts `onSeeBreakdown` to make the whole label clickable with a `→` cue.
- **`<HelpTip>`** (`src/components/help-tip/help-tip.tsx`) — small `?` icon, Radix-based tooltip.
- **`<Banner>`** (`src/components/banner/banner.tsx`) — dismissible announcement, persistence in `localStorage`.

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
