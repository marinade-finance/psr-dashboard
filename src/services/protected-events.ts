import { formatPercentage } from 'src/format'

export type SettlementFunder = 'ValidatorBond' | 'Marinade'

export type SettlementMeta = {
  funder: SettlementFunder
}

export type ProtectedEventCommissionSamIncreaseReason = {
  vote_account: string
  actual_inflation_commission: number
  expected_inflation_commission: number
  actual_mev_commission: number
  expected_mev_commission: number
  expected_epr: number
  actual_epr: number
  epr_loss_bps: number
  stake: number
}
export type ProtectedEventCommissionIncrease = {
  vote_account: string
  previous_commission: number
  current_commission: number
  expected_epr: number
  actual_epr: number
  epr_loss_bps: number
  stake: number
}
export type ProtectedEventLowCredits = {
  vote_account: string
  expected_credits: number
  actual_credits: number
  commission: number
  expected_epr: number
  actual_epr: number
  epr_loss_bps: number
  stake: number
}

export type CommissionIncreaseReason = {
  CommissionIncrease: ProtectedEventCommissionIncrease
}
export type LowCreditsReason = { LowCredits: ProtectedEventLowCredits }
export type DowntimeRevenueImpactReason = {
  DowntimeRevenueImpact: ProtectedEventLowCredits
}
export type CommissionSamIncreaseReason = {
  CommissionSamIncrease: ProtectedEventCommissionSamIncreaseReason
}
export type ProtectedEventReason =
  | CommissionIncreaseReason
  | LowCreditsReason
  | DowntimeRevenueImpactReason
  | CommissionSamIncreaseReason

export const isCommissionIncreaseReason = (
  e: ProtectedEventReason,
): e is CommissionIncreaseReason => 'CommissionIncrease' in e
export const isLowCreditsReason = (
  e: ProtectedEventReason,
): e is LowCreditsReason => 'LowCredits' in e
export const isDowntimeRevenueImpactReason = (
  e: ProtectedEventReason,
): e is DowntimeRevenueImpactReason => 'DowntimeRevenueImpact' in e
export const isCommissionSamIncreaseReason = (
  e: ProtectedEventReason,
): e is CommissionSamIncreaseReason => 'CommissionSamIncrease' in e

export type ProtectedEventSettlement = {
  ProtectedEvent: ProtectedEventReason
}

export type SettlementReason =
  | ProtectedEventSettlement
  | 'Bidding'
  | 'BidTooLowPenalty'
  | 'BlacklistPenalty'

export const isProtectedEvent = (
  e: SettlementReason,
): e is ProtectedEventSettlement =>
  typeof e === 'object' && 'ProtectedEvent' in e
export const isBidTooLowPenalty = (e: SettlementReason): boolean =>
  e === 'BidTooLowPenalty'
export const isBlacklistPenalty = (e: SettlementReason): boolean =>
  e === 'BlacklistPenalty'

export type ProtectedEvent = {
  epoch: number
  amount: number
  vote_account: string
  meta: SettlementMeta
  reason: SettlementReason
}

export type ProtectedEventsResponse = {
  protected_events: ProtectedEvent[]
}

export const selectProtectedStakeReason = (protectedEvent: ProtectedEvent) => {
  if (isProtectedEvent(protectedEvent.reason)) {
    const reason = protectedEvent.reason.ProtectedEvent
    if (isCommissionIncreaseReason(reason)) {
      return `Commission ${reason.CommissionIncrease.previous_commission}% -> ${reason.CommissionIncrease.current_commission}%`
    }
    if (isCommissionSamIncreaseReason(reason)) {
      return `Inflation Commission ${formatPercentage(reason.CommissionSamIncrease.expected_inflation_commission)} -> ${formatPercentage(reason.CommissionSamIncrease.actual_inflation_commission)}; MEV Commission ${formatPercentage(reason.CommissionSamIncrease.expected_mev_commission)} -> ${formatPercentage(reason.CommissionSamIncrease.actual_mev_commission)}`
    }
    if (isLowCreditsReason(reason)) {
      return `Uptime ${formatPercentage(reason.LowCredits.actual_credits / reason.LowCredits.expected_credits)}`
    }
    if (isDowntimeRevenueImpactReason(reason)) {
      return `Uptime ${formatPercentage(reason.DowntimeRevenueImpact.actual_credits / reason.DowntimeRevenueImpact.expected_credits)}`
    }
  }
  if (isBidTooLowPenalty(protectedEvent.reason)) {
    return 'BidTooLow'
  }
  if (isBlacklistPenalty(protectedEvent.reason)) {
    return 'Blacklist'
  }
  console.log('unsupported event:', protectedEvent)
  return 'Unsupported'
}

export const selectEprLossBps = (protectedEvent: ProtectedEvent) => {
  if (isProtectedEvent(protectedEvent.reason)) {
    const reason = protectedEvent.reason.ProtectedEvent
    if (isCommissionIncreaseReason(reason)) {
      // return reason.CommissionIncrease.epr_loss_bps
      return (
        10000 -
        (10000 * (100 - reason.CommissionIncrease.current_commission)) /
          (100 - reason.CommissionIncrease.previous_commission)
      )
    }
    if (isLowCreditsReason(reason)) {
      return reason.LowCredits.epr_loss_bps
    }
  }
  return 0
}

export const selectAmount = (protectedEvent: ProtectedEvent) =>
  Number(protectedEvent.amount / 1e9)

export const fetchProtectedEvents =
  async (): Promise<ProtectedEventsResponse> => {
    const res = await fetch(
      'https://validator-bonds-api.marinade.finance/protected-events',
    )
    return (await res.json()) as ProtectedEventsResponse
  }
