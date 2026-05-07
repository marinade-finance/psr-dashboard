# PSR Dashboard Guide

The PSR (Protected Staking Rewards) Dashboard shows Marinade's stake-distribution
system: who is bidding for stake, who has won this epoch's auction, which validators
have bond coverage, and which past epochs triggered protected-event payouts.

The auction itself is recomputed in your browser using the
[`@marinade.finance/ds-sam-sdk`](https://github.com/marinade-finance/ds-sam/tree/main/packages/ds-sam-sdk)
package — every number you see comes from the same algorithm Marinade uses on the
backend.

---

## Data Sources

| API                  | Endpoint                                                                                                     | Purpose                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Validators API       | [`validators-api.marinade.finance/validators`](https://validators-api.marinade.finance/docs)                 | Validator information, commissions, stake amounts (updated once per hour)   |
| Validator Bonds API  | [`validator-bonds-api.marinade.finance/bonds`](https://validator-bonds-api.marinade.finance/docs)            | Bond balances, configurations, commission overrides (updated once per hour) |
| Protected Events API | [`validator-bonds-api.marinade.finance/protected-events`](https://validator-bonds-api.marinade.finance/docs) | Settlement claims and protected event history (updated once per epoch)      |
| Scoring API          | [`scoring.marinade.finance/api/v1/scores/sam`](https://scoring.marinade.finance/api/v1/scores/sam/last)      | Validator scores and bid penalties (updated once per epoch)                 |

---

## The Three Tabs

### Stake Auction Marketplace (home tab)

The current epoch's auction. Shows validators ranked by yield, who's in the winning
set, and what each validator's situation looks like.

**Top metric tiles**

- **Total Auction Stake** — total SOL that SAM is distributing this epoch.
- **Winning APY** — APY of the *last* validator to make the cut. The clearing
  price of the auction.
- **Projected APY** — expected return for stakers across the whole winning set.
- **Winning Validators** — count of validators receiving stake this epoch.
- **Re-delegation** — estimated SOL the protocol will move next epoch toward
  validators that are below their auction target (capped by the rebalancing budget).

**Table columns**

| Column        | What it shows                                                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **#**         | Auction rank (sorted by max APY by default). A horizontal cutoff line marks the boundary between winners and non-winners. Severity icon coloured by tip urgency.                    |
| **Validator** | Name + vote-account address. A red dot signals an active alert.                                                                                                                     |
| **Max APY**   | Highest APY this validator could deliver to stakers given their bid and commission. Hover for the full APY composition (inflation / MEV / block / stake bid).                       |
| **Bond**      | Health chip (Healthy / Watch / Critical) + balance in SOL + runway in epochs `(Nep)` + utilization bar.                                                                             |
| **Stake / Next Δ** | Currently active SAM stake + projected change next epoch (positive = stake arriving, negative = stake leaving).                                                                |
| **Next Step** | Plain-language tip: what's currently the binding constraint (rank, bond, bid) and what action would help.                                                                           |

Click a row to open the **detail panel** on the right.

**Validator detail panel**

The right-side panel has four tabs:

- **Overview** — stake, bond, expected payment, APY composition, simulation form.
- **Payments** — full breakdown of payments to Marinade this epoch: active-stake
  bid, activating-stake bid, all penalties (bid-too-low, blacklist, bond risk
  fee), and any PSR settlement estimates. Each penalty links to its own
  calculation.
- **Bidding** — the SAM revenue calculation: stake math, commissions, bid gap,
  cost computation.
- **Bond** — the bond coverage calculation: minimum and ideal coverage targets,
  top-up amounts to reach each.

There's also a **What-If Simulation** card on the Overview tab. Toggle "Simulate"
on, edit commission percentages or the stake bid PMPE, and the auction re-runs
with your overrides. The table shows the new result with a yellow border around
your validator's row.

When a simulation runs, the table shows:

- **Green-tinted row** — the validator climbed in ranking
- **Red-tinted row** — the validator dropped
- **Grey-tinted row** — position unchanged
- **Ghost row** (strikethrough) — the validator's *original* pre-simulation
  position, shown so you can see the move at a glance

### Protected Events

History of past PSR settlements — epochs where validators triggered the
protection mechanism (downtime, commission hike, etc.) and stakers were
compensated from the validator's bond or, if the bond ran out, from Marinade's
backstop.

**Top metric tiles**

- **Events Protected** — total count of protected events.
- **Validator Bond Paid** — SOL paid out from validators' own bonds.
- **Marinade Paid** — SOL paid out from Marinade's backstop (bond was
  insufficient).
- **Total SOL to Stakers** — sum of the above.
- **Filtered Events** — appears only when a filter narrows the list.

**Table columns**: Validator · Epoch · Reason · Paid Out (SOL + status badge)
· Funded by (Validator Bond / Marinade).

**Status badges**

- **ESTIMATE** — projected settlement, not yet on-chain.
- **DRYRUN** — test event from the pre-launch period; no real payout.
- (No badge) — finalized on-chain settlement.

### Validator Bonds

How much of Marinade's stake is currently bond-protected.

**Coverage hero bar** at the top: percentage of stake covered by bonds, with a
stacked bar showing covered vs uncovered SOL, plus counters for funded bonds and
total bond capacity.

**Tile map**: each validator a coloured tile. Tile colour = coverage tier (none /
<40% / 40–70% / 70–95% / ≥95%). Tile size ∝ √stake. Hover for details.

**Table columns**: Validator · Marinade Stake · Bond Balance · Protected Stake ·
Coverage (bar + percentage).

---

## How the Auction Works

Each epoch, SAM runs a **last-price auction** to allocate stake.

1. **Validators bid.** Two complementary methods, combinable:
   - **Static bid (CPMPE)** — fixed cost per 1000 SOL per epoch, deducted directly
     from the validator's bond. Predictable.
   - **Dynamic commission bid** — percentage of actual rewards (inflation, MEV,
     block rewards) shared with stakers. Each dimension can be set independently.
2. **Validators are ranked by yield to stakers** (max APY).
3. **Stake flows top-down** — Marinade allocates SOL to the highest-yielding
   validators first, respecting decentralization and concentration limits.
4. **All winners pay the clearing price** — the bid of the last validator to make
   the cut. So your effective bid ≤ your max bid.

### Participation requirements

- Active PSR bond (validator created and funded one).
- Adequate uptime (>80% across the last several epochs).
- Effective commission within the SAM cap (currently 7%).
- Bond funded enough to cover potential downtime payouts and bid costs.

### Stability mechanisms

- **Bid-too-low penalty** — if a validator drops their bid significantly after
  receiving stake, a penalty is charged from their bond. Discourages free-riding.
- **Undelegation caps** — stake movement is rate-limited per epoch to keep
  activation/deactivation costs bounded.
- **Natural withdrawals** — roughly 0.7% of TVL leaves the pool each epoch as
  stakers redeem mSOL. These outflows come first from validators that are above
  their auction target; if no one's over-target, they're spread pro-rata.
- **Re-delegation** — undeployed deposits are routed to validators whose target
  exceeds their active stake, capped per epoch.

---

## Key Concepts

### PMPE — Per Mille Per Epoch

Revenue per 1000 SOL per epoch. The unit the auction speaks in.

- 0.1 PMPE = 0.1 SOL earned per 1000 SOL per epoch.
- APY conversion: `APY = (1 + PMPE/1000)^182 − 1` (≈182 epochs per year).

### Bond

A pre-funded vault each validator creates to participate in SAM. Three jobs:

1. Pays static bid costs (CPMPE × stake) every epoch.
2. Backs protected-staking-rewards payouts if the validator under-delivers.
3. Signals commitment.

A validator without a bond cannot receive SAM stake.

### Effective vs maximum bid

- **Maximum bid** — what the validator offers to pay.
- **Effective bid** — what they actually pay. In a last-price auction this is the
  clearing price (the last winner's max bid), so winners frequently pay less than
  they offered.

---

## Technical Notes

- API data is reloaded periodically by Marinade (typically once per hour).
- Solana epochs are roughly 2.5 days (~182 epochs per year).
- The page does not auto-refresh — reload to fetch new data.
- All auction math runs client-side via the SDK. Numbers should match Marinade's
  backend to the SOL.
