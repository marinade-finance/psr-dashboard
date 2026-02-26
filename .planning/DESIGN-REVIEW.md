# PSR Dashboard — Design & Frontend Review

## Executive Summary

The dashboard has 3 pages (SAM, Protected Events, Validator Bonds) that look like they were built by different teams at different times. The SAM page got a full redesign with the Tailwind migration, but the other two pages still use the old generic `Table` component with basic styling. There's no shared UI kit, inconsistent component patterns, and several UX issues.

---

## 🔴 Critical Issues

### 1. Three Different Visual Languages

**SAM page:** Custom-styled table with APY badges, bond health indicators, tip engine, stats cards in a polished card-based layout.

**Bonds page:** Raw generic `Table` component, `Metric` cards in a flat `flex` row with no gaps, no card container, `fieldset/legend` filters that look like 2005 HTML.

**Protected Events page:** Same raw `Table`, same flat `Metric` row, `fieldset/legend` filters.

**Impact:** Looks like a prototype on 2 of 3 pages. Validators navigate between tabs and experience a jarring quality drop.

### 2. Duplicate "Docs" Links

The SAM page has:
- A "Docs" link in the **navigation bar** (top right, all pages)
- Another "Docs" button in the **page header** (next to "Enter Simulation")

These go to different places (`docs/` vs external Marinade docs URL). Confusing and redundant.

### 3. "Enter Simulation" Button — What Does It Do?

The simulation mode lets validators click a row, edit their bid/commission parameters, and preview the auction outcome. But:
- The button says "Enter Simulation" with zero context
- There's no onboarding tooltip or explanation
- It's a primary CTA competing with the actual data for attention
- Most validators will never use it — it's a power-user feature taking prime real estate

**Recommendation:** Move to a secondary button style, add a tooltip explaining what it does, or move it into the detail view (where simulation already exists via the What-If panel).

### 4. Navigation Bar Design Issues

```
[Stake Auction Marketplace] [Protected Events] [Validator Bonds]          [Docs]
```

- **No brand/logo** — no Marinade logo or "PSR Dashboard" identifier
- **Active state is subtle** — just a bottom border, easily missed
- **"Docs" floated right** — looks disconnected from the nav
- **No visual hierarchy** — all items look the same weight
- **Expert mode is URL-based** (`/expert-bonds`) — invisible to users, no toggle

### 5. Generic Table Component Has No Design

The `Table` component (`table.tsx`) applies styles via a massive className string on the `<table>` element. It has:
- No row hover states that match the SAM table
- No card container (tables float directly on the page background)
- Basic `th/td` styling with no visual grouping
- Sort indicators are tiny (10px) and low contrast

---

## 🟡 Inconsistencies

### Component Style Mismatch

| Pattern | SAM Page | Bonds/Events Pages |
|---------|----------|--------------------|
| Stats/Metrics | `StatsBar` — 4-col grid, rounded-xl cards with shadows | `Metric` — flat flex row, minimal cards, no gaps |
| Table | Custom `SamTable` — hover states, badges, tooltips, dividers | Generic `Table` — basic rows, no badges |
| Filters | None (built into table) | `<fieldset><legend>` — unstyled HTML |
| Page wrapper | `max-w-[1600px] mx-auto`, padded, header bar | No max-width, no header, raw layout |
| Loading | `SamSkeleton` with pulsing cards/rows | `<Loader />` spinner |
| Error | Styled `text-destructive p-6 text-center` | Bare `<p>Error fetching data</p>` |
| Banner | Not shown on SAM | Shown on Bonds + Events with info styling |

### Color Hardcoding

- Protected Events: `bg-[#91e4b7] text-black` for "Estimate" badge — doesn't use design tokens
- Various `cursor-help` spans with no consistent tooltip styling
- `tooltipAttributes()` uses the global `react-tooltip` (id="tooltip") — different system than SAM's custom HelpTip

### Two Tooltip Systems

1. **SAM page:** Custom `HelpTip` component with hover state, styled with design tokens
2. **Bonds/Events pages:** `react-tooltip` library with `data-tooltip-html` attributes, styled globally with `z-index: 2, width: 400`

