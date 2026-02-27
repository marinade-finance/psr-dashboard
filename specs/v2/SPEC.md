# SAM Rewrite Spec

Minimal rewrite of SAM table into list + detail views. Maintain current
structure, reuse existing components and logic.

## Principle

Change as little as possible. No routing library, no state management.
Detail view is React state in sam.tsx (`viewMode: 'list' | 'detail'`),
not a URL route. No browser URL change for detail — back button
restores list via state. Existing `<Table>` component stays for expert
mode.

CSS: Tailwind CSS v3 + shadcn/ui for new components (basic mode table,
detail page). Old CSS Modules coexist — no mass rewrite. See VISUALS.md
for Tailwind tokens and shadcn component mapping.

## Changes by File

### src/pages/sam.tsx

- Add `viewMode` state: `'list' | 'detail'`
- Add `selectedValidator` state (vote account string)
- No density toggle — basic mode uses Variant A (clean table)
- Fetch validator names + country via `fetchValidators()` (already used
  in bonds/events pages) → `Map<voteAccount, {name, countryIso}>`
- Add `dc_country_iso: string | null` to `Validator` type in validators.ts
- Country flag: convert ISO alpha-2 → Unicode regional indicator emoji
  (e.g. "DE" → 🇩🇪). Pure text, no images. Helper: `isoToFlag(code)`
- Pass name map + view states to sam-table
- When `viewMode === 'detail'`: render `<SamDetail>` instead of table
- Preserve scroll position on back (save to ref before navigating)

### src/components/sam-table/sam-table.tsx

- **Basic mode**: simplified table (Variant A) with 6 columns:
  `# | Validator | Max APY | Bond | Stake Δ | Next Step`
  - Validator: name + truncated pubkey (click to copy)
  - Max APY: tooltip shows commission breakdown
  - Bond: colored dot + health label + SOL balance
  - Stake Δ: signed delta, tooltip shows active/target
  - Next Step: recommendation text from `getRecommendation()`
  - Row click → `onValidatorClick(voteAccount)`
- **Expert mode**: keep current `<Table>`, modify columns:
  - Remove SAM Active + SAM Target columns
  - Add Stake Δ column (delta display, tooltip active/target, sort by target)
  - Add Constraint column (`lastCapConstraint` description or "—")
- Reuse existing: `bondHealthColor()`, `bondTooltip()`, `formatSol()`,
  commission formatters, all metric calculations

### src/components/sam-detail/sam-detail.tsx (new)

- Single new component, ~200 lines
- Props: validator data, name, rank, total count, onBack callback,
  `isExpert: boolean`
- Sections: header, 3 summary cards, 3 detail columns, recommendation,
  simulation CTA (expert only — hidden when `!isExpert`)
- `getRecommendation()` function composing existing logic:
  - `bondHealthColor()` for bond state
  - `bondTooltip()` for bond advice text
  - `selectConstraintText()` (existing, `src/services/sam.ts:197`) for cap info
  - `selectIsNonProductive()` (existing, `src/services/sam.ts`) for productivity
  - Priority cascade per SCREENS.md recommendation logic

### src/components/sam-detail/ styling

- Uses Tailwind classes + shadcn/ui components (Card, Badge, Progress)
- No new CSS Modules file — layout via Tailwind utilities
- Summary cards (grid-cols-3), detail columns (grid-cols-3)
- Recommendation box: shadcn Card with accent-blue left border
- Color tokens from VISUALS.md tailwind.config

### src/components/sam-table/sam-table.module.css

- Row hover: left border accent + subtle bg shift
- Click-to-copy on address text (pointer, hover underline)
- "Copied" feedback: inline text replacement for 1.5s via local state +
  setTimeout, no toast library
- Keep all existing simulation/editing styles unchanged

### src/services/sam.ts

- Add `getRecommendation(validator, bondColor)` →
  `{text: string, severity: 'success' | 'warning' | 'danger' | 'info'}`
  - `success`: on track / stable (steps 9, 11)
  - `warning`: watch state, non-productive (steps 3, 4, 7)
  - `danger`: bond at risk, losing stake, no bond (steps 1, 2, 10)
  - `info`: constraint-capped, raise bid, zero target (steps 5, 6, 8)
  - Step numbers reference SCREENS.md recommendation priority cascade
  - Severity visual mapping:
    - NEXT STEP column: always text-muted (severity unused in table)
    - Detail recommendation box: border-l color matches severity
      (`success` → green, `warning` → yellow, `danger` → red,
      `info` → blue). Text stays text-primary in all cases.
- Add `selectBondUtilization(validator)` → number (0–1)
  - Formula: `marinadeSamTargetSol / bondSamStakeCapSol`
  - If `bondSamStakeCapSol` is 0 or null → return 0
  - Clamped to [0, 1]
  - Used in detail page Progress bar and "X% used" sub-label
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
switches from 10-column table to 6-column table — same data, simpler
presentation. Simulation stays expert-only for now.
