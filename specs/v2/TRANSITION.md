# Tailwind + shadcn/ui Full UI Transition Spec

Complete migration from CSS Modules + CSS variables to Tailwind utilities +
shadcn/ui components. Covers every visual surface in the app.

## Current State (Phase 1 Complete)

Infrastructure installed, zero components migrated:

- tailwindcss@3.4, postcss, autoprefixer, postcss-loader wired in webpack
- Webpack CSS rules split: `.module.css` → CSS Modules only, `.css` → postcss
- `tailwind.config.js` with 6 color tokens + Inter font
- `cn()` utility in `src/lib/utils.ts` (unused)
- Inter font loaded in `public/index.html`
- `@tailwind base` + `@tailwind utilities` in `src/index.css`
- No `@tailwind components` (not needed without shadcn base layer)
- No shadcn components installed yet
- No Tailwind classes used anywhere in source

## Design Tokens

### Current CSS Variables (legacy, to be replaced)

```css
--bg-dark-1: #1c1b23    /* darkest bg */
--bg-dark-2: #2b2a34    /* page bg */
--bg-dark-3: #353439    /* hover bg */
--bg-dark-4: #42414e    /* active bg */
--text-light-1: #b8b8bc /* body text */
--text-light-2: #fbfbfe /* bright text */
```

### Target Tailwind Tokens (from VISUALS.md, extend in tailwind.config.js)

```
bg-primary:    #0f172a     (slate-900, page bg)
bg-card:       rgba(15,23,42,0.6)  (translucent card bg)
bg-elevated:   #1e293b     (slate-800, header/metric cards)
text-primary:  #e2e8f0     (slate-200, main text)
text-muted:    #94a3b8     (slate-400, secondary text)
text-dim:      #64748b     (slate-500, labels)
accent-blue:   #3b82f6     (blue-500, interactive accent)
accent-green:  #4ade80     (green-400, healthy/positive)
accent-yellow: #fbbf24     (amber-400, watch state)
accent-red:    #f87171     (red-400, low/negative)
accent-grey:   #6b7280     (gray-500, neutral)
border-subtle: rgba(148,163,184,0.1)
border-hover:  rgba(59,130,246,0.3)
```

### Token Migration

Update `tailwind.config.js` to add missing tokens (text-dim, accent-*,
border-subtle, border-hover, bg-card). After all components are migrated,
remove legacy CSS variables from `src/index.css`.

## shadcn/ui Components to Install

Install via `npx shadcn-ui@latest add <name>` into `src/components/ui/`.
These are copy-pasted source files, not npm dependencies.

| Component     | Priority | Used By |
|---------------|----------|---------|
| `button`      | Phase 2  | Back btn, simulation toggle, CTA |
| `card`        | Phase 2  | Metric cards, summary cards, recommendation box |
| `badge`       | Phase 2  | Bond health, rank, "YOU" indicator |
| `table`       | Phase 2  | Basic mode Variant A, bonds, events |
| `tooltip`     | Phase 2  | Metric tooltips, APY breakdown |
| `progress`    | Phase 2  | Bond utilization bar |
| `input`       | Phase 3  | Simulation inline edits, search filters |
| `separator`   | Phase 3  | Section dividers |
| `tabs`        | Phase 5  | View mode A/B/C switcher |
| `collapsible` | Phase 5  | Variant B expandable rows |
| `sheet`       | Phase 5  | Mobile detail view |
| `command`     | Phase 6  | Validator search combobox |

### shadcn Setup

Before first component install:
1. Create `src/components/ui/` directory
2. Add shadcn `components.json` config pointing to `src/components/ui/`
3. Ensure path aliases work with webpack (`src/` → `@/` or keep `src/`)
4. After install, customize each component's colors to use our tokens

## Component-by-Component Migration

### 1. Global: index.css + html body

**Current**: CSS variables, monospace font, `--bg-dark-2` body bg
**Target**: Tailwind base layer sets bg-primary, Inter font-sans as default,
remove `* { margin: 0; padding: 0 }` (Tailwind preflight handles this)

```css
/* src/index.css after migration */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-bg-primary text-text-primary font-sans antialiased;
  }
}
```

Remove: all `:root` CSS variables, `* { margin/padding/box-sizing }`,
`html,body` rules. Tailwind preflight + base layer replaces them.

