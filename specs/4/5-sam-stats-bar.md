---
status: partial
---

# SAM stats bar — importance hierarchy + further collapse

**Why:** the stats row has 5 equal-weight tiles; some are primary signals (Winning
APY, Re-delegation) and others are secondary context (Projected APY, Winning
Validators, Total Auction Stake). The flat grid makes them visually indistinguishable,
so the most important numbers don't lead.

## Current state (partial)

Compact mode (toggle) already hides Projected APY and Winning Validators, showing
only 3 tiles: Re-delegation, Winning APY, Total Auction Stake. Full view shows all 5
at equal weight in a `grid-cols-3 → md:grid-cols-4 → xl:grid-cols-7` layout.

The compact filter is a blunt instrument — it hides tiles entirely rather than
downplaying them. The result: validators who leave compact off see no importance
signal; validators who turn compact on lose Projected APY entirely even though it
gives useful context.

## Prior attempt (rolled back 2026-05-16)

Commit `4d6aac6a` collapsed Winning + Projected APY into one tile with a `text-[10px]`
subline. Reverted: the subline read as a typographic afterthought and the two-number
rhythm broke the otherwise uniform row.

## Design problem

Two layers of hierarchy needed:

1. **Primary vs secondary:** Winning APY and Re-delegation are the numbers a validator
   acts on. Projected APY, Winning Validators, and Total Auction Stake are supporting
   context. Primary tiles should be visually heavier.

2. **Paired metrics:** Winning APY and Projected APY are related (same unit, compared
   together). Their relationship should be visible without collapsing them into one tile.

## Design directions

- **Size contrast:** primary tiles (Winning APY, Re-delegation) get `text-3xl` value;
  secondary tiles get `text-xl` or a narrower card. Same row, different weights.
- **Paired group:** Winning APY and Projected APY share a card with a hairline divider —
  both at the same weight, explicit grouping. Reduces 5 tiles → 4.
- **HelpTip for context numbers:** % of TVL share (Re-delegation / Total) surfaces in
  the tile's HelpTip tooltip rather than in the chrome — avoids adding a second number
  to the tile value area.
- **Compact = hide secondary, not primary:** compact mode should hide Total Auction Stake
  and Winning Validators (pure context), always show Winning APY, Re-delegation, and
  Projected APY (the three numbers a validator references per epoch).

## Acceptance

- Winning APY and Re-delegation are visually primary (larger or heavier) in full view.
- Projected APY is visible in both full and compact views as a secondary figure.
- Winning Validators and Total Auction Stake are visible in full view, hidden in compact.
- No tile has a `text-[10px]` subline — if two numbers share a tile, they are equal weight.

**Where:** `src/components/sam-table/sam-table.tsx` — `stats` array, grid layout,
compact filter list, tile Card render.
