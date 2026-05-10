import { describe, expect, it } from 'vitest'

import { UserLevel } from '../../navigation/navigation'
import { passesTableFilter } from '../sam-table'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'

const MIN_BOND_EPOCHS = 6

const v = (overrides: Partial<AuctionValidator>): AuctionValidator =>
  ({
    voteAccount: 'va',
    bondBalanceSol: 100,
    bondGoodForNEpochs: 20,
    marinadeActivatedStakeSol: 1000,
    auctionStake: { marinadeSamTargetSol: 1000 },
    ...overrides,
  }) as unknown as AuctionValidator

describe('passesTableFilter', () => {
  it('drops validators with no bond regardless of level', () => {
    const noBond = v({ bondBalanceSol: 0 })
    expect(passesTableFilter(noBond, UserLevel.Expert, MIN_BOND_EPOCHS)).toBe(
      false,
    )
    expect(passesTableFilter(noBond, UserLevel.Basic, MIN_BOND_EPOCHS)).toBe(
      false,
    )
  })

  it('expert mode shows everything else', () => {
    const tinyBond = v({ bondGoodForNEpochs: 1 })
    const noStake = v({
      marinadeActivatedStakeSol: 0,
      auctionStake: { marinadeSamTargetSol: 0 } as never,
    })
    expect(passesTableFilter(tinyBond, UserLevel.Expert, MIN_BOND_EPOCHS)).toBe(
      true,
    )
    expect(passesTableFilter(noStake, UserLevel.Expert, MIN_BOND_EPOCHS)).toBe(
      true,
    )
  })

  it('basic mode hides validators with no marinade stake', () => {
    const noStake = v({
      marinadeActivatedStakeSol: 0,
      auctionStake: { marinadeSamTargetSol: 0 } as never,
    })
    expect(passesTableFilter(noStake, UserLevel.Basic, MIN_BOND_EPOCHS)).toBe(
      false,
    )
  })

  it('basic mode hides validators with bond runway below min', () => {
    const tooShort = v({ bondGoodForNEpochs: MIN_BOND_EPOCHS - 1 })
    expect(passesTableFilter(tooShort, UserLevel.Basic, MIN_BOND_EPOCHS)).toBe(
      false,
    )
  })

  it('basic mode keeps validators at exactly min runway', () => {
    const atMin = v({ bondGoodForNEpochs: MIN_BOND_EPOCHS })
    expect(passesTableFilter(atMin, UserLevel.Basic, MIN_BOND_EPOCHS)).toBe(
      true,
    )
  })

  it('basic mode treats missing bondGoodForNEpochs as 0 (hidden)', () => {
    const missing = v({ bondGoodForNEpochs: undefined as unknown as number })
    expect(passesTableFilter(missing, UserLevel.Basic, MIN_BOND_EPOCHS)).toBe(
      false,
    )
  })
})
