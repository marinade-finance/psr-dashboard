# PSR Dashboard Guide

The PSR (Protected Staking Rewards) Dashboard provides visibility into Marinade's stake distribution system.
It displays DS SAM max yield auction results, validator bonds on-chain, and protected events.

---

## Data Sources

The dashboard aggregates data from multiple Marinade APIs:

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

The main view showing current auction results and validator rankings. Displays how stake is distributed among
validators based on their bids and performance.

**Key Metrics:**

- **Total Auction Stake** &mdash; Total SOL distributed by Marinade via SAM
- **Winning APY** &mdash; Estimated APY of the last validator winning the auction
- **Projected APY** &mdash; Expected staker return based on total revenue from all winning validators
- **Winning Validators** &mdash; Count of validators receiving stake in current auction

**Simulation Mode:** Click "Enter Simulation" to test how changing a validator's parameters would affect their auction
position. Edit commission rates or bid amounts, then click "Simulate" to see projected results.

When a simulation runs, the table re-sorts with updated auction results. The simulated validator's row shows:

- **Green background** &mdash; Position improved (moved up in ranking)
- **Red background** &mdash; Position worsened (moved down in ranking)
- **Grey background** &mdash; Position unchanged

A **ghost row** appears at the validator's original position with strikethrough styling, showing where the validator
moved from. Ghost rows are non-interactive.

### Protected Events

Shows the history of protected staking events for particular epochs &mdash; situations where validators experienced
issues (slashing, downtime, etc.) and the bond system compensated delegators.

**Event Status Types:**

Events display without a badge once settled. Special badges indicate:

- **ESTIMATE** &mdash; Event is projected and pending settlement
- **DRYRUN** &mdash; Test event, no actual settlement occurs

### Validator Bonds

