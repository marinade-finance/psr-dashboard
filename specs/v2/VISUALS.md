# Visual Layout Spec — PSR Dashboard Redesign

Derived from Michael's mockups (3 SAM variants + detail views). Dark theme
throughout. Target: migrate from CSS Modules to Tailwind + shadcn/ui.

---

## Tech Migration: shadcn/ui + Tailwind CSS

### Current Stack
- Webpack + TypeScript 4.9 + React 18
- CSS Modules (`.module.css` + auto-generated `.d.ts`)
- Custom `<Table>` component, custom `<Metric>`, `<Loader>`
- react-tooltip for tooltips, no design system

### Target Stack
- Keep Webpack + React 18 (no framework change)
- Add Tailwind CSS v3 (PostCSS plugin for webpack)
- Add shadcn/ui components (copy-paste, not npm package)
- Migrate pages incrementally — new code uses Tailwind, old CSS
  Modules coexist during transition
- Inter font (sans-serif) for basic mode, keep monospace for expert

### shadcn/ui Components to Use

| shadcn Component | Replaces | Used In |
|------------------|----------|---------|
| `Card` | `.metricWrap`, `.card` | Metric cards, validator rows |
| `Table` | Custom `<Table>` component | Expert table, Variant A |
| `Badge` | Bond dot + inline text | Bond health, delta indicators |
| `Tabs` | URL-based basic/expert + new A/B/C tabs | View mode switcher |
| `Collapsible` | Custom expanded card | Variant B accordion |
| `Tooltip` | react-tooltip | All tooltips |
| `Button` | Custom styled buttons | Simulation, navigation |
| `Input` | `.inlineInput` | Simulation edit fields |
| `Progress` | `.bondBar` / `.bondBarFill` | Bond utilization bar |
| `Sheet` | N/A (new) | Mobile validator detail |
| `Separator` | Border hacks | Section dividers |
| `Command` | N/A (new) | Validator search |

### Tailwind Config

Dark theme as default. Key design tokens:

```
colors:
  bg:
    primary: #0f172a     (page background)
    card: rgba(15, 23, 42, 0.6)  (card/row background)
    elevated: #1e293b    (metric cards, header)
  text:
    primary: #e2e8f0     (main text)
    muted: #94a3b8       (secondary text)
    dim: #64748b         (labels, ranks)
  accent:
    blue: #3b82f6        (hover accents, active states)
    green: #4ade80       (healthy, positive delta)
    yellow: #fbbf24      (watch state)
    red: #f87171         (low/negative)
    grey: #6b7280        (none/neutral)
  border:
    subtle: rgba(148, 163, 184, 0.1)
    hover: rgba(59, 130, 246, 0.3)
```

### Migration Strategy

1. Install Tailwind, configure with dark theme tokens
2. Add `cn()` utility (clsx + tailwind-merge)
3. Copy shadcn/ui primitives: Card, Badge, Tabs, Table, Button,
   Tooltip, Input, Progress, Collapsible
4. Build new pages/components with Tailwind + shadcn
5. Old CSS Modules stay — no mass rewrite of existing expert mode

---

## Shared Page Shell (All Pages)

```
┌─ viewport ─────────────────────────────────────────────────────┐
│                                                                │
│  ┌─ Navigation (sticky) ─────────────────────────────────────┐ │
│  │  SAM  │  Protected Events  │  Bonds  │      Docs  Expert │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─ Banner (optional) ──────────────────────────────────────┐  │
│  │  Epoch info / announcements                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─ Page Content ───────────────────────────────────────────┐  │
│  │  (varies by page)                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Navigation Bar

- Sticky top, full width, dark bg (`bg-elevated`)
- shadcn `Tabs` or custom nav links (keep react-router NavLink)
- Active tab: bottom border accent-blue, brighter text
- Right side: Docs link, Expert Guide (expert only), simulation button
- Height: 48px, items centered vertically

---

## Page 1: Stake Auction Marketplace (SAM)

### Page Header

```
┌──────────────────────────────────────────────────────────────────┐
│  ◉ Stake Auction Marketplace                                     │
│  Epoch 924 · 66 winning validators · 5,764,515◎ total stake     │
└──────────────────────────────────────────────────────────────────┘
```

- Title: text-xl font-semibold text-primary
- Subtitle: text-sm text-muted, epoch · winners · total stake
- Padding: px-6 py-4

### View Mode Tabs (Basic Mode Only)

```
  [ A: Clean Table ]  [ B: Expandable Rows ]  [ C: My Position ]
