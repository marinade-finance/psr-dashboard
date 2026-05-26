import type {
  AuctionResult,
  AuctionValidator,
  SourceDataOverrides,
} from '@marinade.finance/ds-sam-sdk'

// SDK's SourceDataOverrides only knows about the four commission/bid maps.
// Bond balance overrides are applied post-rerun (live) or as a mutation
// before evaluate() (test), so we carry them alongside via this local type.
export type AppOverrides = {
  source: SourceDataOverrides
  bondBalanceSol: Map<string, number>
}

type DisplayValidator<T> = { validator: T; isGhost: boolean }

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
  sorted.forEach((validator, i) => map.set(validator.voteAccount, i + 1))
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
  for (const voteAccount of simulatedVAs) {
    const orig = originalAuctionResult.auctionData.validators.find(
      validator => validator.voteAccount === voteAccount,
    )
    const cur = currentValidators.find(
      validator => validator.voteAccount === voteAccount,
    )
    if (!orig || !cur) continue
    if (
      orig.inflationCommissionDec !== cur.inflationCommissionDec ||
      orig.mevCommissionDec !== cur.mevCommissionDec ||
      orig.blockRewardsCommissionDec !== cur.blockRewardsCommissionDec ||
      orig.revShare.bidPmpe !== cur.revShare.bidPmpe ||
      orig.bondBalanceSol !== cur.bondBalanceSol
    ) {
      changed.add(voteAccount)
    }
  }
  return changed
}

export function insertGhostRows<T extends { voteAccount: string }>(
  display: DisplayValidator<T>[],
  changedVAs: Set<string>,
  originalAuctionResult: AuctionResult,
  originalPositionsMap: Map<string, number>,
  toDisplayValidator: (orig: AuctionValidator) => T,
): DisplayValidator<T>[] {
  const result = [...display]
  const inserts: Array<{ insertIndex: number; item: DisplayValidator<T> }> = []

  for (const voteAccount of changedVAs) {
    const orig = originalAuctionResult.auctionData.validators.find(
      validator => validator.voteAccount === voteAccount,
    )
    if (!orig) continue

    const originalPosition = originalPositionsMap.get(voteAccount) ?? null
    if (originalPosition === null || originalPosition <= 0) continue

    const currentIndex = result.findIndex(
      row => row.validator.voteAccount === voteAccount,
    )
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

  inserts.sort((a, b) => b.insertIndex - a.insertIndex)
  for (const { insertIndex, item } of inserts) {
    result.splice(insertIndex, 0, item)
  }

  return result
}

export function mergeOverrides(
  existing: AppOverrides | null,
  voteAccount: string,
  values: {
    inflationCommissionDec: number | null
    mevCommissionDec: number | null
    blockRewardsCommissionDec: number | null
    bidPmpe: number | null
    bondBalanceSol: number | null
  },
): AppOverrides {
  const merged = cloneOverrides(existing)
  if (values.inflationCommissionDec !== null)
    merged.source.inflationCommissionsDec.set(
      voteAccount,
      values.inflationCommissionDec,
    )
  if (values.mevCommissionDec !== null)
    merged.source.mevCommissionsDec.set(voteAccount, values.mevCommissionDec)
  if (values.blockRewardsCommissionDec !== null)
    merged.source.blockRewardsCommissionsDec.set(
      voteAccount,
      values.blockRewardsCommissionDec,
    )
  if (values.bidPmpe !== null)
    merged.source.cpmpesDec.set(voteAccount, values.bidPmpe)
  if (values.bondBalanceSol !== null)
    merged.bondBalanceSol.set(voteAccount, values.bondBalanceSol)
  return merged
}

export function removeFromOverrides(
  existing: AppOverrides | null,
  voteAccount: string,
): AppOverrides {
  const result = cloneOverrides(existing)
  result.source.inflationCommissionsDec.delete(voteAccount)
  result.source.mevCommissionsDec.delete(voteAccount)
  result.source.blockRewardsCommissionsDec.delete(voteAccount)
  result.source.cpmpesDec.delete(voteAccount)
  result.bondBalanceSol.delete(voteAccount)
  return result
}

function cloneOverrides(existing: AppOverrides | null): AppOverrides {
  return {
    source: {
      inflationCommissionsDec: new Map(
        existing?.source.inflationCommissionsDec,
      ),
      mevCommissionsDec: new Map(existing?.source.mevCommissionsDec),
      blockRewardsCommissionsDec: new Map(
        existing?.source.blockRewardsCommissionsDec,
      ),
      cpmpesDec: new Map(existing?.source.cpmpesDec),
    },
    bondBalanceSol: new Map(existing?.bondBalanceSol),
  }
}
