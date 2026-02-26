---
phase: 1
plan: 4
name: ValidatorDetail Component Refactor
wave: 2
autonomous: true
---

# Plan 01-04: ValidatorDetail Component Refactor

## Objective

Convert the validator detail panel (`validator-detail.tsx`, 491 LOC + 450 LOC CSS) from CSS Modules to Tailwind. This is the slide-over panel showing deep validator info, rank explainer, APY composition, and simulation.

## Context

**Phase Goal:** Convert PSR dashboard from CSS Modules to Tailwind CSS
**This Plan's Role:** Convert the detail view that opens when clicking a validator row
**Dependencies:** Plan 01 (Tailwind setup)

## Tasks

### Task 1: Convert overlay and panel structure

**Steps:**
1. Read full `src/components/validator-detail/validator-detail.tsx` and `validator-detail.module.css`
2. Convert overlay + panel:
   - Overlay: `fixed inset-0 z-50 bg-black/50 flex justify-end`
   - Panel: `w-full max-w-4xl bg-background-page h-full overflow-y-auto shadow-xl`
3. Convert header:
   - Container: `flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10`
   - Back button: `flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors`
   - Rank badge: `text-lg font-bold font-mono text-primary`
   - Vote account: `text-sm font-mono text-muted-foreground`
   - Status badge (In Set / Out of Set): `px-2 py-0.5 rounded-md text-xs font-medium`
   - Close button: `text-2xl text-muted-foreground hover:text-foreground`

---

### Task 2: Convert "Why Rank #N?" section

**Steps:**
1. Convert the ranking factors list:
   - Section title: `text-base font-semibold text-foreground flex items-center gap-2`
   - Factor list: `space-y-2`
   - Factor item: `flex items-center justify-between p-3 rounded-lg border`
     - Positive: `border-primary/20 bg-[var(--primary-light)]`
     - Negative: `border-destructive/20 bg-[var(--destructive-light)]`
     - Neutral: `border-border bg-secondary`
   - Factor icon (✓/✗/—): `w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full`
   - Factor name: `text-sm font-medium text-foreground`
   - Factor note: `text-xs text-muted-foreground`
   - Factor value: `text-sm font-mono font-semibold`

---

### Task 3: Convert Position vs Winning APY gauge

**Steps:**
1. Convert the horizontal gauge bar:
   - Container: `mt-3`
   - Bar background: `h-3 rounded-full bg-secondary relative overflow-hidden`
   - Fill: `h-full rounded-full bg-primary transition-all`
   - Winning APY marker line: `absolute top-0 h-full w-0.5 bg-primary/60`
   - Labels below: `flex justify-between text-xs text-muted-foreground mt-1`
   - "You" label and "Winning" label in appropriate positions

---

### Task 4: Convert APY Composition bar

**Steps:**
1. Convert stacked bar + legend:
   - Bar container: `flex h-4 rounded-full overflow-hidden`
   - Segments: `transition-all` with inline width% and background from chart vars
   - Legend: `flex flex-wrap gap-x-4 gap-y-1 mt-2`
   - Legend items: `flex items-center gap-1.5 text-xs text-muted-foreground`
   - Dot: `w-2 h-2 rounded-full flex-shrink-0`

---

### Task 5: Convert Next Step tip card

**Steps:**
1. Convert the tip/recommendation card:
   - Card: `p-3 rounded-lg border-l-4` with dynamic border-left color and background from tipStyle
   - Icon + text: `flex items-center gap-2 text-sm`

---

### Task 6: Convert What-If Simulation form

**Steps:**
1. Convert the simulation panel:
   - Section: `space-y-3`
   - Form field: `space-y-1`
   - Label: `text-xs font-medium text-muted-foreground`
   - Input: `w-full px-3 py-2 rounded-lg border border-border bg-input text-sm font-mono text-foreground focus:ring-2 focus:ring-ring focus:outline-none`
   - Run Simulation button: `w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-[var(--primary-light-90)] disabled:opacity-50 transition-colors`

---

### Task 7: Convert Bond Health and Stake Overview cards

**Steps:**
1. Convert bond health card:
   - Card: `p-4 rounded-lg border border-border bg-card`
   - Status badge: inline with dynamic color/bg from healthStyle
   - Balance: `text-sm font-mono`
   - Metrics grid: `grid grid-cols-2 gap-3 mt-3`
   - Metric label: `text-xs text-muted-foreground`
   - Metric value: `text-sm font-semibold font-mono`
2. Convert stake overview:
   - Same card style, 3 metrics (Active, Target, Delta)

---

### Task 8: Convert two-column layout and finalize

**Steps:**
1. Content area: `grid grid-cols-1 lg:grid-cols-2 gap-6 p-6`
2. Each column: `space-y-6`
3. Section wrapper: `bg-card rounded-xl border border-border p-5`
4. Remove all CSS module imports and delete files

**Files:**
- Modify: `src/components/validator-detail/validator-detail.tsx`
- Delete: `src/components/validator-detail/validator-detail.module.css`
- Delete: `src/components/validator-detail/validator-detail.module.css.d.ts`

**Commit:** `refactor: convert validator-detail component to tailwind`

## Success Criteria

- [ ] ValidatorDetail uses only Tailwind classes (zero CSS module imports)
- [ ] Overlay slides in from right with backdrop
- [ ] "Why Rank" factors show pass/fail/neutral indicators correctly
- [ ] APY composition bar segments proportional to actual values
- [ ] Simulation form inputs functional with proper styling
- [ ] Bond health displays with correct RAG coloring
- [ ] `pnpm build` succeeds

## Notes

- The component uses `onClick={e => e.stopPropagation()}` on the panel to prevent closing when clicking inside — preserve this
- Simulation `onSimulate` callback sends values to parent which re-runs the SDK — don't touch this logic
- Bond health colors are dynamic from `getBondHealthStyle()` which returns CSS var strings — these are applied as inline styles
- The `useMemo` for `rankFactors` contains business logic — don't modify
