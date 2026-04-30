# TODO

## Tooltips

- **Forward-looking penalty estimate** — restore the projected next-epoch
  penalty estimate that used to exist (currently broken). Today the
  exclamation badge / red CTA only reflects penalties already charged; a
  validator who is *about to* fall foul has no warning. Surface in both
  bond-breakdown and SAM Active tooltips so the two stories agree.

- **Hide derived rows in bond breakdown by default** — current 12-row
  density makes validators bounce off the math. Most only need: bond,
  active stake target, gap, top-up amount. Collapse the rest behind a
  "Show details" toggle, or move to expert level. Open question: how
  best to expose summary CTA — possibly a dedicated summary tooltip /
  badge somewhere on the row that aggregates the actionable line from
  all three tooltips (bid-too-low, bond-breakdown, SAM Active) into one
  short status. We don't know the right shape yet.
