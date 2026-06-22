---
status: shipped
---

# New UI features — shipped

Open items (PSR pending badge, My Validator pin, forward bond ideal,
notifications grouped by epoch, responsive layout) moved to `1/0-next.md`.

## Epoch Status Badge

Shipped as `EpochMeter` in the global navigation. Displays current-epoch
progress, prior-epoch pending/finalized state, and the next-epoch auction
target.

**Where:** `src/components/epoch-meter/epoch-meter.tsx`,
`src/services/epoch.ts` (`EpochProgress`, `TimelineStage`, `EpochMeterModel`),
mounted in `src/components/navigation/navigation.tsx`.
