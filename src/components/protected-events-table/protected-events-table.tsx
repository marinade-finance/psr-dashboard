import React, { useState } from 'react'

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
import { Alignment, OrderDirection, Table } from '../table/table'

import type { ProtectedEvent } from 'src/services/protected-events'
import type { ProtectedEventWithValidator } from 'src/services/validator-with-protected_event'

const NO_NAME = '---'

const renderProtectedEventStatus = (status: ProtectedEventStatus) => {
  switch (status) {
    case ProtectedEventStatus.DRYRUN:
      return (
        <span
          {...tooltipAttributes(
            'This settlement is not claimable as it was created during the testing period.',
          )}
          className="rounded-sm px-1 cursor-help float-left bg-background-page text-foreground"
        >
          Dryrun
        </span>
      )
    case ProtectedEventStatus.ESTIMATE:
      return (
        <span
          {...tooltipAttributes(
            'This is an estimate based on live data but may change during the epoch<br />before the settlements for this epoch are created on-chain.',
          )}
          className="rounded-sm px-1 cursor-help float-left bg-[#91e4b7] text-black"
        >
          Estimate
        </span>
      )
    default:
      return <></>
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
      return <></>
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
    ({ protectedEvent, validator: _validator }) => {
      return protectedEvent.reason !== 'Bidding'
    },
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
      <>
        <Metric
          label="Last Epoch Bids"
          value={`☉ ${formatSolAmount(lastEpochBids)}`}
          {...tooltipAttributes(
            "Last Settled Epoch's Bids collectable By Users",
          )}
        />
      </>
    )
  }

  const filtered = data.length !== filteredData.length

  return (
    <div className="relative">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <Metric
          label="Total events"
          value={totalEvents.toLocaleString()}
          {...tooltipAttributes('Total Count of Protected Events')}
        />
        <Metric
          label="Total amount"
          value={`☉ ${formatSolAmount(totalAmount)}`}
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
            value={`☉ ${formatSolAmount(filteredAmount)}`}
            {...tooltipAttributes('Filtered Amount of SOL Claimable By Users')}
          />
        )}
        <Metric
          label="Last Settled Amount"
          value={`☉ ${formatSolAmount(lastSettledEpochAmount)}`}
          {...tooltipAttributes(
            "Last Settled Epoch's Amount of SOL Claimable By Users",
          )}
        />
        {expertMetrics}
      </div>
      <div className="flex items-center gap-4 px-6 mb-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Validator
          </label>
          <input
            type="text"
            value={validatorFilter}
            onChange={e => setValidatorFilter(e.target.value)}
            placeholder="Search by name or vote account"
            className="px-3 py-2 rounded-lg border border-border bg-input text-sm text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-ring focus:outline-none w-64"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Epoch range
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={minEpochFilter}
              onChange={e => setMinEpochFilter(Number(e.target.value))}
              className="w-24 px-3 py-2 rounded-lg border border-border bg-input text-sm font-mono text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <input
              type="number"
              value={maxEpochFilter}
              onChange={e => setMaxEpochFilter(Number(e.target.value))}
              className="w-24 px-3 py-2 rounded-lg border border-border bg-input text-sm font-mono text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
            />
          </div>
        </div>
      </div>
      <Table
        data={filteredData}
        columns={[
          {
            header: 'Epoch',
            render: ({ protectedEvent }) => <>{protectedEvent.epoch}</>,
            compare: (a, b) => a.protectedEvent.epoch - b.protectedEvent.epoch,
            alignment: Alignment.RIGHT,
          },
          {
            header: 'Validator',
            render: ({ protectedEvent }) => (
              <span className="inline-block max-w-[160px] text-ellipsis overflow-hidden whitespace-nowrap">
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
              <span className="inline-block max-w-[160px] text-ellipsis overflow-hidden whitespace-nowrap">
                {validator ? selectName(validator) : NO_NAME}
              </span>
            ),
            compare: (a, b) =>
              (a.validator
                ? (selectName(a.validator) ?? NO_NAME)
                : NO_NAME
              ).localeCompare(
                b.validator ? (selectName(b.validator) ?? NO_NAME) : NO_NAME,
              ),
          },
          {
            header: 'Settlement [☉]',
            render: ({ protectedEvent, status }) => (
              <>
                {renderProtectedEventStatus(status)}{' '}
                {formatSolAmount(selectAmount(protectedEvent))}
              </>
            ),
            compare: (a, b) =>
              selectAmount(a.protectedEvent) - selectAmount(b.protectedEvent),
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
  )
}
