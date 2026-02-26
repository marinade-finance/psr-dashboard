---
phase: 1
plan: 3
name: SamTable Component Refactor
wave: 2
autonomous: true
---

# Plan 01-03: SamTable Component Refactor

## Objective

Convert the main rankings table (`sam-table.tsx`, 502 LOC + 563 LOC CSS) from CSS Modules to Tailwind. This is the largest and most complex component — the primary view users see.

## Context

**Phase Goal:** Convert PSR dashboard from CSS Modules to Tailwind CSS
**This Plan's Role:** Convert the core data table showing validator rankings
**Dependencies:** Plan 01 (Tailwind setup)

## Tasks

### Task 1: Convert StatsBar section within SamTable

**Description:** The SamTable renders a stats bar at the top (Total Auction Stake, Winning APY, Projected APY, Winning Validators). Convert this section's inline styles to Tailwind.

**Steps:**
1. Read full `src/components/sam-table/sam-table.tsx` and `sam-table.module.css`
2. Convert the stats bar rendering section (the `stats.map()` block) to use Tailwind:
   - Container: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6`
   - Cards: `bg-card rounded-xl border border-border p-5 shadow-xs`
   - Label: `text-xs text-muted-foreground font-medium uppercase tracking-wider`
   - Value: `text-2xl font-bold font-mono text-foreground`

**Commit:** (combined with other tasks below)

---

### Task 2: Convert table header and structure

**Steps:**
1. Convert the `<table>` container and header row:
   - Table wrapper: `w-full overflow-x-auto`
   - Table: `w-full border-collapse`
   - Header row: `border-b border-border-grid`
   - Header cells: `text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3`
2. Remove all `styles.headerX` references

---

### Task 3: Convert table row rendering

**Steps:**
1. Convert `renderRow()` function. Each row needs:
   - Base: `border-b border-border-grid cursor-pointer transition-colors hover:bg-[var(--primary-light)]`
   - Out-of-set rows: add `bg-[var(--destructive-light)]` (faint red tint, use `bg-red-50/30` or css var)
   - Simulated row highlight: `ring-2 ring-primary`
2. Cell styles:
   - Rank: `px-4 py-3 text-sm font-mono text-muted-foreground w-12`
   - Validator: `px-4 py-3` with name as `text-sm font-medium text-foreground` and pubkey as `text-xs text-muted-foreground font-mono truncate`
   - Alert dot: `inline-block w-2 h-2 rounded-full bg-destructive animate-pulse ml-1`
   - Max APY badge: `inline-flex px-2 py-0.5 rounded-md text-sm font-mono font-semibold` with `bg-[var(--primary-light)] text-primary` for in-set, `bg-[var(--destructive-light)] text-destructive` for out-of-set
   - Bond health badge: `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium`
   - Bond utilization bar: `h-1.5 rounded-full bg-secondary` with fill `h-full rounded-full transition-all`
   - Stake delta: `text-sm font-mono font-medium`
   - Next step tip badge: `inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs max-w-[280px] truncate`
   - Chevron: `w-8 flex items-center justify-center`

---

### Task 4: Convert APY Tooltip

**Steps:**
1. Convert `ApyTooltip` component:
   - Container: `absolute z-50 bg-card border border-border rounded-lg shadow-lg p-3 w-64 -translate-x-1/2 left-1/2 mt-1`
   - Title: `text-xs font-semibold text-foreground mb-2`
   - Rows: `flex items-center gap-2 text-xs py-1`
   - Dot: `w-2 h-2 rounded-full flex-shrink-0`
   - Total row: `border-t border-border-grid pt-1 mt-1 flex justify-between text-xs font-semibold`

---

### Task 5: Convert Winning Set Cutoff Divider

**Steps:**
1. Convert the cutoff banner between winning and non-winning validators:
   - Row: full-width colspan
   - Banner: `flex items-center gap-3 px-4 py-2 bg-[var(--primary-light)] rounded-lg my-1`
   - Star icon + "Winning Set Cutoff" label: `text-sm font-semibold text-primary`
   - Divider line: `flex-1 h-px bg-primary/20`
   - APY text: `text-xs font-mono text-primary`
   - Validator count: `text-xs text-primary/70`

---

### Task 6: Remove CSS module and finalize

**Steps:**
1. Remove all `import styles from './sam-table.module.css'` references
2. Remove `styles.X` usage — should all be replaced with `className="..."` Tailwind strings
3. Delete `sam-table.module.css` and `sam-table.module.css.d.ts`
4. Keep the inline `<style>` for pulse animation OR convert to Tailwind's `animate-pulse` (built-in)
5. Verify the component renders the table wrapper ref and simulation mode classes using Tailwind conditionals

**Files:**
- Modify: `src/components/sam-table/sam-table.tsx`
- Delete: `src/components/sam-table/sam-table.module.css`
- Delete: `src/components/sam-table/sam-table.module.css.d.ts`

**Commit:** `refactor: convert sam-table component to tailwind`

## Success Criteria

- [ ] SamTable uses only Tailwind classes (zero CSS module imports)
- [ ] Stats bar cards render with proper design tokens
- [ ] Table rows have correct hover, out-of-set, and simulated states
- [ ] APY tooltip appears on hover with proper composition breakdown
- [ ] Winning set cutoff divider is prominent teal banner
- [ ] Alert dots pulse on critical validators
- [ ] `pnpm build` succeeds

## Notes

- The `tableWrapRef` is used for click-outside detection in simulation mode — preserve this ref
- `hoveredApyRow` and `hoveredRow` states control tooltip visibility and row highlighting — logic stays, only styling changes
- The component receives many props for simulation mode — don't change the prop interface
- `var(--chart-1)` through `var(--chart-4)` are used in APY tooltip dot colors — these CSS vars must exist
- Bond health colors come from `getBondHealthStyle()` which returns `var(--X)` strings — these must match CSS var names