### 2. Navigation

**Current**: `navigation.module.css` — flex bar, `--bg-dark-*` colors,
hardcoded `40px` height, NavLink with `.active` class composition

**Target**: Tailwind classes on Navigation component

```
Bar:   flex items-center h-12 bg-bg-elevated px-1 sticky top-0 z-50
Tab:   px-5 py-2 text-sm text-text-muted rounded transition-colors
       hover:bg-white/5 hover:text-text-primary
Active: bg-white/10 text-text-primary
Docs:  ml-auto text-sm text-text-muted hover:text-text-primary
```

Replace: `navigation.module.css` entirely. Keep NavLink, replace className
logic with `cn()` conditionals.

### 3. Banner

**Current**: `banner.module.css` — `--bg-dark-3` bg, `3px border`, fixed
`100ex` width, custom link colors

**Target**: shadcn Card or plain Tailwind div

```
Wrapper: mx-4 mt-4
Inner:   bg-bg-elevated border border-border-subtle rounded-lg p-5
         max-w-[100ch] text-base leading-relaxed
Title:   font-semibold mb-4 text-text-primary
Links:   text-accent-blue hover:underline
```

Replace: `banner.module.css` entirely.

### 4. Metric + ComplexMetric Cards

**Current**: `metric.module.css` — `--bg-dark-1` bg, `24px` value,
hardcoded padding. ComplexMetric similar.

**Target**: shadcn Card component

```
Card:     bg-bg-elevated border border-border-subtle rounded-lg p-4
          cursor-help
Label:    text-[10px] uppercase tracking-wider text-text-muted font-medium
Value:    text-2xl font-bold text-text-primary font-mono mt-2
Subtitle: text-xs text-text-dim mt-1
```

Replace both `metric.module.css` and `complex-metric.module.css`. Merge
Metric and ComplexMetric into one component using shadcn Card — the only
difference is ComplexMetric renders JSX in the value slot.

### 5. Loader

**Current**: `loader.module.css` — monospace `###...` shifting animation

**Target**: Keep the character animation (it's charming and fits the
monospace/terminal aesthetic for expert mode). For basic mode pages, add a
subtle skeleton or pulse animation:

```
Basic:  animate-pulse bg-bg-elevated/50 rounded h-4 w-32
Expert: keep current loader as-is
```

### 6. Generic Table (table.tsx)

**Current**: `table.module.css` — `--bg-dark-*` colors, sticky thead,
Color enum for RED/GREEN/YELLOW/GREY cell backgrounds

**Target**: Keep for expert mode (CSS Modules stay). For basic mode, new
components use shadcn Table. No changes to table.module.css in this
migration — expert table stays as-is per SPEC.md.

### 7. SAM Table (sam-table.tsx basic mode)

**Current**: `sam-table.module.css` — `.basicTable` class with Inter font,
border-spacing, translucent row backgrounds, hover accent border

**Target**: shadcn Table + Tailwind classes

```
Table:      w-full border-separate border-spacing-y-1 font-sans
THead:      sticky top-[48px] z-10 bg-bg-elevated
TH:         text-[11px] uppercase tracking-wider text-text-muted
            font-medium px-4 py-2
TR:         group transition-colors cursor-pointer
TD:         px-4 py-3 bg-bg-card border-y border-border-subtle
            first:border-l first:border-l-transparent first:rounded-l-lg
            last:border-r last:rounded-r-lg
TR hover:   group-hover:bg-accent-blue/[0.04]
            first:group-hover:border-l-accent-blue

Validator:  flex flex-col gap-0.5
  Name:     text-sm font-medium text-text-primary
  Pubkey:   text-[11px] text-text-dim cursor-pointer hover:underline

Bond:       flex items-center gap-1.5
  Dot:      w-2 h-2 rounded-full (color per health)
  Label:    text-xs (color per health)
  Balance:  text-xs text-text-muted font-mono

Delta:      text-sm font-mono
  Positive: text-accent-green
  Negative: text-accent-red
  Zero:     text-accent-grey

Next Step:  text-xs text-text-muted leading-relaxed max-w-xs
```

Expert mode `.tableWrap`, simulation classes, ghost rows, position grading —
all stay in `sam-table.module.css` unchanged.

