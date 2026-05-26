// SOL → lamports; exact float multiplication, caller rounds if needed.
export function solToLamports(sol: number): number {
  return sol * 1e9
}
