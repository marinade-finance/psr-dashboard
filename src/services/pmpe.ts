// PMPE = "per million per epoch", expressed as lamports per 1000 SOL per
// epoch. Converting a PMPE rate to an absolute amount is `(pmpe / 1000) *
// stake`. The output unit follows the stake unit — pass stake in SOL and
// you get SOL. The lamports-based path in
// `validator-with-protected_event.ts` deliberately does not use this
// helper; it computes amounts in lamports against API epochStats fields.
export function pmpeToSol(pmpe: number, stakeSol: number): number {
  return (pmpe / 1000) * stakeSol
}
