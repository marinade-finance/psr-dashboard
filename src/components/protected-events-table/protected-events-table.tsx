import React, { useState } from "react";
import styles from './protected-events-table.module.css'
import { Alignment, OrderDirection, Table } from "../table/table";
import { formatSolAmount } from "src/format";
import { ProtectedEvent, selectAmount, selectEprLossBps, selectProtectedStakeReason } from "src/services/protected-events";
import { Metric } from "../metric/metric";
import { ProtectedEventStatus, ProtectedEventWithValidator } from "src/services/validator-with-protected_event";
import { selectName } from "src/services/validators";
import { tooltipAttributes } from '../../services/utils'
import { UserLevel } from '../navigation/navigation'

const NO_NAME = '---'

const renderProtectedEventStatus = (status: ProtectedEventStatus) => {
    switch (status) {
        case ProtectedEventStatus.DRYRUN: return <span
            {...tooltipAttributes("This settlement is not claimable as it was created during the testing period.")}
            className={`${styles.badge} ${styles.badgeDryRun}`}>Dryrun</span>
        case ProtectedEventStatus.ESTIMATE: return <span
            {...tooltipAttributes("This is an estimate based on live data but may change during the epoch<br />before the settlements for this epoch are created on-chain.")}
            className={`${styles.badge} ${styles.badgeEstimate}`}>Estimate</span>
        default: return <></>
    }
}

const renderProtectedEventFunder = (protectedEvent: ProtectedEvent) => {
    switch (protectedEvent.meta.funder) {
        case 'Marinade': return <span
            className={styles.funder}
            {...tooltipAttributes("This settlement is funded by Marinade DAO because the yield loss<br />is beyond what the validator's are expected to cover.")}>Marinade</span>
        case 'ValidatorBond': return <span
            className={styles.funder}
            {...tooltipAttributes("This settlement is funded by the validator because the yield loss<br />is within amount which the validator is expected to cover.")}>Validator</span>
        default: return <></>
    }
}

type Props = {
    data: ProtectedEventWithValidator[]
    level: UserLevel
}