### 8. SAM Detail (sam-detail.tsx)

**Current**: `sam-detail.module.css` — already uses Tailwind-like colors
(hardcoded hex values matching our tokens), cards, progress bar

**Target**: Replace CSS Module with Tailwind classes + shadcn components

```
Back btn:     shadcn Button variant="ghost" size="sm"
Header:       flex items-center gap-4 mb-6 flex-wrap
  Name:       text-2xl font-bold text-text-primary truncate
  Non-prod:   shadcn Badge variant="destructive" (red tint)
  Rank:       shadcn Badge variant="outline" (blue tint)
Pubkey:       text-sm font-mono text-text-dim cursor-pointer hover:underline
  Copied:     text-xs text-accent-green

Summary:      grid grid-cols-3 gap-3 mb-6 (responsive: grid-cols-1 on mobile)
  Card:       shadcn Card — bg-bg-card border-border-subtle rounded-lg p-4
  Label:      text-[10px] uppercase tracking-wider text-text-dim font-semibold
  Value:      text-2xl font-bold text-text-primary font-mono
  Sub:        text-xs text-text-dim
  Bond card:  border-l-2 colored by health state

Detail grid:  grid grid-cols-3 gap-4 mb-6 (responsive: grid-cols-1)
  Column:     bg-bg-card/40 border border-border-subtle rounded-lg p-4
  Title:      text-[10px] uppercase tracking-wider text-text-dim font-bold
              pb-2 border-b border-border-subtle
  Row:        flex justify-between items-baseline gap-2
  Row label:  text-xs text-text-dim
  Row value:  text-sm font-medium text-slate-300 text-right font-mono

Progress:     shadcn Progress — colored fill by bond health
  Track:      h-1.5 bg-white/[0.08] rounded-full
  Fill:       rounded-full (green/yellow/red per health)

Rec box:      shadcn Card — border-l-4 colored by severity
  success:    border-l-accent-green bg-accent-green/[0.06]
  warning:    border-l-accent-yellow bg-accent-yellow/[0.06]
  danger:     border-l-accent-red bg-accent-red/[0.06]
  info:       border-l-accent-blue bg-accent-blue/[0.06]
  Label:      text-[10px] uppercase tracking-wider (color matches severity)
  Text:       text-sm text-text-primary leading-relaxed

Sim CTA:     shadcn Card + Button — hidden when !isExpert
  Box:       bg-bg-primary/60 border border-accent-blue/20 rounded-lg
             p-4 flex items-center justify-between
  Text:      text-sm text-text-muted
  Button:    shadcn Button variant="default" (accent-blue bg)
```

Replace: `sam-detail.module.css` entirely. Remove all inline `style={{}}` props.

### 9. SAM Page Shell (sam.tsx)

**Current**: `sam.module.css` — `.page` bg, `.simulatorToggle` button

**Target**: Tailwind on page wrapper + shadcn Button for toggle

```
Page:     min-h-screen bg-bg-primary
Content:  relative

Sim btn:  shadcn Button — variant depends on state:
  Off:    bg-accent-blue text-white hover:bg-blue-600
  On:     bg-sky-500 text-white hover:bg-sky-600
  Calc:   bg-gray-500 cursor-not-allowed (disabled)
```

Replace: `sam.module.css` entirely.

### 10. Protected Events Table

**Current**: `protected-events-table.module.css` + `protected-events.module.css`
(minimal — just page bg)

**Target**: shadcn Table + Tailwind, same dark theme

```
Search:     shadcn Input with search icon
Epoch:      shadcn Input type="number" for min/max
Table:      shadcn Table with our dark tokens
Settlement: shadcn Badge (green for settled, grey for dryrun)
Validator:  name + truncated pubkey (shared pattern)
```

### 11. Validator Bonds Table

**Current**: `validator-bonds-table.module.css` + `validator-bonds.module.css`
(minimal)

**Target**: shadcn Table + Tailwind, add bond health dot

```
Table:      shadcn Table with our dark tokens
Bond cell:  dot + health label + balance (same as SAM basic table)
Validator:  name + truncated pubkey (shared pattern)
```

### 12. scheme.module.css

**Current**: Empty file
**Target**: Delete

## Shared UI Patterns (Extract to Reusable Components)

### ValidatorCell

