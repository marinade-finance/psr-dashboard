/**
 * Loads the live API snapshot captured by scripts/capture-fixtures.js.
 * Files are served from /snapshot/ (public/snapshot/) by the Vite preview
 * server — they are NOT bundled and NOT committed (gitignored).
 *
 * `scale(n)` duplicates the validator list n times with unique vote accounts
 * for stress testing Chrome memory and rendering at larger fleet sizes.
 */

import type {
  AuctionResult,
  AuctionValidator,
} from '@marinade.finance/ds-sam-sdk'

export type LiveSnapshot = {
  auctionResult: AuctionResult
  validatorNames: Map<string, string>
  capturedAt: string
  validatorCount: number
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok)
    throw new Error(
      `snapshot not found: ${path} — run: node scripts/capture-fixtures.js`,
    )
  return res.json() as Promise<T>
}

// Serialized representation of a Set in the JSON snapshot (written by capture-fixtures.js).
type SerializedSet = { setType: 'Set'; values: string[] }

function isSerializedSet(v: unknown): v is SerializedSet {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as SerializedSet).setType === 'Set'
  )
}

export async function loadLiveSnapshot(scale = 1): Promise<LiveSnapshot> {
  const [auctionRaw, namesRaw, metaRaw] = await Promise.all([
    fetchJson<Record<string, unknown>>('/snapshot/auction-result.json'),
    fetchJson<Record<string, string>>('/snapshot/validator-names.json'),
    fetchJson<{
      capturedAt: string
      validatorCount: number
      winningTotalPmpe: number
      epoch: number
    }>('/snapshot/meta.json'),
  ])

  const rawData = auctionRaw['auctionData'] as Record<string, unknown>
  const rawBlacklist = rawData['blacklist']
  const blacklist: Set<string> = isSerializedSet(rawBlacklist)
    ? new Set(rawBlacklist.values)
    : new Set<string>()

  const validators = rawData['validators'] as AuctionValidator[]

  const scaledValidators: AuctionValidator[] =
    scale <= 1
      ? validators
      : Array.from({ length: scale }, (_, i) =>
          i === 0
            ? validators
            : validators.map(v => ({
                ...v,
                // Append hex suffix to make vote accounts unique across copies
                voteAccount: `${v.voteAccount.slice(0, -2)}${i.toString(16).padStart(2, '0')}`,
              })),
        ).flat()

  const auctionResult: AuctionResult = {
    winningTotalPmpe: auctionRaw['winningTotalPmpe'] as number,
    auctionData: {
      ...(auctionRaw['auctionData'] as object),
      validators: scaledValidators,
      blacklist,
    },
  } as AuctionResult

  return {
    auctionResult,
    validatorNames: new Map(Object.entries(namesRaw)),
    capturedAt: metaRaw.capturedAt,
    validatorCount: scaledValidators.length,
  }
}
