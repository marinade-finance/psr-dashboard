---
status: shipped
---

# Queued fixes — shipped

Shipped items from the original queued-fixes batch. Open items (test-page
parity, `assertNever` extraction candidate) moved to `1/0-next.md`.

- **Rounding / decimal-places** — `bondSol()` (1-dp, round down) and `topUp()`
  (ceil) in `src/format.ts`. All breakdown call sites migrated.
- **"Your bid today" rename** — `src/components/breakdowns/bidding.tsx:130`.
- **Total/SectionHeader margins** — `TOTAL_CELL_PAD = 'pt-3 pb-2'` in
  `src/components/breakdowns/row.tsx:13`.
- **Gauge 20% debate resolved** — `BOND_CRITICAL_FRAC = 0.2` fixed constant;
  `bondGaugeScaleMax = minBondEpochs / 0.20` in `src/services/calculations.ts`.
- **Sim ring wraps broadcast banner** — `stake-auction-marketplace.tsx:233-260`.
- **Cap CTA reworded** — `capCauseLine()` in `src/services/tip-engine.ts`;
  no vote account in text.
- **3-col CalcRow model uniform** — all four breakdowns use `CalcRow` only;
  `RevRow` is gone.
- **Bond gauge critical band** — `marker = criticalBand = BOND_CRITICAL_FRAC`
  derived from one constant at `sam-table.tsx:866-868`.
- **Avoid-fee CTA in CRITICAL state when fee = 0** — `bondAdvice()` in
  `src/services/tip-engine.ts:166-196` gates avoid-fee wording on
  `bondRiskFeeSol > 0`; falls through to keep-stake / ideal top-up / generic
  runway warning when the fee isn't actually being charged.
- **Tooltip singleton + click-outside dismiss** — `HelpTip` rewritten with a
  module-level pinned-id singleton; Radix `Tooltip` for hover; mousedown +
  Esc dismiss. `src/components/help-tip/help-tip.tsx`.
- **/test- simulation collapses table to 2 rows** — root cause was
  `passesTableFilter` using `bondGoodForNEpochs < minBondEpochs`, which
  `Auction.evaluate()` recomputes from synthetic bonds. Fix filters on
  `bondBalanceSol < minBondBalanceSol` instead. `sam-table.tsx:156`.
