import type {
  AuctionResult,
  AuctionValidator,
  SourceDataOverrides,
} from '@marinade.finance/ds-sam-sdk'

export type PendingEdits = {
  inflationCommission?: string
  mevCommission?: string
  blockRewardsCommission?: string
  bidPmpe?: string
}

export function buildOverrideValues(
  current: AuctionValidator,
  edits: PendingEdits,
): {
  inflationCommissionDec: number | null
  mevCommissionDec: number | null
  blockRewardsCommissionDec: number | null
  bidPmpe: number | null
} {
  const dec = (edit: string | undefined, fallback: number | null): number =>
    edit !== undefined
      ? parseFloat(edit) / 100
      : fallback !== null
        ? fallback
        : NaN
  const pmpe = (edit: string | undefined, fallback: number): number =>
    edit !== undefined ? parseFloat(edit) : fallback
  const infl = dec(edits.inflationCommission, current.inflationCommissionDec)
  const mev = dec(edits.mevCommission, current.mevCommissionDec)
  const blk = dec(
    edits.blockRewardsCommission,
    current.blockRewardsCommissionDec,
  )
  const bid = pmpe(edits.bidPmpe, current.revShare.bidPmpe)
  return {
    inflationCommissionDec: !isNaN(infl) ? infl : null,
    mevCommissionDec: !isNaN(mev) ? mev : null,
    blockRewardsCommissionDec: !isNaN(blk) ? blk : null,
    bidPmpe: !isNaN(bid) ? bid : null,
  }
}

export type DisplayValidator<T> = { validator: T; isGhost: boolean }

export type PositionChange = {
  direction: 'improved' | 'worsened' | 'unchanged'
  severity: 1 | 2 | 3
  delta: number
}

export function buildOriginalPositionsMap(
  originalAuctionResult: AuctionResult,
  compareFn: (a: AuctionValidator, b: AuctionValidator) => number,
): Map<string, number> {
  const sorted = [...originalAuctionResult.auctionData.validators].sort(
    compareFn,
  )
  const map = new Map<string, number>()
  sorted.forEach((v, i) => map.set(v.voteAccount, i + 1))
  return map
}

export function getPositionChange(
  originalPosition: number | null,
  currentPosition: number,
): PositionChange | null {
  if (originalPosition === null) return null
  const delta = Math.abs(currentPosition - originalPosition)
  if (currentPosition < originalPosition) {
    return {
      direction: 'improved',
      severity: delta >= 5 ? 3 : delta >= 3 ? 2 : 1,
      delta,
    }
  }
  if (currentPosition > originalPosition) {
    return {
      direction: 'worsened',
      severity: delta >= 5 ? 3 : delta >= 3 ? 2 : 1,
      delta,
    }
  }
  return { direction: 'unchanged', severity: 1, delta: 0 }
}

export function detectChangedValidators(
  simulatedVAs: Set<string>,
  currentValidators: AuctionValidator[],
  originalAuctionResult: AuctionResult,
): Set<string> {
  const changed = new Set<string>()
  for (const va of simulatedVAs) {
    const orig = originalAuctionResult.auctionData.validators.find(
      v => v.voteAccount === va,
    )
    const cur = currentValidators.find(v => v.voteAccount === va)
    if (!orig || !cur) continue
    if (
      orig.inflationCommissionDec !== cur.inflationCommissionDec ||
      orig.mevCommissionDec !== cur.mevCommissionDec ||
      orig.blockRewardsCommissionDec !== cur.blockRewardsCommissionDec ||
      orig.revShare.bidPmpe !== cur.revShare.bidPmpe
    ) {
      changed.add(va)
    }
  }
  return changed
}

// Splices ghost rows into display for all changed validators.
// Processes in descending insert-index order to prevent index drift.
export function insertGhostRows<T extends { voteAccount: string }>(
  display: DisplayValidator<T>[],
  changedVAs: Set<string>,
  originalAuctionResult: AuctionResult,
  originalPositionsMap: Map<string, number>,
  toDisplayValidator: (orig: AuctionValidator) => T,
): DisplayValidator<T>[] {
  const result = [...display]

  // Collect (insertIndex, ghostItem) pairs, then sort descending
  const inserts: Array<{ insertIndex: number; item: DisplayValidator<T> }> = []

  for (const va of changedVAs) {
    const orig = originalAuctionResult.auctionData.validators.find(
      v => v.voteAccount === va,
    )
    if (!orig) continue

    const originalPosition = originalPositionsMap.get(va) ?? null
    if (originalPosition === null || originalPosition <= 0) continue

    const currentIndex = result.findIndex(d => d.validator.voteAccount === va)
    if (currentIndex === -1) continue

    const adjustedOrigPos = originalPosition - 1
    const insertIndex = Math.min(
      currentIndex === adjustedOrigPos ? currentIndex + 1 : adjustedOrigPos,
      result.length,
    )

    inserts.push({
      insertIndex,
      item: { validator: toDisplayValidator(orig), isGhost: true },
    })
  }

  // Apply in reverse order so earlier inserts don't shift later indices
  inserts.sort((a, b) => b.insertIndex - a.insertIndex)
  for (const { insertIndex, item } of inserts) {
    result.splice(insertIndex, 0, item)
  }

  return result
}

export function mergeOverrides(
  existing: SourceDataOverrides | null,
  voteAccount: string,
  values: {
    inflationCommissionDec: number | null
    mevCommissionDec: number | null
    blockRewardsCommissionDec: number | null
    bidPmpe: number | null
  },
): SourceDataOverrides {
  const merged: SourceDataOverrides = {
    inflationCommissionsDec: new Map(existing?.inflationCommissionsDec),
    mevCommissionsDec: new Map(existing?.mevCommissionsDec),
    blockRewardsCommissionsDec: new Map(existing?.blockRewardsCommissionsDec),
    cpmpesDec: new Map(existing?.cpmpesDec),
  }
  if (values.inflationCommissionDec !== null)
    merged.inflationCommissionsDec.set(
      voteAccount,
      values.inflationCommissionDec,
    )
  if (values.mevCommissionDec !== null)
    merged.mevCommissionsDec.set(voteAccount, values.mevCommissionDec)
  if (values.blockRewardsCommissionDec !== null)
    merged.blockRewardsCommissionsDec.set(
      voteAccount,
      values.blockRewardsCommissionDec,
    )
  if (values.bidPmpe !== null) merged.cpmpesDec.set(voteAccount, values.bidPmpe)
  return merged
}

export function removeFromOverrides(
  existing: SourceDataOverrides | null,
  voteAccount: string,
): SourceDataOverrides {
  const result: SourceDataOverrides = {
    inflationCommissionsDec: new Map(existing?.inflationCommissionsDec),
    mevCommissionsDec: new Map(existing?.mevCommissionsDec),
    blockRewardsCommissionsDec: new Map(existing?.blockRewardsCommissionsDec),
    cpmpesDec: new Map(existing?.cpmpesDec),
  }
  result.inflationCommissionsDec.delete(voteAccount)
  result.mevCommissionsDec.delete(voteAccount)
  result.blockRewardsCommissionsDec.delete(voteAccount)
  result.cpmpesDec.delete(voteAccount)
  return result
}
