---
status: draft
---

# Thread abort signal through the SAM load path

**Why:** `fetchValidatorsWithBonds` (`src/services/validator-with-bond.ts`)
accepts `signal?: AbortSignal` and forwards it to `fetchValidatorsWithEpochs`
and `fetchBonds`, but the `ensureQueryData` fallback `() => loadSam()` passes
no signal. A cancellation (navigation away, query invalidation) never reaches
the SAM fetch, so an in-flight `runFinalOnly()` keeps running.

## Why it's blocked

`loadSam()` (`src/services/sam.ts:29`) has no signal parameter and calls
`dsSam.runFinalOnly()` — the ds-sam-sdk API does not appear to accept an
`AbortSignal`. Forwarding a signal requires:

- a `loadSam` signature change to accept and honour a signal,
- an SDK-level hook to abort `runFinalOnly()` mid-flight (may not exist),
- updates at the other call sites (`epoch-meter.tsx:27`,
  `validator-with-protected-event.ts:40`).

Effectively blocked on ds-sam-sdk supporting cancellation. Until then the
cost is a wasted in-flight computation on cancel — no correctness impact.

## Fix (when SDK supports it)

Add an optional `signal` to `loadSam`, pass it to the SDK run, and forward
from all three call sites. Track the SDK cancellation support need in the
ds-sam-sdk follow-up (see `specs/3/2-calculations-to-sdk.md`).

**Where:** `src/services/sam.ts` (`loadSam`); `src/services/validator-with-bond.ts:43-51`;
`src/components/epoch-meter/epoch-meter.tsx:27`;
`src/services/validator-with-protected-event.ts:40`.
