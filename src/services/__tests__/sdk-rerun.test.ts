import { describe, it, expect } from 'vitest'
import {
  Auction,
  AuctionConstraints,
  Debug,
  LogVerbosity,
  buildAuctionConstraintsConfig,
} from '@marinade.finance/ds-sam-sdk/dist/src/engine.js'

import {
  TEST_AUCTION_RESULT,
  TEST_DS_SAM_CONFIG,
} from 'src/fixtures/test-validators'

import { runSdkRerun } from '../sdk-rerun'

const evaluateWithSdk = () => {
  const base = TEST_AUCTION_RESULT.auctionData
  // Per-row clone: fixture rows share auctionStake objects, which one whole-graph clone would keep.
  const data = {
    ...structuredClone(base),
    validators: base.validators.map(v => structuredClone(v)),
  }
  const debug = new Debug(new Set(), LogVerbosity.ERROR)
  const constraints = new AuctionConstraints(
    buildAuctionConstraintsConfig(TEST_DS_SAM_CONFIG, data),
    debug,
  )
  const auction = new Auction(data, constraints, TEST_DS_SAM_CONFIG, debug)
  auction.reset()
  return auction.evaluate()
}

describe('runSdkRerun', () => {
  it('with no overrides reproduces the SDK-evaluated input auction', () => {
    const input = evaluateWithSdk()
    expect(Number.isFinite(input.winningTotalPmpe)).toBe(true)
    expect(
      input.auctionData.validators.some(
        v => v.auctionStake.marinadeSamTargetSol > 0,
      ),
    ).toBe(true)

    const rerun = runSdkRerun(input.auctionData, TEST_DS_SAM_CONFIG, null)

    expect(rerun.winningTotalPmpe).toBe(input.winningTotalPmpe)
    expect(rerun.auctionData.validators.map(v => v.voteAccount)).toEqual(
      input.auctionData.validators.map(v => v.voteAccount),
    )
    rerun.auctionData.validators.forEach((v, i) => {
      expect(v.auctionStake.marinadeSamTargetSol).toBeCloseTo(
        input.auctionData.validators[i].auctionStake.marinadeSamTargetSol,
        6,
      )
    })
  })
})
