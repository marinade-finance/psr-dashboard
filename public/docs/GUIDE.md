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

- **Stake To Distribute** &mdash; Stake cooled down in the previous epoch and available to re-delegate next epoch
- **Winning APY** &mdash; Estimated APY of the last validator winning the auction
- **Projected APY** &mdash; Estimated APY of currently active stake
- **Total Auction Stake** &mdash; Total SOL distributed by Marinade via SAM
- **Winning Validators** &mdash; Validators receiving stake in current auction, shown as `won / total` (e.g. `46 / 759`)
- **Top Countries** &mdash; The three countries holding the largest share of SAM-distributed stake,
  with each row showing the country name, a bar proportional to its share, and the percentage.
  A row marked **(capped)** in red means at least one validator in that country had its stake
  cut by the country concentration cap that SAM enforces. Hover the card for the full list
  (all countries with validator counts, stake, share, and cap status).
- **Top ASOs** &mdash; Same breakdown grouped by ASO (Autonomous System Operator &mdash; the
  hosting provider or network operator). SAM also caps stake concentration per ASO to prevent
  operator-level risk; (capped) rows have at least one validator hit by the ASO cap.

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

### What Gets Charged Each Epoch

A validator pays bids on two stake buckets, both visible in the **SAM Active** tooltip
under "Charge this epoch":

- **Active charge** &mdash; bid paid on currently activated Marinade stake
  (`marinadeActivatedStakeSol`), at the effective bid rate (Eff. Bid PMPE).
- **Activating charge** &mdash; bid paid on stake that is being activated *into* the
  validator this epoch (the positive expected delta toward SAM Target), at
  `revShare.activatingStakePmpe = max(0, bidPmpe − auctionEffectiveBidPmpe)`. The
  charge scales with the gap between St. Bid and Eff. Bid so a validator can't dodge
  bid costs on freshly delegated stake. See the
  [Activating Stake Fee docs](https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market/activating-stake-fee).

The **Total Charge** row sums both. Both are deducted from the validator's bond.

### Table Columns

| Column          | Description                                                                                                                                                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Validator**   | Vote account public key                                                                                                                                                                                                                                                             |
| **St. Bid**     | Static bid per 1000 SOL set in bond configuration. Hover the SAM Active cell for the full breakdown: Stake, Commissions, and Charge this epoch (St. Bid, Eff. Bid, Activating charge, Active charge, Total Charge) |
| **Bond [☉]**    | Current bond balance in SOL                                                                                                                                                                                                                                                         |
| **Cover. [ep]** | Epochs of bond runway above the minimum required reserve. At zero, Marinade starts undelegating stake and charging fees to cover the costs; negative means the bond is short of the reserve by that many epochs of bid payments. Color: green = 13+, yellow = 6–12, orange = 2–5, red ≤ 1 |
| **Max APY**     | Maximum APY offered based on validator's bid and commission settings                                                                                                                                                                                                                |
| **SAM Active [☉]** | Currently active stake delegated by SAM. A large colored arrow (↑ green / ↓ red) flags an expected stake change next epoch; hover for SAM Active now, SAM Target, and the expected delta |

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
- APY conversion: `APY = (1 + PMPE/1000)^epochsPerYear - 1`. `epochsPerYear` is
  measured dynamically from recent on-chain epoch timestamps via
  `estimateEpochsPerYear` (typically ~182; the static fallback
  `seconds_per_year / (0.4s × 432000 slots)` ≈ 182.6 applies only when on-chain
  data is unavailable)

### Bond

A pre-funded vault validators create to participate in SAM. The bond:

- Covers bid costs (static bids are deducted from bond)
- Protects delegators against validator failures
- Demonstrates validator commitment to the ecosystem

### Bond Breakdown (Cover. [ep] tooltip)

Hovering the **Cover. [ep]** cell shows a three-section breakdown
explaining the bond state and what a validator should top up. A header
CTA summarises the bond status; if the status message has multiple
sentences, the earlier ones render small and muted while the final
sentence is the prominent call-to-action.

**Terms used in the tooltip**

