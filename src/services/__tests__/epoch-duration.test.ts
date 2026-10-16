import { describe, expect, it } from 'vitest'

import {
  ESTIMATED_SLOT_STRETCH,
  regimeStartEpoch,
  resolveEpochDuration,
  type SlotsPerYearRecord,
} from '../epoch-duration'

const NOMINAL_200MS = 157_784_629.968 // epoch 1053 onwards
const NOMINAL_250MS = 126_227_703.974 // epochs 1037-1052
const NOMINAL_EPOCH_SECONDS = 86_400 // 432,000 slots at 200 ms

const history = (
  from: number,
  to: number,
  slotsPerYear: number,
): SlotsPerYearRecord[] =>
  Array.from({ length: to - from + 1 }, (_, i) => [from + i, slotsPerYear])

describe('regimeStartEpoch', () => {
  it('finds where the latest slots_per_year run starts, in any order', () => {
    const records = [
      ...history(1050, 1052, NOMINAL_250MS),
      ...history(1053, 1058, NOMINAL_200MS),
    ]
    expect(regimeStartEpoch(records)).toBe(1053)
    expect(regimeStartEpoch([...records].reverse())).toBe(1053)
  })

  it('stops at a gap rather than assuming the regime is older', () => {
    expect(
      regimeStartEpoch([
        ...history(1050, 1054, NOMINAL_200MS),
        ...history(1056, 1058, NOMINAL_200MS),
      ]),
    ).toBe(1056)
  })

  it('is null for an empty history', () => {
    expect(regimeStartEpoch([])).toBeNull()
  })
})

describe('resolveEpochDuration', () => {
  const settled = [
    ...history(1052, 1052, NOMINAL_250MS),
    ...history(1053, 1058, NOMINAL_200MS),
  ]

  it('uses the measured average when all three epochs ran on the current nominal', () => {
    const duration = resolveEpochDuration(NOMINAL_200MS, {
      measuredHours: 26.16,
      slotsPerYearByEpoch: settled,
    })
    expect(duration.source).toBe('measured')
    expect(duration.seconds).toBeCloseTo(26.16 * 3600, 6)
    expect(duration.nominalSeconds).toBeCloseTo(NOMINAL_EPOCH_SECONDS, 3)
  })

  it('estimates while the window still holds epochs from the previous regime', () => {
    // Current epoch 1055: the window is 1052-1054, and 1052 ran on 250 ms slots.
    const duration = resolveEpochDuration(NOMINAL_200MS, {
      measuredHours: 28.2,
      slotsPerYearByEpoch: [
        ...history(1050, 1052, NOMINAL_250MS),
        ...history(1053, 1055, NOMINAL_200MS),
      ],
    })
    expect(duration.source).toBe('estimated')
    expect(duration.seconds).toBeCloseTo(
      NOMINAL_EPOCH_SECONDS * ESTIMATED_SLOT_STRETCH,
      3,
    )
  })

  it('accepts the measurement once the window is clean (current epoch 1056)', () => {
    expect(
      resolveEpochDuration(NOMINAL_200MS, {
        measuredHours: 26.2,
        slotsPerYearByEpoch: [
          ...history(1052, 1052, NOMINAL_250MS),
          ...history(1053, 1056, NOMINAL_200MS),
        ],
      }).source,
    ).toBe('measured')
  })

  it('estimates 220 ms per 200 ms slot without a measurement', () => {
    const duration = resolveEpochDuration(NOMINAL_200MS, null)
    expect(duration.source).toBe('estimated')
    expect(duration.seconds / 432_000).toBeCloseTo(0.22, 6)
  })

  it('estimates when the history is missing or out of step with the auction', () => {
    expect(
      resolveEpochDuration(NOMINAL_200MS, {
        measuredHours: 26.16,
        slotsPerYearByEpoch: [],
      }).source,
    ).toBe('estimated')
    expect(
      resolveEpochDuration(NOMINAL_200MS, {
        measuredHours: 26.16,
        slotsPerYearByEpoch: history(1050, 1058, NOMINAL_250MS),
      }).source,
    ).toBe('estimated')
  })

  it('rejects a measurement that cannot be an epoch duration', () => {
    for (const measuredHours of [20, 40, NaN])
      expect(
        resolveEpochDuration(NOMINAL_200MS, {
          measuredHours,
          slotsPerYearByEpoch: settled,
        }).source,
      ).toBe('estimated')
  })
})
