---
status: planned
---

# Bond override — add to SourceDataOverrides in ds-sam-sdk

**Why:** `AppOverrides` in `src/services/simulation.ts` wraps `SourceDataOverrides` with
an extra `bondBalanceSol: Map<string, number>` because the SDK type has no bond
override path. `sdk-rerun.ts` manually patches `bondBalanceSol` /
`claimableBondBalanceSol` on the cloned validator before calling `Auction.evaluate()`.
This is a workaround — bond is a first-class simulation input and belongs in
`SourceDataOverrides` alongside commissions and bid.

**Blocked on:** SDK adding `bondBalanceSol` to `SourceDataOverrides` and reading it
inside the validator-patch step of `runFinalOnly`.

**End state:** drop `AppOverrides`; use `SourceDataOverrides` directly everywhere.
`sdk-rerun.ts` bond-patch block goes away; `simulation.ts` `AppOverrides` type is deleted.
