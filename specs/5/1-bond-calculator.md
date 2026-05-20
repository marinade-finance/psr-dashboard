---
status: planned
---

# Bond Calculator

## Problem

Validators ask how to determine the bid and bond required to obtain stake.
Because SAM is a last-price auction, the required bid varies by epoch
depending on competition. Minimal bond is tricky to reason about: more bond
can be staked, and once stake is obtained the excess bond can be withdrawn.

## Solution

Add a bond calculator that lets validators input parameters and see:

1. **Minimum bid** — estimated clearing price based on recent auction history
2. **Minimum bond** — the bond floor needed to cover the stake they'd receive
   at that bid, given current `bondBalanceSol` requirements
3. **Recommended bond** — a safer amount accounting for variance across epochs
4. **Withdraw-after-stake flow** — show how much bond becomes withdrawable
   once stake is assigned (bond posted minus bond required for received stake)

## UX

- Accessible from the SAM auction page (inline or linked panel)
- Inputs: desired stake amount (SOL), validator vote account (optional,
  to prefill current bond/commission)
- Outputs: recommended bid, required bond, expected stake, withdrawable
  surplus after assignment
- Show historical clearing prices for context (last N epochs)

## Technical Notes

- Use `ds-sam-sdk` auction data to derive recent effective bids
- Bond requirement = f(stake_received, validator_params) — extract from
  SDK or replicate logic
- Consider a sensitivity sweep: "if you bid X, you'd have won in Y of
  last Z epochs"
