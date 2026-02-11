The comprehensive investigation and summary has been written to /home/chalda/marinade/claude-summary/ds-sam-constraints-investigation.md. Here's a high-level overview of findings:

  Key Findings

  Current state: The PSR dashboard shows constraint info only as a simple tooltip on the SAM Target column — just "Stake capped by X constraint" with no numbers. The data exists in the SDK but isn't surfaced.

  How constraints work in ds-sam-sdk: The auction distributes stake to validators in PMPE groups (highest bidders first). After each round, constraints are checked and validators whose cap drops below EPSILON (1e-4 SOL) are removed. The binding constraint is
  stored in lastCapConstraint. There are 6 active constraint types: COUNTRY, ASO, VALIDATOR, BOND, WANT, and RISK.

  The lastCapConstraint limitation: Only captures the single final constraint that capped a validator. Uncapped validators get null — no insight into how close they are to being constrained.

  Proposed Implementation Plan (3 phases)

  Phase 1 — SDK Enhancement

  - Add ConstraintDiagnostic type with full numeric details per constraint
  - Add constraintDiagnostics: ConstraintDiagnostic[] | null field to AuctionValidator
  - New post-auction diagnostic pass in Auction.evaluate() that computes per-validator headroom under every constraint, plus actionable advice strings
  - New file: diagnostics.ts in the SDK

  Phase 2 — Dashboard Tooltips

  - Replace the simple text tooltip with rich HTML showing all constraints with traffic-light indicators, numeric headroom, and advice
  - Update selectConstraintText() in sam.ts to build multi-line HTML tooltips
  - Possibly widen tooltip from 400px to 500px

  Phase 3 — Ineligibility Visibility (future)

  - Show why non-bonded/ineligible validators don't appear (blacklisted, client version, uptime, no bond, commission too high)

  The SDK changes are backward-compatible (new field defaults to null). The approach of doing a post-auction diagnostic pass avoids modifying the sensitive auction distribution loop.

  Would you like me to proceed with implementing any of these phases?

✻ Sautéed for 14m 49s

❯ yes, start with the SDK changes 

● Let me start by entering plan mode to design the SDK changes carefully before implementing.

● Entered plan mode
  Claude is now exploring and designing an implementation approach.

● Let me explore the SDK codebase in detail to understand testing patterns, the auction lifecycle, and how to best integrate diagnostics.
  ⎿  Interrupted · What should Claude do instead?

❯ Please only place the plan details into PLAN.md I need to check if we want to really implement this. 

● Let me quickly check the test structure and then write the plan.

● Searched for 1 pattern, read 1 file (ctrl+o to expand)

● Good, now I have a thorough understanding. Let me also check how the Auction class retains access to constraints after evaluation.

● Read 1 file (ctrl+o to expand)

● Good. The Auction class has this.constraints as a private field, accessible throughout the lifecycle including during evaluate(). After setMaxBondDelegations() (the last step that calls constraint methods), the constraints object still has the final state. Let
  me now check one more thing — does setMaxBondDelegations() call updateStateForSam again, which would rebuild constraints?

  Looking at the code — setMaxBondDelegations() only calls this.constraints.bondStakeCapSam(), it does NOT call updateStateForSam(). So the constraints object after evaluate() still holds the state from the last updateStateForBackstop() call (from
  distributeBackstopStake()), not the SAM state. This is important for the implementation.

  Now let me write the plan.

