# Screens

Three tabs, dark theme, shared sticky nav with tab links and docs buttons.

---

## Stake Auction Marketplace

Default view. Shows auction results and validator rankings.

### Metrics

Total Auction Stake, Winning APY, Projected APY, Winning Validators.
Expert adds: Stake to Move, Active Stake, Productive Stake, Avg Stake,
T. Protected, T. Unprotected, Conc. Risk, Conc. TVL, +/-10% TVL, Ideal APY.

### Basic Mode — List View

Card-based list with two density modes. Default sort: target stake desc.
Click any row → validator detail page.

#### Density Toggle

`Compact | Expanded` toggle above the list. Default: Compact.

#### Compact Row

Single-line card. Five elements:

```
┌──────────────────────────────────────────────────────────────┐
│  1   Laine            16.27%    ● Healthy     ↑ +22,549☉    │
└──────────────────────────────────────────────────────────────┘
```

- **#** — rank, muted
- **Name** — validator name, fallback truncated pubkey `Abc1…xyz9`
- **Max APY** — bold percentage
- **Bond health** — colored dot + label
- **Stake Δ** — signed SOL delta (target − active), colored arrow

#### Expanded Row

Multi-line card with 3-column detail breakdown:

```
┌──────────────────────────────────────────────────────────────┐
│  1   Laine                                     ↑ +22,549☉   │
│                                                              │
│  APY BREAKDOWN          BOND HEALTH         STAKE MOVEMENT   │
│  Inflation comm.  0%    315☉  42% used      Current  45,000☉ │
│  MEV comm.        0%    ● Healthy           Target   67,549☉ │
│  Block prod.    100%    ████████████░░░░                      │
│  Stake bid    0.461%                        Delta  ↑+22,549☉ │
│  ──────────────                                              │
│  Max APY     16.27%                                          │
│                                                              │
│  Tip: On track to gain +22,549☉                              │
└──────────────────────────────────────────────────────────────┘
```

**APY Breakdown** (left): commission percentages + stake bid,
separator, Max APY total.

**Bond Health** (center): balance in SOL, utilization badge
(`42% used`), health dot + label, progress bar colored by health.

**Stake Movement** (right): current (active), target, delta
with colored arrow.

**Tip line**: recommendation text at bottom, muted.

#### Bond Health States

- `● Healthy` #4ade80 — >10 epochs coverage
- `● Watch` #fbbf24 — 3-10 epochs
- `● Low` #f87171 — ≤2 epochs
- `● None` #6b7280 — no bond

#### Stake Δ Colors

- `↑ +N☉` #4ade80 — gaining stake
- `↓ -N☉` #f87171 — losing stake
- `— 0☉` #6b7280 — stable

#### Row Style

- Background: rgba(15, 23, 42, 0.6)
- Border: 1px solid rgba(148, 163, 184, 0.1), radius 8px
- Gap: 4px between rows
- Padding: compact 12px 24px, expanded 20px 24px
- Hover: border brightens to rgba(148, 163, 184, 0.2), pointer

### Validator Detail Page

Navigate by clicking any row. Route: `/validator/{voteAccount}`.
Back button top-left returns to list, preserving scroll and sort.

#### Layout

```
← Back

Laine                                             #1 of 211
Abc1...xyz9

┌──────────┐  ┌──────────┐  ┌──────────┐
│ MAX APY  │  │ BOND     │  │ STAKE Δ  │
│ 16.27%   │  │ 315☉     │  │ ↑+22,549 │
│          │  │ Healthy   │  │ next ep  │
│          │  │ 42% used  │  │          │
└──────────┘  └──────────┘  └──────────┘

APY BREAKDOWN            BOND HEALTH           STAKE MOVEMENT
──────────────           ───────────           ──────────────
Inflation comm.    0%    250☉  72% used        Current 337,282☉
MEV comm.          0%    ████████░░░░░░        Target  360,341☉
Block prod.      100%    Bond low — top up
Stake bid      0.461%                          Delta  ↑+23,059☉

┌─ RECOMMENDATION ─────────────────────────────────────────┐
│ Top up bond to unlock higher stake cap (+23,059☉)        │
└──────────────────────────────────────────────────────────┘

┌─ SIMULATION ─────────────────────────────────────────────┐
│ What if I change my bid? → Enter Simulation              │
└──────────────────────────────────────────────────────────┘
```

**Header**: name (large), pubkey (muted, copyable), rank badge.

**Summary cards** (3 across): Max APY, Bond (health + utilization),
Stake Δ (signed delta + "next epoch").

**Detail columns** (3 across): APY breakdown, Bond health with
progress bar and advice, Stake movement with current/target/delta.

**Recommendation box**: faint blue bg rgba(59, 130, 246, 0.08),
left border 2px solid #3b82f6, actionable tip text.

**Simulation box**: CTA to enter simulation mode.

#### Recommendation Logic

Priority order (first match wins):
1. No bond → "Fund bond to enter auction"
2. Bond ≤2 epochs → "Top up bond — stake at risk"
3. Bond 3-10 epochs → "Bond covers N epochs — consider topping up"
4. Bond constraint → "Bond limits max stake — top up to unlock"
5. Country/ASO constraint → "Capped by [name] concentration"
6. Validator/Want constraint → "At [constraint] cap"
7. Non-productive bid → "Raise bid — below obligation threshold"
8. Target = 0 → "Raise bid to win stake"
9. Delta > 0 → "On track to gain +Δ☉"
10. Delta < 0 → "Losing Δ☉ — others outbid you"
11. Stable → "Stable position"

Reuses existing: `bondHealthColor()`, `bondTooltip()`,
`selectConstraintText()`, `selectIsNonProductive()`.

### Expert Mode — Table View

Traditional sortable table, mostly unchanged from current.

**Column changes**:
- SAM Active + SAM Target → **Stake Δ** (delta display, tooltip
  shows active/target, sorts by target stake)
- New **Constraint** column showing `lastCapConstraint` or "—"

Expert columns:
```
# | Validator | Infl | MEV | Block | St. Bid | Bond | Max APY | Stake Δ | Eff. Bid | Constraint
```

Bond cell coloring unchanged (GREEN/YELLOW/RED/GREY).
Row tinting unchanged (yellow for non-productive).

#### Simulation Mode (Expert)

Same as current: inline editing, ghost rows, position grading.

---

## Protected Events

History of protected staking events per epoch.

### Metrics

Total events, Total amount, Last Settled Amount.
Expert adds: Last Epoch Bids.
When filtered: Filtered Events, Filtered Amount.

### Filters

Validator text search (vote account or name) + epoch range (min/max).

### Table

Columns: Epoch, Validator, Name, Settlement, Reason, Funder.
Default sort: Epoch desc, Settlement desc, Reason desc.

Badges in Settlement column:
- **Estimate** (green) — pending settlement, may change
- **Dryrun** (dark) — test event, not claimable

Funder shows "Marinade" or "Validator" with explanatory tooltip.

---

## Validator Bonds

All validator bonds and protection coverage.

### Metrics

Bonds Funded, Bonds Balance, Marinade Stake, Protected Stake.
Expert adds: Max Protectable Stake.

### Table

Columns: Validator, Name, Bond balance, Max Stake Wanted, Bond Comm.,
Marinade stake, Eff. Cost.
Expert adds: Max protected stake, Protected stake %.
Default sort: Bond Commission asc, Bond balance desc.

---

## Expert vs Basic

Expert mode adds extra metrics, 2 bond table columns, and an
"Expert Guide" docs link. Otherwise identical.
