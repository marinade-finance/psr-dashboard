import React, { useState } from 'react'

import { Badge } from 'src/components/ui/badge'
import { EpochRangePicker } from 'src/components/ui/epoch-range-picker'
import { Input } from 'src/components/ui/input'
import { Label } from 'src/components/ui/label'
import { formatSolAmount } from 'src/format'
import {
  selectAmount,
  selectProtectedStakeReason,
} from 'src/services/protected-events'
import { ProtectedEventStatus } from 'src/services/validator-with-protected_event'
import { selectName } from 'src/services/validators'

import { tooltipAttributes } from '../../services/utils'
import { Metric } from '../metric/metric'
import { UserLevel } from '../navigation/navigation'
import { Alignment, OrderDirection, Table } from '../table/table'

import type { ProtectedEvent } from 'src/services/protected-events'
import type { ProtectedEventWithValidator } from 'src/services/validator-with-protected_event'

const renderProtectedEventStatus = (status: ProtectedEventStatus) => {
  switch (status) {
    case ProtectedEventStatus.DRYRUN:
      return (
        <Badge
          variant="secondary"
          {...tooltipAttributes(
            'This settlement is not claimable as it was created during the testing period.',
          )}
          className="badge cursor-help float-left"
        >
          Dryrun
        </Badge>
      )
    case ProtectedEventStatus.ESTIMATE:
      return (
        <Badge
          variant="default"
          {...tooltipAttributes(
            'This is an estimate based on live data but may change during the epoch<br />before the settlements for this epoch are created on-chain.',
          )}
          className="badge cursor-help float-left"
        >
          Estimate
        </Badge>
      )
    default:
      return null
  }
}