Used in: SAM table, bonds table, events table, detail header.
Extract to `src/components/ui/validator-cell.tsx`:

```tsx
function ValidatorCell({ name, pubkey, countryIso, onCopy }) {
  // name + flag + truncated pubkey with click-to-copy
}
```

### BondBadge

Used in: SAM table, bonds table, detail summary card.
Extract to `src/components/ui/bond-badge.tsx`:

```tsx
function BondBadge({ color, balance, compact }) {
  // dot + label + optional balance
}
```

### DeltaValue

Used in: SAM table, detail summary, detail grid.
Extract to `src/components/ui/delta-value.tsx`:

```tsx
function DeltaValue({ delta, suffix }) {
  // colored arrow + formatted number
}
```

## Typography Strategy

- **Basic mode**: Inter (font-sans) everywhere. Clean, modern, readable.
- **Expert mode**: Keep monospace for table data. Headers/nav use Inter.
- Font sizes: Tailwind defaults (text-xs through text-2xl).
  No custom sizes except text-[10px] for uppercase labels.

## Migration Order

### Phase 2A: shadcn Setup + Global Styles

1. Update `tailwind.config.js` with full token set
2. Install shadcn/ui: Button, Card, Badge, Table, Tooltip, Progress
3. Customize shadcn component colors to match dark tokens
4. Replace `src/index.css` global styles with Tailwind base layer
5. Add `@tailwind components` directive

### Phase 2B: Navigation + Page Shell

1. Migrate Navigation to Tailwind (delete navigation.module.css)
2. Migrate sam.tsx page shell (delete sam.module.css)
3. Migrate validator-bonds + protected-events page shells
4. Migrate Banner to Tailwind (delete banner.module.css)

### Phase 2C: Metric Cards

1. Rewrite Metric using shadcn Card (delete metric.module.css)
2. Merge ComplexMetric into Metric (delete complex-metric.module.css)
3. All pages get consistent card styling

### Phase 2D: SAM Basic Table

1. Build basic mode table using shadcn Table + Tailwind
2. Extract ValidatorCell, BondBadge, DeltaValue as shared components
3. Keep expert mode table unchanged (CSS Modules stay)

### Phase 2E: SAM Detail Page

1. Rewrite sam-detail.tsx with Tailwind + shadcn components
2. Delete sam-detail.module.css
3. Severity-colored recommendation box
4. isExpert prop for simulation CTA visibility

### Phase 3: Secondary Pages

1. Protected Events: shadcn Table + Input filters + Badge settlements
2. Validator Bonds: shadcn Table + bond health dots
3. Delete their module.css files

### Phase 4: Cleanup

1. Remove unused CSS variables from index.css
2. Delete empty scheme.module.css
3. Remove css-modules-typescript-loader if no .module.css files remain
   (expert table still needs it — keep for now)
4. Verify no hardcoded hex colors remain in TSX — all via Tailwind tokens

## Files Deleted After Full Migration

```
src/components/navigation/navigation.module.css
src/components/navigation/navigation.module.css.d.ts
src/components/banner/banner.module.css
src/components/banner/banner.module.css.d.ts
src/components/metric/metric.module.css
src/components/metric/metric.module.css.d.ts
src/components/complex-metric/complex-metric.module.css
src/components/complex-metric/complex-metric.module.css.d.ts
src/components/sam-detail/sam-detail.module.css
src/components/sam-detail/sam-detail.module.css.d.ts
src/pages/sam.module.css
src/pages/sam.module.css.d.ts
src/pages/validator-bonds.module.css
src/pages/validator-bonds.module.css.d.ts
src/pages/protected-events.module.css
src/pages/protected-events.module.css.d.ts
src/scheme.module.css
src/scheme.module.css.d.ts
```

## Files Kept (Expert Mode)

```
src/components/table/table.module.css        (generic expert table)
src/components/table/table.module.css.d.ts
src/components/sam-table/sam-table.module.css (simulation/ghost rows)
src/components/sam-table/sam-table.module.css.d.ts
src/components/loader/loader.module.css      (terminal spinner)
src/components/loader/loader.module.css.d.ts
src/components/protected-events-table/protected-events-table.module.css
src/components/validator-bonds-table/validator-bonds-table.module.css
```

These stay until expert mode is also migrated (out of scope for v2).
