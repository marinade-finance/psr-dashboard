import { z } from 'zod'

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

// The non-ProtectedEvent reasons come from the generated schema, so a regen adds new ones (most
// recently InstitutionalPayout) without a hand edit here.
export type SettlementReason =
  | ProtectedEventSettlement
  | Exclude<z.infer<typeof schemas.SettlementReason>, object>

export const isProtectedEvent = (
  e: SettlementReason,
): e is ProtectedEventSettlement =>
  typeof e === 'object' && 'ProtectedEvent' in e

// Which bond paid, and the off-chain product attribution — typed from the generated schema. Both
// optional because locally built estimates are not settlements and never carry them.
export type ProtectedEvent = {
  epoch: number
  amount: number
  vote_account: string
  meta: SettlementMeta
  reason: SettlementReason
  bond_type?: z.infer<typeof schemas.ProtectedEventRecord>['bond_type']
  product?: z.infer<typeof schemas.ProtectedEventRecord>['product']
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
