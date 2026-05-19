<!-- page: expert | Expert Mode -->

# Expert View

Expert mode is reached via the `/expert-…` URL prefix or by toggling the docs
selector. It exposes a small set of additional metrics and removes the basic-mode
filter that hides inactive validators.

See the [Dashboard Guide](#GUIDE) for everything else.

---

## What changes in expert mode

### Stake Auction Marketplace — full validator list

In basic mode, the SAM table shows only validators that either currently have
active Marinade stake **or** are receiving stake in this epoch's auction.
Everyone else is hidden because the row would show all-zeros.

In expert mode, **every validator known to the auction is listed** — including
those that bid but didn't win, those that aren't bidding, and those that have
neither active stake nor a target. Useful when investigating the long tail (why
did this validator not get any stake? what's their bid? bond? rank in the order?).

The cutoff line still marks the boundary between winners and non-winners; the
extra rows simply continue below it.

### Validator Bonds — Max Protectable

Two extras appear on the Validator Bonds page:

- **Hero-bar stat: "Max protectable: NN%"** — what fraction of total Marinade
  stake *could* be protected if every existing bond were fully utilized. This is
  always ≥ the currently-protected percentage; the gap shows headroom.
- **Table column: "Max protectable [SOL]"** — per-validator maximum bond-only
  protection capacity. Computed as `bondEffectiveAmount ÷ ((inflationPmpe +
  mevPmpe + effParticipatingBidPmpe) ÷ 1000)` — bond divided by the
  participating-total PMPE rate per 1000 SOL of stake, i.e. how much stake one
  epoch's commitments would just cover. No horizon multiplier.

These are useful for asking "how much more stake could this validator absorb
before their bond becomes the binding constraint?".

### Protected Events — Last Epoch Bids

One extra metric tile at the top of the Protected Events page:

- **Last Epoch Bids** — total SOL collected as bid payments in the most recent
  fully-settled epoch, summed across all validators. (The basic page only shows
  protected-event payouts; this tile adds the routine bid revenue stream.)

---

<!-- page: expert-concepts | Expert Concepts -->

## Additional Concepts

<a id="sfdp"></a>
### SFDP — Solana Foundation Delegation Programme

Validators meeting the foundation's uptime, commission, and identity criteria receive a minor stake-weight uplift in the SAM auction. The boolean is read from the validators API and treated as a static score component — it does not interact with the bid or bond math.

<a id="stake-wanted"></a>
### Max Stake Wanted

Validator-set upper bound on Marinade delegation. The SDK caps `marinadeSamTargetSol` at `wantedSol`; the constraint shows up in the Next Step tip as "Raise your max-stake-wanted". Bond and bid improvements are inert while `wantedSol` is binding.

<a id="bid-distribution"></a>
### Bid Distribution

The bid-distribution histogram plots each validator's static CPMPE bid in quantile buckets. Useful for gauging whether a given bid is at the top, middle, or tail of the current field. The clearing price (`winningTotalPmpe − onchainDistributedPmpe`) sets the practical floor; bids below it lose stake regardless of absolute size.

<a id="concentration"></a>
### Concentration Limits

Per-country and per-ASO stake caps are enforced as a post-ranking filter: the SDK iterates winners in APY order and skips any validator whose group is already at the cap (`countryCapPct`, `asoCapPct` in `DsSamConfig`, both defaulting to 30%). A per-validator cap of 15% of TVL applies in parallel. Capped validators show in the Top Countries / Top ASOs tiles with a red marker. In expert mode, capped validators that would otherwise win appear below the cutoff line because the cap, not their bid, is the binding constraint.

---

<!-- page: expert -->

## Notes

- The `expert-` URL prefix persists across navigation: clicking between SAM,
  Bonds, Protected Events, and Docs keeps you in expert mode.
- Expert mode does not unlock additional table columns on the SAM table or the
  Protected Events table — those columns are the same as in basic mode.
- Simulation mode, the validator-detail panel, and all calculation breakdowns are
  available in both modes.
