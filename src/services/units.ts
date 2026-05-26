// SOL ↔ lamports unit conversion. EXACT float multiplication — no
// rounding. Callers that need an integer lamport amount must Math.round()
// the result themselves; the protected-events serialization sites do this
// at the call site, and the comparison sites deliberately do not (an
// eligibility check against a lamport floor must compare the real-valued
// result, not the rounded one).
//
// The string-input `lamportsToSol(string)` in src/format.ts is a separate
// concern (precision-preserving display for API-supplied lamport strings).
export function solToLamports(sol: number): number {
  return sol * 1e9
}