Displays all [validator bonds](https://github.com/marinade-finance/validator-bonds/tree/main/packages/validator-bonds-cli#core-concepts)
and their protection coverage. Shows effective bond amounts, protected stake limits, and maximum protection capacity
for each validator.

---

## Stake Auction Marketplace

The Stake Auction Marketplace (SAM) is Marinade's transparent delegation system. Each epoch, validators compete for
stake allocation through a last-price auction mechanism.

### How the Auction Works

1. **Validators submit bids** &mdash; Either as static bids (fixed cost per 1000 SOL per epoch) or dynamic commission
   bids (percentage of rewards)
2. **Ranking by yield** &mdash; Validators are ranked by the APY they offer to stakers
3. **Stake distribution** &mdash; Marinade allocates stake to highest-yielding validators while respecting
   decentralization constraints
4. **Last-price settlement** &mdash; All winning validators pay the same effective rate (the bid of the last validator
   to receive stake)

### Bidding Options

Validators can use two complementary bidding methods:

**Static Bid (CPMPE)** &mdash; Cost Per Mille Per Epoch

- Fixed payment per 1000 SOL delegated per epoch
- Deducted directly from the validator's bond
- Predictable cost regardless of reward fluctuations

**Dynamic Commission Bid**

- Percentage-based sharing of actual rewards
- Covers inflation rewards, MEV rewards, and block rewards
- Each can be set independently via bond configuration

Both methods can be combined. The effective bid combines all components to determine auction ranking.

### Table Columns

| Column          | Description                                                                                                                                                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Validator**   | Vote account public key                                                                                                                                                                                                                                                             |
| **Infl.**       | Inflation commission - percentage of inflation rewards kept by validator                                                                                                                                                                                                            |
| **MEV**         | MEV commission - percentage of MEV rewards kept by validator                                                                                                                                                                                                                        |
| **Block**       | Block rewards commission - percentage of block rewards kept by validator                                                                                                                                                                                                            |
| **St. Bid**     | Static bid per 1000 SOL set in bond configuration                                                                                                                                                                                                                                   |
| **Bond**        | Current bond balance in SOL                                                                                                                                                                                                                                                         |
| **Cover. [ep]** | Epochs of bond runway above the minimum required reserve. At zero, Marinade starts undelegating stake and charging fees to cover the costs; negative means the bond is short of the reserve by that many epochs of bid payments. Color: green = 13+, yellow = 6–12, orange = 2–5, red ≤ 1                                         |
| **Max APY**     | Maximum APY offered based on validator's bid and commission settings                                                                                                                                                                                                                |
| **SAM Active**  | Currently active stake delegated by SAM                                                                                                                                                                                                                                             |
| **SAM Target**  | Target stake based on auction results                                                                                                                                                                                                                                               |
| **Eff. Bid**    | Effective bid combining static bid and commission settings                                                                                                                                                                                                                          |

### Participation Requirements

To receive stake via SAM, validators must:

- Create a Protected Staking Rewards (PSR) bond
- Maintain adequate uptime (>80% across recent epochs)
- Keep effective commission within limits (currently 7%)
- Fund bond to cover potential downtime and bid costs

### Stability Mechanisms

**Bid Reduction Penalty** &mdash; Discourages validators from lowering bids after receiving stake. If a validator
reduces their bid significantly, penalties are charged from their bond to prevent free-riding behavior.

**Undelegation Caps** &mdash; Stake movements are rate-limited per epoch to minimize activation/deactivation costs
and maintain stability.

---

## Key Concepts

### PMPE (Per Mille Per Epoch)

Revenue measurement per 1000 SOL per epoch.

- Example: 0.1 PMPE = 0.1 SOL earned per 1000 SOL per epoch
- APY conversion: `APY = (1 + PMPE/1000)^182 - 1` where 182 = epochs per year

### Bond

A pre-funded vault validators create to participate in SAM. The bond:

- Covers bid costs (static bids are deducted from bond)
- Protects delegators against validator failures
- Demonstrates validator commitment to the ecosystem

### Bond Breakdown (Cover. [ep] tooltip)

Hovering the **Cover. [ep]** cell shows a two-section breakdown explaining
the bond state and what a validator should top up. The vocabulary mirrors
the Marinade docs page for the Bond Risk Reduction Mechanism:
[Bond Risk Reduction Mechanism](https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market/bond-risk-reduction-mechanism).

**Terms used in the tooltip**

| Label in tooltip                | SDK field                  | Meaning                                                                                     |
| ------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------- |
| Expected max effective bid      | `expectedMaxEffBidPmpe`    | Maximum bid the validator could be charged this epoch, in PMPE                              |
| On-chain distributed rewards    | `onchainDistributedPmpe`   | Inflation + MEV rewards distributed on-chain (not via bond), in PMPE                        |
| Bond balance                    | `bondBalanceSol`           | Full bond deposit                                                                           |
| Claimable bond balance          | `claimableBondBalanceSol`  | Portion of the bond already available for settlement / fees                                 |
| Activated Marinade stake        | `marinadeActivatedStakeSol`| Currently active Marinade stake on the validator                                            |
| Paid undelegation               | `paidUndelegationSol`      | Stake already force-undelegated but not yet settled &mdash; bid is still owed on it         |
| Protected stake                 | `protectedStakeSol`        | `activated − unprotected`; the portion the bond is responsible for                          |
| SAM target stake                | `marinadeSamTargetSol`     | Stake the auction has assigned to this validator this epoch                                 |

**Section 1 — Minimum Coverage**

Shows whether the **claimable bond balance** covers the minimum obligations
for **activated stake + paid undelegation** across `1 + minBondEpochs`
epochs (the fee threshold, `5` by default). Below this line the validator
is subject to `bondRiskFeeSol` charges and, at the floor, forced
undelegation. Matches the docs' `minBondCoef`:

```
minBondCoef = (onchainDistributedPmpe + (1 + minBondEpochs) × expectedMaxEffBidPmpe) / 1000
```

Row components:

- **On-chain distributed reserve** = `onchainDistributedPmpe/1000 ×
  protectedStake` &mdash; inflation + MEV Marinade must cover each epoch
  for bond-protected stake.
- **Minimum coverage bid × activated stake** = `(1 + minBondEpochs) ×
  expectedMaxEffBidPmpe/1000 × activated stake` &mdash; fee-threshold bid
  reserve on currently active stake.
- **Minimum coverage bid × paid undelegation** = same coefficient applied
  to stake already force-undelegated but not yet settled.

`Minimum required = on-chain reserve + minimum coverage bid (active) +
minimum coverage bid (paid undelegation)`. If the claimable balance is
short, **Top-up to minimum coverage** is what the validator must add *now*
to escape the risk band.

**Section 2 — Ideal Coverage**

Shows how much **bond balance** is required to comfortably sustain the
auction-assigned **SAM target stake** for `1 + idealBondEpochs` epochs (the
runway target, `13` by default). Uses the raw target because this section
is forward-looking: "is the bond large enough to keep receiving new
stake?". Matches the docs' `idealBondCoef`:

```
idealBondCoef = (onchainDistributedPmpe + (1 + idealBondEpochs) × expectedMaxEffBidPmpe) / 1000
```

- **On-chain distributed reserve** at target stake.
- **Ideal coverage bid × SAM target stake** = `(1 + idealBondEpochs) ×
  expectedMaxEffBidPmpe/1000 × target`.
- `Ideal required = on-chain reserve + ideal coverage bid`.
- **To get more stake, top up** = shortfall between the current bond and a
  small cushion above `Ideal required`, so the bond does not dip back below
  ideal after a few epochs of bid drain.

The column value `Cover. [ep]` is derived from
`bondGoodForNEpochs` (from the ds-sam-sdk), computed against
`marinadeActivatedStakeSol`. It represents epochs of runway *above the
fee threshold*. Zero or negative means the bond is below minimum coverage
and `bondRiskFeeSol` applies.

### Effective vs Maximum Bid

- **Maximum Bid**: The full amount a validator offers to pay
- **Effective Bid**: The actual payment, capped at the winning threshold

In a last-price auction, validators may pay less than their maximum bid since all winners pay the clearing price.

---

## Technical Notes

- API data is reloaded periodically by Marinade (typically once per hour for most endpoints)
- Solana epochs last approximately 2.5 days (~182 epochs per year)
- Data refreshes on page load; use browser refresh for latest data
