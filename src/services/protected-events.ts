import { isProtectedEvent } from '@marinade.finance/ds-sam-estimator'
import { z } from 'zod'

import { pct } from 'src/format'
import { schemas } from 'src/schemas/generated/bonds'
import { VALIDATOR_BONDS_API_URL } from 'src/services/apiUrls'
import { fetchJson } from 'src/services/fetch-utils'

import type { ProtectedEvent } from '@marinade.finance/ds-sam-estimator'

export {
  isProtectedEvent,
  selectCurrentEpochEstimates,
  selectLatestProcessedEpoch,
  selectUnsettledEstimates,
  type ProtectedEvent,
  type ProtectedEventCommissionIncrease,
  type ProtectedEventCommissionSamIncrease,
  type ProtectedEventDowntimeRevenueImpact,
  type ProtectedEventLowCredits,
  type ProtectedEventReason,
  type ProtectedEventSettlement,
  type SettlementFunder,
  type SettlementMeta,
  type SettlementReason,
} from '@marinade.finance/ds-sam-estimator'

type ProtectedEventsResponse = {
  protected_events: ProtectedEvent[]
}

// `expected_credits` is the stake-weighted mean vote credits of every validator
// in that epoch (see calcTargetCreditsByEpoch), so actual/expected is a
// vote-credits-vs-network-mean ratio — NOT uptime. A validator that voted every
// slot but landed below the network mean is not "99% up". Name the metric.
const lowCreditsLabel = (actualCredits: number, expectedCredits: number) =>
  `Vote credits ${pct(expectedCredits > 0 ? actualCredits / expectedCredits : 0)} of network mean`

const optionalPct = (dec: number | null) => (dec == null ? '-' : pct(dec))

export const selectProtectedStakeReason = (protectedEvent: ProtectedEvent) => {
  if (isProtectedEvent(protectedEvent.reason)) {
    const reason = protectedEvent.reason.ProtectedEvent
    if ('CommissionIncrease' in reason) {
      return `Commission ${reason.CommissionIncrease.previous_commission}% -> ${reason.CommissionIncrease.current_commission}%`
    }
    if ('CommissionSamIncrease' in reason) {
      return `Inflation Commission ${pct(reason.CommissionSamIncrease.expected_inflation_commission)} -> ${pct(reason.CommissionSamIncrease.actual_inflation_commission)}; MEV Commission ${optionalPct(reason.CommissionSamIncrease.expected_mev_commission)} -> ${optionalPct(reason.CommissionSamIncrease.actual_mev_commission)}`
    }
    if ('LowCredits' in reason) {
      const { actual_credits: actual, expected_credits: expected } =
        reason.LowCredits
      return lowCreditsLabel(actual, expected)
    }
    if ('DowntimeRevenueImpact' in reason) {
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
    case 'InstitutionalPayout':
      return 'Institutional payout'
    default:
      console.log('unsupported event:', protectedEvent)
      return 'Unsupported'
  }
}

// `amount` is stored in lamports; expose to callers in SOL.
export const selectAmount = (protectedEvent: ProtectedEvent) =>
  protectedEvent.amount / 1e9

// This dashboard is the SAM view, but /v1 returns every settlement of both bond configs, so
// institutional payouts and direct-staking PSR would otherwise land in per-validator totals.
// An allowlist, not a denylist: `product` is an open string, so a product the backend adds
// later must stay out until someone decides it belongs here — a row missing either field is
// dropped for the same reason. Takes fetched /v1 rows only, never locally built estimates,
// which carry neither field.
export const selectSamBiddingSettlements = (
  protectedEvents: ProtectedEvent[],
): ProtectedEvent[] =>
  protectedEvents.filter(e => e.product === 'sam' && e.bond_type === 'bidding')

// Override layer over the generated schema, shaped like src/services/bonds.ts but for a different
// reason: /v1 serializes bond_type and product from non-Option fields, so optional() is not a
// compatibility shim. It is containment — one anomalous row must not reject the whole array and
// blank every Payments total, and selectSamBiddingSettlements then drops that row rather than
// counting it as SAM. The trailing fallbacks do the same for a reason the backend deploys before
// the next regen, which degrades to "Unsupported" in selectProtectedStakeReason. A regen drops
// that catch-all every time (scripts/generate-schemas.sh warns about it); here it cannot.
const SettlementReasonSchema = z.union([
  schemas.SettlementReason,
  z.object({}).passthrough(),
  z.string(),
])
const ProtectedEventsResponseSchema = z
  .object({
    protected_events: z.array(
      schemas.ProtectedEventRecord.extend({
        bond_type: z.string().optional(),
        product: z.string().optional(),
        reason: SettlementReasonSchema,
      }),
    ),
  })
  .passthrough()

export const fetchProtectedEvents = async (
  signal?: AbortSignal,
): Promise<ProtectedEventsResponse> => {
  const { protected_events: protectedEvents } =
    await fetchJson<ProtectedEventsResponse>(
      `${VALIDATOR_BONDS_API_URL}/v1/protected-events`,
      signal,
      body =>
        ProtectedEventsResponseSchema.parse(body) as ProtectedEventsResponse,
    )
  return { protected_events: selectSamBiddingSettlements(protectedEvents) }
}
