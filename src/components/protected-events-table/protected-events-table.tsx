import React, { useMemo, useState } from 'react'

import { formatSolAmount } from 'src/format'
import {
  selectAmount,
  selectEprLossBps,
  selectProtectedStakeReason,
} from 'src/services/protected-events'
import { ProtectedEventStatus } from 'src/services/validator-with-protected_event'
import { selectName } from 'src/services/validators'

import { HelpTip } from '../help-tip/help-tip'
import { UserLevel } from '../navigation/navigation'

import type { ProtectedEvent } from 'src/services/protected-events'
import type { ProtectedEventWithValidator } from 'src/services/validator-with-protected_event'

const NO_NAME = '---'

type SortColumn = 'epoch' | 'validator' | 'settlement' | 'reason' | 'funder'
type SortDir = 'asc' | 'desc'

// Pad/truncate string to exact width
const pad = (s: string, w: number): string =>
  s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length)
const rpad = (s: string, w: number): string =>
  s.length >= w ? s.slice(0, w) : ' '.repeat(w - s.length) + s

// Column widths
const W = { epoch: 6, validator: 22, settlement: 14, reason: 20, funder: 12 }
const SEP = ' │ '

const getReasonText = (reason: string): string => {
  if (reason.startsWith('BidTooLow')) return '[BID LOW]'
  if (reason.startsWith('Uptime')) {
    const match = reason.match(/([\d.]+)%/)
    const pct = match ? match[1] : '?'
    return `[UPTIME ${pct}%]`
  }
  if (
    reason.startsWith('Commission') ||
    reason.startsWith('Inflation Commission')
  )
    return '[COMMISSION]'
  if (reason === 'Blacklist') return '[BLACKLIST]'
  return `[${reason.toUpperCase()}]`
}

const getReasonHelpText = (reason: string): string | null => {
  if (
    reason.startsWith('Commission') ||
    reason.startsWith('Inflation Commission')
  )
    return reason.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return null
}

const getFunderText = (protectedEvent: ProtectedEvent): string => {
  switch (protectedEvent.meta.funder) {
    case 'Marinade':
      return '[MARINADE]'
    case 'ValidatorBond':
      return '[VALIDATOR]'
    default:
      return ''
  }
}

const getFunderHelpText = (protectedEvent: ProtectedEvent): string | null => {
  switch (protectedEvent.meta.funder) {
    case 'Marinade':
      return 'This settlement is funded by Marinade DAO because the yield loss<br />is beyond what the validator\'s are expected to cover.'
    case 'ValidatorBond':
      return 'This settlement is funded by the validator because the yield loss<br />is within amount which the validator is expected to cover.'
    default:
      return null
  }
}

const getStatusText = (status: ProtectedEventStatus): string => {
  switch (status) {
    case ProtectedEventStatus.DRYRUN:
      return '[DRYRUN]'
    case ProtectedEventStatus.ESTIMATE:
      return '[ESTIMATE]'
    default:
      return ''
  }
}

