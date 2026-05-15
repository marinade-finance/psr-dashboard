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

**Table Columns:**

| Column             | Description                          |
| ------------------ | ------------------------------------ |
| **Epoch**          | Epoch of the event                   |
| **Validator**      | Vote account public key              |
| **Name**           | Validator display name               |
| **Settlement [☉]** | Settlement amount in SOL             |
| **Reason**         | Reason for the protected event       |
| **Funder**         | Who funded the settlement            |

### Validator Bonds

How much of Marinade's stake is currently bond-protected.

**Coverage hero bar** at the top: percentage of stake covered by bonds, with a
stacked bar showing covered vs uncovered SOL, plus counters for funded bonds and
total bond capacity.

**Tile map**: each validator a coloured tile. Tile colour = coverage tier (none /
<40% / 40–70% / 70–95% / ≥95%). Tile size ∝ √stake. Hover for details.

**Table columns**: Validator · Marinade Stake · Bond Balance · Protected Stake ·
Coverage (bar + percentage).

**Table Columns:**

| Column                   | Description                                                          |
| ------------------------ | -------------------------------------------------------------------- |
| **Validator**            | Vote account public key                                              |
| **Name**                 | Validator display name                                               |
| **Bond balance [☉]**     | Total bond deposit in SOL                                            |
| **Max Stake Wanted [☉]** | Maximum stake the validator wants from Marinade                      |
| **Bond Comm.**           | Commission override configured via bond                              |
| **Marinade stake [☉]**   | Currently delegated Marinade stake                                   |
| **Eff. Cost [☉]**        | Effective cost                                                       |

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
- **Natural turnover** — each epoch a fraction of TVL turns over (mSOL/native
  redemptions plus the natural-redelegation cap). Outflows come first from
  validators above their auction target; if no one's over-target, they're
  spread pro-rata. See the Marinade docs linked below for the exact mechanism.

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

#### Activating-stake PMPE

When the auction grows your target stake above what's currently
delegated, the gap doesn't appear instantly — it warms up. SAM still
charges your bid against that incoming stake at a separate rate called
the activating-stake PMPE, billed only on `max(0, target − active)`.
The Bidding tab shows it on its own row inside the **Cost** section.
If your target is at or below your active stake, this cost is zero.

#### Where to read it on the dashboard