```

- shadcn `Tabs` component with 3 `TabsTrigger`s
- Active: bg-card border border-border-subtle text-primary
- Inactive: text-muted hover:text-primary
- Positioned below header, above metrics
- Expert mode: no tabs, goes straight to expert table

### Metric Cards Row

```
┌───────────────┐ ┌───────────┐ ┌────────────┐ ┌──────────────────┐
│ TOTAL AUCTION │ │ WINNING   │ │ PROJECTED  │ │ WINNING          │
│ STAKE         │ │ APY       │ │ APY        │ │ VALIDATORS       │
│ 5,764,515◎    │ │ 7.29%     │ │ 6.80%      │ │ 66 / 211         │
└───────────────┘ └───────────┘ └────────────┘ └──────────────────┘
```

- 4x shadcn `Card` in a `grid grid-cols-4 gap-3` row
- Card: bg-elevated border-border-subtle rounded-lg p-4
- Label: text-[10px] uppercase tracking-wider text-muted font-medium
- Value: text-2xl font-bold text-primary font-mono
- Basic mode adds one-line subtitle in text-xs text-dim
- Expert mode: 3 rows of cards (4 + 4 + 6), no subtitles
- shadcn `Tooltip` on each card for full-precision value

---

### Variant A — Clean Table (Ship First)

**Mockup text**: "Merges commissions into Max APY tooltip, replaces raw
bond with health indicator, collapses SAM into a single delta column,
adds actionable tips."

#### Table Structure

Use shadcn `Table` component with custom dark styling.

```
┌─────┬──────────────────────┬─────────┬──────────────────┬────────────┬──────────────────────────────────────────┐
│  #  │ VALIDATOR            │ MAX APY │ BOND             │ STAKE Δ    │ NEXT STEP                                │
├─────┼──────────────────────┼─────────┼──────────────────┼────────────┼──────────────────────────────────────────┤
│  1  │ Laine                │ 16.27%  │ ● Healthy  315◎  │ ↑ +22,549  │ On track to gain 22,549◎                 │
│     │ KaSMkr…              │         │                  │            │                                          │
├─────┼──────────────────────┼─────────┼──────────────────┼────────────┼──────────────────────────────────────────┤
│  2  │ Shinobi Systems      │  8.02%  │ ● Healthy  888◎  │ ↑+164,135  │ Raise bid — currently low at 0.08%.      │
│     │ 1oSoLe…              │         │                  │            │ Could gain 184,135◎ with competitive bid  │
├─────┼──────────────────────┼─────────┼──────────────────┼────────────┼──────────────────────────────────────────┤
│  3  │ Overclock            │ 11.90%  │ ● Healthy  353◎  │ ↑ +23,058  │ On track to gain 23,058◎                 │
│     │ 1Val…                │         │                  │            │                                          │
├─────┼──────────────────────┼─────────┼──────────────────┼────────────┼──────────────────────────────────────────┤
│  4  │ Chorus One           │ 15.95%  │ ● Watch    139◎  │ ↑ +23,059  │ Top up bond to unlock higher stake cap   │
│     │ Chorus…              │         │                  │            │ (+23,059◎ potential)                      │
├─────┼──────────────────────┼─────────┼──────────────────┼────────────┼──────────────────────────────────────────┤
│  5  │ Everstake            │ 10.84%  │ ● Watch    118◎  │ ↑ +23,058  │ Top up bond to unlock higher stake cap   │
│     │ Toff…                │         │                  │            │ (+23,058◎ potential)                      │
└─────┴──────────────────────┴─────────┴──────────────────┴────────────┴──────────────────────────────────────────┘
```

#### Column Specifications

**# (Rank)**
- Width: w-10, text-right
- Style: text-sm text-dim font-mono
- Content: integer rank, sorted by target stake desc

**VALIDATOR**
- Width: flex-1 (fills remaining space)
- Line 1: validator name, text-sm font-medium text-primary
- Line 2: truncated pubkey (first 6 + "…"), text-xs text-muted
  - Click to copy (navigator.clipboard), cursor-pointer
  - Hover: underline
  - Copied state: text briefly shows "Copied" in text-green for 1.5s
- Tooltip on name: shows full pubkey

**MAX APY**
- Width: w-20, text-right
- Style: text-sm font-semibold text-primary font-mono
- Content: percentage (e.g., "16.27%")
- Tooltip: APY breakdown (inflation comm, MEV comm, block prod,
  stake bid — all the components that sum to Max APY)

**BOND**
- Width: w-36, text-left
- Content: colored dot + health label + SOL balance
- Layout: `flex items-center gap-1.5`
- Dot: `w-2 h-2 rounded-full` with health color
- Label: text-xs, colored to match dot
- Balance: text-xs text-muted font-mono, after label
- Health states and colors:
  - `● Healthy` — bg-green (#4ade80), >10 epochs
  - `● Watch` — bg-yellow (#fbbf24), 3-10 epochs
  - `● Low` — bg-red (#f87171), ≤2 epochs
  - `● None` — bg-grey (#6b7280), no bond
- Use shadcn `Badge` variant for the label: small pill with
  tinted background (10% opacity of health color)

**STAKE Δ**
- Width: w-24, text-right
- Style: text-sm font-mono
- Content: arrow + signed formatted number
- Colors:
  - Positive: `↑ +22,549` in text-green (#4ade80)
  - Negative: `↓ -5,000` in text-red (#f87171)
  - Zero: `— 0` in text-grey (#6b7280)
- Tooltip: "Active: X◎ → Target: Y◎"

**NEXT STEP**
- Width: flex-1 (shares remaining space with VALIDATOR)
- Style: text-xs text-muted leading-relaxed
- Content: actionable recommendation text
- Can wrap to 2 lines for longer recommendations
- Recommendation priority (first match wins, reuses existing logic):
  1. No bond → "Fund bond to enter auction"
  2. Bond ≤2 epochs → "Top up bond — stake at risk"
  3. Bond 3-10 + constrained → "Top up bond to unlock higher
     stake cap (+N◎ potential)"
  4. Non-productive bid → "Raise bid — currently low at X%.
     Could gain N◎ with competitive bid"
  5. Country/ASO constraint → "Capped by [name] concentration"
  6. Target > active → "On track to gain +N◎"
  7. Target < active → "Losing N◎ — others outbid you"
  8. Stable → "Stable position"

#### Row Interaction
- Entire row is clickable → navigates to Variant C detail or
  separate detail view
- Hover: bg-card/80 transition, subtle left border accent-blue (3px)
- Cursor: pointer
- Active/pressed: brief opacity change

#### Table Header
- Sticky top (below nav), bg-elevated
- Columns clickable for sorting
- Sort indicator: shadcn-style arrow, accent-blue when active
- Default sort: target stake desc

---

### Variant B — Expandable Rows (Ship Later)

**Mockup text**: "Shows only the essentials on the row. Click to expand
for full breakdown, bond details, and personalized recommendation.
Better for mobile & scanning."

Uses shadcn `Collapsible` for each row.

#### Collapsed Row

```
┌──────────────────────────────────────────────────────────────────────────┐
│  1   Laine              16.27%    ● Healthy    ↑ +22,549◎          ▾    │
│                         MAX APY                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

