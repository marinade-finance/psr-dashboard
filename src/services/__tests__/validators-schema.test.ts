import { describe, expect, it } from 'vitest'

import { schemas } from 'src/schemas/generated/validators'

const epochStats = (credits: number | null) => ({
  activated_stake: '1000',
  blocks_produced: 0,
  credits,
  epoch: 1100,
  foundation_stake: '0',
  institutional_stake: '0',
  leader_slots: 0,
  marinade_native_stake: '0',
  marinade_stake: '0',
  self_stake: '0',
  skip_rate: 0,
  stake_to_become_superminority: '0',
  superminority: false,
  vote_reward_lamports: 5000,
})

describe('ValidatorEpochStats schema', () => {
  it('accepts null credits, as the validators API sends in an Alpenglow epoch', () => {
    expect(
      schemas.ValidatorEpochStats.safeParse(epochStats(null)).success,
    ).toBe(true)
    expect(
      schemas.ValidatorEpochStats.safeParse(epochStats(432_000)).success,
    ).toBe(true)
  })
})
