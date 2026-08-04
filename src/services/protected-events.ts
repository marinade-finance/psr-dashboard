import { pct } from 'src/format'
import { schemas } from 'src/schemas/generated/bonds'
import { VALIDATOR_BONDS_API_URL } from 'src/services/apiUrls'
import { fetchJson } from 'src/services/fetch-utils'

type SettlementFunder = 'ValidatorBond' | 'Marinade'

export type SettlementMeta = {
  funder: SettlementFunder
}

type ProtectedEventCommissionSamIncreaseReason = {
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
type ProtectedEventCommissionIncrease = {
  vote_account: string
  previous_commission: number
  current_commission: number
  expected_epr: number
  actual_epr: number
  epr_loss_bps: number
  stake: number
}
type ProtectedEventLowCredits = {
  vote_account: string
  expected_credits: number
  actual_credits: number
  commission: number
  expected_epr: number
  actual_epr: number
  epr_loss_bps: number
  stake: number
}

type CommissionIncreaseReason = {
  CommissionIncrease: ProtectedEventCommissionIncrease
}
type LowCreditsReason = { LowCredits: ProtectedEventLowCredits }
type DowntimeRevenueImpactReason = {
  DowntimeRevenueImpact: ProtectedEventLowCredits
}
type CommissionSamIncreaseReason = {
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

type ProtectedEventSettlement = {
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

type ProtectedEventsResponse = {
  protected_events: ProtectedEvent[]
}

// `expected_credits` is the stake-weighted mean vote credits of every validator
// in that epoch (see calcTargetCreditsByEpoch), so actual/expected is a
// vote-credits-vs-network-mean ratio — NOT uptime. A validator that voted every
// slot but landed below the network mean is not "99% up". Name the metric.
const lowCreditsLabel = (actualCredits: number, expectedCredits: number) =>
  `Vote credits ${pct(expectedCredits > 0 ? actualCredits / expectedCredits : 0)} of network mean`

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
      return lowCreditsLabel(actual, expected)
    }
    if (isDowntimeRevenueImpactReason(reason)) {
      const { actual_credits: actual, expected_credits: expected } =
        reason.DowntimeRevenueImpact
      return lowCreditsLabel(actual, expected)
    }
  }
  // After isProtectedEvent narrows the object case out, reason is the
  // string-union. The default branch is lenient on purpose: a new SDK
  // reason logs and falls back to "Unsupported" so a backend deploy
  // can't break the page. (Trade-off vs assertNever: chose resilience.)
  switch (protectedEvent.reason) {
    case 'Bidding':
      return 'Bidding'
    case 'BidTooLowPenalty':
      return 'Bid too low'
    case 'BlacklistPenalty':
      return 'Blacklisted'
    case 'BondRiskFee':
      return 'Bond risk fee'
    case 'PriorityFee':
      return 'Priority fee'
    default:
      console.log('unsupported event:', protectedEvent)
      return 'Unsupported'
  }
}

// `amount` is stored in lamports; expose to callers in SOL.
export const selectAmount = (protectedEvent: ProtectedEvent) =>
  protectedEvent.amount / 1e9

// Newest epoch the bonds API has finalized settlements for. Anything at or
// below it is a paid fact, so an estimate for the same epoch would bill the
// operator a second time.
export const selectLatestProcessedEpoch = (
  protectedEvents: ProtectedEvent[],
): number => protectedEvents.reduce((max, e) => Math.max(e.epoch, max), 0)

// Drop estimates the API has already settled. Shared by the Events page and the
// validator-detail Payments tab so both surfaces suppress the same rows.
export const selectUnsettledEstimates = (
  estimates: ProtectedEvent[],
  latestProcessedEpoch: number,
): ProtectedEvent[] => estimates.filter(e => e.epoch > latestProcessedEpoch)

// Estimates that belong on the Payments tab. That tab totals a single epoch
// ("you will pay X this epoch"), but the estimator walks a trailing 3-epoch
// window (validators?epochs=3), so without this an old bad epoch keeps getting
// re-billed on the current epoch's total for three epochs running. Keep only
// the live epoch, and only while it is still unsettled.
// A null networkEpoch means we cannot tell which epoch is live — show nothing
// rather than risk re-billing a settled one.
export const selectCurrentEpochEstimates = (
  estimates: ProtectedEvent[],
  networkEpoch: number | null,
  latestProcessedEpoch: number,
): ProtectedEvent[] =>
  networkEpoch === null
    ? []
    : selectUnsettledEstimates(estimates, latestProcessedEpoch).filter(
        e => e.epoch === networkEpoch,
      )

export const fetchProtectedEvents = (
  signal?: AbortSignal,
): Promise<ProtectedEventsResponse> =>
  fetchJson<ProtectedEventsResponse>(
    `${VALIDATOR_BONDS_API_URL}/protected-events`,
    signal,
    body =>
      schemas.ProtectedEventsResponse.parse(body) as ProtectedEventsResponse,
  )
