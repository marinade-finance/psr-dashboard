# IMPROVE.md

All items shipped. File kept for reference.

## Done

1. **Brand identity in nav** — Marinade wave SVG + "PSR Dashboard" label, `NavLink to="/"` wraps brand.
2. **Solid filled active nav state** — `bg-primary text-primary-foreground shadow-sm` pill, `rounded-lg px-3.5 py-2`.
3. **Hover prefetch on nav links** — `onMouseEnter` triggers `queryClient.prefetchQuery` for protected-events and bonds.
4. **Docs link with SVG icon** — document SVG (14×14, `opacity-60`) + border on hover.
5. **APY tooltip** — skipped (not worth the complexity).
6. **tip-engine service** — `getBondHealthStyle`, `getValidatorTip`, `calculateBondUtilization`, `formatStakeDelta` all shipped in `src/services/tip-engine.ts`.
7. **HelpTip component** — `src/components/help-tip/help-tip.tsx`, used by Metric and table headers.
8. **Semantic colors** — all component files use Tailwind tokens; shadow vars and sim animation vars in `src/index.css`.
