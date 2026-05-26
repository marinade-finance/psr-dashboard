// PMPE = lamports per 1000 SOL per epoch; output unit follows stake unit.
export function pmpeToSol(pmpe: number, stakeSol: number): number {
  return (pmpe / 1000) * stakeSol
}