- Single-line card, `flex items-center` layout
- Rank: text-dim, w-8
- Name: font-medium text-primary, flex-1
- APY: text-sm font-mono, with "MAX APY" sub-label in text-[10px] text-dim
- Bond: colored dot + "Healthy" text
- Delta: colored arrow + formatted number
- Chevron: `▾` / `▴` toggle indicator, text-muted, right edge
- Card style: bg-card border border-border-subtle rounded-lg
- Gap between cards: 2px (tight stacking)
- Hover: border-l-3 border-accent-blue, bg slightly lighter
- Left/right carousel arrows visible on mobile (scroll-snap)

#### Expanded Row (Chorus One example from mockup)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  4   Chorus One         15.95%    ● Watch      ↑ +23,059◎          ▴    │
│                         MAX APY                                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                         │
│  APY BREAKDOWN           BOND HEALTH            STAKE MOVEMENT          │
│  Inflation comm.   0%    250◎  ┌──────────┐     Current    337,282◎     │
│  MEV comm.         0%          │ 72% used │     Target     360,341◎     │
│  Block prod.     100%          └──────────┘                             │
│  Stake bid     0.461%    ████████████░░░░░░     Delta    ↑ +23,059◎     │
│                          Bond getting low —                              │
│                          consider topping up                             │
│                                                                         │
│                    ┌──────────────────────────────────────────┐          │
│                    │  RECOMMENDATION                          │          │
│                    │  Top up bond to unlock higher stake cap  │          │
│                    │  (+23,059◎ potential)                    │          │
│                    └──────────────────────────────────────────┘          │
│                                                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Expanded Detail: Three Columns

