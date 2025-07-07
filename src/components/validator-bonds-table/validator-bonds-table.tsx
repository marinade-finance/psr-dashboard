import round from 'lodash.round'
import { UserLevel } from "src/components/navigation/navigation";
import React, { useEffect, useMemo, useState } from "react";
import styles from './validator-bonds-table.module.css'
import { Alignment, OrderDirection, Table } from "../table/table";
import { formatPercentage, formatSolAmount, lamportsToSol } from "src/format";
import { ValidatorWithBond, selectProtectedStake, selectMaxStakeWanted, selectMaxProtectedStake } from "src/services/validator-with-bond";
import { selectLiquidMarinadeStake, selectName, selectNativeMarinadeStake, selectTotalMarinadeStake, selectVoteAccount } from "src/services/validators";
import { selectEffectiveBid, selectEffectiveCost } from "src/services/sam";
import { selectEffectiveAmount } from "src/services/bonds";
import { Metric } from "../metric/metric";
import { tooltipAttributes } from '../../services/utils'

type Props = {
    data: ValidatorWithBond[]
    level: UserLevel
}

export const ValidatorBondsTable: React.FC<Props> = ({ data, level }) => {

    const totalMarinadeStake = data.reduce((sum, { validator }) => sum + selectTotalMarinadeStake(validator), 0)
    const totalProtectedStake = data.reduce((sum, validatorWithBond) => sum + selectProtectedStake(validatorWithBond), 0)
    const totalMaxProtectedStake = data.reduce((sum, entry) => sum + selectMaxProtectedStake(entry), 0)
    const effectiveBalance = Math.round(data.reduce((sum, { bond }) => sum + (bond ? selectEffectiveAmount(bond) : 0), 0))
    const totalFundedBonds = data.filter(({ bond }) => (bond ? selectEffectiveAmount(bond) : 0) > 0).length

    let expertMetrics
    if (level === UserLevel.Expert) {
        expertMetrics = <>
            <Metric label="Max Protectable Stake" value={formatPercentage(totalMaxProtectedStake / totalMarinadeStake)}
                {...tooltipAttributes("How much of Marinade's stake can be potentially protected if all bonds in the system are used")} />
        </>
    }
    
    return <div className={styles.tableWrap}>
        <div className={styles.metricWrap}>
            <Metric label="Bonds Funded" value={totalFundedBonds.toLocaleString()}
                {...tooltipAttributes("Count of currently funded bonds")} />
            <Metric label="Bonds Balance" value={`☉ ${formatSolAmount(effectiveBalance)}`}
                {...tooltipAttributes("Total effective amount of SOL deposited to the bonds")} />
            <Metric label="Marinade Stake" value={`☉ ${formatSolAmount(totalMarinadeStake)}`}
                {...tooltipAttributes("How much stake is distributed by Marinade")} />
            <Metric label="Protected Stake" value={formatPercentage(totalProtectedStake / totalMarinadeStake)}
                {...tooltipAttributes("How much of Marinade's stake is protected by validators' deposits to the bonds")} />
            <>{ expertMetrics }</>
        </div>
        <Table
            data={data}
            columns={[
                { header: 'Validator', render: ({ validator }) => <span className={styles.pubkey}>{selectVoteAccount(validator)}</span>, compare: (a, b) => selectVoteAccount(a.validator).localeCompare(selectVoteAccount(b.validator)) },
                { header: 'Name', render: ({ validator }) => <span className={styles.pubkey}>{selectName(validator)}</span>, compare: (a, b) => selectName(a.validator).localeCompare(selectName(b.validator)) },
                { header: 'Bond balance [☉]', render: ({ bond }) => <>{formatSolAmount(Number(lamportsToSol(bond?.effective_amount?.toString() ?? '0')))}</>, compare: (a, b) => Number(a.bond?.effective_amount ?? 0) - Number(b.bond?.effective_amount ?? 0), alignment: Alignment.RIGHT },
                {
                    header: 'Max Stake Wanted [☉]',
                    headerAttrsFn: () => tooltipAttributes("The max-stake-wanted parameter set up in contract.  If not set up, max stake is not limited."),
                    render: ({ bond }) => {
                      const maxStakeWanted = bond ? selectMaxStakeWanted(bond) : 0
                      return <>{ maxStakeWanted > 0 ? formatSolAmount(maxStakeWanted) : '-' }</>
                    },
                    compare: ({ bond: a }, { bond: b }) => a && b ? selectMaxStakeWanted(a) - selectMaxStakeWanted(b) : undefined,
                    alignment: Alignment.RIGHT
                },
                {
                    header: 'Marinade stake [☉]',
                    render: ({ validator }) => <span {...tooltipAttributes(`Native: ${formatSolAmount(selectNativeMarinadeStake(validator))}, Liquid: ${formatSolAmount(selectLiquidMarinadeStake(validator))}`)}>{formatSolAmount(selectTotalMarinadeStake(validator))}</span>,
                    compare: (a, b) => selectTotalMarinadeStake(a.validator) - selectTotalMarinadeStake(b.validator),
                    alignment: Alignment.RIGHT
                },
                {
                    header: 'Eff. Cost [☉]',
                    headerAttrsFn: () => tooltipAttributes("Total cost per epoch for the SAM stake that this validator received.  (sorts by Eff. Bid)"),
                    cellAttrsFn: () => tooltipAttributes("Total cost per epoch for the SAM stake that this validator received."),
                    render: ({ auction }) => <>{auction ? round(selectEffectiveCost(auction), 1) : '-'}</>,
                    compare: ({ auction: a }, { auction: b }) => a && b ? selectEffectiveBid(a) - selectEffectiveBid(b) : undefined,
                    alignment: Alignment.RIGHT
                },
                {
                    header: 'Protected stake [☉]',
                    render: (validatorWithBond) => <>{formatSolAmount(selectProtectedStake(validatorWithBond))}</>,
                    compare: (a, b) => selectProtectedStake(a) - selectProtectedStake(b),
                    alignment: Alignment.RIGHT
                },
                {
                    header: 'Max protected stake [☉]',
                    render: (entry) => <>{formatSolAmount(selectMaxProtectedStake(entry))}</>,
                    compare: (a, b) => selectMaxProtectedStake(a) - selectMaxProtectedStake(b), alignment: Alignment.RIGHT
                },
            ]}
            defaultOrder={[
                [2, OrderDirection.DESC],
                [4, OrderDirection.DESC],
            ]} />
    </div>
};
