import { describe, expect, it } from 'vitest'

import { apyStanding, PILL } from '../apy-composition-card'

import type { AuctionValidator } from '@marinade.finance/ds-sam-sdk'

const makeValidator = (marinadeSamTargetSol: number): AuctionValidator =>
  ({ auctionStake: { marinadeSamTargetSol } }) as unknown as AuctionValidator

describe('apyStanding', () => {
  it('is below when the total APY misses the threshold', () => {
    expect(apyStanding(makeValidator(100), -0.004)).toBe('below')
  })

  it('is winning when the validator clears the threshold and holds stake', () => {
    expect(apyStanding(makeValidator(100), 0.004)).toBe('winning')
  })

  it('is outOfSet when the validator clears the threshold with no stake', () => {
    expect(apyStanding(makeValidator(0), 0.004)).toBe('outOfSet')
  })

  it('is winning exactly at the threshold', () => {
    expect(apyStanding(makeValidator(100), 0)).toBe('winning')
  })
})

describe('PILL tones', () => {
  it('never paints an out-of-set validator as a winner', () => {
    expect(PILL.outOfSet).not.toContain('primary')
  })

  it('keeps the out-of-set tone distinct from the below-threshold one', () => {
    expect(PILL.outOfSet).not.toContain('destructive')
  })
})
