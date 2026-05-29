import React, { useEffect, useMemo, useState } from 'react'

import { cn } from 'src/class_utils'
import { docsPath } from 'src/components/breakdowns/docs-path'
import { EpochRangePicker } from 'src/components/ui/epoch-range-picker'
import { Input } from 'src/components/ui/input'
import { Label } from 'src/components/ui/label'
import { HtmlTooltip } from 'src/components/ui/tooltip'
import { ValidatorIdentity } from 'src/components/validator-identity/validator-identity'
import { pct, sol, pay } from 'src/format'
import {
  selectAmount,
  selectProtectedStakeReason,
} from 'src/services/protected-events'
import type { ProtectedEventStatus } from 'src/services/validator-with-protected_event'
import { selectName } from 'src/services/validators'

import { Metric } from '../metric/metric'
import type { UserLevel } from '../navigation/navigation'
import { TABLE_SHELL_HOVER, Table, TableShell } from '../table/table'

import type { ProtectedEvent } from 'src/services/protected-events'
import type { ProtectedEventWithValidator } from 'src/services/validator-with-protected_event'

// SAM-aligned chip shape — see `BOND_CHIP` in src/components/sam-table/sam-table.tsx.
// Padding + radius match the bond-health pill so chips read identically across
// SAM, bonds, and events tables.
const CHIP_BASE =
  'inline-flex items-center px-2 py-[3px] rounded-md text-xs font-medium'

const renderProtectedEventStatus = (status: ProtectedEventStatus) => {
  switch (status) {
    case 'dryrun':
      return (
        <HtmlTooltip html="This was logged during a test run — no money actually changes hands.">
          <span
            className={cn(
              CHIP_BASE,
              'cursor-help float-left bg-muted text-muted-foreground',
            )}
          >
            Dryrun
          </span>
        </HtmlTooltip>
      )
    case 'estimate':
      return (
        <HtmlTooltip html="An early estimate from live data. The final number gets locked in at the end of the epoch and may shift before then.">
          <span
            className={cn(
              CHIP_BASE,
              'cursor-help float-left bg-primary-light-10 text-primary',
            )}
          >
            Estimate
          </span>
        </HtmlTooltip>
      )
    default:
      return null
  }
}

const renderFunderBadge = (protectedEvent: ProtectedEvent) => {
  if (protectedEvent.meta.funder === 'ValidatorBond') {
    return (
      <HtmlTooltip html="Paid out of the validator's own bond — the validator footed the bill.">
        <span
          className={cn(
            CHIP_BASE,
            'cursor-help bg-status-green-light text-status-green',
          )}
        >
          Validator Bond
        </span>
      </HtmlTooltip>
    )
  }
  if (protectedEvent.meta.funder === 'Marinade') {
    return (
      <HtmlTooltip html="Marinade had to step in and pay because the validator's bond ran out.">
        <span
          className={cn(CHIP_BASE, 'cursor-help bg-warning-light text-warning')}
        >
          Marinade backstop
        </span>
      </HtmlTooltip>
    )
  }
  return null
}

// Identity of a settlement row. The backend has emitted exact duplicate
// settlements for some epochs (known protocol bug, e.g. epoch 977) — two rows
// with the same validator, epoch, reason, and lamport amount. We surface them
// as duplicates rather than silently rendering two identical rows; we never
// deduplicate, since the data is what the API returned.
const dedupeKey = (e: ProtectedEvent) =>
  `${e.vote_account}|${e.epoch}|${selectProtectedStakeReason(e)}|${e.amount}`

const renderDuplicateBadge = () => (
  <HtmlTooltip html="This settlement appears more than once with identical details — a known backend double-settlement bug, not two separate events. The amount may be double-counted until the backend resolves it.">
    <span
      className={cn(CHIP_BASE, 'cursor-help ml-2 bg-warning-light text-warning')}
    >
      Duplicate
    </span>
  </HtmlTooltip>
)

type Props = {
  data: ProtectedEventWithValidator[]
  level?: UserLevel
}