● Updated plan
  ⎿  /plan to preview
  ⎿  User rejected Claude's plan:
     ╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
     │ Plan: Add Constraint Diagnostics to ds-sam-sdk                                                                                                                                                                                                                 │
     │                                                                                                                                                                                                                                                                │
     │ Context                                                                                                                                                                                                                                                        │
     │                                                                                                                                                                                                                                                                │
     │ The PSR dashboard shows SAM auction results but only displays a simple one-line tooltip for constraints: "Stake capped by X constraint". Validators have no visibility into numeric details (how much headroom under each constraint, what the caps are, how   │
     │ many peers share the constraint) or actionable advice. The ds-sam-sdk calculates rich constraint data but only exposes lastCapConstraint — a single binding constraint recorded when a validator's cap hits zero.                                              │
     │                                                                                                                                                                                                                                                                │
     │ Goal: Enrich the SDK so that after an auction run, each AuctionValidator carries a full diagnostic breakdown of ALL constraints affecting it, including headroom and advice. This data will later be consumed by the dashboard for rich tooltips.              │
     │                                                                                                                                                                                                                                                                │
     │ ---                                                                                                                                                                                                                                                            │
     │ Files to Modify                                                                                                                                                                                                                                                │
     │ ┌──────────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────┐                                                                                                                           │
     │ │                     File                     │                                      Change                                       │                                                                                                                           │
     │ ├──────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤                                                                                                                           │
     │ │ packages/ds-sam-sdk/src/types.ts             │ Add ConstraintDiagnostic type and constraintDiagnostics field to AuctionValidator │                                                                                                                           │
     │ ├──────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤                                                                                                                           │
     │ │ packages/ds-sam-sdk/src/diagnostics.ts       │ New file — diagnostic computation and advice generation                           │                                                                                                                           │
     │ ├──────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤                                                                                                                           │
     │ │ packages/ds-sam-sdk/src/auction.ts           │ Add setConstraintDiagnostics() step at end of evaluate()                          │                                                                                                                           │
     │ ├──────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤                                                                                                                           │
     │ │ packages/ds-sam-sdk/src/constraints.ts       │ Expose constraint config via a getter (needed by diagnostics)                     │                                                                                                                           │
     │ ├──────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤                                                                                                                           │
     │ │ packages/ds-sam-sdk/src/utils.ts             │ Add constraintDiagnostics: null to validatorAggDefaults()                         │                                                                                                                           │
     │ ├──────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤                                                                                                                           │
     │ │ packages/ds-sam-sdk/src/index.ts             │ Export new diagnostics.ts module                                                  │                                                                                                                           │
     │ ├──────────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤                                                                                                                           │
     │ │ packages/ds-sam-sdk/test/diagnostics.test.ts │ New file — tests for the diagnostics                                              │                                                                                                                           │
     │ └──────────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────┘                                                                                                                           │
     │ ---                                                                                                                                                                                                                                                            │
     │ Implementation Steps                                                                                                                                                                                                                                           │
     │                                                                                                                                                                                                                                                                │
     │ Step 1: Add types (types.ts)                                                                                                                                                                                                                                   │
     │                                                                                                                                                                                                                                                                │
     │ Add new type ConstraintDiagnostic:                                                                                                                                                                                                                             │
     │                                                                                                                                                                                                                                                                │
     │ export type ConstraintDiagnostic = {                                                                                                                                                                                                                           │
     │   constraintType: AuctionConstraintType                                                                                                                                                                                                                        │
     │   constraintName: string                                                                                                                                                                                                                                       │
     │   isBinding: boolean              // true if this is the lastCapConstraint                                                                                                                                                                                     │
     │   marinadeCapSol: number          // total marinade capacity for this bucket                                                                                                                                                                                   │
     │   marinadeUsedSol: number         // marinade stake currently allocated                                                                                                                                                                                        │
     │   marinadeRemainingCapSol: number // remaining marinade capacity                                                                                                                                                                                               │
     │   totalCapSol: number             // total network capacity for this bucket                                                                                                                                                                                    │
     │   totalUsedSol: number            // total network stake in bucket                                                                                                                                                                                             │
     │   totalRemainingCapSol: number    // remaining network capacity                                                                                                                                                                                                │
     │   validatorsInGroup: number       // how many validators share this constraint                                                                                                                                                                                 │
     │   headroomSol: number             // this validator's share of remaining capacity                                                                                                                                                                              │
     │   advice: string | null           // actionable suggestion                                                                                                                                                                                                     │
     │ }                                                                                                                                                                                                                                                              │
     │                                                                                                                                                                                                                                                                │
     │ Add field to AuctionValidator:                                                                                                                                                                                                                                 │
     │ constraintDiagnostics: ConstraintDiagnostic[]                                                                                                                                                                                                                  │
     │                                                                                                                                                                                                                                                                │
     │ Step 2: Create diagnostics.ts                                                                                                                                                                                                                                  │
     │                                                                                                                                                                                                                                                                │
     │ New file with two exported functions:                                                                                                                                                                                                                          │
     │                                                                                                                                                                                                                                                                │
     │ computeConstraintDiagnostics(validator, constraints, config)                                                                                                                                                                                                   │
     │ - Calls constraints.getValidatorConstraints(voteAccount) to get all constraints                                                                                                                                                                                │
     │ - For each constraint, computes:                                                                                                                                                                                                                               │
     │   - Cap values (from totalStakeSol + totalLeftToCapSol and marinadeStakeSol + marinadeLeftToCapSol)                                                                                                                                                            │
     │   - Headroom: max(0, min(totalLeftToCapSol, marinadeLeftToCapSol)) (for shared constraints like COUNTRY/ASO, divided by number of validators in the group that are in the same PMPE group or higher)                                                           │
     │   - Whether it's the binding one (matches lastCapConstraint)                                                                                                                                                                                                   │
     │   - Actionable advice via generateAdvice()                                                                                                                                                                                                                     │
     │ - Returns ConstraintDiagnostic[] sorted by headroom ascending (tightest first)                                                                                                                                                                                 │
     │                                                                                                                                                                                                                                                                │
     │ generateAdvice(constraintType, constraintName, diagnostic, validator, config)                                                                                                                                                                                  │
     │ - Per constraint type, returns a human-readable advice string:                                                                                                                                                                                                 │
     │   - COUNTRY: "Country ${name}: ${usedPct}% of ${capSol} SOL network cap used by ${n} validators"                                                                                                                                                               │
     │   - ASO: "ASO ${name}: ${usedPct}% of ${capSol} SOL network cap used by ${n} validators"                                                                                                                                                                       │
     │   - VALIDATOR: "Per-validator cap: ${capSol} SOL (${pct}% of Marinade TVL)"                                                                                                                                                                                    │
     │   - BOND: "Bond ${bondBal} SOL supports up to ${bondCap} SOL stake. Top up by ${needed} SOL for full auction stake."                                                                                                                                           │
     │   - WANT: "Max stake wanted set to ${maxWanted} SOL. Increase to receive more stake."                                                                                                                                                                          │
     │   - RISK: "Unprotected stake limit: ${capSol} SOL based on external delegations."                                                                                                                                                                              │
     │                                                                                                                                                                                                                                                                │
     │ Step 3: Expose constraint config (constraints.ts)                                                                                                                                                                                                              │
     │                                                                                                                                                                                                                                                                │
     │ Add a simple getter to AuctionConstraints:                                                                                                                                                                                                                     │
     │ getConfig(): AuctionConstraintsConfig {                                                                                                                                                                                                                        │
     │   return this.config                                                                                                                                                                                                                                           │
     │ }                                                                                                                                                                                                                                                              │
     │                                                                                                                                                                                                                                                                │
     │ This is needed by diagnostics.ts to compute cap values for advice text.                                                                                                                                                                                        │
     │                                                                                                                                                                                                                                                                │
     │ Step 4: Wire into auction (auction.ts)                                                                                                                                                                                                                         │
     │                                                                                                                                                                                                                                                                │
     │ Add a new method setConstraintDiagnostics() to the Auction class that:                                                                                                                                                                                         │
     │ 1. Calls this.constraints.updateStateForSam(this.data) to rebuild SAM constraints in final state                                                                                                                                                               │
     │ 2. Iterates all validators                                                                                                                                                                                                                                     │
     │ 3. Calls computeConstraintDiagnostics() for each                                                                                                                                                                                                               │
     │ 4. Assigns result to validator.constraintDiagnostics                                                                                                                                                                                                           │
     │                                                                                                                                                                                                                                                                │
     │ Call it at the end of evaluate(), after setBlacklistPenalties():                                                                                                                                                                                               │
     │ evaluate(): AuctionResult {                                                                                                                                                                                                                                    │
     │   // ... existing steps ...                                                                                                                                                                                                                                    │
     │   this.setBlacklistPenalties(result.winningTotalPmpe)                                                                                                                                                                                                          │
     │   this.setConstraintDiagnostics()  // NEW                                                                                                                                                                                                                      │
     │   return result                                                                                                                                                                                                                                                │
     │ }                                                                                                                                                                                                                                                              │
     │                                                                                                                                                                                                                                                                │
     │ Important: We must call constraints.updateStateForSam() again inside setConstraintDiagnostics() because after evaluate() the constraints hold backstop state (from distributeBackstopStake()), not SAM state. We want the diagnostics to reflect the final SAM │
     │  auction state.                                                                                                                                                                                                                                                │
     │                                                                                                                                                                                                                                                                │
     │ Step 5: Update defaults (utils.ts)                                                                                                                                                                                                                             │
     │                                                                                                                                                                                                                                                                │
     │ Add constraintDiagnostics: [] to validatorAggDefaults() so every validator starts with an empty array.                                                                                                                                                         │
     │                                                                                                                                                                                                                                                                │
     │ Step 6: Export (index.ts)                                                                                                                                                                                                                                      │
     │                                                                                                                                                                                                                                                                │
     │ Add export * from './diagnostics' to index.ts.                                                                                                                                                                                                                 │
     │                                                                                                                                                                                                                                                                │
     │ Step 7: Tests (test/diagnostics.test.ts)                                                                                                                                                                                                                       │
     │                                                                                                                                                                                                                                                                │
     │ Test cases using the existing test patterns (makeValidator, makeConstraints, makeAuction helpers):                                                                                                                                                             │
     │                                                                                                                                                                                                                                                                │
     │ 1. Uncapped validator gets diagnostics for all constraint types — verify all 5 SAM constraints present (COUNTRY, ASO, VALIDATOR, BOND, WANT), all with isBinding: false                                                                                        │
     │ 2. COUNTRY-capped validator — set tight country cap, verify binding diagnostic and advice text                                                                                                                                                                 │
     │ 3. BOND-capped validator — low bond balance, verify BOND diagnostic is binding with correct headroom and advice                                                                                                                                                │
     │ 4. WANT-capped validator — low maxStakeWanted, verify WANT diagnostic                                                                                                                                                                                          │
     │ 5. Sorted by headroom — tightest constraint first                                                                                                                                                                                                              │
     │ 6. Advice text content — verify advice strings contain expected numbers                                                                                                                                                                                        │
     │                                                                                                                                                                                                                                                                │
     │ ---                                                                                                                                                                                                                                                            │
     │ Verification                                                                                                                                                                                                                                                   │
     │                                                                                                                                                                                                                                                                │
     │ 1. Run existing tests to confirm no regressions: cd /home/chalda/marinade/ds-sam && npm test (or the project's test command)                                                                                                                                   │
     │ 2. Run new diagnostics tests                                                                                                                                                                                                                                   │
     │ 3. Verify types compile: npm run build (or tsc)                                                                                                                                                                                                                │
     ╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
