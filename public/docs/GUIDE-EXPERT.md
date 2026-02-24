# Expert View Guide

See the [Dashboard Guide](#GUIDE) for general documentation.

Additional metrics and columns visible in expert mode.

---

## Expert Metrics

### Ideal APY

Estimated APY of currently active stake. Unlike Projected APY
in basic mode, divides by active stake ratio to show the return
on stake that is actually earning rewards. Assumes no Marinade
fees and that all distributed stake is active.

### Stake to Move

Percentage of total auction stake that needs to be
redistributed to match current auction results. High values
indicate the current on-chain delegation diverges significantly
from the auction's target distribution.

### Avg. Stake

Average SOL stake per winning validator. Calculated as total
auction stake divided by number of winning validators.

### Conc. TVL

Total target stake concentrated in the top 5 validators by
target stake. Shows absolute SOL exposure to the largest
validators, complementing Conc. Risk which shows the APY
impact of their departure.

### Target Protected

Percentage of total SAM target stake with validator bond coverage. Calculated as `1 - (actuallyUnprotectedStake / totalTargetStake)`, where unprotected stake is `max(0, targetStake - (bondCapacity - existingUnprotectedStake))`.

### Target Unprotected

Total SOL where target stake exceeds validator bond-only capacity. Sum of `max(0, targetStake - (bondCapacity - unprotectedStake))` across all validators. Represents stake lacking bond coverage if validators fail to pay bids.

### Conc. Risk (Backstop)

APY impact if top 5 validators by target stake departed. Stake redistributes proportionally to remaining validators. Both APYs use formula `(1 + profit/tvl)^epochsPerYear - 1` with identical TVL. Difference: base profit from all validators at current stake, backstop profit from remaining validators earning on original plus redistributed stake. Result: `backstopAPY - baseAPY`.

- **Positive value** (e.g., +0.18%) &mdash; Departed validators had below-average effective bids; APY improves
- **Negative value** &mdash; Departed validators contributed above-average revenue; APY declines

Measures concentration risk and dependence on largest validators for yield.

### +10% TVL

APY impact if 10% more TVL enters the pool. Computed by re-running the full SAM auction with `marinadeSamTvlSol * 1.1` and `marinadeRemainingSamSol * 1.1`. The auction recalculates constraints (stake caps scale with TVL), re-evaluates all validators, and produces a new stake distribution. Result: `joinAPY - baseAPY` where each APY = `(1 + profit/tvl)^epochsPerYear - 1`.

- **Negative value** (typical, e.g., -0.70%) &mdash; More TVL dilutes per-SOL revenue; validators bid the same but stake is spread across more SOL
- **Near zero** &mdash; Additional TVL unlocks enough new validator capacity to offset dilution

### -10% TVL

APY impact if 10% of TVL leaves the pool. Computed by re-running the full SAM auction with `marinadeSamTvlSol * 0.9` and `marinadeRemainingSamSol * 0.9`. Constraints shrink with TVL (per-validator caps, concentration limits). Result: `leaveAPY - baseAPY`.

- **Positive value** (typical) &mdash; Less TVL concentrates per-SOL revenue; same bids spread over fewer SOL
- **Near zero** &mdash; Reduced capacity offsets the concentration benefit

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
