---
phase: 1
plan: 5
name: Pages, Remaining Components, and Cleanup
wave: 3
autonomous: true
---

# Plan 01-05: Pages, Remaining Components, and Cleanup

## Objective

Convert the page-level components (sam.tsx, validator-bonds.tsx, protected-events.tsx), the generic Table component, remaining table components, and clean up all leftover CSS module files and type declarations.

## Context

**Phase Goal:** Convert PSR dashboard from CSS Modules to Tailwind CSS
**This Plan's Role:** Final sweep — convert pages, remaining components, cleanup
**Dependencies:** Plans 01-04 (all component conversions)

## Tasks

### Task 1: Convert sam.tsx page

**Steps:**
1. Read `src/pages/sam.tsx` and `sam.module.css`
2. Convert page layout:
   - Page wrapper: `min-h-screen bg-background-page`
   - Page content: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6`
   - Page header: `flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6`
   - Title: `text-2xl font-bold text-foreground`
   - Subtitle: `text-sm text-muted-foreground`
   - Header buttons area: `flex items-center gap-3`
   - Docs link: `px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors`
   - Simulation toggle button:
     - Default: `px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-[var(--primary-light-90)] transition-colors`
     - Active: `px-4 py-1.5 rounded-lg border-2 border-primary text-primary text-sm font-medium`
   - "Simulation applied" / "Calculating..." note: `text-xs text-primary font-medium`
   - Error text: `text-destructive text-sm`
   - Table container: `mt-4`
3. Delete CSS module files

**Files:**
- Modify: `src/pages/sam.tsx`
- Delete: `src/pages/sam.module.css`
- Delete: `src/pages/sam.module.css.d.ts`

**Commit:** `refactor: convert sam page to tailwind`

---

### Task 2: Convert validator-bonds.tsx and protected-events.tsx pages

**Steps:**
1. Read and convert both pages (they're small — 37 and 32 LOC)
2. Apply same page layout pattern as sam.tsx
3. Delete their CSS module files

**Files:**
- Modify: `src/pages/validator-bonds.tsx`
- Modify: `src/pages/protected-events.tsx`
- Delete: `src/pages/validator-bonds.module.css`, `.d.ts`
- Delete: `src/pages/protected-events.module.css`, `.d.ts`

**Commit:** `refactor: convert bonds and events pages to tailwind`

---

### Task 3: Convert generic Table component

**Steps:**
1. Read `src/components/table/table.tsx` (266 LOC) and `table.module.css`
2. Convert to Tailwind — this is a reusable table component:
   - Table: `w-full border-collapse`
   - Header: `text-left text-xs font-medium text-muted-foreground uppercase tracking-wider`
   - Rows: `border-b border-border-grid hover:bg-muted/50 transition-colors`
   - Cells: `px-4 py-3 text-sm`
3. Delete CSS module files

**Files:**
- Modify: `src/components/table/table.tsx`
- Delete: `src/components/table/table.module.css`, `.d.ts`

**Commit:** `refactor: convert generic table component to tailwind`

---

### Task 4: Convert ValidatorBondsTable and ProtectedEventsTable

**Steps:**
1. Read and convert `src/components/validator-bonds-table/validator-bonds-table.tsx` (284 LOC)
2. Read and convert `src/components/protected-events-table/protected-events-table.tsx` (301 LOC)
3. Apply consistent table styling from Tailwind
4. Delete their CSS module files

**Files:**
- Modify: `src/components/validator-bonds-table/validator-bonds-table.tsx`
- Modify: `src/components/protected-events-table/protected-events-table.tsx`
- Delete: All corresponding `.module.css` and `.d.ts` files

**Commit:** `refactor: convert bonds and events table components to tailwind`

---

### Task 5: Clean up residual CSS files and imports

**Steps:**
1. `find src -name "*.module.css" -o -name "*.module.css.d.ts"` — ensure ALL are deleted
2. Check `src/scheme.module.css` — delete if empty/unused
3. Update `src/index.css` — remove any old non-Tailwind styles that are now redundant
4. Check that `src/index.css.d.ts` is still needed (may not be if index.css is no longer a CSS module)
5. Ensure NO component still imports a `.module.css` file
6. Run `pnpm build` to verify clean build

**Verification:**
```bash
cd /data/clawd/psr-dashboard
find src -name "*.module.css*" 2>/dev/null
grep -r "module.css" src/ --include="*.tsx" --include="*.ts" 2>/dev/null
pnpm build 2>&1 | tail -20
```

**Commit:** `chore: remove all css module files and complete tailwind migration`

## Success Criteria

- [ ] All pages use Tailwind (zero CSS module imports anywhere)
- [ ] Zero `.module.css` files remain in `src/`
- [ ] Zero `.module.css.d.ts` files remain in `src/`
- [ ] `pnpm build` succeeds with no CSS module references
- [ ] All table views (SAM, Bonds, Events) render correctly

## Notes

- The generic `Table` component in `table.tsx` exports a `Color` enum used by `sam.ts` service — don't remove the enum, just the CSS
- `validator-bonds-table` and `protected-events-table` may use the generic `Table` component — check imports
- `scheme.module.css` is likely empty (0 LOC per wc output) — safe to delete
- After this plan, the entire codebase should be CSS-module-free
