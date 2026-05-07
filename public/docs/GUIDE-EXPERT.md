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
  protection capacity. Computed from bond effective amount and the validator's
  configured `cpmpe` × the protection horizon.

These are useful for asking "how much more stake could this validator absorb
before their bond becomes the binding constraint?".

### Protected Events — Last Epoch Bids

One extra metric tile at the top of the Protected Events page:

- **Last Epoch Bids** — total SOL collected as bid payments in the most recent
  fully-settled epoch, summed across all validators. (The basic page only shows
  protected-event payouts; this tile adds the routine bid revenue stream.)

---

## Notes

- The `expert-` URL prefix persists across navigation: clicking between SAM,
  Bonds, Protected Events, and Docs keeps you in expert mode.
- Expert mode does not unlock additional table columns on the SAM table or the
  Protected Events table — those columns are the same as in basic mode.
- Simulation mode, the validator-detail panel, and all calculation breakdowns are
  available in both modes.
