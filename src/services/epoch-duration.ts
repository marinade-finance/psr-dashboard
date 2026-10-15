import { epochDurationSecondsFromSlotsPerYear } from '@marinade.finance/ts-common'

import { MARINADE_API_URL, VALIDATORS_API_URL } from './apiUrls'

// How long an epoch really lasts, which is what turns a per-epoch yield (PMPE)
// into an APY. Every PMPE is per epoch: inflation is paid per epoch on the
// nominal slots per year (the SDK normalises its inflation window to that
// nominal), MEV and block rewards accrue per block. How many epochs fit in a
// year depends on wall-clock slot time, and real slots run slower than the
// nominal (about 218 ms against 200 ms since epoch 1053), so annualising on
// the nominal overstates every APY by roughly 60 bps.
//
// The measured figure is the Marinade API's average over the last three
// completed epochs. Right after a SIMD-0525 slot-time step that window still
// holds epochs from the slower regime and would understate APY, so it is used
// only when all three epochs ran on today's nominal. Otherwise, or when the
// API is down, the duration is estimated at 220 ms per 200 ms nominal slot.

const MEASURED_WINDOW_EPOCHS = 3
// Real slot time over nominal when no clean measurement exists.
export const ESTIMATED_SLOT_STRETCH = 1.1
// Slots cannot run faster than the nominal; a 50% stall is an outage.
const PLAUSIBLE_STRETCH = { min: 0.95, max: 1.5 } as const

export type SlotsPerYearRecord = readonly [epoch: number, slotsPerYear: number]

export type EpochMeasurement = {
  measuredHours: number | null
  // Must reach the current epoch (the validators API lists it).
  slotsPerYearByEpoch: readonly SlotsPerYearRecord[]
}

export type EpochDuration = {
  seconds: number
  source: 'measured' | 'estimated'
  nominalSeconds: number
}

// First epoch of the current slot-time regime: where the trailing run of the
// latest slots_per_year value starts. A gap ends the run, so a regime is never
// assumed older than the history shows.
export const regimeStartEpoch = (
  slotsPerYearByEpoch: readonly SlotsPerYearRecord[],
): number | null => {
  const sorted = [...slotsPerYearByEpoch].sort((a, b) => b[0] - a[0])
  const latest = sorted[0]
  if (!latest) return null
  const [latestEpoch, current] = latest
  let start = latestEpoch
  for (const [epoch, slotsPerYear] of sorted.slice(1)) {
    if (slotsPerYear !== current || epoch !== start - 1) break
    start = epoch
  }
  return start
}

export const resolveEpochDuration = (
  slotsPerYear: number,
  measurement: EpochMeasurement | null,
): EpochDuration => {
  const nominalSeconds =
    epochDurationSecondsFromSlotsPerYear(slotsPerYear).toNumber()
  const estimated: EpochDuration = {
    seconds: nominalSeconds * ESTIMATED_SLOT_STRETCH,
    source: 'estimated',
    nominalSeconds,
  }
  const measuredHours = measurement?.measuredHours
  if (measuredHours == null || !Number.isFinite(measuredHours)) return estimated

  const measuredSeconds = measuredHours * 3600
  const stretch = measuredSeconds / nominalSeconds
  if (stretch < PLAUSIBLE_STRETCH.min || stretch > PLAUSIBLE_STRETCH.max)
    return estimated

  // Clean when the regime began at or before the window's first epoch, and
  // the history carries the nominal the auction annualises on.
  const history = measurement?.slotsPerYearByEpoch ?? []
  const latest = history.reduce<SlotsPerYearRecord | null>(
    (acc, record) => (!acc || record[0] > acc[0] ? record : acc),
    null,
  )
  const start = regimeStartEpoch(history)
  if (!latest || start == null || latest[1] !== slotsPerYear) return estimated
  if (start > latest[0] - MEASURED_WINDOW_EPOCHS) return estimated

  return { seconds: measuredSeconds, source: 'measured', nominalSeconds }
}

const fetchJson = async (
  url: string,
  signal?: AbortSignal,
): Promise<unknown> => {
  try {
    const res = await fetch(url, { signal })
    return res.ok ? ((await res.json()) as unknown) : null
  } catch {
    return null
  }
}

// Both inputs are optional: a failure resolves to "no measurement", which
// resolveEpochDuration turns into the estimate rather than failing the page.
export const fetchEpochMeasurement = async (
  signal?: AbortSignal,
): Promise<EpochMeasurement> => {
  const [metrics, rewards] = await Promise.all([
    fetchJson(`${MARINADE_API_URL}/metrics_json`, signal),
    fetchJson(`${VALIDATORS_API_URL}/rewards?epochs=4`, signal),
  ])
  const hours = (metrics as { last_3_epochs_avg_duration_hs?: unknown } | null)
    ?.last_3_epochs_avg_duration_hs
  const records = (rewards as { slots_per_year?: unknown } | null)
    ?.slots_per_year
  return {
    measuredHours: typeof hours === 'number' && hours > 0 ? hours : null,
    slotsPerYearByEpoch: Array.isArray(records)
      ? records.filter(
          (r): r is SlotsPerYearRecord =>
            Array.isArray(r) &&
            r.length === 2 &&
            typeof r[0] === 'number' &&
            typeof r[1] === 'number',
        )
      : [],
  }
}
