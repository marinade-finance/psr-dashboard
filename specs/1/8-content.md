---
status: shipped
---

# Content and documentation — shipped

## CPMPE → Cost PMPE rename

Oracle verdict: the C-prefix is a UI smell — directional distinction is
load-bearing but should be natural language, not a single-letter prefix.

Renamed user-facing label from `CPMPE` to `Cost PMPE` everywhere:
`public/docs/GUIDE.md`, `public/docs/GUIDE-EXPERT.md`,
`src/services/sam.ts` (column header string),
`src/components/breakdowns/bidding.tsx` (tooltip).
Internal identifier `cpmpe` in code is unchanged.

## Natural turnover rate

`WITHDRAWAL_FRACTION_PER_EPOCH = 0.01` (`src/services/sam.ts`) — 1%
redelegation-turnover cap per epoch. Not SDK-exported; comment notes this
until the SDK exposes it. `GUIDE.md` updated to match.
