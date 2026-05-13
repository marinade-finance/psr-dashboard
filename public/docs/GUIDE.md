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

The detailed column reference is in [Auction Table Columns](#auction-table) and
the side panel in [Validator Detail Panel](#detail-panel).

### Protected Events

History of past PSR settlements — epochs where validators triggered the
protection mechanism (downtime, commission hike, etc.) and stakers were
compensated from the validator's bond or, if the bond ran out, from Marinade's
backstop.

**Top metric tiles**

- **Events** — count of protected events. When a validator or epoch filter
  is active, the primary number is the filtered subset and the subline shows
  `of N total`.
- **Amount** — total SOL paid out to stakers. Same filter behaviour as Events.
  Below the value, a Bond / Marinade split bar shows what fraction came from
  validator bonds vs. Marinade's backstop (hover for exact SOL).
- **Last settled epoch** — most recent epoch where settlements have been
  finalised on-chain.

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

<a id="sam"></a>
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

- **Bid-too-low penalty** — see [Bid-Too-Low Penalty](#bid-penalty).
- **Blacklist penalty** — see [Blacklist Penalty](#blacklist-penalty).
- **Bond risk fee** — see [Bond Risk Fee](#bond-risk-fee).
- **Undelegation caps** — stake movement is rate-limited per epoch to keep
  activation/deactivation costs bounded. See [Re-delegation](#redelegation).
- **Natural withdrawals** — roughly 0.7% of TVL leaves the pool each epoch as
  stakers redeem mSOL. These outflows come first from validators that are above
  their auction target; if no one's over-target, they're spread pro-rata.

_See [Stake Auction Marketplace — Marinade Docs](https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market#stake-auction-marketplace) for the full protocol spec._

---

## Key Concepts

<a id="cpmpe"></a>
### PMPE / CPMPE — Per Mille Per Epoch

PMPE measures revenue per 1000 SOL per epoch. The unit the auction speaks in.

- **PMPE** — generic per-1000-SOL-per-epoch number. Used for every revenue stream
  (inflation, MEV, block rewards, stake bid).
- **CPMPE** — *cost* per 1000 SOL per epoch. The validator's static bid component:
  a fixed amount the validator pays out of their bond for every 1000 SOL of stake
  they receive, every epoch.
- **0.1 PMPE = 0.1 SOL earned per 1000 SOL per epoch.**
- **APY conversion**: `APY = (1 + PMPE/1000)^182 − 1` (≈182 epochs per year).

A validator's **max APY** in the table is the sum of all PMPE streams converted
to APY, with the static CPMPE bid mixed in.

_See [Last-Price Auction — Marinade Docs](https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market#last-price-auction) for how PMPE feeds the clearing price._

<a id="last-price"></a>
### Effective vs Maximum Bid (Last-Price Clearing)

SAM clears as a **uniform-price (last-price) auction**:

- **Maximum bid** — what the validator offers to pay. This is what they configure.
- **Clearing price** — the maximum bid of the *last* validator that made the cut
  (the lowest winner). Shown on the table cutoff line as **Winning APY**.
- **Effective bid** — what they actually pay. Equal to the clearing price for
  every winner. Winners frequently pay strictly less than they offered.

This is what makes it safe for high-yield validators to bid aggressively: bidding
high only sharpens your rank, it doesn't increase what you pay if you win.

_See [Last-Price Auction — Marinade Docs](https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market#last-price-auction)._

<a id="commissions"></a>
### Inflation, MEV, and Block-Rewards Commissions (Dynamic Bid)

The dynamic-bid component is split across three commission dimensions, each set
independently per validator:

- **Inflation commission** — fraction of inflation rewards the validator keeps
  before passing the rest to stakers. Lower = better APY for the stake pool.
- **MEV commission** — same, applied to MEV (Jito) tips.
- **Block-rewards commission** — same, applied to priority-fee revenue.

The **effective commission** the auction reads is the share that flows back to
stakers across all three streams, weighted by the validator's actual reward mix.
A validator with high inflation rewards but no MEV will be valued differently
from a high-MEV validator at the same headline commission.

The dashboard's What-If Simulation lets you tweak each commission independently
and watch the validator's rank shift; see [Simulation Mode](#simulation).

_See [How to participate — Marinade Docs](https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market#how-to-participate-in-the-stake-auction-marketplace) for the participation rules and commission caps._

<a id="bond"></a>
### Validator Bonds

A bond is a pre-funded vault each validator creates to participate in SAM. It has
three jobs:

1. Pays static bid costs (CPMPE × stake) every epoch.
2. Backs Protected Staking Rewards payouts if the validator under-delivers (see
   [PSR](#psr)).
3. Signals commitment.

A validator without adequate bond coverage cannot receive SAM stake.

#### Three balance/coverage concepts that confuse people

**Claimable bond balance vs total bond balance.** The total bond balance is the
SOL deposited into the bond account. The *claimable* balance is what's
realistically available to pay penalties and PSR claims after subtracting
amounts already committed to in-flight settlements. Coverage math uses the
claimable balance.

**Current vs projected exposed stake.** Current exposed stake is
`activated − unprotected` — the stake the bond must cover for next
epoch's stake-keep decision. Projected exposed stake subtracts pending
paid undelegations on top, so it's always ≤ current. The projected
figure is what the [Bond Risk Fee](#bond-risk-fee) trigger and amount
are computed against — using the smaller number means stake already
on its way out doesn't inflate the fee.

**Minimum vs ideal coverage.** *Minimum coverage* is the threshold at
which the SDK starts charging the [Bond Risk Fee](#bond-risk-fee) and
forcing paid undelegations: when `claimableBond − minUnprotectedReserve
< projectedExposedStake × minBondPmpe / 1000`. *Ideal coverage* is a
larger buffer above the minimum — bond below it doesn't trigger a fee
but the SAM auction won't award additional stake until coverage clears
the ideal line. The Bond tab shows the top-up to reach each level.

_See [Setup for Validators — Marinade Docs](https://docs.marinade.finance/marinade-protocol/protocol-overview/protected-staking-rewards#setup-for-validators) for the bond contract and PSR mechanics._

<a id="bond-risk-fee"></a>
### Bond Risk Fee

A per-epoch fee charged when the claimable bond cannot cover the
projected exposed stake at the minimum-bond rate.

- **Trigger.** `claimableBond − minUnprotectedReserve < projectedExposedStake
  × minBondPmpe / 1000`. Above this line: no fee.
- **Amount.** Scales with how far below the minimum the bond sits and
  with the validator's revenue rate (`onchainDistributed + auctionEffectiveBid`
  PMPE). The SDK also forces a matching paid undelegation. The in-app
  **Bond** tab shows the exact figures via "See full bond coverage
  breakdown".

_See [Stronger Bond Signals and a New Risk Fee in SAM — Marinade Blog](https://marinade.finance/blog/stronger-bond-signals-and-a-new-risk-fee-in-sam) for context._

<a id="bid-penalty"></a>
### Bid-Too-Low Penalty

If a validator drops their bid significantly mid-epoch — after stake has already
been allocated based on a higher bid — a penalty is charged from their bond. This
discourages "bait-and-switch" bidding where a validator wins stake at a high
advertised bid, then immediately lowers it.

- **Trigger.** The validator's currently-active bid is meaningfully lower than
  the bid that won them stake at the start of the epoch. Small reductions are
  tolerated.
- **How the SOL amount is computed (plain language).** It's the gap between the
  bid the validator promised when winning stake and the bid they're actually
  paying, applied to the activated stake for the duration the discrepancy lasts.
  The in-app **Bid Penalty** tab shows the exact components.

_See [Bid Reduction Penalty — Marinade Docs](https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market#bid-reduction-penalty)._

<a id="blacklist-penalty"></a>
### Blacklist Penalty

Charged when a validator is on Marinade's blacklist (commission abuse, behavioural
issues flagged by governance, etc.) but still holds Marinade stake. The penalty
exists to recover stake-pool revenue that the validator should not have been
earning.

- **Trigger.** Validator address present on the active blacklist while still
  having Marinade stake on epoch boundary.
- **How the SOL amount is computed (plain language).** A multiple of the
  validator's normal bid revenue for the affected stake, designed to make
  remaining on the blacklist economically punishing rather than merely
  reputational. The breakdown is on the **Payments** tab of the validator
  detail panel.

_See [Blacklist Policy — Marinade Docs](https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market#blacklist-policy)._

<a id="redelegation"></a>
### Re-delegation and Undelegation Caps

Stake doesn't teleport between validators. Each epoch, Marinade can only move a
bounded amount of SOL:

- **Re-delegation budget** — undeployed deposits and stake withdrawn from
  over-target validators are routed to validators whose auction target exceeds
  their active stake. The total amount moved per epoch is capped to keep
  activation/deactivation costs bounded.
- **Withdrawal priority** — when stakers redeem mSOL (~0.7% of TVL per epoch),
  the SOL leaves over-target validators first. Validators sitting at or below
  target are protected from forced withdrawals as long as anyone is over-target.
- **Why "Next Δ" might be smaller than (target − active).** Because the
  rebalancing budget is shared across the whole pool. A validator far below
  target won't close the entire gap in one epoch.

_See [Stake Matching — Marinade Docs](https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market#stake-matching) for the rebalancing algorithm._

<a id="psr"></a>
### Protected Staking Rewards (PSR)

PSR is the user-facing guarantee: if a validator under-delivers (downtime,
commission hike, etc.), the affected stakers are made whole from the validator's
bond. If the bond is insufficient, Marinade's backstop covers the remainder —
which is *also* why under-collateralized bonds are penalised (see
[Bond Risk Fee](#bond-risk-fee)).

The Protected Events tab shows the history of every PSR settlement, including
which were paid by the validator's bond vs Marinade's backstop.

_See [How Protected Staking Rewards work — Marinade Docs](https://docs.marinade.finance/marinade-protocol/protocol-overview/protected-staking-rewards#how-protected-staking-rewards-work) for the protection guarantee, settlement flow, and bond requirements._

---

<a id="auction-table"></a>
## Auction Table Columns

The SAM table is the centrepiece of the home tab. Every column, in order:

### `#` — Auction rank

The validator's position in the auction order, sorted by max APY by default.

- A horizontal **Winning Set Cutoff** line marks the boundary between winners
  and non-winners. Above the line → receiving stake this epoch.
- Hovering shows the cutoff-relative offset (`+N` above, `-N` below).
- A small **severity icon** appears next to the rank. Its colour is the
  validator's tip urgency (red = critical action required, yellow = needs
  attention, grey = nothing pressing).

### `Validator` — Identity

Validator name, vote-account address (truncated, click to copy), and a small
red dot if the validator currently has an active alert (depleted bond, blacklist
flag, large bid drop, etc.).

### `Max APY` — Maximum APY to stakers

The highest APY this validator could deliver to stakers given their current
bid and commissions. This is what the auction sorts by.

- Hover the cell to see the **APY composition tooltip** — inflation share,
  MEV share, block-rewards share, and the stake-bid contribution, each as
  a separate PMPE line.
- This is the *maximum* yield. The actual yield to stakers (after the
  clearing-price discount) is the **Winning APY** shown on the cutoff line.

### `Bond` — Bond chip

A compact summary of the validator's bond:

- **Health pill** — colour-coded status:
  - **Healthy** (green) — bond comfortably above ideal coverage.
  - **OK** (muted) — bond covers current stake but not the ideal target;
    validator is fine but not eligible for more stake.
  - **Watch** (yellow) — bond can no longer back the validator's current
    stake; some stake will be undelegated unless the bond is topped up.
  - **Critical** (red) — bond is below the penalty threshold. The bond
    risk fee is being charged this epoch. See [Bond Risk Fee](#bond-risk-fee).
- **Balance** — bond size in SOL.
- **Runway** — `(Nep)` shows how many epochs the bond will last at the current
  burn rate (CPMPE bid + risk fee). `(0ep)` or "Depleted" means out of money
  imminently.
- **Utilization bar** — tiny progress bar showing how much of the bond's
  protective capacity is currently in use.

### `Stake / Next Δ` — Active and projected stake

Two numbers stacked:

- **Top:** currently active SAM stake (SOL).
- **Bottom (Δ):** projected stake change next epoch.
  - **Positive (green)** — stake arriving (capped by the redelegation budget).
  - **Negative (red)** — stake leaving (natural withdrawals or auction loss).
  - **`0`** — exactly zero (not "no data" — the page distinguishes).

See [Re-delegation](#redelegation) for why the delta is often smaller than the
gap to target.

### `Next Step` — Plain-language tip

What's currently the binding constraint on this validator and the single
action that would help most:

- "Top up bond by N SOL to reach ideal coverage" (bond constraint)
- "Lower commission by X% to clear winning APY" (rank constraint)
- "Raise stake bid to Y PMPE" (bid constraint)
- "Nothing — you're winning comfortably" (no constraint)

Tip colour matches the rank cell's severity icon.

### Click anywhere on a row to open the [Validator Detail Panel](#detail-panel).

_See [Eligibility Criteria — Marinade Docs](https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market#eligibility-criteria-to-receive-stake-from-marinade) for the auction algorithm itself._

---

<a id="detail-panel"></a>
## Validator Detail Panel

Clicking a row opens the right-side panel with six tabs.

### Overview tab

Five cards, laid out in two columns:

- **Stake** — Active SOL, target SOL, and projected next-epoch delta.
- **Bond** — Balance, reserve / coverage status, bid runway in epochs, and a
  link straight to the full coverage breakdown on the Bond tab.
- **Expected Payment This Epoch** — payment for active stake, payment for
  activating stake (with a `bid gap` sub-row when activating-stake bid differs
  from active-stake bid), and any active penalties (bid-too-low, blacklist,
  bond risk fee). Each penalty has a "see breakdown" jump to the relevant tab.
- **APY Composition** — bar chart breaking down the validator's max APY into
  inflation / MEV / block / stake-bid components, with the current Winning APY
  line drawn across for visual comparison.
- **What-If Simulation** — toggle on, edit commissions or stake bid, the
  auction re-runs. See [Simulation Mode](#simulation).

### Notifications tab

Active alerts for this validator: depleted bond warnings, large bid changes,
blacklist flags, recent protected events. Click an alert to jump to the
relevant tab.

### Payments tab

Full breakdown of payments to Marinade this epoch:

- Active-stake bid (CPMPE × active SOL).
- Activating-stake bid (CPMPE × incoming SOL, prorated by activation).
- All applicable penalties (bid-too-low, blacklist, bond risk fee), each with
  its own component breakdown.
- Any PSR settlement estimates from the current epoch.

### Bidding tab

The SAM revenue calculation as the auction sees it: stake math, effective
commission across the three dimensions, the gap between max bid and clearing
bid, and the resulting cost. This is where you understand *why* the validator
is at the rank they're at.

### Bond tab

The bond coverage calculation:

- Current balance and claimable balance.
- Current and projected exposed stake.
- Minimum coverage target with top-up amount.
- Ideal coverage target with top-up amount.
- Bond risk fee, if any.

See [Validator Bonds](#bond).

### Bid Penalty tab

Component-level walkthrough of the bid-too-low penalty (when applicable). Shows
the historical bid, current bid, the applicable stake, and the resulting SOL
charge. See [Bid-Too-Low Penalty](#bid-penalty).

---

<a id="simulation"></a>
## Simulation Mode

Simulation lets you ask "what if this validator changed their bid?" and see
the answer reflected in the live auction.

### How to enter simulation mode

1. Click any validator row to open the detail panel.
2. On the **Overview** tab, find the **What-If Simulation** card.
3. Toggle "Simulate" on.
4. Edit any of: inflation commission, MEV commission, block-rewards commission,
   or stake bid PMPE.

The auction re-runs immediately on every change, using the SDK's
`runFinalOnly()` with your overrides applied as `SourceDataOverrides`.

### What happens to the table

- The simulated validator's row gets a **yellow border**.
- A **ghost row** appears at the validator's *original* (pre-simulation)
  position — strikethrough text, greyed out — so you can see the move at a
  glance.
- Other rows are tinted by **rank movement severity**:
  - **Green tint** — climbed in ranking due to your simulation.
  - **Red tint** — dropped in ranking.
  - **Grey / no tint** — position unchanged.
- The cutoff line redraws based on the new clearing price.

### Same engine in two places

The validator-detail "What-If Simulation" form and the table-wide simulation
mode use the *same* auction engine and the *same* override mechanism. Anything
you change in one is reflected in the other immediately.

### Resetting

Toggle "Simulate" off (or close the detail panel) to clear all overrides and
restore the live auction.

---

## Technical Notes

- API data is reloaded periodically by Marinade (typically once per hour).
- Solana epochs are roughly 2 days (~182 epochs per year).
- The page does not auto-refresh — reload to fetch new data.
- All auction math runs client-side via the SDK. Numbers should match Marinade's
  backend to the SOL.