const renderFunderBadge = (protectedEvent: ProtectedEvent) => {
  if (protectedEvent.meta.funder === 'ValidatorBond') {
    return (
      <Badge
        variant="outline"
        {...tooltipAttributes(
          "The validator's own bond covered this settlement — the validator paid.",
        )}
        className="cursor-help bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
      >
        Validator Bond
      </Badge>
    )
  }
  if (protectedEvent.meta.funder === 'Marinade') {
    return (
      <Badge
        variant="outline"
        {...tooltipAttributes(
          "Marinade's backstop covered this settlement — the validator's bond was insufficient.",
        )}
        className="cursor-help bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
      >
        Marinade
      </Badge>
    )
  }
  return null
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

  const allEpochs = Array.from(
    new Set(data.map(({ protectedEvent }) => protectedEvent.epoch)),
  ).sort((a, b) => a - b)

  const [validatorFilter, setValidatorFilter] = useState('')
  const [minEpochFilter, setMinEpochFilter] = useState(minEpoch)
  const [maxEpochFilter, setMaxEpochFilter] = useState(maxEpoch)

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

  const validatorBondTotal = data.reduce(
    (sum, { protectedEvent }) =>
      protectedEvent.meta.funder === 'ValidatorBond'
        ? sum + selectAmount(protectedEvent)
        : sum,
    0,
  )
  const marinadePaidTotal = data.reduce(
    (sum, { protectedEvent }) =>
      protectedEvent.meta.funder === 'Marinade'
        ? sum + selectAmount(protectedEvent)
        : sum,
    0,
  )
  const totalAmount = validatorBondTotal + marinadePaidTotal

  const lastEpochBids = preFilteredData
    .filter(
      ({ protectedEvent }) =>
        protectedEvent.epoch === lastSettledEpoch &&
        protectedEvent.reason === 'Bidding',
    )
    .reduce((sum, { protectedEvent }) => sum + selectAmount(protectedEvent), 0)

  const filtered = preFilteredData.length !== data.length

  return (
    <div className="relative">
      <div className="metricWrap grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 px-4 pb-4">
        <Metric
          label="Events Protected"
          value={totalEvents.toLocaleString()}
          {...tooltipAttributes(
            'Total number of protected events paid out to stakers',
          )}
        />
        <Metric
          label="Validator Bond Paid"
          value={`${formatSolAmount(validatorBondTotal)} SOL`}
          {...tooltipAttributes(
            "SOL paid from validators' own bonds — validator covered their stakers' loss",
          )}
        />
        <Metric
          label="Marinade Paid"
          value={`${formatSolAmount(marinadePaidTotal)} SOL`}
          {...tooltipAttributes(
            "SOL paid by Marinade's backstop — validator bond was insufficient",
          )}
        />
        <Metric
          label="Total SOL to Stakers"
          value={`${formatSolAmount(totalAmount)} SOL`}
          {...tooltipAttributes(
            'Total SOL paid out to stakers across all protected events',
          )}
        />
        {filtered && (
          <Metric
            label="Filtered Events"
            value={filteredEvents.toLocaleString()}
            {...tooltipAttributes('Count of filtered protected events')}
          />
        )}
        {level === UserLevel.Expert && (
          <Metric
            label="Last Epoch Bids"
            value={`${formatSolAmount(lastEpochBids)} SOL`}
            {...tooltipAttributes(
              "Last settled epoch's bids collectable by users",
            )}
          />
        )}
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
        <div className="bg-card rounded-xl border border-border shadow-card overflow-x-auto">
          <Table
            className="[&_tbody]:bg-card [&_tbody_tr]:bg-card [&_tbody_tr:hover]:bg-secondary"
            data={filteredData}
            showRowNumber
            columns={[
              {
                header: 'Validator',
                render: ({ protectedEvent, validator }) => {
                  const name = validator ? selectName(validator) : null
                  const va = protectedEvent.vote_account
                  return (
                    <div>
                      <div className="font-medium text-[13px] text-foreground">
                        {name ?? '---'}
                      </div>
                      <div className="text-[11px] font-mono text-secondary-foreground mt-px">
                        {va.slice(0, 8)}...{va.slice(-4)}
                      </div>
                    </div>
                  )
                },
                compare: (a, b) =>
                  a.protectedEvent.vote_account.localeCompare(
                    b.protectedEvent.vote_account,
                  ),
              },
              {
                header: 'Epoch',
                headerHelp:
                  'Solana epoch (~2 days) in which this event occurred',
                render: ({ protectedEvent }) => <>{protectedEvent.epoch}</>,
                compare: (a, b) =>
                  a.protectedEvent.epoch - b.protectedEvent.epoch,
                alignment: Alignment.RIGHT,
              },
              {
                header: 'Reason',
                headerHelp:
                  'Why the protection was triggered — commission increase, low uptime, or downtime',
                render: ({ protectedEvent }) => (
                  <>{selectProtectedStakeReason(protectedEvent)}</>
                ),
                compare: (a, b) =>
                  selectProtectedStakeReason(a.protectedEvent).localeCompare(
                    selectProtectedStakeReason(b.protectedEvent),
                  ),
              },
              {
                header: 'Paid Out',
                headerHelp:
                  'SOL paid to compensate stakers for this event. Estimate = live data, may change before epoch settles.',
                render: ({ protectedEvent, status }) => (
                  <>
                    {renderProtectedEventStatus(status)}{' '}
                    {formatSolAmount(selectAmount(protectedEvent))} SOL
                  </>
                ),
                compare: (a, b) =>
                  selectAmount(a.protectedEvent) -
                  selectAmount(b.protectedEvent),
                alignment: Alignment.RIGHT,
              },
              {
                header: 'Funded by',
                headerHelp:
                  "Validator Bond = validator's own collateral covered this. Marinade = backstop fund covered it (validator bond was insufficient).",
                render: ({ protectedEvent }) =>
                  renderFunderBadge(protectedEvent),
                compare: (a, b) =>
                  a.protectedEvent.meta.funder.localeCompare(
                    b.protectedEvent.meta.funder,
                  ),
              },
            ]}
            defaultOrder={[
              [2, OrderDirection.DESC],
              [3, OrderDirection.DESC],
            ]}
          />
        </div>
      </div>
    </div>
  )
}