| Label in tooltip                | SDK field                  | Meaning                                                                                     |
| ------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------- |
| Expected max effective bid PMPE | `expectedMaxEffBidPmpe`    | The expected maximum bid the validator could be charged this epoch, in PMPE                 |
| On-chain distributed rewards PMPE | `onchainDistributedPmpe` | Inflation + MEV rewards distributed on-chain (not via bond), in PMPE                        |
| Bond balance                    | `bondBalanceSol`           | Full bond deposit                                                                           |
| Claimable bond balance          | `claimableBondBalanceSol`  | Portion of the bond already available for settlement / fees                                 |
| Activated Marinade stake        | `marinadeActivatedStakeSol`| Currently active Marinade stake on the validator                                            |
| SAM target stake                | `marinadeSamTargetSol`     | Stake the auction has assigned to this validator this epoch                                 |
| Projected exposed stake         | `projectedExposedStakeSol` | `max(0, projectedActivated − unprotectedStakeSol)` where `projectedActivated = max(0, activated − carriedPaidUndelegation)`; computed locally, the portion the bond has to cover |

**Section 1 — Rates**

A small two-column table (label / PMPE) listing the two PMPE rates fed
into both coverage calculations: `Expected max effective bid PMPE` and
`On-chain distributed rewards PMPE`.

**Section 2 — Minimum Coverage (1 + minBondEpochs epochs)**

Shows whether the **claimable bond balance** covers the minimum
obligations across `1 + minBondEpochs` epochs (the fee threshold, per
current protocol config). At or below this line the validator is
subject to `bondRiskFeeSol` charges and forced undelegation.

The section uses small column headers (label / ☉ stake / ☉ pay). Rows
that scale with stake show **Projected exposed stake** in the middle
column (i.e. the multiplier value in ☉) instead of literal "× projected
exposed stake" suffix text. Rows, in order: claimable bond balance
(bold), activated Marinade stake, projected exposed stake, minimum
unprotected reserve, on-chain distributed reserve, minimum coverage
bid, then **Minimum required** (bold). When short, the final row is
**Top-up to minimum coverage**; otherwise an OK row confirms the
minimum is met.

**Section 3 — Ideal Coverage (1 + idealBondEpochs epochs)**

Shows how much **bond balance** is required to comfortably sustain the
projected exposed stake for `1 + idealBondEpochs` epochs (the runway
target, per current protocol config). When the validator is not in the
current auction (`marinadeSamTargetSol <= 0`), this section collapses
to a single OK row: "Not in current auction — ideal coverage not
applicable."

The actual ideal-coverage calculation uses
`projectedExposedStakeSol` (the same multiplier as the minimum
section); **Activated Marinade stake**, **SAM target stake**, and
**Max (activated, target)** rows are shown as informational basis
context, not as multipliers in the calc. The coefficient applied to
`expectedMaxEffBidPmpe` over `1 + idealBondEpochs` epochs is the
protocol's ideal-coverage coefficient &mdash; see [idealBondCoef in
the BRRM docs](https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market/bond-risk-reduction-mechanism#ideal-bond-coef).

Rows, in order: bond balance (bold), activated Marinade stake, SAM
target stake, Max (activated, target), projected exposed stake, ideal
unprotected reserve, on-chain distributed reserve, ideal coverage bid,
then **Ideal required** (bold). As in Section 2, rows that scale with
stake show the projected exposed stake value in the middle column
rather than a textual suffix.

**To get more stake, top up** is the shortfall between the current
bond and `Ideal required`. Topping up beyond that is advisable so the
bond does not dip back below ideal after a few epochs of bid drain.

The column value `Cover. [ep]` is derived from
`bondGoodForNEpochs`, computed against
`marinadeActivatedStakeSol`. Note that `bondGoodForNEpochs` uses the full
`bondBalanceSol` (not just the claimable portion) as the runway base. It
represents epochs of runway *above the fee threshold*. Zero or negative
means the bond is below minimum coverage and `bondRiskFeeSol` applies.

### Effective vs Maximum Bid

- **Maximum Bid**: The full amount a validator offers to pay
- **Effective Bid**: The actual payment, capped at the winning threshold

In a last-price auction, validators may pay less than their maximum bid since all winners pay the clearing price.
Activating stake is charged separately at rate equal to St. Bid − Eff. Bid — see the
[Activating Stake Fee docs](https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market/activating-stake-fee).

---

## Technical Notes

- API data is reloaded periodically by Marinade (typically once per hour for most endpoints)
- Solana epochs last approximately 2 days (~48 hours, ~182 epochs per year);
  the dashboard measures the actual rate dynamically per `estimateEpochsPerYear`
- Data refreshes on page load; use browser refresh for latest data
