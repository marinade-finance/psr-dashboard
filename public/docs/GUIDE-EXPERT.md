# Expert View Guide

Additional metrics and columns beyond the standard view.

---

## Expert Metrics

### Target Protected

Percentage of total SAM target stake with validator bond coverage. Calculated as `1 - (actuallyUnprotectedStake / totalTargetStake)`, where unprotected stake is `max(0, targetStake - (bondCapacity - existingUnprotectedStake))`.

### Unprotected Stake

Total SOL where target stake exceeds validator bond-only capacity. Sum of `max(0, targetStake - (bondCapacity - unprotectedStake))` across all validators. Represents stake lacking bond coverage if validators fail to pay bids.

### Backstop

APY impact if top 5 validators by target stake departed. Stake redistributes proportionally to remaining validators. Both APYs use formula `(1 + profit/tvl)^epochsPerYear - 1` with identical TVL. Difference: base profit from all validators at current stake, backstop profit from remaining validators earning on original plus redistributed stake. Result: `backstopAPY - baseAPY`.

- **Positive value** (e.g., +0.18%) &mdash; Departed validators had below-average effective bids; APY improves
- **Negative value** &mdash; Departed validators contributed above-average revenue; APY declines

Measures concentration risk and dependence on largest validators for yield.

### +10% TVL

APY impact if 10% more TVL joins and distributes proportionally to current active stake. Assumes validators maintain current earning rates on increased stake. Recalculates profit based on validators earning at same rates on 1.1x their active stake. Formula: `joinAPY - baseAPY` where `joinAPY = (1 + joinProfit / joinTVL)^epochsPerYear - 1`.

### -10% TVL

APY impact if 10% of TVL leaves the pool. Removes validators from bottom (by target stake) until 10% TVL is gone. Profit decreases (removed validators no longer earning) and TVL decreases. Result: `leaveAPY - baseAPY`.

- **Positive value** &mdash; Removed validators had below-average effective bids; APY improves
- **Negative value** &mdash; Removed validators contributed above-average revenue; APY declines

### Productive Stake / Active Stake

- **Productive Stake** &mdash; Ratio of activated stake on validators paying ≥90% of effective participating bid. Measures stake delegated to validators meeting revenue commitments.
- **Active Stake** &mdash; Ratio of currently activated stake vs total target auction stake (marinadeSamTargetSol)

---

## Expert Table Columns

| Column      | Description                                                              |
| ----------- | ------------------------------------------------------------------------ |
| **Score**   | SAM eligibility score (0-1) from uptime and performance metrics          |
| **Penalty** | Bid reduction multiplier applied when validator decreases bid            |
| **Max SAM** | Maximum marinadeSamTargetSol capped by maxTvlDelegation or bond capacity |
