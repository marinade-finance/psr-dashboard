import React, { useMemo, useState } from 'react'

import { docsPath } from 'src/components/breakdowns/docs-path'
import { DonutChart } from 'src/components/donut-chart/donut-chart'
import { Gauge } from 'src/components/gauge/gauge'
import { Table, TableShell } from 'src/components/table/table'
import { Card } from 'src/components/ui/card'
import { CSS_RANK, CSS_RANK_OTHER } from 'src/css'
import { pct, stake } from 'src/format'

import type { DonutSegment } from 'src/components/donut-chart/donut-chart'
import type { UserLevel } from 'src/components/navigation/navigation'
import type {
  Concentration,
  ConcentrationDimension,
  ConcentrationSlice,
} from 'src/services/concentration'

// Copy per dimension. Kept as one table so the two splits can never drift
// into describing the same mechanic in two different voices.
const COPY: Record<
  ConcentrationDimension,
  {
    title: string
    description: string
    groupHeader: string
    shareHelp: string
    networkHelp: string
    donutLabel: string
    otherLabel: (n: number) => string
  }
> = {
  aso: {
    title: 'SAM target stake by ASO',
    description:
      'Share of SAM target stake per Autonomous System Operator (the hosting provider or network operator).',
    groupHeader: 'ASO',
    shareHelp:
      "Share of Marinade's SAM target stake in this ASO. The tick marks the per-ASO concentration cap.",
    networkHelp:
      "This ASO's share of all activated stake on Solana — the market Marinade's split is read against.",
    donutLabel: 'SAM target stake split across ASOs',
    otherLabel: n => `Other (${n} ASOs)`,
  },
  country: {
    title: 'SAM target stake by country',
    description:
      'Share of SAM target stake per country, the jurisdiction dimension of the same concentration limit.',
    groupHeader: 'Country',
    shareHelp:
      "Share of Marinade's SAM target stake in this country. The tick marks the per-country concentration cap.",
    networkHelp:
      "This country's share of all activated stake on Solana — the market Marinade's split is read against.",
    donutLabel: 'SAM target stake split across countries',
    otherLabel: n => `Other (${n} countries)`,
  },
}

type Props = {
  concentration: Concentration
  // Null while the cluster-stats call is in flight or has failed — the SAM
  // split still renders without it, only the comparison column goes quiet.
  networkShares: Map<string, number> | null
  // Only used to resolve the guide link base.
  level?: UserLevel
}

// Below every real share (which are 0..1), so groups the network has no entry
// for sort under every group it does. Deliberately finite: the generic Table
// treats ±Infinity as a direction-invariant escape hatch (table.tsx) and would
// pin these rows to the same end in BOTH sort directions.
const NO_NETWORK_SHARE = -1

const sliceColor = (slice: ConcentrationSlice, index: number): string =>
  slice.isOther ? CSS_RANK_OTHER : (CSS_RANK[index] ?? CSS_RANK_OTHER)

// `pct(v, 1)` renders a small-but-real share as "0.0%", which reads as none at
// all. Anything under the resolution of one decimal gets the threshold instead.
const share = (value: number): string =>
  value > 0 && value < 0.001 ? '<0.1%' : pct(value, 1)

// The donut hole is ~134px across, so the full `stake()` string does not fit —
// it would paint over the ring. Millions with two decimals keeps the total
// readable at a glance and inside the hole.
const compactSol = (sol: number): string =>
  sol >= 1e6
    ? `${(sol / 1e6).toFixed(2)}M SOL`
    : sol >= 1e3
      ? `${(sol / 1e3).toFixed(0)}K SOL`
      : `${Math.round(sol)} SOL`

type Row = ConcentrationSlice & { networkPct: number | null }

