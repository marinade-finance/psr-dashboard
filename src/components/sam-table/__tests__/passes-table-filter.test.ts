import { describe, expect, it } from 'vitest'

import { UserLevel } from '../../navigation/navigation'
import { passesTableFilter } from '../sam-table'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'

const MIN_BOND_SOL = 5

const makeValidator = (
  overrides: Partial<AuctionValidator>,
): AuctionValidator =>
  ({
    voteAccount: 'va',
    bondBalanceSol: 100,
    bondGoodForNEpochs: 1, // runway does NOT drive visibility
    marinadeActivatedStakeSol: 1000,
    auctionStake: { marinadeSamTargetSol: 1000 },
    ...overrides,
  }) as unknown as AuctionValidator

describe('passesTableFilter', () => {
  it('drops validators with bond below minimum regardless of level', () => {
    const belowMin = makeValidator({ bondBalanceSol: MIN_BOND_SOL - 1 })
    expect(passesTableFilter(belowMin, UserLevel.Expert, MIN_BOND_SOL)).toBe(
      false,
    )
    expect(passesTableFilter(belowMin, UserLevel.Basic, MIN_BOND_SOL)).toBe(
      false,
    )
  })

  it('drops validators with zero bond regardless of level', () => {
    const noBond = makeValidator({ bondBalanceSol: 0 })
    expect(passesTableFilter(noBond, UserLevel.Expert, MIN_BOND_SOL)).toBe(
      false,
    )
    expect(passesTableFilter(noBond, UserLevel.Basic, MIN_BOND_SOL)).toBe(false)
  })

  it('expert mode shows everything with sufficient bond', () => {
    const atMin = makeValidator({ bondBalanceSol: MIN_BOND_SOL })
    const noStake = makeValidator({
      bondBalanceSol: MIN_BOND_SOL,
      marinadeActivatedStakeSol: 0,
      auctionStake: { marinadeSamTargetSol: 0 } as never,
    })
    // low runway does NOT cause expert to hide a row
    const tinyRunway = makeValidator({ bondGoodForNEpochs: 0 })
    expect(passesTableFilter(atMin, UserLevel.Expert, MIN_BOND_SOL)).toBe(true)
    expect(passesTableFilter(noStake, UserLevel.Expert, MIN_BOND_SOL)).toBe(
      true,
    )
    expect(passesTableFilter(tinyRunway, UserLevel.Expert, MIN_BOND_SOL)).toBe(
      true,
    )
  })

  it('basic mode hides validators with no marinade stake', () => {
    const noStake = makeValidator({
      marinadeActivatedStakeSol: 0,
      auctionStake: { marinadeSamTargetSol: 0 } as never,
    })
    expect(passesTableFilter(noStake, UserLevel.Basic, MIN_BOND_SOL)).toBe(
      false,
    )
  })

  it('basic mode shows in-set validators regardless of runway', () => {
    const zeroRunway = makeValidator({ bondGoodForNEpochs: 0 })
    expect(passesTableFilter(zeroRunway, UserLevel.Basic, MIN_BOND_SOL)).toBe(
      true,
    )
  })

  it('basic mode keeps validators at exactly min bond', () => {
    const atMin = makeValidator({ bondBalanceSol: MIN_BOND_SOL })
    expect(passesTableFilter(atMin, UserLevel.Basic, MIN_BOND_SOL)).toBe(true)
  })
})
