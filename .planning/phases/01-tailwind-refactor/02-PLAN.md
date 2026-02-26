---
phase: 1
plan: 2
name: Core UI Components (Loader, HelpTip, Metric, Navigation, Banner, StatsBar)
wave: 2
autonomous: true
---

# Plan 01-02: Core UI Components Refactor

## Objective

Convert all small/shared components from CSS Modules to Tailwind. These are used by the larger components (SamTable, ValidatorDetail) so must be done first.

## Context

**Phase Goal:** Convert PSR dashboard from CSS Modules to Tailwind CSS
**This Plan's Role:** Convert foundational UI components that other components depend on
**Dependencies:** Plan 01 (Tailwind setup must be complete)

## Tasks

### Task 1: Convert Loader component

**Description:** Replace `loader.module.css` with Tailwind classes in `loader.tsx`

**Steps:**
1. Read `src/components/loader/loader.module.css` to understand styles
2. Read `src/components/loader/loader.tsx`
3. Replace CSS module imports and `styles.X` references with Tailwind utility classes
4. Delete `loader.module.css` and `loader.module.css.d.ts`

**Files:**
- Modify: `src/components/loader/loader.tsx`
- Delete: `src/components/loader/loader.module.css`
- Delete: `src/components/loader/loader.module.css.d.ts`

**Commit:** `refactor: convert loader component to tailwind`

---

### Task 2: Convert HelpTip component

**Description:** Replace `help-tip.module.css` with Tailwind classes. This is the `(?)` tooltip used throughout.

**Steps:**
1. Read `src/components/help-tip/help-tip.module.css` and `help-tip.tsx`
2. Convert to Tailwind. The tooltip should use:
   - `group` / `group-hover:visible` for hover behavior
   - `absolute` positioning for tooltip popover
   - `bg-card text-card-foreground border border-border rounded-lg shadow-md` for tooltip styling
   - `text-muted-foreground cursor-help` for the (?) trigger
3. Delete CSS module files

**Files:**
- Modify: `src/components/help-tip/help-tip.tsx`
- Delete: `src/components/help-tip/help-tip.module.css`
- Delete: `src/components/help-tip/help-tip.module.css.d.ts`

**Commit:** `refactor: convert help-tip component to tailwind`

---

### Task 3: Convert Metric and ComplexMetric components

**Steps:**
1. Read and convert `src/components/metric/metric.tsx` (simple label+value display)
2. Read and convert `src/components/complex-metric/complex-metric.tsx`
3. Delete their CSS module files

**Files:**
- Modify: `src/components/metric/metric.tsx`
- Modify: `src/components/complex-metric/complex-metric.tsx`
- Delete: `src/components/metric/metric.module.css`, `metric.module.css.d.ts`
- Delete: `src/components/complex-metric/complex-metric.module.css`, `complex-metric.module.css.d.ts`

**Commit:** `refactor: convert metric components to tailwind`

---

### Task 4: Convert Navigation component

**Steps:**
1. Read `src/components/navigation/navigation.module.css` and `navigation.tsx`
2. Convert to Tailwind. Navigation should use:
   - `flex items-center gap-4` for layout
   - Tab/link styling with active states using `text-primary border-b-2 border-primary`
   - `font-sans text-sm font-medium` for text
3. Delete CSS module files

**Files:**
- Modify: `src/components/navigation/navigation.tsx`
- Delete: `src/components/navigation/navigation.module.css`

**Commit:** `refactor: convert navigation component to tailwind`

---

### Task 5: Convert Banner component

**Steps:**
1. Read `src/components/banner/banner.module.css` and `banner.tsx`
2. Convert to Tailwind
3. Delete CSS module files

**Files:**
- Modify: `src/components/banner/banner.tsx`
- Delete: `src/components/banner/banner.module.css`, `banner.module.css.d.ts`

**Commit:** `refactor: convert banner component to tailwind`

---

### Task 6: Convert StatsBar component

**Steps:**
1. Read `src/components/stats-bar/stats-bar.tsx` and its CSS module
2. Convert to Tailwind. Stats bar cards should use:
   - `grid grid-cols-4 gap-4` for layout
   - Card styling: `bg-card rounded-xl border border-border p-4 shadow-xs`
   - Label: `text-xs text-muted-foreground font-medium uppercase tracking-wide`
   - Value: `text-2xl font-semibold font-mono text-foreground`
3. Delete CSS module files

**Files:**
- Modify: `src/components/stats-bar/stats-bar.tsx`
- Delete: `src/components/stats-bar/stats-bar.module.css`

**Commit:** `refactor: convert stats-bar component to tailwind`

## Success Criteria

- [ ] All 6 components use only Tailwind classes (no CSS module imports)
- [ ] All CSS module files for these components deleted
- [ ] `pnpm build` succeeds
- [ ] Visual appearance matches original (using design token CSS variables)

## Notes

- Reference `src/services/help-text.ts` for tooltip content — those strings should be preserved exactly
- Some components may import from other components (e.g., stats-bar uses HelpTip) — make sure imports still work
- The `table.tsx` and `table.module.css` generic table component may also need conversion, check if it's still used
