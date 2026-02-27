# IMPROVE.md

Design improvements extracted from `feature/my-feature` branch inspection and
general UX critique.

---

## 1. Brand identity in nav — DONE

Marinade wave SVG + "PSR Dashboard" brand label added to the left of the nav
divider. `NavLink to="/"` wraps brand, hover opacity-80.

---

## 2. Solid filled active nav state

**Current**: active tab uses an underline border-bottom indicator.

**Feature branch has**:
```
isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
```
`rounded-lg`, `px-3.5 py-2` pill buttons, `gap-0.5` between items.

**Take**: swap underline for filled pill. Clearer, more modern, works on dark themes.

---

## 3. Hover prefetch on nav links — DONE

`onMouseEnter` triggers `queryClient.prefetchQuery` for `protected-events` and
`bonds` with `staleTime: 5 * 60 * 1000`. Tab data starts loading on hover intent
before the click lands. Module-level `PROTECTED_EVENTS`/`BONDS` constants used.

---

## 4. Docs link with SVG icon

**Current**: plain `Docs` text link.

**Feature branch has**: document SVG icon (14×14, `opacity-60`) + "Docs" label,
`rounded-lg`, border on hover.

**Take**: add the icon. Makes "Docs" feel less like an orphan and more intentional.

---

## 5. APY tooltip breakdown popup

**Feature branch has** a hover tooltip component (`ApyTooltip`) that renders
a mini breakdown card:
- Chart color swatch + "Inflation (X% comm.) → Y%"
- Same for MEV, Block Rewards, SAM Bid
- Appears as `absolute` positioned card next to the APY cell on hover

**Take**: very useful for expert mode. Shows why APY is what it is without
navigating to detail view. Worth porting the `getApyBreakdown` helper +
tooltip shell.

---

## 6. `tip-engine` service (bond health + validator advice)

**Feature branch has** `src/services/tip-engine.ts` with:
- `getBondHealth(v)` → `'healthy' | 'watch' | 'critical'`
- `getBondHealthStyle(health)` → Tailwind badge classes
- `getValidatorTip(v)` → actionable string advice ("Increase bid by X SOL")
- `calculateBondUtilization(v)` → 0–1 ratio
- `formatStakeDelta(v)` → signed formatted string

**Take**: `getBondHealth` is better than our current raw-number bond comparison.
`getValidatorTip` could replace the current recommendation logic in `sam-table.tsx`.

---

## 7. shadcn Table component — SKIP

Our `Table` has sorting, color coding, and column config that the shadcn primitive
lacks. Migration is not worthwhile unless we also port the sorting logic.

---

## 8. `HelpTip` component — DONE

`src/components/help-tip/help-tip.tsx` extracted from `Metric`'s inline tooltip
JSX. `Metric` now uses `HelpTip`, subtitle prop retained.

---

## Priority order (remaining)

1. **Solid filled active nav state** — small CSS change, big visual polish
2. **Docs icon** — one SVG element
3. **APY tooltip breakdown** — medium effort, high value for expert mode
4. **tip-engine bond health** — refactor, medium effort
