import React, { useState } from 'react'

import { Badge } from 'src/components/ui/badge'
import { Input } from 'src/components/ui/input'
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

const NO_NAME = '---'

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

const renderProtectedEventFunder = (protectedEvent: ProtectedEvent) => {
  switch (protectedEvent.meta.funder) {
    case 'Marinade':
      return (
        <span
          className="cursor-help"
          {...tooltipAttributes(
            "This settlement is funded by Marinade DAO because the yield loss<br />is beyond what the validator's are expected to cover.",
          )}
        >
          Marinade
        </span>
      )
    case 'ValidatorBond':
      return (
        <span
          className="cursor-help"
          {...tooltipAttributes(
            'This settlement is funded by the validator because the yield loss<br />is within amount which the validator is expected to cover.',
          )}
        >
          Validator
        </span>
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

  let expertMetrics
  if (level === UserLevel.Expert) {
    expertMetrics = (
      <Metric
        label="Last Epoch Bids"
        value={`${formatSolAmount(lastEpochBids)} SOL`}
        {...tooltipAttributes("Last Settled Epoch's Bids collectable By Users")}
      />
    )
  }

  const filtered = preFilteredData.length !== data.length

  return (
    <div className="relative">
      <div className="metricWrap grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 px-4 pb-4">
        <Metric
          label="Total events"
          value={totalEvents.toLocaleString()}
          {...tooltipAttributes('Total Count of Protected Events')}
        />
        <Metric
          label="Total amount"
          value={`${formatSolAmount(totalAmount)} SOL`}
          {...tooltipAttributes('Total Amount of SOL Claimable by Users')}
        />
        {filtered && (
          <Metric
            label="Filtered Events"
            value={filteredEvents.toLocaleString()}
            {...tooltipAttributes('Count of Filtered Protected Events')}
          />
        )}
        {filtered && (
          <Metric
            label="Filtered Amount"
            value={`${formatSolAmount(filteredAmount)} SOL`}
            {...tooltipAttributes('Filtered Amount of SOL Claimable By Users')}
          />
        )}
        <Metric
          label="Last Settled Amount"
          value={`${formatSolAmount(lastSettledEpochAmount)} SOL`}
          {...tooltipAttributes(
            "Last Settled Epoch's Amount of SOL Claimable By Users",
          )}
        />
        {expertMetrics}
      </div>
      <div className="px-4 mb-4 [&_fieldset]:inline-block [&_fieldset]:mr-2.5 [&_fieldset]:border-transparent [&_legend]:text-[11px] [&_legend]:uppercase [&_legend]:tracking-wider [&_legend]:font-medium [&_legend]:text-muted-foreground [&_legend]:mb-1">
        <fieldset>
          <legend>Validator filter</legend>
          <Input
            type="text"
            value={validatorFilter}
            onChange={e => setValidatorFilter(e.target.value)}
          />
        </fieldset>
        <fieldset>
          <legend>Epoch filter</legend>
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
        </fieldset>
      </div>
      <div className="px-4 pb-4">
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <Table
            className="[&_tbody]:bg-card [&_tbody_tr]:bg-card [&_tbody_tr:hover]:bg-secondary"
            data={filteredData}
            columns={[
              {
                header: 'Epoch',
                render: ({ protectedEvent }) => <>{protectedEvent.epoch}</>,
                compare: (a, b) =>
                  a.protectedEvent.epoch - b.protectedEvent.epoch,
                alignment: Alignment.RIGHT,
              },
              {
                header: 'Validator',
                render: ({ protectedEvent }) => (
                  <span className={TRUNCATED_CELL}>
                    {protectedEvent.vote_account}
                  </span>
                ),
                compare: (a, b) =>
                  a.protectedEvent.vote_account.localeCompare(
                    b.protectedEvent.vote_account,
                  ),
              },
              {
                header: 'Name',
                render: ({ validator }) => (
                  <span className={TRUNCATED_CELL}>
                    {validator ? selectName(validator) : NO_NAME}
                  </span>
                ),
                compare: (a, b) =>
                  (a.validator
                    ? (selectName(a.validator) ?? NO_NAME)
                    : NO_NAME
                  ).localeCompare(
                    b.validator
                      ? (selectName(b.validator) ?? NO_NAME)
                      : NO_NAME,
                  ),
              },
              {
                header: 'Settlement [SOL]',
                render: ({ protectedEvent, status }) => (
                  <>
                    {renderProtectedEventStatus(status)}{' '}
                    {formatSolAmount(selectAmount(protectedEvent))}
                  </>
                ),
                compare: (a, b) =>
                  selectAmount(a.protectedEvent) -
                  selectAmount(b.protectedEvent),
                alignment: Alignment.RIGHT,
              },
              {
                header: 'Reason',
                render: ({ protectedEvent }) => (
                  <>{selectProtectedStakeReason(protectedEvent)}</>
                ),
                compare: (a, b) =>
                  selectEprLossBps(a.protectedEvent) -
                  selectEprLossBps(b.protectedEvent),
              },
              {
                header: 'Funder',
                render: ({ protectedEvent }) =>
                  renderProtectedEventFunder(protectedEvent),
                compare: (a, b) =>
                  a.protectedEvent.meta.funder.localeCompare(
                    b.protectedEvent.meta.funder,
                  ),
              },
            ]}
            defaultOrder={[
              [0, OrderDirection.DESC],
              [3, OrderDirection.DESC],
              [4, OrderDirection.DESC],
            ]}
          />
        </div>
      </div>
    </div>
  )
}
