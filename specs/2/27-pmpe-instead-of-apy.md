---
status: experiment
---

# PMPE instead of Max APY in the SAM table

**Why:** The SAM table leads with a "Max APY" column. Showing each validator's
Max APY publicly broadcasts their commission+bid strategy — high bidders get
spotted, pressured, and accused of "sharing alpha." Validator feedback (Discord,
2026-05-29) raised this as a reason some validators are reluctant to participate
publicly.

Replacing Max APY with Total PMPE achieves the same bid-positioning utility —
same underlying number — but in a unit that is native to the auction and opaque
to outside observers. A validator reading their own PMPE knows exactly where they
stand; a casual reader cannot as easily convert it to a yield signal to gossip about.

## Hypothesis

PMPE as the primary ranking column reduces the social friction of public
participation without losing the bid-positioning value that Max APY provides
to active validators.

## Experiment scope

A preview deployment with `Max APY` column replaced by `Total PMPE`:

- Column header: "PMPE" (or "Total PMPE")
- Value: `revShare.totalPmpe` formatted to 2 dp
- Sort: same descending order — highest PMPE wins
- APY is still derivable via `(1 + pmpe/1000)^epochsPerYear − 1`; surface it
  on hover or in the validator detail panel, not as the table-leading column

The Winning APY stat in the stats bar and the APY composition card in the detail
panel are unaffected — those are contextual, not the primary sort signal.

## Gate

Must not ship to production until:

1. All open bugs in `bugs.md` are resolved (particularly #41, display/filter
   correctness issues that affect which validators appear in the table).
2. Experiment validated with validator feedback — at least the user-test cohort
   from the May 2026 outreach confirms PMPE is sufficient for self-positioning.

**Where:** `src/components/sam-table/sam-table.tsx` — `maxApy` column header,
cell render, sort comparator; `src/services/sam.ts` — `selectMaxAPY` is the
current value source (replace with `revShare.totalPmpe` for the column).
