// Tests for passesTableFilter: bond-below-min always visible, Basic vs Expert mode
// differences, and that bond runway does not drive row visibility.
import { describe, expect, it } from 'vitest'

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
    for (const bondBalanceSol of [0, MIN_BOND_SOL - 1]) {
      const v = makeValidator({ bondBalanceSol })
      expect(passesTableFilter(v, 'expert', MIN_BOND_SOL)).toBe(false)
      expect(passesTableFilter(v, 'basic', MIN_BOND_SOL)).toBe(false)
    }
  })

  it('expert mode shows everything with sufficient bond', () => {
    const atMin = makeValidator({ bondBalanceSol: MIN_BOND_SOL })
    const noStake = makeValidator({
      bondBalanceSol: MIN_BOND_SOL,
      marinadeActivatedStakeSol: 0,
      auctionStake: { marinadeSamTargetSol: 0 } as never,
    })
    expect(passesTableFilter(atMin, 'expert', MIN_BOND_SOL)).toBe(true)
    expect(passesTableFilter(noStake, 'expert', MIN_BOND_SOL)).toBe(
      true,
    )
  })

  it('bond runway does not drive visibility in either mode', () => {
    const zeroRunway = makeValidator({ bondGoodForNEpochs: 0 })
    expect(passesTableFilter(zeroRunway, 'expert', MIN_BOND_SOL)).toBe(
      true,
    )
    expect(passesTableFilter(zeroRunway, 'basic', MIN_BOND_SOL)).toBe(
      true,
    )
  })

  it('basic mode hides validators with no marinade stake', () => {
    const noStake = makeValidator({
      marinadeActivatedStakeSol: 0,
      auctionStake: { marinadeSamTargetSol: 0 } as never,
    })
    expect(passesTableFilter(noStake, 'basic', MIN_BOND_SOL)).toBe(
      false,
    )
  })
})
