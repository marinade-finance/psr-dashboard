// Tests for passesTableFilter: bond-below-min always excluded,
// no-marinade-stake excluded, bond runway does not drive visibility.
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
  it('drops validators with bond below minimum', () => {
    for (const bondBalanceSol of [0, MIN_BOND_SOL - 1]) {
      const v = makeValidator({ bondBalanceSol })
      expect(passesTableFilter(v, UserLevel.Basic, MIN_BOND_SOL)).toBe(false)
    }
  })

  it('bond runway does not drive visibility', () => {
    const zeroRunway = makeValidator({ bondGoodForNEpochs: 0 })
    expect(passesTableFilter(zeroRunway, UserLevel.Basic, MIN_BOND_SOL)).toBe(
      true,
    )
  })

  it('hides validators with no marinade stake', () => {
    const noStake = makeValidator({
      marinadeActivatedStakeSol: 0,
      auctionStake: { marinadeSamTargetSol: 0 } as never,
    })
    expect(passesTableFilter(noStake, UserLevel.Basic, MIN_BOND_SOL)).toBe(
      false,
    )
  })
})
