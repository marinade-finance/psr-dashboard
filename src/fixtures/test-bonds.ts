import type { BondRecord } from 'src/services/bonds'
import type { ValidatorWithBond } from 'src/services/validator-with-bond'
import type { Validator } from 'src/services/validators'

const EPOCH = 700
const SOL = 1_000_000_000

function makeValidator(
  voteAccount: string,
  name: string,
  marinadeSol: number,
  nativeSol = 0,
): Validator {
  return {
    vote_account: voteAccount,
    info_name: name,
    dc_country_iso: 'US',
    marinade_stake: String(marinadeSol * SOL),
    marinade_native_stake: String(nativeSol * SOL),
    activated_stake: String((marinadeSol + nativeSol) * SOL),
    epoch_stats: [],
  }
}

function makeBond(
  voteAccount: string,
  effectiveSol: number,
  cpmpe: number | string = '2',
): BondRecord {
  return {
    pubkey: voteAccount.slice(0, 6) + 'bnd',
    vote_account: voteAccount,
    authority: 'BondAuth11111111111111111111111111111111111',
    cpmpe: String(cpmpe),
    updated_at: new Date().toISOString(),
    epoch: EPOCH,
    funded_amount: effectiveSol * SOL,
    effective_amount: effectiveSol * SOL,
    max_stake_wanted: effectiveSol * SOL * 500,
    remaining_witdraw_request_amount: 0,
    remainining_settlement_claim_amount: 0,
    inflation_commission_bps: 500,
    mev_commission_bps: 800,
  }
}

// Coverage = bond_sol / (stake_sol * pmpe/1000)
// With cpmpe=2: need ~500 SOL bond per 100k SOL stake for full coverage
const va = Array.from(
  { length: 12 },
  (_, i) =>
    `BondTest${String(i + 1).padStart(2, '0')}1111111111111111111111111111111111111`,
)

export const TEST_BONDS_DATA: ValidatorWithBond[] = [
  // Full coverage (ratio ≥ 0.95)
  {
    validator: makeValidator(va[0], 'Full Coverage — Tier >100k', 200_000),
    bond: makeBond(va[0], 2_000, 2),
  },
  {
    validator: makeValidator(va[1], 'Full Coverage — Tier 50k–100k', 80_000),
    bond: makeBond(va[1], 900, 2),
  },
  // High coverage (0.70–0.95)
  {
    validator: makeValidator(va[2], 'High Coverage — Tier 20k–50k', 35_000),
    bond: makeBond(va[2], 250, 2),
  },
  // Mid coverage (0.40–0.70)
  {
    validator: makeValidator(va[3], 'Mid Coverage', 120_000),
    bond: makeBond(va[3], 400, 2),
  },
  // Low coverage (< 0.40)
  {
    validator: makeValidator(va[4], 'Low Coverage', 90_000),
    bond: makeBond(va[4], 50, 2),
  },
  // No bond at all
  {
    validator: makeValidator(va[5], 'No Bond — Large Stake', 150_000),
    bond: null,
  },
  {
    validator: makeValidator(va[6], 'No Bond — Small Stake', 8_000),
    bond: null,
  },
  // Tier <20k
  {
    validator: makeValidator(va[7], 'Small — Full Coverage', 5_000),
    bond: makeBond(va[7], 60, 2),
  },
  {
    validator: makeValidator(va[8], 'Small — Low Coverage', 12_000),
    bond: makeBond(va[8], 10, 2),
  },
  // Native stake only
  {
    validator: makeValidator(va[9], 'Native Stake + Bond', 0, 60_000),
    bond: makeBond(va[9], 400, 2),
  },
  // High CPMPE (smaller bond needed for same coverage)
  {
    validator: makeValidator(va[10], 'High CPMPE Bond', 50_000),
    bond: makeBond(va[10], 100, 8),
  },
  // Zero effective stake (edge case)
  {
    validator: makeValidator(va[11], 'Bond No Stake', 0),
    bond: makeBond(va[11], 200, 2),
  },
]
