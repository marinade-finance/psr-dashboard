import React, { useState } from 'react'

import { Badge } from 'src/components/ui/badge'
import { Input } from 'src/components/ui/input'
import { Label } from 'src/components/ui/label'
import { formatSolAmount } from 'src/format'
import {
  selectAmount,
  selectEprLossBps,
  selectProtectedStakeReason,
} from 'src/services/protected-events'
import { ProtectedEventStatus } from 'src/services/validator-with-protected_event'
import { selectName } from 'src/services/validators'

import { tooltipAttributes } from '../../services/utils'
import { Metric } from '../metric/metric'
import { UserLevel } from '../navigation/navigation'
import {
  Alignment,
  OrderDirection,
  Table,
  TRUNCATED_CELL,
} from '../table/table'

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
      <div className="flex flex-wrap gap-4 px-4 mb-4">
        <div className="flex flex-col gap-1">
          <Label>Validator filter</Label>
          <Input
            type="text"
            value={validatorFilter}
            onChange={e => setValidatorFilter(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Epoch filter</Label>
          <div className="flex gap-1">
            <Input
              className="w-[70px]"
              type="number"
              value={minEpochFilter}
              onChange={e => setMinEpochFilter(Number(e.target.value))}
            />
            <Input
              className="w-[70px]"
              type="number"
              value={maxEpochFilter}
              onChange={e => setMaxEpochFilter(Number(e.target.value))}
            />
          </div>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <Table
            className="[&_tbody]:bg-card [&_tbody_tr]:bg-card [&_tbody_tr:hover]:bg-secondary"
            data={filteredData}
            columns={[
              {
                header: 'Validator',
                render: ({ protectedEvent, validator }) => (
                  <span className={TRUNCATED_CELL}>
                    {validator
                      ? (selectName(validator) ?? protectedEvent.vote_account)
                      : protectedEvent.vote_account}
                  </span>
                ),
                compare: (a, b) =>
                  a.protectedEvent.vote_account.localeCompare(
                    b.protectedEvent.vote_account,
                  ),
              },
              {
                header: 'Epoch',
                render: ({ protectedEvent }) => <>{protectedEvent.epoch}</>,
                compare: (a, b) =>
                  a.protectedEvent.epoch - b.protectedEvent.epoch,
                alignment: Alignment.RIGHT,
              },
              {
                header: 'Reason',
                render: ({ protectedEvent }) => (
                  <>{selectProtectedStakeReason(protectedEvent)}</>
                ),
                compare: (a, b) =>
                  selectProtectedStakeReason(a.protectedEvent).localeCompare(
                    selectProtectedStakeReason(b.protectedEvent),
                  ),
              },
              {
                header: 'Staker Loss',
                render: ({ protectedEvent }) => {
                  const bps = selectEprLossBps(protectedEvent)
                  return <>{bps ? `${Math.round(bps)} bps` : '—'}</>
                },
                compare: (a, b) =>
                  selectEprLossBps(a.protectedEvent) -
                  selectEprLossBps(b.protectedEvent),
                alignment: Alignment.RIGHT,
              },
              {
                header: 'Paid Out',
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
                render: ({ protectedEvent }) =>
                  renderFunderBadge(protectedEvent),
                compare: (a, b) =>
                  a.protectedEvent.meta.funder.localeCompare(
                    b.protectedEvent.meta.funder,
                  ),
              },
            ]}
            defaultOrder={[
              [1, OrderDirection.DESC],
              [4, OrderDirection.DESC],
            ]}
          />
        </div>
      </div>
    </div>
  )
}
