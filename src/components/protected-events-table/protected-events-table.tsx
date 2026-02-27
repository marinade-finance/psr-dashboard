import React, { useMemo, useState } from 'react'

import { Badge } from 'src/components/ui/badge'
import { Input } from 'src/components/ui/input'
import {
  ShadTable,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from 'src/components/ui/table'
import { formatSolAmount } from 'src/format'
import {
  selectAmount,
  selectEprLossBps,
  selectProtectedStakeReason,
} from 'src/services/protected-events'
import { ProtectedEventStatus } from 'src/services/validator-with-protected_event'
import { selectName } from 'src/services/validators'

import { HelpTip } from '../help-tip/help-tip'
import { Metric } from '../metric/metric'
import { UserLevel } from '../navigation/navigation'

import type { ProtectedEvent } from 'src/services/protected-events'
import type { ProtectedEventWithValidator } from 'src/services/validator-with-protected_event'

const NO_NAME = '---'

type SortColumn = 'epoch' | 'validator' | 'settlement' | 'reason' | 'funder'
type SortDir = 'asc' | 'desc'

const renderProtectedEventStatus = (status: ProtectedEventStatus) => {
  switch (status) {
    case ProtectedEventStatus.DRYRUN:
      return (
        <HelpTip text="This settlement is not claimable as it was created during the testing period.">
          <Badge variant="dryrun">Dryrun</Badge>
        </HelpTip>
      )
    case ProtectedEventStatus.ESTIMATE:
      return (
        <HelpTip text="This is an estimate based on live data but may change during the epoch<br />before the settlements for this epoch are created on-chain.">
          <Badge variant="estimate">Estimate</Badge>
        </HelpTip>
      )
    default:
      return null
  }
}

const getReasonBadge = (reason: string) => {
  if (reason.startsWith('BidTooLow')) {
    return <Badge variant="watch">Bid Too Low</Badge>
  }
  if (reason.startsWith('Uptime')) {
    const match = reason.match(/([\d.]+)%/)
    const pct = match ? match[1] : '?'
    return <Badge variant="watch">Uptime {pct}%</Badge>
  }
  if (
    reason.startsWith('Commission') ||
    reason.startsWith('Inflation Commission')
  ) {
    return (
      <HelpTip text={reason.replace(/</g, '&lt;').replace(/>/g, '&gt;')}>
        <Badge variant="secondary">Commission Change</Badge>
      </HelpTip>
    )
  }
  if (reason === 'Blacklist') {
    return <Badge variant="destructive">Blacklist</Badge>
  }
  return <Badge variant="secondary">{reason}</Badge>
}

const renderFunderBadge = (protectedEvent: ProtectedEvent) => {
  switch (protectedEvent.meta.funder) {
    case 'Marinade':
      return (
        <HelpTip text="This settlement is funded by Marinade DAO because the yield loss<br />is beyond what the validator's are expected to cover.">
          <Badge variant="default">Marinade</Badge>
        </HelpTip>
      )
    case 'ValidatorBond':
      return (
        <HelpTip text="This settlement is funded by the validator because the yield loss<br />is within amount which the validator is expected to cover.">
          <Badge variant="secondary">Validator</Badge>
        </HelpTip>
      )
    default:
      return null
  }
}

type Props = {
  data: ProtectedEventWithValidator[]
  level: UserLevel
}

export const ProtectedEventsTable: React.FC<Props> = ({ data, level }) => {
  const minEpoch = data.reduce(
    (epoch, { protectedEvent }) => Math.min(protectedEvent.epoch, epoch),
    9999,
  )
  const maxEpoch = data.reduce(
    (epoch, { protectedEvent }) => Math.max(protectedEvent.epoch, epoch),
    0,
  )

  const [validatorFilter, setValidatorFilter] = useState('')
  const [minEpochFilter, setMinEpochFilter] = useState(minEpoch)
  const [maxEpochFilter, setMaxEpochFilter] = useState(maxEpoch)
  const [sortCol, setSortCol] = useState<SortColumn>('epoch')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const preFilteredData = data.filter(({ protectedEvent, validator }) => {
    const lowerCaseValidatorFilter = validatorFilter.toLocaleLowerCase()
    const matchesValidator =
      protectedEvent.vote_account
        .toLowerCase()
        .includes(lowerCaseValidatorFilter) ||
      validator?.info_name
        ?.toLocaleLowerCase()
        .includes(lowerCaseValidatorFilter)
    const matchesEpoch =
      minEpochFilter <= protectedEvent.epoch &&
      protectedEvent.epoch <= maxEpochFilter
    return matchesEpoch && matchesValidator
  })
  const filteredData = preFilteredData.filter(
    ({ protectedEvent }) => protectedEvent.reason !== 'Bidding',
  )
  const lastSettledEpoch = data.reduce(
    (epoch, { protectedEvent, status }) =>
      status === ProtectedEventStatus.FACT
        ? Math.max(epoch, protectedEvent.epoch)
        : epoch,
    0,
  )

  const totalEvents = data.length
  const filteredEvents = filteredData.length
  const totalAmount = data.reduce(
    (sum, { protectedEvent }) => sum + selectAmount(protectedEvent),
    0,
  )
  const filteredAmount = filteredData.reduce(
    (sum, { protectedEvent }) => sum + selectAmount(protectedEvent),
    0,
  )
  const lastSettledEpochAmount = filteredData
    .filter(({ protectedEvent: { epoch } }) => epoch === lastSettledEpoch)
    .reduce((sum, { protectedEvent }) => sum + selectAmount(protectedEvent), 0)
  const lastEpochBids = preFilteredData
    .filter(
      ({ protectedEvent }) =>
        protectedEvent.epoch === lastSettledEpoch &&
        protectedEvent.reason === 'Bidding',
    )
    .reduce((sum, { protectedEvent }) => sum + selectAmount(protectedEvent), 0)

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const sortedData = useMemo(() => {
    const mul = sortDir === 'asc' ? 1 : -1
    return [...filteredData].sort((a, b) => {
      switch (sortCol) {
        case 'epoch':
          return mul * (a.protectedEvent.epoch - b.protectedEvent.epoch)
        case 'validator': {
          const nameA = a.validator ? selectName(a.validator) : NO_NAME
          const nameB = b.validator ? selectName(b.validator) : NO_NAME
          return mul * nameA.localeCompare(nameB)
        }
        case 'settlement':
          return (
            mul *
            (selectAmount(a.protectedEvent) - selectAmount(b.protectedEvent))
          )
        case 'reason':
          return (
            mul *
            (selectEprLossBps(a.protectedEvent) -
              selectEprLossBps(b.protectedEvent))
          )
        case 'funder':
          return (
            mul *
            a.protectedEvent.meta.funder.localeCompare(
              b.protectedEvent.meta.funder,
            )
          )
        default:
          return 0
      }
    })
  }, [filteredData, sortCol, sortDir])

  const sortIndicator = (col: SortColumn) => {
    if (sortCol !== col)
      return <span className="ml-1 text-muted-foreground/40">▲</span>
    return <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>
  }

  const headClass =
    'px-3.5 py-[11px] text-left text-[11px] font-medium tracking-[0.06em] bg-muted cursor-pointer select-none whitespace-nowrap'

  let expertMetrics
  if (level === UserLevel.Expert) {
    expertMetrics = (
      <HelpTip text="Last Settled Epoch's Bids collectable By Users">
        <Metric
          label="Last Epoch Bids"
          value={`☉ ${formatSolAmount(lastEpochBids)}`}
        />
      </HelpTip>
    )
  }

  const filtered = data.length !== filteredData.length

  return (
    <div className="relative">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <HelpTip text="Total Count of Protected Events">
          <Metric label="Total events" value={totalEvents.toLocaleString()} />
        </HelpTip>
        <HelpTip text="Total Amount of SOL Claimable by Users">
          <Metric
            label="Total amount"
            value={`☉ ${formatSolAmount(totalAmount)}`}
          />
        </HelpTip>
        {filtered && (
          <HelpTip text="Count of Filtered Protected Events">
            <Metric
              label="Filtered Events"
              value={filteredEvents.toLocaleString()}
            />
          </HelpTip>
        )}
        {filtered && (
          <HelpTip text="Filtered Amount of SOL Claimable By Users">
            <Metric
              label="Filtered Amount"
              value={`☉ ${formatSolAmount(filteredAmount)}`}
            />
          </HelpTip>
        )}
        <HelpTip text="Last Settled Epoch's Amount of SOL Claimable By Users">
          <Metric
            label="Last Settled Amount"
            value={`☉ ${formatSolAmount(lastSettledEpochAmount)}`}
          />
        </HelpTip>
        {expertMetrics}
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Validator
          </label>
          <Input
            value={validatorFilter}
            onChange={e => setValidatorFilter(e.target.value)}
            placeholder="Search by name or vote account"
            className="w-64"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Epoch range
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={minEpochFilter}
              onChange={e => setMinEpochFilter(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="number"
              value={maxEpochFilter}
              onChange={e => setMaxEpochFilter(Number(e.target.value))}
              className="w-24"
            />
          </div>
        </div>
      </div>
      <div className="bg-card border border-border overflow-hidden">
        <ShadTable>
          <TableHeader>
            <TableRow className="border-b border-border-grid">
              <TableHead
                className={`${headClass} w-16 text-right`}
                onClick={() => handleSort('epoch')}
              >
                Epoch{sortIndicator('epoch')}
              </TableHead>
              <TableHead
                className={`${headClass} min-w-[200px]`}
                onClick={() => handleSort('validator')}
              >
                Validator{sortIndicator('validator')}
              </TableHead>
              <TableHead
                className={`${headClass} w-[160px] text-right`}
                onClick={() => handleSort('settlement')}
              >
                Settlement [☉]{sortIndicator('settlement')}
              </TableHead>
              <TableHead
                className={`${headClass} w-[160px]`}
                onClick={() => handleSort('reason')}
              >
                Reason{sortIndicator('reason')}
              </TableHead>
              <TableHead
                className={`${headClass} w-[100px]`}
                onClick={() => handleSort('funder')}
              >
                Funder{sortIndicator('funder')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map(({ protectedEvent, validator, status }, idx) => {
              const name = validator ? selectName(validator) : NO_NAME
              const reason = selectProtectedStakeReason(protectedEvent)
              const statusBadge = renderProtectedEventStatus(status)

              return (
                <TableRow
                  key={`${protectedEvent.vote_account}-${protectedEvent.epoch}-${idx}`}
                  className="border-b border-border-grid bg-card transition-colors duration-[120ms] hover:bg-primary-light-05"
                >
                  <TableCell className="px-3.5 py-3 text-right font-mono text-[13px]">
                    {protectedEvent.epoch}
                  </TableCell>
                  <TableCell className="px-3.5 py-3 min-w-[200px]">
                    <div className="text-foreground font-medium text-[13px]">
                      {name}
                    </div>
                    <div className="text-muted-foreground text-[11px] mt-px font-mono truncate max-w-[280px]">
                      {protectedEvent.vote_account}
                    </div>
                  </TableCell>
                  <TableCell className="px-3.5 py-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      {statusBadge}
                      <span className="font-mono font-semibold text-[13px]">
                        {formatSolAmount(selectAmount(protectedEvent))}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-3.5 py-3">
                    {getReasonBadge(reason)}
                  </TableCell>
                  <TableCell className="px-3.5 py-3">
                    {renderFunderBadge(protectedEvent)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </ShadTable>
      </div>
    </div>
  )
}
