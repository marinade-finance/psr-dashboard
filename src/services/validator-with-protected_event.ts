import { buildProtectedEventRows } from '@marinade.finance/ds-sam-estimator'

import { LAST_DRYRUN_EPOCH } from './constants'
import { fetchProtectedEvents } from './protected-events'
import { calculateProtectedEventEstimates } from './protected-events-estimator'
import { loadSam } from './sam'
import { fetchScoring } from './scoring'
import { fetchValidatorsWithEpochs } from './validators'

import type { Validator } from './validators'
import type { ProtectedEventRow } from '@marinade.finance/ds-sam-estimator'
import type { QueryClient } from '@tanstack/react-query'

export type { ProtectedEventStatus } from '@marinade.finance/ds-sam-estimator'
export type ProtectedEventWithValidator = ProtectedEventRow<Validator>

// Takes a QueryClient so the shared loadSam() result is read from the canonical
// ['sam'] cache via ensureQueryData — see fetchValidatorsWithBonds.
export const fetchProtectedEventsWithValidators = async (
  qc: QueryClient,
  signal?: AbortSignal,
): Promise<ProtectedEventWithValidator[]> => {
  const [
    { validators },
    { protected_events: protectedEvents },
    scoring,
    { auctionResult },
  ] = await Promise.all([
    // Canonical cache key shared with the validator-detail Payments tab, so the
    // 3-epoch validator payload (multi-MB) is fetched at most once.
    qc.ensureQueryData({
      queryKey: ['validators-with-epochs', 3],
      queryFn: ({ signal: s }) => fetchValidatorsWithEpochs(3, s),
    }),
    fetchProtectedEvents(signal),
    fetchScoring(signal),
    qc.ensureQueryData({ queryKey: ['sam'], queryFn: () => loadSam() }),
  ])

  const estimates = await calculateProtectedEventEstimates(validators, signal)

  return buildProtectedEventRows({
    validators,
    settlements: protectedEvents,
    estimates,
    scoring,
    auctionValidators: auctionResult.auctionData.validators,
    lastDryrunEpoch: LAST_DRYRUN_EPOCH,
  })
}
