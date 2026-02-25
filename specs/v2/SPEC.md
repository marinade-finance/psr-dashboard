# SAM Rewrite Spec

Minimal rewrite of SAM table into list + detail views. Maintain current
structure, reuse existing components and logic.

## Principle

Change as little as possible. No new frameworks, no routing library,
no state management. Detail view is React state in sam.tsx
(`viewMode: 'list' | 'detail'`), not a URL route. No browser URL
change for detail — back button restores list via state. Existing
`<Table>` component stays for expert mode.

## Changes by File

### src/pages/sam.tsx

- Add `viewMode` state: `'list' | 'detail'`
- Add `selectedValidator` state (vote account string)
- Add `densityMode` state: `'compact' | 'expanded'`
- Fetch validator names + country via `fetchValidators()` (already used
  in bonds/events pages) → `Map<voteAccount, {name, countryIso}>`
- Add `dc_country_iso: string | null` to `Validator` type in validators.ts
- Country flag: convert ISO alpha-2 → Unicode regional indicator emoji
  (e.g. "DE" → 🇩🇪). Pure text, no images. Helper: `isoToFlag(code)`
- Pass name map + view states to sam-table
- When `viewMode === 'detail'`: render `<SamDetail>` instead of table
- Preserve scroll position on back (save to ref before navigating)

### src/components/sam-table/sam-table.tsx

- **Basic mode**: replace `<Table>` with card-based list
  - Compact: single-line row (rank, flag, name, APY, bond dot, delta)
  - Expanded: multi-line card (APY breakdown, bond health, stake movement)
  - Density toggle above list
  - Row click → `onValidatorClick(voteAccount)`
- **Expert mode**: keep current `<Table>`, modify columns:
  - Remove SAM Active + SAM Target columns
  - Add Stake Δ column (delta display, tooltip active/target, sort by target)
  - Add Constraint column (`lastCapConstraint` description or "—")
- Reuse existing: `bondHealthColor()`, `bondTooltip()`, `formatSol()`,
  commission formatters, all metric calculations

### src/components/sam-detail/sam-detail.tsx (new)

- Single new component, ~200 lines
- Props: validator data, name, rank, total count, onBack callback
- Sections: header, 3 summary cards, 3 detail columns, recommendation,
  simulation CTA
- `getRecommendation()` function composing existing logic:
  - `bondHealthColor()` for bond state
  - `bondTooltip()` for bond advice text
  - `selectConstraintText()` (existing, `src/services/sam.ts:197`) for cap info
  - `selectIsNonProductive()` (existing, `src/services/sam.ts`) for productivity
  - Priority cascade per SCREENS.md recommendation logic

### src/components/sam-detail/sam-detail.module.css (new)

- Detail page layout styles
- Summary cards (3-across flex)
- Detail columns (3-across grid)
- Recommendation box (blue accent)
- Reuse color palette from SCREENS.md

### src/components/sam-table/sam-table.module.css

- Add card row styles (background, border, radius, hover with left accent)
- Country flag (circular 16px)
- Click-to-copy on address text (pointer, hover underline)
- "Copied" feedback: inline text replacement for 1.5s via local state +
  setTimeout, no toast library
- Density toggle styles
- Keep all existing simulation/editing styles unchanged

### src/services/sam.ts

- Add `getRecommendation(validator, bondColor)` → `{text, severity}`
- Add `selectStakeDelta(validator)` → number (target - active)
- No other changes to auction logic, runAlt, backstop

## What Stays Unchanged

- All auction calculation logic in sam.ts
- Simulation mode (expert only, inline editing, ghost rows)
- Metric calculations and display
- Table component and its CSS
- Navigation component
- Protected Events and Validator Bonds tabs
- Expert/Basic toggle behavior
- All existing CSS module class names

## Migration

No breaking changes. Expert mode table is nearly identical. Basic mode
switches from table to card list — same data, different presentation.
Simulation stays expert-only for now.