These look completely different to the user.

---

## 🟢 What's Working Well

- SAM page table design is polished — bond health badges, APY tooltips, winning set divider
- Tip engine provides genuinely useful actionable recommendations
- Design tokens are well-defined in CSS variables
- Validator detail panel is well-structured with clear information hierarchy

---

## 💡 Recommendation: Adopt shadcn/ui

### What is shadcn/ui?

Not a component library — it's a collection of accessible, unstyled components you copy into your project. Built on Radix UI primitives + Tailwind CSS. You own the code.

### What Would It Give Us?

| Component | Current | With shadcn |
|-----------|---------|-------------|
| Table | Two different implementations | One `<DataTable>` with sorting, filtering, pagination built-in |
| Buttons | Inconsistent — `bg-primary`, `bg-info`, `bg-secondary` with different padding/radius | `<Button variant="default|secondary|outline|ghost|destructive">` |
| Tooltips | Two systems (HelpTip + react-tooltip) | `<Tooltip>` from Radix — one system, accessible |
| Cards | SAM uses rounded-xl cards, others use flat divs | `<Card>` with consistent padding/border/shadow |
| Inputs | Raw `<input>` with inline styling | `<Input>` with consistent border/focus/disabled states |
| Badges | Custom spans with inline bg/color | `<Badge variant="default|secondary|destructive|outline">` |
| Navigation | Custom NavLink wrappers | `<NavigationMenu>` with proper active/hover states |
| Skeleton | Custom (just added) | `<Skeleton>` primitive |
| Dialog/Sheet | Custom overlay + panel | `<Sheet>` for the detail slide-over, proper focus trap + animations |
| Select/Dropdown | None | `<Select>` for any future filter dropdowns |

### Migration Effort

**Low-medium.** shadcn/ui is Tailwind-native and uses CSS variables with the exact same naming convention we already have (`--primary`, `--background`, `--border`, etc.). Our `index.css` is already 90% compatible.

Steps:
1. Install: `npx shadcn@latest init` (generates `components/ui/` folder)
2. Add components as needed: `npx shadcn@latest add button card table tooltip badge`
3. Refactor pages one at a time to use shared components
4. Remove `react-tooltip` dependency
5. Remove custom `HelpTip`, `Metric`, `ComplexMetric`, `Loader` in favor of shadcn primitives

### What It Doesn't Give Us

- Data fetching / state management (keep react-query)
- Business logic (keep tip-engine, sam.ts, etc.)
- Custom visualizations (APY composition bar, bid histogram — keep custom)

---

## 📋 Proposed Action Items

### Phase 1: Quick Consistency Fixes (no shadcn needed)
1. **Remove duplicate Docs button** from SAM page header — keep only the nav one
2. **Downgrade "Enter Simulation" button** — make it `secondary` style with a tooltip explaining what it does
3. **Wrap Bonds/Events pages** in same layout container as SAM (`max-w-[1600px] mx-auto`)
4. **Add page headers** to Bonds/Events matching SAM style
5. **Fix the Estimate badge** — use `bg-primary-light text-primary` instead of hardcoded `#91e4b7`
6. **Add skeleton loading** to Bonds/Events pages (reuse pattern from SAM)
7. **Style error states** consistently across all pages

### Phase 2: Adopt shadcn/ui Components
1. Initialize shadcn in the project
2. Replace generic `Table` with shadcn DataTable
3. Replace both tooltip systems with shadcn Tooltip
4. Create shared `PageLayout`, `PageHeader`, `StatsGrid` wrapper components
5. Replace custom buttons/badges/inputs with shadcn variants
6. Replace detail panel overlay with shadcn `Sheet`

### Phase 3: Navigation Redesign
1. Add Marinade logo
2. Proper active states with background highlight (not just border)
3. Remove separate "Docs" nav item — integrate into a help menu or footer
4. Add user context (connected wallet indicator if applicable)
5. Consider removing Expert mode URL pattern — add a toggle switch in the UI instead