**APY Breakdown** (left column)
- Section label: text-[10px] uppercase tracking-wider text-dim
- Rows: `flex justify-between`, label text-xs text-muted, value font-mono
- Items: Inflation comm., MEV comm., Block prod., Stake bid
- No separator line or total (Max APY already shown in collapsed header)

**Bond Health** (center column)
- SOL balance: text-lg font-bold text-primary font-mono ("250◎")
- Utilization badge: shadcn `Badge` variant outline, "72% utilized"
- Progress bar: shadcn `Progress` component
  - Green fill (>10 epochs), yellow (3-10), red (≤2)
  - Height: h-2, rounded-full
- Advisory text: text-xs text-muted, wraps
  - "Bond getting low — consider topping up"
  - Or "Healthy — N epochs coverage"

**Stake Movement** (right column)
- Section label: same style as APY
- Three rows:
  - "Current" + active stake in text-muted font-mono
  - "Target" + target stake in text-primary font-mono
  - "Delta" + colored delta (green/red) font-mono font-semibold

**Recommendation Box**
- Spans full width below the 3 columns
- shadcn `Card` with: bg-accent-blue/8, border-l-2 border-accent-blue
- Label: "RECOMMENDATION" in text-[10px] uppercase text-dim
- Text: text-sm text-primary

#### Animation
- Expand: shadcn Collapsible with smooth height transition (200ms)
- Only one row expanded at a time (accordion behavior)

---

### Variant C — "My Position" Focus View (Ship Later)

**Mockup text**: "Optimized for a single validator checking their own
position. Shows your status prominently with nearby competitors, clear
next actions, and what-if simulation hints. Best as a logged-in/
personalized view."

#### Validator Selector

```
  [ Laine ] [ Shinobi Systems ] [ Overclock ] [ Chorus One ] [ Everstake ] ...
```

- Horizontal scrollable row of shadcn `Badge` or chip buttons
- One active (filled), rest outlined
- Click to select "your" validator
- Alternative: shadcn `Command` (combobox search) for 211+ validators
- Positioned below metric cards, above the focus panel

#### Focus Panel: Left Side (Your Status)

