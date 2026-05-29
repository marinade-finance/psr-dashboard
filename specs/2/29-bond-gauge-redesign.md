---
status: planned
---

# Bond coverage gauge redesign — legible at a glance

**Why:** the bond coverage gauge on the bonds table uses a multi-segment
colored bar with narrow bands that are visually dense and hard to
distinguish, especially for thin segments (validator feedback, L, Discord
2026-05-29). A reader can't quickly tell a healthy bond from a thin one.

## Problem

The current gauge packs several colored bands into one short bar. Thin
segments collapse to a few pixels and the colour transitions blur together,
so the bar reads as noise rather than a clear health signal.

## Design directions

- **Single-fill + threshold marker:** one fill bar (bond health colour from
  `BondHealthState`) with a tick at the minimum/ideal threshold — the reader
  sees "how full vs where the line is" in one glance. Drops the multi-segment
  grammar entirely.
- **Wider segments + contrast:** if the multi-segment breakdown carries
  information worth keeping, widen the bar and increase inter-segment
  contrast / spacing so thin segments stay distinguishable.
- **Reuse the SAM-table bond chip language:** the SAM table already encodes
  bond health as a colour + dot + label (`BOND_CHIP` in
  `src/components/sam-table/sam-table.tsx`). The bonds-table gauge could
  adopt the same vocabulary instead of a bespoke bar.

Prefer the single-fill + threshold marker unless the multi-segment data is
load-bearing — a deliberate visual pass should confirm which on the real
table.

## Acceptance

- Bond health is legible at a glance without inspecting individual segments.
- Thin/edge values remain distinguishable (no sub-pixel bands).
- Consistent with the VISUALS.md bond-tier language; update VISUALS.md if the
  gauge token/primitive changes.

**Where:** `src/components/validator-bonds-table/` — the gauge / coverage bar;
`src/services/bond-health.ts` (`BondHealthState`) for the health colour;
`VISUALS.md` (bond-tier gauge entry).