export const ProtectedEventsTable: React.FC<Props> = ({ data, level }) => {
    const minEpoch = data.reduce((epoch, { protectedEvent }) => Math.min(protectedEvent.epoch, epoch), 9999)
    const maxEpoch = data.reduce((epoch, { protectedEvent }) => Math.max(protectedEvent.epoch, epoch), 0)

    const [validatorFilter, setValidatorFilter] = useState('')
    const [minEpochFilter, setMinEpochFilter] = useState(minEpoch)
    const [maxEpochFilter, setMaxEpochFilter] = useState(maxEpoch)

    const preFilteredData = data.filter(({ protectedEvent, validator }) => {
        const lowerCaseValidatorFilter = validatorFilter.toLocaleLowerCase()
        const matchesValidator = protectedEvent.vote_account.toLowerCase().includes(lowerCaseValidatorFilter) || validator?.info_name?.toLocaleLowerCase().includes(lowerCaseValidatorFilter)
        const matchesEpoch = minEpochFilter <= protectedEvent.epoch && protectedEvent.epoch <= maxEpochFilter
        return matchesEpoch && matchesValidator
    })
    const filteredData = preFilteredData.filter(({ protectedEvent, validator }) => {
        return protectedEvent.reason as any !== 'Bidding'
    })
    const lastSettledEpoch = data.reduce((epoch, { protectedEvent, status }) =>
      status == ProtectedEventStatus.FACT ? Math.max(epoch, protectedEvent.epoch) : epoch,
      0
    )

    const totalEvents = data.length
    const filteredEvents = filteredData.length
    const totalAmount = data.reduce((sum, { protectedEvent }) => sum + selectAmount(protectedEvent), 0)
    const filteredAmount = filteredData.reduce((sum, { protectedEvent }) => sum + selectAmount(protectedEvent), 0)
    const lastSettledEpochAmount = filteredData.filter(
      ({ protectedEvent: { epoch } }) => epoch == lastSettledEpoch
    ).reduce(
      (sum, { protectedEvent }) =>
        sum + selectAmount(protectedEvent),
      0
    )
    const lastEpochBids = preFilteredData.filter(
      ({ protectedEvent }) =>
        protectedEvent.epoch == lastSettledEpoch
        && protectedEvent.reason as any === 'Bidding'
    ).reduce(
      (sum, { protectedEvent }) =>
        sum + selectAmount(protectedEvent),
      0
    )

    let expertMetrics
    if (level === UserLevel.Expert) {
        expertMetrics = <>
          <Metric label="Last Epoch Bids" value={`☉ ${formatSolAmount(lastEpochBids)}`}
              {...tooltipAttributes("Last Settled Epoch's Bids collectable By Users")} />
        </>
    }

    const filtered = data.length !== filteredData.length

    return <div className={styles.tableWrap}>
        <div className={styles.metricWrap}>
            <Metric label="Total events" value={totalEvents.toLocaleString()}
                {...tooltipAttributes("Total Count of Protected Events")} />
            <Metric label="Total amount" value={`☉ ${formatSolAmount(totalAmount)}`}
                {...tooltipAttributes("Total Amount of SOL Claimable by Users")} />
            { filtered && <Metric label="Filtered Events" value={filteredEvents.toLocaleString()}
                {...tooltipAttributes("Count of Filtered Protected Events")} /> }
            { filtered && <Metric label="Filtered Amount" value={`☉ ${formatSolAmount(filteredAmount)}`}
                {...tooltipAttributes("Filtered Amount of SOL Claimable By Users")} /> }
            <Metric label="Last Settled Amount" value={`☉ ${formatSolAmount(lastSettledEpochAmount)}`}
                {...tooltipAttributes("Last Settled Epoch's Amount of SOL Claimable By Users")} />
            { expertMetrics }
        </div>
        <div className={styles.filters}>
            <fieldset>
                <legend>Validator filter</legend>
                <input type="text" value={validatorFilter} onChange={(e) => setValidatorFilter(e.target.value)} />
            </fieldset>
            <fieldset>
                <legend>Epoch filter</legend>
                <input className={styles.epochFilter} type="number" value={minEpochFilter} onChange={(e) => setMinEpochFilter(Number(e.target.value))} />
                <input className={styles.epochFilter} type="number" value={maxEpochFilter} onChange={(e) => setMaxEpochFilter(Number(e.target.value))} />
            </fieldset>
        </div>
        <Table
            data={filteredData}
            columns={[
                { header: 'Epoch', render: ({ protectedEvent }) => <>{protectedEvent.epoch}</>, compare: (a, b) => a.protectedEvent.epoch - b.protectedEvent.epoch, alignment: Alignment.RIGHT  },
                { header: 'Validator', render: ({ protectedEvent }) => <span className={styles.pubkey}>{protectedEvent.vote_account}</span>, compare: (a, b) => a.protectedEvent.vote_account.localeCompare(b.protectedEvent.vote_account) },
                { header: 'Name', render: ({ validator }) => <span className={styles.pubkey}>{validator ? selectName(validator) : NO_NAME}</span>, compare: (a, b) => (a.validator ? selectName(a.validator) ?? NO_NAME : NO_NAME).localeCompare((b.validator ? selectName(b.validator) ?? NO_NAME : NO_NAME)) },
                { header: 'Settlement [☉]', render: ({ protectedEvent, status }) => <>{renderProtectedEventStatus(status)} {formatSolAmount(selectAmount(protectedEvent))}</>, compare: (a, b) => selectAmount(a.protectedEvent) - selectAmount(b.protectedEvent), alignment: Alignment.RIGHT },
                { header: 'Reason', render: ({ protectedEvent }) => <>{selectProtectedStakeReason(protectedEvent)}</>, compare: (a, b) => selectEprLossBps(a.protectedEvent) - selectEprLossBps(b.protectedEvent) },
                { header: 'Funder', render: ({ protectedEvent }) => renderProtectedEventFunder(protectedEvent), compare: (a, b) => a.protectedEvent.meta.funder.localeCompare(b.protectedEvent.meta.funder) },
            ]}
            defaultOrder={[
                [0, OrderDirection.DESC],
                [3, OrderDirection.DESC],
                [4, OrderDirection.DESC],
            ]} />
    </div>
};