```
┌──────────────────────────────────────────────────────────────┐
│  ← (back arrow)                              ┌────────┐     │
│                                               │  #1    │     │
│  Ec8uCF…h…                                   │ of 211 │     │
│                                               └────────┘     │
│                                                              │
│  ┌────────────┐  ┌─────────────────┐  ┌────────────────┐   │
│  │  MAX APY   │  │  BOND           │  │  STAKE Δ       │   │
│  │  16.27%    │  │  315◎           │  │  ↑ +22,549     │   │
│  │            │  │  Healthy·42%used│  │  next epoch    │   │
│  └────────────┘  └─────────────────┘  └────────────────┘   │
│                                                              │
│  ┌─ ✓ STATUS ──────────────────────────────────────────┐    │
│  │  On track to gain 22,549◎                            │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🧪 Enter Simulation — What if I change my bid?      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Header area**
- Back arrow: circular button, bg-card border, `←` icon
  (shadcn `Button` variant ghost, size icon)
- Truncated pubkey: text-sm text-muted, click to copy
- Rank badge: large, top-right, bg-elevated rounded-xl
  - "#1" in text-2xl font-bold text-primary
  - "of 211" in text-xs text-dim below

**Three Summary Cards**
- `grid grid-cols-3 gap-4`
- Each: shadcn `Card` with bg-card border-border-subtle
- Label: text-[10px] uppercase text-dim
- Value: text-2xl font-bold font-mono
  - MAX APY: text-primary
  - BOND: text-green (if healthy), with sub-text "Healthy · 42% used"
  - STAKE Δ: text-green (if positive), with sub-text "next epoch"

**Status Box**
- Full width, bg-card rounded-lg p-4
- Checkmark icon + "STATUS" label in text-[10px] uppercase text-dim
- Status text: text-sm text-primary

**Simulation CTA**
- Full width shadcn `Button` variant outline, large
- Text: "🧪 Enter Simulation — What if I change my bid?"
- Hover: bg-accent-blue/10, border-accent-blue
- Navigates back to list view with simulation mode active

#### Focus Panel: Right Side (Context)

```
┌──────────────────────────────────────────────────────────────┐
│  NEARBY VALIDATORS                                           │
│                                                              │
│  #1  Laine  YOU        16.27%   ●315◎    ↑+22,549           │
│                                                              │
│  #2  Shinobi Systems    8.02%   ●400◎    ↑+164,135          │
│                                                              │
│  #3  Overclock         11.90%   ●353◎    ↑+23,058           │
│                                                              │
│                                                              │
│  YOUR APY COMPOSITION                                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │████████████████████████████│██████████████████████│  │    │
│  │   Block Prod              │      Stake Bid       │  │    │
│  └─────────────────────────────────────────────────────┘    │
│  ■ Block Prod  ■ Stake Bid  ■ Inflation  ■ MEV              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Nearby Validators**
- Section label: text-[10px] uppercase tracking-wider text-dim
- Mini-table: 3-5 rows around the selected validator's rank
- "YOU" row: highlighted with bg-accent-blue/10 border-l-2
  border-accent-blue, shadcn `Badge` "YOU" in accent-blue
- Other rows: standard text-muted styling
- Each row: rank, name, APY, bond dot + balance, delta

