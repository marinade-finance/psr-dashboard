import { pct } from 'src/format'
import { VALIDATOR_BONDS_API_URL } from 'src/services/apiUrls'
import { fetchJson } from 'src/services/fetch-utils'

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

const isCommissionIncreaseReason = (
  e: ProtectedEventReason,
): e is CommissionIncreaseReason => 'CommissionIncrease' in e
const isLowCreditsReason = (e: ProtectedEventReason): e is LowCreditsReason =>
  'LowCredits' in e
const isDowntimeRevenueImpactReason = (
  e: ProtectedEventReason,
): e is DowntimeRevenueImpactReason => 'DowntimeRevenueImpact' in e
const isCommissionSamIncreaseReason = (
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
  | 'BondRiskFee'
  | 'PriorityFee'

export const isProtectedEvent = (
  e: SettlementReason,
): e is ProtectedEventSettlement =>
  typeof e === 'object' && 'ProtectedEvent' in e

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
      return `Inflation Commission ${pct(reason.CommissionSamIncrease.expected_inflation_commission)} -> ${pct(reason.CommissionSamIncrease.actual_inflation_commission)}; MEV Commission ${pct(reason.CommissionSamIncrease.expected_mev_commission)} -> ${pct(reason.CommissionSamIncrease.actual_mev_commission)}`
    }
    if (isLowCreditsReason(reason)) {
      const { actual_credits: actual, expected_credits: expected } =
        reason.LowCredits
      return `Uptime ${pct(expected > 0 ? actual / expected : 0)}`
    }
    if (isDowntimeRevenueImpactReason(reason)) {
      const { actual_credits: actual, expected_credits: expected } =
        reason.DowntimeRevenueImpact
      return `Uptime ${pct(expected > 0 ? actual / expected : 0)}`
    }
  }
  if (protectedEvent.reason === 'Bidding') return 'Bidding'
  if (protectedEvent.reason === 'BidTooLowPenalty') return 'BidTooLow'
  if (protectedEvent.reason === 'BlacklistPenalty') return 'Blacklist'
  if (protectedEvent.reason === 'BondRiskFee') return 'BondRiskFee'
  if (protectedEvent.reason === 'PriorityFee') return 'PriorityFee'
  console.log('unsupported event:', protectedEvent)
  return 'Unsupported'
}

export const selectAmount = (protectedEvent: ProtectedEvent) =>
  Number(protectedEvent.amount / 1e9)

export const fetchProtectedEvents = (): Promise<ProtectedEventsResponse> =>
  fetchJson<ProtectedEventsResponse>(
    `${VALIDATOR_BONDS_API_URL}/protected-events`,
  )