The validator detail panel's **Bidding tab** is the per-validator
breakdown in PMPE — Stake (active vs target), commissions split by
stream, the static-vs-effective bid gap, and the resulting cost in
SOL. See the [Bidding tab subsection](#detail-panel) for what each
row means.

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

Charged at auction time when a validator's bid drops between epochs
and their bond obligation no longer services what their historical
bid implied.

#### When it fires

Two conditions both have to hold:

1. **Bid dropped this epoch.** The validator's effective participating
   bid PMPE is lower than it was the previous epoch.
2. **Bond obligation fell below the historical floor.** The lower of
   the current effective participating bid and the worst bid seen
   across the recent history window — minus a small permitted
   deviation — is the **adjusted limit**. The bond obligation PMPE has
   to drop below that limit for the penalty to engage.

If only one of those is true the dashboard shows a green status
("Bid dropped but bond obligation covers it — no penalty" or "Bid did
not decrease — no penalty").

#### How big it gets

The shortfall — how far the bond obligation sits under the adjusted
limit — gets normalised by the limit, square-rooted, and capped at 1
to produce a coefficient. That coefficient is multiplied by a base of
`winning total PMPE + effective participating bid PMPE`, then turned
into SOL by multiplying by activated stake / 1000.

In practice this means a small dip below the limit costs a relatively
small fraction of one epoch's revenue; a large dip can wipe out the
whole epoch's revenue from that validator.

#### Where to read it on the dashboard

The validator detail panel's **Bid Penalty tab** walks you through
every input — bid history, historical baseline, threshold inputs, the
shortfall, the coefficient, and the final SOL charge. See the
[Bid Penalty tab subsection](#detail-panel) for the row-by-row
formula.

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
- **Withdrawal priority** — when natural turnover pulls SOL from the pool, it
  leaves over-target validators first. Validators sitting at or below target
  are protected from forced withdrawals as long as anyone is over-target.
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

- Click the row to open the detail panel — the **APY composition** card
  there breaks out inflation, MEV, block-rewards, and stake-bid PMPE
  contributions.
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
- **Health bar** — remaining-runway gauge above the minimum threshold.
  Full bar = runway well above minimum; partially filled = approaching
  the minimum; empty bar = at or past minimum, which is the state in
  which the bond risk fee fires and forced undelegation begins. Bar
  colour matches the health pill.

### `Stake / Next Δ` — Active and projected stake

Two numbers stacked:

- **Top:** currently active SAM stake (SOL).
- **Bottom (Δ):** projected stake change next epoch — driven by the
  validator's auction outcome (bond, bid, max-stake-wanted), capped
  by the redelegation budget.
  - **Positive (green)** — the auction set a target above the current
    active stake; the bond and bid support more.
  - **Negative (red)** — the auction set a target below the current
    active stake; the bond, bid, or other cap is squeezing the
    allocation down.

See [Re-delegation](#redelegation) for why the delta is often smaller than the
gap to target.

### `Next Step` — Plain-language tip

What's currently the binding constraint on this validator and the single
action that would help most:

- "Top up bond by N SOL to reach ideal coverage" (bond constraint)
- "Lower commission by X% to clear winning APY" (rank constraint)
- "Raise stake bid to Y PMPE" (bid constraint)
- "Raise your max-stake-wanted to qualify for more" (want constraint —
  the validator's own self-imposed cap is the binding limit; topping
  up bond or raising bid would not help)
- "Nothing — you're winning comfortably" (no constraint)

Tip colour matches the rank cell's severity icon.

### Click anywhere on a row to open the [Validator Detail Panel](#detail-panel).

_See [Eligibility Criteria — Marinade Docs](https://docs.marinade.finance/marinade-protocol/protocol-overview/stake-auction-market#eligibility-criteria-to-receive-stake-from-marinade) for the auction algorithm itself._

---

<a id="detail-panel"></a>
## Validator Detail Panel

Clicking a row opens the side panel. The four calculation tabs
(Payments, Bidding, Bond, Bid Penalty) **mirror the same math the
SAM auction runs server-side** — they recompute the SDK's formulas
locally so you can see each input and intermediate value. Numbers
match the protocol's settlement decisions to the SOL.

### Overview tab

A two-column dashboard summarising the validator's situation. The cards
that have a deeper companion tab — Bond, Expected Payment, APY
Composition — let you click their title to jump there.

- **Stake** — three rows: Active Marinade stake (SOL delegated right
  now), Target Marinade stake (what the auction wants you to have), and
  Expected change next epoch (signed delta — green for gains, red for
  losses). Losses come mostly from falling out of the auction; a small
  share is the natural-turnover share spread pro-rata across all
  validators.
- **Bond** — Balance (raw bond SOL), Reserve (a coverage status label
  like "Fully covered", "Top up X to keep your stake", or "Top up X to
  avoid the fee" — coloured by health), and Bid runway in epochs
  ("N epochs" or "Depleted"). Click the card title to open the full
  Bond tab and see the underlying numbers.
- **Expected payment this epoch** — Active stake cost, Activating stake
  cost, then a **Penalty** row that totals every penalty, with each
  contributing penalty broken out below it as a `↳` sub-row
  (`↳ bid-too-low penalty`, `↳ blacklist penalty`, `↳ bond risk fee`).
  Click any sub-row label to jump straight to the tab that explains it.
  The Total at the bottom reconciles with the Payments tab.
- **Max APY composition** — a stacked bar showing how the validator's
  total APY splits across Inflation, MEV, Block rewards, and the Stake
  bid contribution. Each row has its own bar segment, the segment colour
  matches a tiny swatch on the row, and the rightmost number is that
  component's APY. The Total bar at the bottom carries a vertical tick
  at the **Winning APY** so you can see how far above or below the
  cutoff the validator sits; the pill in the top-right corner restates
  the gap as `+X%` (above) or `−X%` (below).
- **What-If Simulation** — only visible when you toggle "Simulate" on
  in the panel header. Edit the validator's bid PMPE or any of the three
  commissions; the auction recalculates after a brief debounce and the
  table reshuffles. See [Simulation Mode](#simulation) for details.

### Notifications tab

Active alerts for this validator pulled from Marinade's notifications
API — typical examples are depleted bond warnings, blacklist flags,
and recent protected events.

Each notification is a passive card with three pieces:

- A coloured **priority pill** in the top-left — red for `critical`,
  orange-yellow for `warning`, blue for `info`. The pill text is the
  literal priority name in caps.
- A **title** next to the pill in stronger text.
- A **body** below the title with the message itself; line breaks in
  the source message are preserved.
- An optional **footer** in small italic underneath, used for
  timestamps or source references.

Notifications stack vertically; older entries don't disappear
automatically — they fall off when the API marks them as no longer
relevant. If the validator has none, the tab reads "No notifications
for this validator."

The cards themselves don't link anywhere — to act on a depleted-bond
or bid-too-low warning, switch to the Bond, Bid Penalty, or Payments
tab manually.

### Payments tab

Sum of every SOL outflow from this validator this epoch. The card
header carries a one-line status banner — green "You will pay X in
total this epoch — no penalties" or red "You will pay X in total this
epoch — including Y in penalties" — so you can read the bottom line
without scanning the rows.

| Section | Row | Source |
|---|---|---|
| Bid costs | Active stake cost | `effectiveCost = marinadeActivatedStakeSol × auctionEffectiveBidPmpe / 1000` |
| Bid costs | Activating stake cost | `activatingStakePmpe × max(0, expectedDelta) / 1000` |
| Penalties | Bid-too-low penalty | conditional — see Bid Penalty tab |
| Penalties | Blacklist penalty | `blacklistPenaltyPmpe × activatedStake / 1000` |
| Penalties | Bond risk fee | conditional — computed in the Bond tab |
| PSR settlements — estimated | per-event row | `fetchPsrEstimatesForValidator(vote)` — secondary text reads "from bond" or "from Marinade" |
| Total per epoch | sum of the above | red-accented when any penalty or PSR row is present, green otherwise |

Reading the table:

- A penalty row showing `—` means that penalty isn't being charged
  this epoch. The row is always rendered so the layout stays stable
  across validators.
- The **PSR settlements — estimated** section only appears when the
  PSR estimator API has projected at least one settlement for this
  validator. No section means no expected payouts.
- The funder line under each PSR row says **from bond** when the
  validator's own bond will fund the payout, or **from Marinade** when
  Marinade's backstop kicks in because the bond can't cover it.

Two action links at the bottom of the card jump straight to the
relevant tab: "See bid-too-low penalty calculation →" appears only
when the bid-too-low penalty is active, and "Simulate commission or
bid changes →" turns on simulation mode.

### Bidding tab

Why the validator pays what they pay. Tracks the bid construction
side-by-side with the cost.

- **Stake** — Active / Target Marinade stake and the projected
  next-epoch delta (`selectExpectedStakeChange`).
- **Commissions** — Inflation, MEV, Block rewards. The percent column
  is the validator's retained commission; the PMPE column is what flows
  into the bid (`revShare.inflationPmpe`, `revShare.mevPmpe`,
  `revShare.blockPmpe`).
- **Bid** — Static bid PMPE (`revShare.bidPmpe`), auction effective bid
  PMPE (`revShare.auctionEffectiveBidPmpe` — the clearing price), and
  the **bid gap** = `max(0, staticBid − effectiveBid)`. A non-zero gap
  means you bid above clearing and pay an activating-stake fee.
- **Cost** — Active Stake Cost, Activating Stake Cost, Total (same
  formulas as the Payments tab Bid Costs section).

An "**Overrides CPMPE**" notice appears if `values.commissions.bidCpmpeOverrideDec`
is set — the displayed bid is a manual override, not the on-chain value.

### Bond tab

The full bond-coverage calculation in up to four sections. Each row in
the table is one input or one intermediate value; the section ends in
either a "Top up X" call to action or a green tick reading "Bond meets
ideal coverage" / "Bond above the penalty threshold".

The two reasons a bond exists — paying bid costs every epoch and
backing PSR payouts when something goes wrong — show up directly as
two line items inside each coverage section: **Held for bid payments**
covers the bid burn over the coverage window, and **Held for reward
payouts** covers the rewards a staker is guaranteed under PSR. Their
sum is the row labelled "Minimum required" or "Ideal required"; that's
the floor the bond has to clear.

**Rates** — `expectedMaxEffBidPmpe` and `onchainDistributedPmpe`, the
two PMPE rates that scale the bid-payment and reward-payout
requirements respectively.

**Minimum bond to keep stake** (uses *current* exposed stake) —
answers "what bond do I need to keep my current stake?". Falling
below this floor triggers a bond risk fee and starts forced
undelegation:

```
currentExposedStake     = activatedStake − unprotectedStake
floorBaseKeep           = minUnprotectedReserve
                          + (minBondPmpe / 1000) × currentExposedStake
topUpToKeepStake        = max(0, floorBaseKeep − claimableBondBalance)
```

**Ideal bond to grow stake** (uses *current* exposed stake too, but
with `idealBondPmpe` and `idealUnprotectedReserve`) — answers "what
bond unlocks more stake?". Below this line the validator stays in the
auction but the pool won't award additional stake:

```
requiredIdealKeep       = idealUnprotectedReserve
                          + (idealBondPmpe / 1000) × currentExposedStake
topUpToIdealKeep        = max(0, requiredIdealKeep − bondBalance)
```

**Bond risk fee** (conditional — only when `bondRiskFeeSol > 0`,
`topUpToAvoidFee > 0`, or there is carried paid undelegation, so the
section vanishes for healthy bonds): uses `projectedExposedStake =
activatedStake − carriedPaidUndelegation − unprotectedStake` — always
≤ current, because stake already on its way out shouldn't inflate the
fee. The penalty trigger threshold is `floorBaseProjected`; falling
below it fires the SDK's `calcBondRiskFee`. See
[Bond Risk Fee](#bond-risk-fee).

Status colour at the top of the card: critical (red) when
top-up-to-avoid-fee > 0; watch (yellow) when top-up-to-keep-stake > 0;
soft (muted) when only top-up-to-ideal > 0; healthy (green) otherwise.

### Bid Penalty tab

Shows the math behind `calcBidTooLowPenalty`. Renders only when both
trigger conditions in [Bid-Too-Low Penalty](#bid-penalty) hold.

```
adjustedLimit  = min(thisEpochEffParticipatingBid,
                     worstHistoricalEffParticipatingBid)
                 × (1 − permittedBidDeviation)
shortfall      = max(0, adjustedLimit − bondObligationPmpe)
shortfallRatio = shortfall / adjustedLimit
penaltyCoef    = min(1, sqrt(1.5 × shortfallRatio))   # only if bid dropped
base           = winningTotalPmpe + effParticipatingBidPmpe
penaltyPmpe    = penaltyCoef × base
penaltySol     = (penaltyPmpe / 1000) × activatedStake
```

The status banner reads "Penalty active" (red) when `penaltySol > 0`,
"Bid dropped but bond obligation covers it — no penalty" (green) when
the bid dropped but the obligation didn't fall below `adjustedLimit`,
and "Bid did not decrease — no penalty" (green) otherwise.

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

### Multiple validators at once

Simulation is started from the **What-If Simulation** form on a
validator's detail panel. You can leave that simulation in place,
close the panel, open a different validator, and edit theirs too —
both sets of overrides stay active and the auction re-runs with all
of them at once. The yellow banner at the top of the page shows how
many validators currently have what-if values.

### Resetting

Use the **Reset Simulation** button in the yellow banner to clear all
overrides and restore the live auction. Closing the detail panel
alone does not clear the simulation.

---

## Technical Notes

- Bond data (bid/CPMPE and bond balance) is reloaded periodically by
  Marinade — typically once per hour. Other validator and auction data
  follow their own refresh cadences (see the table at the top).
- Solana epochs are roughly 2 days (~182 epochs per year).
- The page auto-refreshes its main data once an hour. Manual reload
  forces an immediate refetch.
- All auction math runs client-side via the SDK. Numbers should match Marinade's
  backend to the SOL.