**APY Composition Chart**
- Horizontal stacked bar chart
- Segments colored by component:
  - Block Prod: accent-blue (#3b82f6)
  - Stake Bid: purple (#a855f7)
  - Inflation: accent-green (#4ade80)
  - MEV: amber (#f59e0b)
- Legend below: colored squares + labels
- Pure CSS/div implementation (no charting library)
- Bar height: h-8, rounded-lg, overflow-hidden
- Each segment: inline-block with percentage width

#### Layout
- Two-column: `grid grid-cols-2 gap-6` on desktop
- Left: your status (60% width)
- Right: nearby validators + APY chart (40% width)
- Mobile: stacks vertically

---

### Expert Mode Table (Unchanged)

Keep current `<Table>` component and expert columns. Changes:

- **Column updates**: SAM Active + SAM Target → Stake Δ column,
  add Constraint column
- **Simulation mode**: unchanged (inline editing, ghost rows, grading)
- **Styling**: stays CSS Modules/monospace for now. Future migration
  to shadcn Table can happen separately
- **Metrics**: 3 rows of cards, no subtitles, same as current

---

## Page 2: Protected Events

### Layout

```
┌─ Navigation ─────────────────────────────────────────────────┐
│                                                               │
├─ Metrics ────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Total    │ │ Total    │ │ Last     │ │ Last Ep. │       │
│  │ Events   │ │ Amount   │ │ Settled  │ │ Bids*    │       │
│  │ 1,234    │ │ 45,678◎  │ │ 12,345◎  │ │ 892◎     │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                  *expert only │
│                                                               │
├─ Filters ────────────────────────────────────────────────────┤
│  ┌─ Search ──────────────┐  ┌─ Epoch ──┐  ┌─ Epoch ──┐     │
│  │ 🔍 Search validator…  │  │ Min: 900 │  │ Max: 924 │     │
│  └───────────────────────┘  └──────────┘  └──────────┘     │
│                                                               │
│  When filtered: + "Filtered Events: N" + "Filtered: X◎"     │
│                                                               │
├─ Table ──────────────────────────────────────────────────────┤
│  Epoch │ Validator  │ Name      │ Settlement │ Reason │ Funder│
│  ──────┼────────────┼───────────┼────────────┼────────┼───────│
│  924   │ AbC1…xyz9  │ Laine     │ 12.5◎ Est. │ Slash  │ Mrnde │
│  924   │ DeF2…abc3  │ Overclock │  5.2◎      │ Comm.  │ Valid │
│  923   │ …          │ …         │ …          │ …      │ …     │
└──────────────────────────────────────────────────────────────┘
```

### Redesign Changes
- **Filters**: shadcn `Input` for search, shadcn `Input type=number`
  for epoch range. Horizontal flex row.
- **Table**: shadcn `Table` with sticky header
- **Settlement badges**: shadcn `Badge`
  - "Estimate" — variant with bg-green/10 text-green
  - "Dryrun" — variant with bg-grey/10 text-dim
- **Funder column**: shadcn `Tooltip` on "Marinade" / "Validator"
  explaining the distinction
- **Validator cell**: name + truncated pubkey (same pattern as SAM),
  click to copy
- **Filtered metrics**: conditionally shown shadcn `Card` row when
  any filter active

---

## Page 3: Validator Bonds

### Layout

```
┌─ Navigation ─────────────────────────────────────────────────┐
│                                                               │
├─ Metrics ────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Bonds    │ │ Bonds    │ │ Marinade │ │ Protected│       │
│  │ Funded   │ │ Balance  │ │ Stake    │ │ Stake    │       │
│  │ 189      │ │ 45,000◎  │ │ 5.7M◎   │ │ 4.2M◎   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                          Expert adds: Max Protectable Stake   │
│                                                               │
├─ Table ──────────────────────────────────────────────────────┤
│  Validator │ Name  │ Bond Bal. │ Max Stake │ Comm. │ M.Stake │
│  ──────────┼───────┼──────────┼───────────┼───────┼─────────│
│  AbC1…     │ Laine │ 315◎     │ 500,000◎  │ 0%    │ 67,549◎ │
│  DeF2…     │ Over..│ 353◎     │ 400,000◎  │ 0%    │ 45,000◎ │
│  …         │ …     │ …        │ …         │ …     │ …       │
└──────────────────────────────────────────────────────────────┘
```

### Redesign Changes
- **Table**: shadcn `Table`, same dark theme
- **Bond balance cell**: add health dot inline (same as SAM BOND column)
- **Validator cell**: name + truncated pubkey (consistent pattern)
- **No filters**: keep as-is (static display)
- Expert adds: Max protected stake, Protected stake % columns

---

## Validator Detail Page (from SAM row click)

Renders inside SAM page via `viewMode: 'detail'` state.
Shared structure across all SAM variants.

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back                                                         │
│                                                                  │
│  🇩🇪 Laine                                        #1 of 211      │
│  Abc1…xyz9  (click to copy)                                      │
│                                                                  │
│  ┌────────────┐  ┌─────────────────┐  ┌────────────────┐       │
│  │  MAX APY   │  │  BOND           │  │  STAKE Δ       │       │
│  │  16.27%    │  │  315◎           │  │  ↑ +22,549     │       │
│  │            │  │  Healthy         │  │  next epoch    │       │
│  │            │  │  42% used        │  │                │       │
│  └────────────┘  └─────────────────┘  └────────────────┘       │
│                                                                  │
│  APY BREAKDOWN           BOND HEALTH          STAKE MOVEMENT     │
│  ──────────────          ────────────         ──────────────     │
│  Inflation comm.   0%    250◎  72% used       Current 337,282◎  │
│  MEV comm.         0%    ████████░░░░░░       Target  360,341◎  │
│  Block prod.     100%    Bond low — top up                       │
│  Stake bid     0.461%                         Delta ↑+23,059◎   │
│                                                                  │
│  ┌─ RECOMMENDATION ──────────────────────────────────────────┐  │
│  │  Top up bond to unlock higher stake cap (+23,059◎)        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ SIMULATION ──────────────────────────────────────────────┐  │
│  │  What if I change my bid? → Enter Simulation               │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Component Mapping

- **Back button**: shadcn `Button` variant ghost, size sm
- **Name + flag**: text-2xl font-bold + country emoji
- **Rank badge**: shadcn `Badge` variant outline, "# 1 of 211"
- **Pubkey**: text-sm text-muted, click-to-copy
- **Summary cards**: 3x shadcn `Card` in grid-cols-3
- **Detail columns**: `grid grid-cols-3 gap-8`, monospace values
- **Bond progress**: shadcn `Progress`, colored by health
- **Recommendation box**: shadcn `Card` with accent-blue left border
- **Simulation CTA**: shadcn `Card` with hover effect → enters
  simulation mode

---

## Shared Patterns

### Click-to-Copy Pubkey
- Used everywhere a pubkey appears (all 3 pages + detail)
- Click text → `navigator.clipboard.writeText(fullPubkey)`
- Cursor: pointer, hover: underline
- Copied state: text replaced with "Copied" in text-green for 1.5s
- No external toast library — local React state + setTimeout

### Bond Health Badge
- Consistent across all pages: dot + label + optional balance
- shadcn `Badge` with variant per health state
- Green/Yellow/Red/Grey color system

### Number Formatting
- SOL amounts: comma-separated, ◎ suffix
- Percentages: 2 decimal places
- Large numbers: full in tables, abbreviated (22.5k) in compact views
- Monospace font for all numeric values (font-mono)

### Loading & Error States
- Loading: shadcn skeleton or current `<Loader>` spinner
- Error: simple text message (keep current)
- Empty: "No data" centered text

### Responsive Breakpoints
- Desktop: full table/grid layouts (>1024px)
- Tablet: reduce metric card grid to 2×2 (768-1024px)
- Mobile: stack everything vertically, cards full-width (<768px)
  - Variant B is the best mobile experience (compact rows)

---

## Implementation Phases

### Ship Now (Phases 1–2)

**Phase 1: Foundation**
- Install Tailwind CSS v3 + PostCSS in webpack
- Add shadcn/ui primitives (Card, Badge, Table, Tabs, Button, etc.)
- Set up dark theme tokens in tailwind.config.js (v3 syntax)
- Add Inter font
- Wire up `cn()` utility

**Phase 2: Variant A (Basic SAM Table)**
- Build simplified table with 6 columns
- Implement NEXT STEP recommendation logic
- Bond health dots + SOL balance
- Validator name + truncated pubkey
- View mode tabs (A only active, B/C disabled)
- Click row → detail page (existing SamDetail)

### Ship Later (Phases 3–6)

**Phase 3: Detail Page Polish**
- Migrate SamDetail to shadcn Card/Badge/Progress
- Add APY composition bar chart
- Polish recommendation box

**Phase 4: Protected Events + Bonds**
- Migrate tables to shadcn Table
- Add search/filter with shadcn Input
- Settlement badges with shadcn Badge
- Consistent validator cell pattern

**Phase 5: Variant B (Expandable Rows)**
- shadcn Collapsible accordion
- 3-column expanded detail
- Recommendation box in expanded view

**Phase 6: Variant C (My Position)**
- Validator selector (chips or combobox)
- Focus panel with summary cards
- Nearby validators mini-table
- APY composition stacked bar