export const ProtectedEventsTable: React.FC<Props> = ({ data, level }) => {
  const datasetAggregates = useMemo(() => {
    let lastSettledEpoch = 0
    let validatorBondTotal = 0
    let marinadePaidTotal = 0
    const epochSet = new Set<number>()
    for (const { protectedEvent, status } of data) {
      const { epoch, meta } = protectedEvent
      epochSet.add(epoch)
      if (status === 'fact' && epoch > lastSettledEpoch) {
        lastSettledEpoch = epoch
      }
      const amount = selectAmount(protectedEvent)
      if (meta.funder === 'ValidatorBond') validatorBondTotal += amount
      else if (meta.funder === 'Marinade') marinadePaidTotal += amount
    }
    const allEpochs = [...epochSet].sort((a, b) => a - b)
    return {
      hasData: allEpochs.length > 0,
      minEpoch: allEpochs[0] ?? 0,
      maxEpoch: allEpochs[allEpochs.length - 1] ?? 0,
      allEpochs,
      lastSettledEpoch,
      validatorBondTotal,
      marinadePaidTotal,
      totalAmount: validatorBondTotal + marinadePaidTotal,
    }
  }, [data])
  const { hasData, minEpoch, maxEpoch, allEpochs, lastSettledEpoch } =
    datasetAggregates

  const [validatorFilter, setValidatorFilter] = useState('')
  const [minEpochFilter, setMinEpochFilter] = useState(minEpoch)
  const [maxEpochFilter, setMaxEpochFilter] = useState(maxEpoch)
  // Seed filter bounds the first time real data lands. After that, leave the
  // user's selection alone — refetches must not silently widen a narrowed
  // filter back to the dataset minimum.
  const seeded = React.useRef(false)
  useEffect(() => {
    if (seeded.current) return
    if (!hasData) return
    seeded.current = true
    setMinEpochFilter(minEpoch)
    setMaxEpochFilter(maxEpoch)
  }, [hasData, minEpoch, maxEpoch])

  // Filtered subsets memoised on the inputs that actually change them.
  const preFilteredData = useMemo(() => {
    const lowerCaseValidatorFilter = validatorFilter.toLocaleLowerCase()
    const lo = minEpochFilter ?? minEpoch
    const hi = maxEpochFilter ?? maxEpoch
    return data.filter(({ protectedEvent, validator }) => {
      const matchesValidator =
        protectedEvent.vote_account
          .toLowerCase()
          .includes(lowerCaseValidatorFilter) ||
        validator?.info_name
          ?.toLocaleLowerCase()
          .includes(lowerCaseValidatorFilter)
      const matchesEpoch =
        lo <= protectedEvent.epoch && protectedEvent.epoch <= hi
      return matchesEpoch && matchesValidator
    })
  }, [
    data,
    validatorFilter,
    minEpochFilter,
    maxEpochFilter,
    minEpoch,
    maxEpoch,
  ])

  const filteredData = useMemo(
    () =>
      preFilteredData.filter(({ protectedEvent }) => {
        if (protectedEvent.reason === 'Bidding') return false
        if (
          protectedEvent.reason === 'PriorityFee' &&
          selectAmount(protectedEvent) < 0.01
        )
          return false
        return true
      }),
    [preFilteredData],
  )

  // Keys that occur more than once across the filtered rows — flagged as
  // backend double-settlements in the Reason cell.
  const duplicateKeys = useMemo(() => {
    const counts = new Map<string, number>()
    for (const { protectedEvent } of filteredData) {
      const key = dedupeKey(protectedEvent)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return new Set(
      [...counts].filter(([, n]) => n > 1).map(([key]) => key),
    )
  }, [filteredData])

  // Filtered aggregates — also one-pass for the same reason.
  const filteredAggregates = useMemo(() => {
    let filteredAmount = 0
    let lastEpochBids = 0
    for (const { protectedEvent } of filteredData) {
      filteredAmount += selectAmount(protectedEvent)
    }
    for (const { protectedEvent } of preFilteredData) {
      if (
        protectedEvent.epoch === lastSettledEpoch &&
        protectedEvent.reason === 'Bidding'
      ) {
        lastEpochBids += selectAmount(protectedEvent)
      }
    }
    return { filteredAmount, lastEpochBids }
  }, [filteredData, preFilteredData, lastSettledEpoch])

  const { validatorBondTotal, marinadePaidTotal, totalAmount } =
    datasetAggregates
  const { filteredAmount, lastEpochBids } = filteredAggregates

  const totalEvents = data.length
  const filteredEvents = filteredData.length
  const filtered = preFilteredData.length !== data.length
  const bondRatio = totalAmount > 0 ? validatorBondTotal / totalAmount : 0
  // Integer-by-construction; only fed into CSS widths.
  const bondPct = Math.round(bondRatio * 100)

  return (
    <div className="max-w-[1920px] mx-auto relative">
      <div className="metricWrap grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 pb-4">
        <Metric
          label="Events"
          value={(filtered ? filteredEvents : totalEvents).toLocaleString()}
          subline={
            filtered ? `of ${totalEvents.toLocaleString()} total` : undefined
          }
          tooltipHtml="Number of times stakers got reimbursed because a validator under-delivered. Shows the filtered count when filters are on."
          guideTo={`${docsPath(level)}#psr`}
        />
        <Metric
          label="Amount"
          value={`${sol(filtered ? filteredAmount : totalAmount)} SOL`}
          subline={filtered ? `of ${sol(totalAmount)} SOL total` : undefined}
          extra={
            !filtered && totalAmount > 0 ? (
              <HtmlTooltip
                html={`Validator Bond: ${sol(validatorBondTotal)} SOL (${pct(bondRatio, 0)})<br/>Marinade backstop: ${sol(marinadePaidTotal)} SOL (${pct(1 - bondRatio, 0)})`}
              >
                <div className="cursor-help">
                  <div className="flex h-1.5 rounded-sm overflow-hidden bg-secondary">
                    <div
                      className="bg-primary"
                      style={{ width: `${bondPct}%` }}
                    />
                    <div
                      className="bg-warning"
                      style={{ width: `${100 - bondPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-2xs text-muted-foreground font-mono mt-1">
                    <span>Bond {pct(bondRatio, 0)}</span>
                    <span>Marinade {pct(1 - bondRatio, 0)}</span>
                  </div>
                </div>
              </HtmlTooltip>
            ) : null
          }
          tooltipHtml="Total SOL stakers received as reimbursement when validators under-delivered. Shows the filtered total when filters are on."
          guideTo={`${docsPath(level)}#psr`}
        />
        <Metric
          label="Last settled epoch"
          value={lastSettledEpoch > 0 ? lastSettledEpoch.toLocaleString() : '—'}
          subline={
            level === 'expert' && lastEpochBids > 0
              ? `${sol(lastEpochBids)} SOL bids`
              : undefined
          }
          tooltipHtml="The most recent epoch where reimbursements have been fully paid out and locked in."
          guideTo={`${docsPath(level)}#psr`}
        />
      </div>
      <div className="flex flex-col sm:flex-row flex-wrap gap-4 px-4 mb-4">
        <div className="flex flex-col gap-1 flex-1 sm:flex-none">
          <Label>Validator filter</Label>
          <Input
            type="text"
            value={validatorFilter}
            onChange={e => setValidatorFilter(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Epoch range</Label>
          <EpochRangePicker
            epochs={allEpochs}
            min={minEpochFilter}
            max={maxEpochFilter}
            onChange={(lo, hi) => {
              setMinEpochFilter(lo)
              setMaxEpochFilter(hi)
            }}
          />
        </div>
      </div>
      <div className="px-4 pb-4">
        <TableShell>
          <Table
            className={TABLE_SHELL_HOVER}
            data={filteredData}
            showRowNumber
            virtualize
            virtualizeRowHeight={48}
            virtualizeMaxHeight="75vh"
            columns={[
              {
                header: 'Validator',
                render: ({ protectedEvent, validator }) => (
                  <ValidatorIdentity
                    name={validator ? selectName(validator) : null}
                    voteAccount={protectedEvent.vote_account}
                  />
                ),
                compare: (a, b) =>
                  a.protectedEvent.vote_account.localeCompare(
                    b.protectedEvent.vote_account,
                  ),
              },
              {
                header: 'Epoch',
                headerHelp:
                  'Which Solana epoch this happened in — each epoch is about two days long.',
                headerGuideTo: `${docsPath(level)}#psr`,
                render: ({ protectedEvent }) => <>{protectedEvent.epoch}</>,
                compare: (a, b) =>
                  a.protectedEvent.epoch - b.protectedEvent.epoch,
                alignment: 'right',
              },
              {
                header: 'Reason',
                headerHelp:
                  'Why stakers needed reimbursing — the validator hiked its commission, missed too many slots, or went down entirely.',
                headerGuideTo: `${docsPath(level)}#psr`,
                render: ({ protectedEvent }) => (
                  <>
                    {selectProtectedStakeReason(protectedEvent)}
                    {duplicateKeys.has(dedupeKey(protectedEvent)) &&
                      renderDuplicateBadge()}
                  </>
                ),
                compare: (a, b) =>
                  selectProtectedStakeReason(a.protectedEvent).localeCompare(
                    selectProtectedStakeReason(b.protectedEvent),
                  ),
              },
              {
                header: 'Paid Out',
                headerHelp:
                  "How much SOL stakers received for this event. 'Estimate' means the epoch is still live and the number may shift.",
                headerGuideTo: `${docsPath(level)}#psr`,
                render: ({ protectedEvent, status }) => (
                  <>
                    {renderProtectedEventStatus(status)}{' '}
                    {pay(selectAmount(protectedEvent), 3)}
                  </>
                ),
                compare: (a, b) =>
                  selectAmount(a.protectedEvent) -
                  selectAmount(b.protectedEvent),
                alignment: 'right',
              },
              {
                header: 'Funded by',
                headerHelp:
                  "Who actually paid: Validator Bond means the validator's own deposit covered it; Marinade means our reserve fund had to step in because the bond came up short.",
                headerGuideTo: `${docsPath(level)}#psr`,
                render: ({ protectedEvent }) =>
                  renderFunderBadge(protectedEvent) ?? <></>,
                compare: (a, b) =>
                  a.protectedEvent.meta.funder.localeCompare(
                    b.protectedEvent.meta.funder,
                  ),
              },
            ]}
            defaultOrder={[[1, 'desc']]}
          />
        </TableShell>
      </div>
    </div>
  )
}