export const ConcentrationSplit: React.FC<Props> = ({
  concentration,
  networkShares,
  level,
}) => {
  const [hovered, setHovered] = useState<number | null>(null)
  const { dimension, slices, rows, totalSol, groupCount, capPct } =
    concentration
  const copy = COPY[dimension]

  const segments: DonutSegment[] = slices.map((slice, index) => ({
    label: slice.group,
    value: slice.sol,
    color: sliceColor(slice, index),
  }))

  const tableRows: Row[] = useMemo(
    () =>
      rows.map(row => ({
        ...row,
        networkPct: networkShares?.get(row.group) ?? null,
      })),
    [rows, networkShares],
  )

  // One track for every share gauge so rows stay comparable, wide enough to
  // hold both the largest share and the cap tick.
  const scaleMax = Math.max(capPct, ...rows.map(r => r.pctOfTotal), 0.01)

  const active = hovered === null ? null : slices[hovered]

  return (
    <section className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <DonutChart
            className="w-56 h-56 mx-auto lg:mx-0"
            segments={segments}
            hoveredIndex={hovered}
            onHover={setHovered}
            ariaLabel={`${copy.donutLabel} (${groupCount})`}
          >
            {active ? (
              <>
                <div className="text-2xl font-semibold font-mono leading-tight">
                  {share(active.pctOfTotal)}
                </div>
                <div className="text-2xs text-muted-foreground mt-1 line-clamp-2">
                  {active.isOther
                    ? copy.otherLabel(active.groupCount)
                    : active.group}
                </div>
              </>
            ) : (
              <>
                <div className="text-xl font-semibold font-mono leading-tight">
                  {compactSol(totalSol)}
                </div>
                <div className="text-2xs text-muted-foreground mt-1">
                  across {groupCount}{' '}
                  {dimension === 'aso' ? 'ASOs' : 'countries'}
                </div>
              </>
            )}
          </DonutChart>

          {/* Capped width: a legend stretched across the full card strands
              each value hundreds of pixels from the name it belongs to. */}
          <div className="flex-1 min-w-0 max-w-xl">
            <h2 className="text-base font-semibold mb-0.5">{copy.title}</h2>
            <p className="text-xs text-muted-foreground mb-4">
              {copy.description} Cap: {pct(capPct, 0)}.
            </p>
            <ul className="space-y-2 m-0 p-0 list-none">
              {slices.map((slice, index) => (
                <li
                  key={slice.group}
                  className="splitLegendRow flex items-center gap-2.5 text-sm cursor-default"
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span
                    aria-hidden
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: sliceColor(slice, index) }}
                  />
                  <span className="truncate flex-1 min-w-0">
                    {slice.isOther
                      ? copy.otherLabel(slice.groupCount)
                      : slice.group}
                  </span>
                  <span className="font-mono tabular-nums shrink-0 w-14 text-right">
                    {share(slice.pctOfTotal)}
                  </span>
                  <span className="font-mono tabular-nums text-muted-foreground text-xs shrink-0 w-24 text-right">
                    {stake(slice.sol)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <TableShell>
        <Table<Row>
          className="splitTable"
          data={tableRows}
          defaultOrder={[[1, 'desc']]}
          columns={[
            {
              header: copy.groupHeader,
              render: row => <span className="font-medium">{row.group}</span>,
              compare: (a, b) => a.group.localeCompare(b.group),
            },
            {
              header: 'SAM target stake',
              alignment: 'right',
              render: row => (
                <span className="font-mono tabular-nums">{stake(row.sol)}</span>
              ),
              compare: (a, b) => a.sol - b.sol,
            },
            {
              header: 'Share of SAM',
              headerHelp: copy.shareHelp,
              // Full path, not a bare anchor: HelpTip renders `guideTo`
              // verbatim as an href, so a slug would resolve relative to
              // /concentration and reopen this page instead of the guide.
              headerGuideTo: `${docsPath(level)}#concentration`,
              alignment: 'right',
              render: row => (
                <div className="flex items-center justify-end gap-2.5">
                  <span className="font-mono tabular-nums">
                    {share(row.pctOfTotal)}
                  </span>
                  <Gauge
                    value={row.pctOfTotal}
                    scaleMax={scaleMax}
                    marker={capPct / scaleMax}
                    markerTone="bg-tertiary-foreground"
                    tone="bg-primary"
                  />
                </div>
              ),
              compare: (a, b) => a.pctOfTotal - b.pctOfTotal,
            },
            {
              header: 'Share of network',
              headerHelp: copy.networkHelp,
              alignment: 'right',
              render: row => (
                <span className="font-mono tabular-nums text-muted-foreground">
                  {row.networkPct === null ? '—' : share(row.networkPct)}
                </span>
              ),
              // Groups with no network entry rank below every real share, and
              // two of them compare equal so the default stake order breaks
              // the tie.
              compare: (a, b) =>
                (a.networkPct ?? NO_NETWORK_SHARE) -
                (b.networkPct ?? NO_NETWORK_SHARE),
            },
            {
              header: 'Validators',
              alignment: 'right',
              render: row => (
                <span className="font-mono tabular-nums">
                  {row.validatorCount}
                </span>
              ),
              compare: (a, b) => a.validatorCount - b.validatorCount,
            },
          ]}
        />
      </TableShell>
    </section>
  )
}
