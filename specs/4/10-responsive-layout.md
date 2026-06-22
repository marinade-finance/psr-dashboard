---
status: planned
---

# Responsive layout

**Why:** on narrow screens (< 900px) the app layout is dense and some elements
overlap or clip. Not a mobile target (mobile shows unsupported banner below
640px), but laptop/tablet users in a split-pane or narrow window need a
better experience.

**Known issues:**

- Validator detail sheet: `sticky top-[68px]` tab strip assumes the global nav
  is 68px — needs re-validation after the sheet gained `top-4` inset margin
  (commit c7cd8840). The sticky offset should reference the sheet's own header
  height, not the page nav height.
- General: audit all fixed px offsets in sticky elements for correctness at
  various viewport widths.

**Key files:** `src/components/validator-detail/validator-detail.tsx` (TabStrip),
`src/components/ui/sheet.tsx` (inset geometry).
