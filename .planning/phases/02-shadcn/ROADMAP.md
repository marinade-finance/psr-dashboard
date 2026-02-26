# Phase 2: shadcn/ui Adoption

## Overview

| Plan | Name | Wave | Goal | Status |
|------|------|------|------|--------|
| 01 | Init shadcn + foundation | 1 | Install shadcn, configure for webpack, set up ui/ folder | ⬜ |
| 02 | Card + Badge primitives | 2 | Replace hand-rolled card/badge markup with shadcn components | ⬜ |
| 03 | Tooltip unification | 2 | Replace custom HelpTip + any react-tooltip with shadcn Tooltip | ⬜ |
| 04 | Table unification | 3 | Replace generic Table component with shadcn DataTable | ⬜ |
| 05 | Sheet for ValidatorDetail | 3 | Replace custom overlay panel with shadcn Sheet | ⬜ |
| 06 | Button + Input + Skeleton | 2 | Replace custom buttons/inputs/loader with shadcn primitives | ⬜ |
| 07 | Navigation redesign | 4 | Rebuild nav with shadcn NavigationMenu + proper active states | ⬜ |

Status: ⬜ Not Started | 🔄 In Progress | ✅ Complete

---

## Plan 01: Init shadcn + Foundation (Wave 1)

**Goal:** Get shadcn working in the webpack + Tailwind setup. This is the blocker for everything else.

**Key Challenge:** shadcn's `init` assumes Vite/Next.js. We use webpack. Need to:
- Install dependencies manually (radix primitives, class-variance-authority, clsx, tailwind-merge)
- Create `lib/utils.ts` with `cn()` helper
- Create `components.json` config
- Verify Radix components work with our webpack `fs: false` alias

**Deliverables:**
- [ ] `cn()` utility function
- [ ] `components.json` config
- [ ] Dependencies installed (cva, clsx, tailwind-merge, @radix-ui/*)
- [ ] One test component (Button) renders correctly
- [ ] Build passes

---

## Plan 02: Card + Badge Primitives (Wave 2)

**Goal:** Replace all hand-rolled card containers and badge markup with shadcn Card/Badge.

**Current state:**
- `Metric` component: `px-5 py-4 bg-card border border-border rounded-xl shadow-xs`
- `ComplexMetric`: same pattern, recently fixed
- `StatsBar`: same pattern inline
- `SamTable` inline badges: bond health, APY, winning set
- Protected Events: "Estimate" / "Dryrun" badges with custom classes
- `Banner` component: info-styled card variant

**What changes:**
- `<Card>`, `<CardHeader>`, `<CardContent>` replaces all card markup
- `<Badge variant="default|secondary|destructive|outline">` replaces all badge spans
- Custom variants for bond health (healthy/watch/critical) and estimate/dryrun
- `Metric` and `ComplexMetric` become thin wrappers around `<Card>`
- `StatsBar` uses `<Card>` internally

**Files to modify:**
- Create: `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`
- Modify: `metric.tsx`, `complex-metric.tsx`, `stats-bar.tsx`, `banner.tsx`
- Modify: `sam-table.tsx` (badge usage), `protected-events-table.tsx` (Estimate/Dryrun badges)

---

## Plan 03: Tooltip Unification (Wave 2)

**Goal:** Single tooltip system across the entire app.

**Current state:**
- `HelpTip` component (48 LOC): custom hover-based tooltip with `useState`, manually positioned, `dangerouslySetInnerHTML`
- No react-tooltip dependency (already removed), but HelpTip is used 30+ times across all components
- Tooltip renders above trigger, absolute positioned, with arrow

**What changes:**
- Add shadcn `Tooltip` (wraps `@radix-ui/react-tooltip`)
- Create `HelpTip` wrapper that uses shadcn Tooltip internally (keep same API)
- Benefits: proper positioning (collision-aware via Radix), keyboard accessible, animation, no manual state management

**Files to modify:**
- Create: `src/components/ui/tooltip.tsx`
- Modify: `src/components/help-tip/help-tip.tsx` (rewrite internals, keep API)
- Add: `TooltipProvider` in app root

---

## Plan 04: Table Unification (Wave 3)

**Goal:** One table component with consistent styling, sorting, and row interactions.

**Current state:**
- `Table` component (table.tsx, ~250 LOC): generic sortable table with `[&_...]` selector styling
- `SamTable` (sam-table.tsx, 506 LOC): custom table with its own markup, not using generic Table
- Two completely different visual styles for tables

**What changes:**
- Add shadcn `Table` primitives (`Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`)
- Keep existing sort logic from generic `Table` — just swap the rendering layer
- SamTable keeps its custom rendering but uses shadcn Table primitives for consistent cell/header styling
- Bonds table and Events table get consistent styling for free

**Files to modify:**
- Create: `src/components/ui/table.tsx`
- Modify: `src/components/table/table.tsx` (use shadcn primitives for rendering)
- Modify: `src/components/sam-table/sam-table.tsx` (use same primitives)

**Constraint:** Do NOT change sort logic, column definitions, or data flow. Only the rendering layer.

---

## Plan 05: Sheet for ValidatorDetail (Wave 3)

**Goal:** Replace custom overlay with shadcn Sheet for the validator detail slide-over panel.

**Current state:**
- `ValidatorDetail` (505 LOC): custom slide-in panel with backdrop, manual close handling
- No focus trap, no animation, no escape key handling (or manual)

**What changes:**
- Add shadcn `Sheet` (wraps `@radix-ui/react-dialog`)
- Wrap ValidatorDetail content in `<Sheet><SheetContent>` 
- Get: focus trap, escape key, backdrop click, slide animation, scroll lock — all for free
- Keep all internal content/logic identical

**Files to modify:**
- Create: `src/components/ui/sheet.tsx`
- Modify: `src/components/validator-detail/validator-detail.tsx` (wrap in Sheet)
- Modify: `src/pages/sam.tsx` (Sheet open state management)

---

## Plan 06: Button + Input + Skeleton (Wave 2)

**Goal:** Replace all custom button/input/loading markup with shadcn primitives.

**Current state:**
- Buttons: ad-hoc classes (`bg-primary text-primary-foreground px-4 py-2 rounded-lg`)
- Inputs: raw `<input>` with inline Tailwind classes per usage
- Loading: custom `<Loader />` (spinner) + `<SamSkeleton>` (pulse animation)

**What changes:**
- `<Button variant="default|secondary|outline|ghost">` with consistent sizing
- `<Input>` with consistent border, focus, disabled states
- `<Skeleton>` primitive for loading states
- `SamSkeleton` uses shadcn `<Skeleton>` internally

**Files to modify:**
- Create: `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/skeleton.tsx`
- Modify: `src/components/skeleton/skeleton.tsx`, `src/components/loader/loader.tsx`
- Modify: `protected-events-table.tsx` (filter inputs)
- Modify: `validator-detail.tsx` (any buttons)

---

## Plan 07: Navigation Redesign (Wave 4)

**Goal:** Professional navigation bar with proper branding, active states, and hierarchy.

**Current state:**
- Plain text links with subtle active state (bg-primary/10)
- No logo/brand
- "Docs" link floated right, disconnected
- Expert mode is URL-based, invisible to users

**What changes:**
- Add Marinade logo / "PSR Dashboard" brand mark
- Proper active states with background highlight
- Group "Docs" into nav or move to footer/help
- Consider expert mode toggle (stretch goal)

**Files to modify:**
- Modify: `src/components/navigation/navigation.tsx`
- Potentially add logo asset

**Dependency:** Plans 01 + 06 (needs Button component)
