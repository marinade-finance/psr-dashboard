# PSR Dashboard Guide

The PSR (Protected Staking Rewards) Dashboard shows Marinade's stake distribution system. Displays DS SAM max yield auction results, validator bonds on-chain, and protected events.

---

## Data Sources

Aggregates data from multiple Marinade APIs:

| API                  | Endpoint                                                                                                     | Purpose                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Validators API       | [`validators-api.marinade.finance/validators`](https://validators-api.marinade.finance/docs)                 | Validator information, commissions, stake amounts (updated once per hour)   |
| Validator Bonds API  | [`validator-bonds-api.marinade.finance/bonds`](https://validator-bonds-api.marinade.finance/docs)            | Bond balances, configurations, commission overrides (updated once per hour) |
| Protected Events API | [`validator-bonds-api.marinade.finance/protected-events`](https://validator-bonds-api.marinade.finance/docs) | Settlement claims and protected event history (updated once per epoch)      |
| Scoring API          | [`scoring.marinade.finance/api/v1/scores/sam`](https://scoring.marinade.finance/api/v1/scores/sam/last)      | Validator scores and bid penalties (updated once per epoch)                 |

Auction calculations are performed client-side using the
[`@marinade.finance/ds-sam-sdk`](https://github.com/marinade-finance/ds-sam/tree/main/packages/ds-sam-sdk) package.

---

## Dashboard Tabs

### Stake Auction Marketplace

Shows current auction results and validator rankings. Displays stake distribution among validators based on bids and performance.

**Key Metrics:**

- **Total Auction Stake** &mdash; Total SOL distributed by Marinade via SAM
- **Winning APY** &mdash; Estimated APY of the last validator winning the auction
- **Projected APY** &mdash; Expected staker return based on total revenue from all winning validators
- **Winning Validators** &mdash; Count of validators receiving stake in current auction

**Simulation Mode:** Click "Enter Simulation" to test parameter changes and their effect on auction position. Edit commission rates or bid amounts, click "Simulate" to see projected results.

### Protected Events

History of protected staking events by epoch. Shows situations where validators experienced issues (slashing, downtime) and the bond system compensated delegators.

**Event Status Types:**

Events display without a badge once settled. Special badges indicate:

- **ESTIMATE** &mdash; Event is projected and pending settlement
- **DRYRUN** &mdash; Test event, no actual settlement occurs

### Validator Bonds

All [validator bonds](https://github.com/marinade-finance/validator-bonds/tree/main/packages/validator-bonds-cli#core-concepts) and their protection coverage. Shows bond amounts, protected stake limits, and maximum protection capacity per validator.

---

## Stake Auction Marketplace

Marinade's transparent delegation system. Each epoch, validators compete for stake allocation through a last-price auction mechanism.

### How the Auction Works

1. **Validators submit bids** &mdash; Either as static bids (fixed cost per 1000 SOL per epoch) or dynamic commission bids (percentage of rewards)
2. **Ranking by yield** &mdash; Validators are ranked by the APY they offer to stakers
3. **Stake distribution** &mdash; Marinade allocates stake to highest-yielding validators while respecting decentralization constraints
4. **Last-price settlement** &mdash; All winning validators pay the same effective rate (the bid of the last validator to receive stake)

### Bidding Options

Validators can use two complementary bidding methods:

**Static Bid (CPMPE)** &mdash; Cost Per Mille Per Epoch

- Fixed payment per 1000 SOL delegated per epoch
- Deducted from validator's bond
- Cost independent of reward fluctuations

**Dynamic Commission Bid**

- Percentage of actual rewards
- Covers inflation rewards, MEV rewards, and block rewards
- Each set independently via bond configuration

Both methods can be combined. Effective bid combines all components for auction ranking.

### Table Columns

| Column         | Description                                                              |
| -------------- | ------------------------------------------------------------------------ |
| **Validator**  | Vote account public key                                                  |
| **Infl.**      | Inflation commission - percentage of inflation rewards kept by validator |
| **MEV**        | MEV commission - percentage of MEV rewards kept by validator             |
| **Block**      | Block rewards commission - percentage of block rewards kept by validator |
| **St. Bid**    | Static bid per 1000 SOL set in bond configuration                        |
| **Bond**       | Current bond balance in SOL                                              |
| **Max APY**    | Maximum APY offered based on validator's bid and commission settings     |
| **SAM Active** | Currently active stake delegated by SAM                                  |
| **SAM Target** | Target stake based on auction results                                    |
| **Eff. Bid**   | Effective bid combining static bid and commission settings               |

### Participation Requirements

To receive stake via SAM, validators must:

- Create a Protected Staking Rewards (PSR) bond
- Maintain adequate uptime (>80% across recent epochs)
- Keep effective commission within limits (currently 7%)
- Fund bond to cover potential downtime and bid costs

### Stability Mechanisms

**Bid Reduction Penalty** &mdash; Penalties charged from bond when validator significantly reduces bid after receiving stake. Prevents free-riding.

**Undelegation Caps** &mdash; Stake movements rate-limited per epoch to minimize activation/deactivation costs.

---

## Key Concepts

### PMPE (Per Mille Per Epoch)

Revenue measurement per 1000 SOL per epoch.

- Example: 0.1 PMPE = 0.1 SOL earned per 1000 SOL per epoch
- APY conversion: `APY = (1 + PMPE/1000)^182 - 1` where 182 = epochs per year

### Bond

Pre-funded vault validators create to participate in SAM. The bond:

- Covers bid costs (static bids deducted from bond)
- Protects delegators against validator failures
- Required for auction participation

### Effective vs Maximum Bid

- **Maximum Bid**: The full amount a validator offers to pay
- **Effective Bid**: The actual payment, capped at the winning threshold

In a last-price auction, validators may pay less than their maximum bid since all winners pay the clearing price.

---

## Technical Notes

- API data is reloaded periodically by Marinade (typically once per hour for most endpoints)
- Solana epochs last approximately 2.5 days (~182 epochs per year)
- Data refreshes on page load; use browser refresh for latest data
