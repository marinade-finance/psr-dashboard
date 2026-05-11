---
status: shipped
---

# Followups: Audit Findings

Deferred items surfaced during the bug-finding pass. Each is small in scope —
this spec captures direction, not implementation.

## APY breakdown bars don't sum

The validator detail "APY Composition" segmented bar shows
`inflation + mev + blockRewards + bid` as four segments, with the total APY
shown elsewhere. Because each segment is computed independently via
`compoundApy(pmpe, epochsPerYear)`, the sum of segments does not equal
`compoundApy(totalPmpe, ...)` — compounding is non-linear in the input.

`src/services/calculations.ts:51` — `apyBreakdown` returns each component
compounded independently; `total` is also compounded but from `totalPmpe`,
not the sum.

**Direction.** Either (a) display the bars in PMPE space (simple, additive)
and only convert to APY for the headline number, or (b) scale each
component proportionally so segments sum to the displayed total APY (visual
fidelity, lossy semantics). Decide based on what the user is meant to read
from the bar — relative composition vs absolute APY contribution.

## useMemo deps thrash on whole `dsSamConfig` object

Several memos in `src/components/sam-table/sam-table.tsx` and
`src/components/validator-detail/validator-detail.tsx` depend on the entire
`dsSamConfig` object reference (e.g. `validator-detail.tsx:235, :243`).
The config is rebuilt on every `loadSam` round-trip, so any re-fetch
(epoch change, simulation run) invalidates every memo even though the
fields actually consumed (`minBondEpochs`, `idealBondEpochs`,
`bondRiskFeeMult`) rarely change.

**Direction.** Pass scalar config fields as deps, not the object. Or
freeze the consumed subset into a stable object via a top-level
`useMemo([cfg.minBondEpochs, cfg.idealBondEpochs, cfg.bondRiskFeeMult])`.

## `computeExpectedStakeChanges` undelegation handling

`src/services/sam.ts:278` only counts `paidUndelegationSol` as a stake
removal when the validator is currently *over* its auction target. For
under-target validators, paid undelegations are silently dropped from the
displayed delta — the user sees `+N SOL` when in fact the SDK already
scheduled an undelegation that will partially offset that growth.

**Direction.** Verify with the SDK whether under-target undelegation can
ever happen (probably yes during natural stake decay). If so, surface it
in the delta. If not, document why it's safe to ignore and add an
assertion.

## SAM table row keyboard accessibility

`src/components/sam-table/sam-table.tsx:524` — table rows have `onClick`
but no `role="button"`, no `tabIndex`, no `onKeyDown` for Enter/Space. Rows
are non-interactive for keyboard users; the validator-detail sheet is
unreachable without a mouse.

**Direction.** Add `role="button"`, `tabIndex={0}` and an
`onKeyDown` handler that fires the same callback as `onClick` for
`Enter` and `Space`. Skip ghost rows (already non-interactive).

## Bond table O(N²) lookup on fetch

`src/services/validator-with-bond.ts:52` — `fetchValidatorsWithBonds`
loops over all validators and does `auctionResult.auctionData.validators.find(...)`
inside the loop. With ~1500 validators this is ~2.25M comparisons on every
bonds-page mount.

**Direction.** Build a `Map<voteAccount, AuctionValidator>` once before the
loop, then `auctionMap.get(validator.vote_account)`. Same fix pattern is
worth grepping for elsewhere.
