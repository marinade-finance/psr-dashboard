# Expert View Guide

The expert view shows additional metrics and columns beyond the standard dashboard view.

---

## Expert Metrics

### Target Protected

Percentage of total SAM target delegation covered by validator bonds. Higher values mean more delegated stake has bond protection backing it.

### Unprotected Stake

Total SOL of target delegation that exceeds bond coverage across all validators. This is the aggregate amount of stake that would lack coverage if validators experienced issues.

### Backstop

APY impact if the top 5 validators by target stake left the pool. When validators leave, their stake remains in the pool but their revenue contribution is lost. The metric recalculates projected APY with the remaining validators' revenue against the full TVL.

- **Positive value** (e.g. +0.18%) &mdash; APY would increase if these validators left, meaning their effective bids were below the weighted average
- **Negative value** &mdash; APY would decrease, meaning the validators were contributing above-average revenue

This metric indicates concentration risk &mdash; how dependent the pool's yield is on its largest validators.

### Productive Stake / Active Stake

- **Productive Stake** &mdash; Ratio of stake delegated to validators actively earning rewards
- **Active Stake** &mdash; Ratio of currently activated stake vs total auction stake

---

## Expert Table Columns

Expert view adds these columns to the standard SAM table:

| Column       | Description                                                              |
| ------------ | ------------------------------------------------------------------------ |
| **Score**    | Validator's SAM score combining uptime and performance metrics           |
| **Penalty**  | Bid reduction penalty applied if validator lowered their bid             |
| **Max SAM**  | Maximum stake the validator can receive (limited by TVL cap or bond)     |
| **Eff. Bid** | Effective bid in PMPE after accounting for all commission types          |

---

## Simulation Mode

Available in both basic and expert views. Enter simulation to test parameter changes:

1. Click a validator row to select it for editing
2. Modify commission rates or bid amounts
3. Click "Simulate" to recalculate the auction
4. Results show projected changes to stake distribution and APY
