# Phase 5 Followups

Status: planned. Deferred non-blocking work from earlier audits.

## SAM stats bar — combined-metric tiles

**Status:** rolled back 2026-05-16 (commit reverting `4d6aac6a`).

The original `4d6aac6a` commit collapsed Winning APY + Projected APY into a
single tile with a `text-[10px]` muted "projected N%" subline, and gave
Re-delegation a "X% of SAM TVL" subline. Net effect: 5 tiles → 4.

The visual didn't land. The subline reads as a typographic afterthought
against the much-larger primary value, the two-number-per-tile rhythm
breaks the otherwise uniform stat row, and the "projected" label is
lost under the dominant Winning figure. Reverted; 5 separate tiles
restored. New order, top-down, by user importance:

1. Re-delegation
2. Winning APY
3. Projected APY
4. Winning Validators
5. Total Auction Stake

### What to try next time

A redesign of the stats row that genuinely conveys related-pair metrics
without sacrificing scannability:

- Two-tile group with a hairline divider — explicit "these belong
  together" container, both numbers at the same primary weight.
- Or a small inline pill on the primary metric that links to the
  paired one (e.g. Winning APY tile carries a `Projected →` chip that
  scrolls/highlights the Projected tile).
- For the "% of TVL" share — surface it in the tile's HelpTip rather
  than in the chrome. The HelpTip is exactly the affordance for "where
  does this number sit in the context of the whole?".

Reference commit: `4d6aac6a [sam-table] merge Winning+Projected APY,
add Re-delegation TVL share`. Reference revert: see the commit titled
`[sam-table] revert merged APY tile, swap Re-delegation to first`.
