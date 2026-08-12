// Donut arc geometry. These invariants are not visible from the rendered SVG
// — a segment that overruns its arc looks like a slightly wrong boundary — so
// they are asserted on the pure layout instead.
import { describe, it, expect } from 'vitest'

import { layoutSegments } from '../donut-chart'

// The component's real circumference (r=38) and gap, so the thresholds under
// test are the ones that actually ship.
const C = 2 * Math.PI * 38
const GAP = 2

describe('layoutSegments — staying inside the arc', () => {
  it('never strokes more than a segment owns', () => {
    // 0.1% of the circle is ~0.24 units, under the 0.5 hairline: floored
    // naively it would overrun into the next segment.
    const arcs = layoutSegments([0.1, 99.9], C, GAP)
    const tiny = arcs[0]
    const tinyArc = (0.1 / 100) * C
    expect(tiny.drawn).toBeLessThanOrEqual(tinyArc)
  })

  it('a segment never reaches into the next one', () => {
    const values = [0.1, 5, 40, 54.9]
    const arcs = layoutSegments(values, C, GAP)
    for (let i = 0; i < arcs.length - 1; i++) {
      expect(arcs[i].offset + arcs[i].drawn).toBeLessThanOrEqual(
        arcs[i + 1].offset,
      )
    }
  })

  it('the last segment stays inside the circle', () => {
    const arcs = layoutSegments([30, 30, 40], C, GAP)
    const last = arcs[arcs.length - 1]
    expect(last.offset + last.drawn).toBeLessThanOrEqual(C + 1e-9)
  })
})

describe('layoutSegments — what gets an arc at all', () => {
  it('drops zero-valued segments rather than drawing the hairline', () => {
    // A hairline for a zero value paints a segment for something that is not
    // there.
    const arcs = layoutSegments([50, 0, 50], C, GAP)
    expect(arcs.map(a => a.index)).toEqual([0, 2])
  })

  it('drops negative values too', () => {
    const arcs = layoutSegments([50, -10, 50], C, GAP)
    expect(arcs.map(a => a.index)).toEqual([0, 2])
  })

  it('keeps a tiny positive segment visible', () => {
    const arcs = layoutSegments([0.01, 99.99], C, GAP)
    expect(arcs).toHaveLength(2)
    expect(arcs[0].drawn).toBeGreaterThan(0)
  })

  it('returns nothing when the total is zero', () => {
    expect(layoutSegments([0, 0], C, GAP)).toEqual([])
    expect(layoutSegments([], C, GAP)).toEqual([])
  })

  it('reports indices into the ORIGINAL values, so colours stay aligned', () => {
    // The caller maps `index` back to its own segment list for colour and
    // label; a re-indexed array would silently recolour every segment after
    // a dropped one.
    const arcs = layoutSegments([0, 25, 75], C, GAP)
    expect(arcs.map(a => a.index)).toEqual([1, 2])
  })
})

describe('layoutSegments — offsets', () => {
  it('places each segment at the running total of the arcs before it', () => {
    const arcs = layoutSegments([25, 25, 50], C, GAP)
    expect(arcs[0].offset).toBeCloseTo(0)
    expect(arcs[1].offset).toBeCloseTo(C * 0.25)
    expect(arcs[2].offset).toBeCloseTo(C * 0.5)
  })

  it('a dropped zero segment still leaves no gap in the ring', () => {
    // Zero takes no arc, so the segment after it starts where the one before
    // it ended.
    const arcs = layoutSegments([50, 0, 50], C, GAP)
    expect(arcs[1].offset).toBeCloseTo(C * 0.5)
  })

  it('spends the gap on every segment when there is more than one', () => {
    const arcs = layoutSegments([50, 50], C, GAP)
    expect(arcs[0].drawn).toBeCloseTo(C * 0.5 - GAP)
  })

  it('spends no gap when the caller passes none', () => {
    const arcs = layoutSegments([100], C, 0)
    expect(arcs[0].drawn).toBeCloseTo(C)
  })
})
