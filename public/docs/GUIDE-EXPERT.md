# Expert View Guide

The expert view shows additional metrics and columns beyond the standard dashboard view.

---

## Expert Metrics

### Target Protected

Percentage of total SAM target stake where validator bond coverage exceeds unprotected stake thresholds. Calculated as `1 - (actuallyUnprotectedStake / totalTargetStake)`, where unprotected stake is `max(0, targetStake - (bondCapacity - existingUnprotectedStake))`.

### Unprotected Stake

Total SOL where target stake exceeds validator bond-only capacity. Sum of `max(0, targetStake - (bondCapacity - unprotectedStake))` across all validators. Represents stake lacking bond coverage if validators fail to pay bids.

### Backstop

APY impact if the top 5 validators by target stake departed. Calculates `backstopAPY - baseAPY` where backstop APY excludes revenue from the 5 largest validators but keeps their stake in TVL. Formula: `(1 + remainingProfit/tvl)^epochsPerYear - 1 - baseAPY`.

- **Positive value** (e.g. +0.18%) &mdash; Departed validators had below-average effective bids; APY improves
- **Negative value** &mdash; Departed validators contributed above-average revenue; APY declines

Measures concentration risk: dependence on largest validators for yield.

### Productive Stake / Active Stake

- **Productive Stake** &mdash; Ratio of activated stake on validators paying ≥90% of their effective participating bid. Measures stake delegated to validators meeting revenue commitments.
- **Active Stake** &mdash; Ratio of currently activated stake vs total target auction stake (marinadeSamTargetSol)

---

## Expert Table Columns

Expert view adds these columns to the standard SAM table:

| Column       | Description                                                              |
| ------------ | ------------------------------------------------------------------------ |
| **Score**    | SAM eligibility score (0-1) from uptime and performance metrics          |
| **Penalty**  | Bid reduction multiplier applied when validator decreases bid            |
| **Max SAM**  | Maximum marinadeSamTargetSol capped by maxTvlDelegation or bond capacity |
| **Eff. Bid** | Auction effective bid PMPE: `auctionEffectiveBidPmpe` after commissions  |

---

## Simulation Mode

Available in both basic and expert views. Enter simulation to test parameter changes:

1. Click a validator row to select it for editing
2. Modify commission rates or bid amounts
3. Click "Simulate" to recalculate the auction
4. Results show projected changes to stake distribution and APY
