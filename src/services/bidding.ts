import { pct } from 'src/format'
import { pmpeToSol } from 'src/services/pmpe'
import {
  formattedBlockRewardsCommission,
  formattedMevCommission,
  overridesCpmpeMessage,
  selectBid,
  selectBlockRewardsCommissionPmpe,
  selectCommission,
  selectCommissionPmpe,
  selectEffectiveBid,
  selectEffectiveCost,
  selectExpectedStakeChange,
  selectMevCommissionPmpe,
  selectSamActiveStake,
  selectSamTargetStake,
} from 'src/services/sam'

import type { AugmentedAuctionValidator } from 'src/services/sam'

export type Bidding = {
  active: number
  target: number
  delta: number
  effBid: number
  bid: number
  bidGap: number
  activatingStakePmpe: number
  stake: number
  activating: number
  cost: number
  activatingCost: number
  total: number
  inflPct: string
  mevPct: string
  blkPct: string
  inflPmpe: number
  mevPmpe: number
  blkPmpe: number
  overrideMsg: string
}

export function computeBidding(v: AugmentedAuctionValidator): Bidding {
  const stake = v.marinadeActivatedStakeSol
  const delta = selectExpectedStakeChange(v)
  const activating = Math.max(0, delta)
  const bid = selectBid(v)
  const effBid = selectEffectiveBid(v)
  const cost = selectEffectiveCost(v)
  const activatingStakePmpe = v.revShare.activatingStakePmpe
  const activatingCost = pmpeToSol(activatingStakePmpe, activating)
  return {
    active: selectSamActiveStake(v),
    target: selectSamTargetStake(v),
    delta,
    effBid,
    bid,
    bidGap: Math.max(0, bid - effBid),
    activatingStakePmpe,
    stake,
    activating,
    cost,
    activatingCost,
    total: cost + activatingCost,
    inflPct: pct(selectCommission(v), 0),
    mevPct: formattedMevCommission(v),
    blkPct: formattedBlockRewardsCommission(v),
    inflPmpe: selectCommissionPmpe(v),
    mevPmpe: selectMevCommissionPmpe(v),
    blkPmpe: selectBlockRewardsCommissionPmpe(v),
    overrideMsg: overridesCpmpeMessage(v),
  }
}