const getStatusHelpText = (status: ProtectedEventStatus): string | null => {
  switch (status) {
    case ProtectedEventStatus.DRYRUN:
      return 'This settlement is not claimable as it was created during the testing period.'
    case ProtectedEventStatus.ESTIMATE:
      return 'This is an estimate based on live data but may change during the epoch<br />before the settlements for this epoch are created on-chain.'
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
    if (sortCol !== col) return ' ▲'
    return sortDir === 'asc' ? ' ▲' : ' ▼'
  }

  const filtered = data.length !== filteredData.length

  // Header separator line
  const headerLine =
    '─'.repeat(W.epoch) +
    '─┼─' +
    '─'.repeat(W.validator) +
    '─┼─' +
    '─'.repeat(W.settlement) +
    '─┼─' +
    '─'.repeat(W.reason) +
    '─┼─' +
    '─'.repeat(W.funder)

  return (
    <div className="w-full font-mono text-[12px] leading-[1.6] text-foreground">
      {/* Stats */}
      <div className="mb-4 whitespace-pre leading-[1.8]">
        <span className="text-muted-foreground">{':: '}</span>
        TOTAL EVENTS{' '}
        <span className="font-bold">{totalEvents.toLocaleString()}</span>
        <HelpTip text="Total Count of Protected Events" />
        {'    '}
        <span className="text-muted-foreground">{':: '}</span>
        TOTAL AMOUNT{' '}
        <span className="font-bold">☉ {formatSolAmount(totalAmount)}</span>
        <HelpTip text="Total Amount of SOL Claimable by Users" />
        {'    '}
        {filtered && (
          <>
            <span className="text-muted-foreground">{':: '}</span>
            FILTERED{' '}
            <span className="font-bold">{filteredEvents.toLocaleString()}</span>
            <HelpTip text="Count of Filtered Protected Events" />
            {'    '}
            <span className="text-muted-foreground">{':: '}</span>
            FILTERED AMT{' '}
            <span className="font-bold">☉ {formatSolAmount(filteredAmount)}</span>
            <HelpTip text="Filtered Amount of SOL Claimable By Users" />
            {'    '}
          </>
        )}
        <span className="text-muted-foreground">{':: '}</span>
        LAST SETTLED{' '}
        <span className="font-bold">☉ {formatSolAmount(lastSettledEpochAmount)}</span>
        <HelpTip text="Last Settled Epoch's Amount of SOL Claimable By Users" />
        {level === UserLevel.Expert && (
          <>
            {'    '}
            <span className="text-muted-foreground">{':: '}</span>
            LAST EPOCH BIDS{' '}
            <span className="font-bold">☉ {formatSolAmount(lastEpochBids)}</span>
            <HelpTip text="Last Settled Epoch's Bids collectable By Users" />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-end gap-4 mb-4">
        <div>
          <div className="text-muted-foreground mb-1">Validator</div>
          <input
            value={validatorFilter}
            onChange={e => setValidatorFilter(e.target.value)}
            placeholder="Search by name or vote account"
            className="font-mono text-[12px] bg-transparent border border-muted-foreground/30 px-2 py-1 w-64 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-foreground"
          />
        </div>
        <div>
          <div className="text-muted-foreground mb-1">Epoch range</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={minEpochFilter}
              onChange={e => setMinEpochFilter(Number(e.target.value))}
              className="font-mono text-[12px] bg-transparent border border-muted-foreground/30 px-2 py-1 w-24 text-foreground outline-none focus:border-foreground"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="number"
              value={maxEpochFilter}
              onChange={e => setMaxEpochFilter(Number(e.target.value))}
              className="font-mono text-[12px] bg-transparent border border-muted-foreground/30 px-2 py-1 w-24 text-foreground outline-none focus:border-foreground"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto whitespace-pre">
        {/* Header */}
        <div className="text-muted-foreground">
          <span
            className="cursor-pointer select-none"
            onClick={() => handleSort('epoch')}
          >
            {rpad('EPOCH' + sortIndicator('epoch'), W.epoch)}
          </span>
          <span>{SEP}</span>
          <span
            className="cursor-pointer select-none"
            onClick={() => handleSort('validator')}
          >
            {pad('VALIDATOR' + sortIndicator('validator'), W.validator)}
          </span>
          <span>{SEP}</span>
          <span
            className="cursor-pointer select-none"
            onClick={() => handleSort('settlement')}
          >
            {rpad('SETTLE [☉]' + sortIndicator('settlement'), W.settlement)}
          </span>
          <span>{SEP}</span>
          <span
            className="cursor-pointer select-none"
            onClick={() => handleSort('reason')}
          >
            {pad('REASON' + sortIndicator('reason'), W.reason)}
          </span>
          <span>{SEP}</span>
          <span
            className="cursor-pointer select-none"
            onClick={() => handleSort('funder')}
          >
            {pad('FUNDER' + sortIndicator('funder'), W.funder)}
          </span>
        </div>
        <div className="text-muted-foreground">{headerLine}</div>

        {/* Rows */}
        {sortedData.map(({ protectedEvent, validator, status }, idx) => {
          const name = validator ? selectName(validator) : NO_NAME
          const reason = selectProtectedStakeReason(protectedEvent)
          const statusText = getStatusText(status)
          const statusHelp = getStatusHelpText(status)
          const reasonText = getReasonText(reason)
          const reasonHelp = getReasonHelpText(reason)
          const funderText = getFunderText(protectedEvent)
          const funderHelp = getFunderHelpText(protectedEvent)
          const amountStr = formatSolAmount(selectAmount(protectedEvent))
          const settlementStr = statusText
            ? `${statusText} ${amountStr}`
            : amountStr

          return (
            <div key={`${protectedEvent.vote_account}-${protectedEvent.epoch}-${idx}`}>
              <span>{rpad(String(protectedEvent.epoch), W.epoch)}</span>
              <span className="text-muted-foreground">{SEP}</span>
              <span>{pad(name, W.validator)}</span>
              <span className="text-muted-foreground">{SEP}</span>
              <span>
                {statusHelp ? (
                  <HelpTip text={statusHelp}>
                    <span>{rpad(settlementStr, W.settlement)}</span>
                  </HelpTip>
                ) : (
                  rpad(settlementStr, W.settlement)
                )}
              </span>
              <span className="text-muted-foreground">{SEP}</span>
              <span>
                {reasonHelp ? (
                  <HelpTip text={reasonHelp}>
                    <span>{pad(reasonText, W.reason)}</span>
                  </HelpTip>
                ) : (
                  pad(reasonText, W.reason)
                )}
              </span>
              <span className="text-muted-foreground">{SEP}</span>
              <span>
                {funderHelp ? (
                  <HelpTip text={funderHelp}>
                    <span>{pad(funderText, W.funder)}</span>
                  </HelpTip>
                ) : (
                  pad(funderText, W.funder)
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
