import React, { useEffect, useMemo, useState } from "react";
import styles from './validator-bonds-table.module.css'
import { Alignment, OrderDirection, Table } from "../table/table";
import { formatPercentage, formatSolAmount, lamportsToSol } from "src/format";
import { ValidatorWithBond, selectProtectedStake, selectProtectedStakePct } from "src/services/validator-with-bond";
import { selectLiquidMarinadeStake, selectName, selectNativeMarinadeStake, selectTotalMarinadeStake, selectVoteAccount } from "src/services/validators";
import { selectEffectiveAmount, selectMaxProtectedStake } from "src/services/bonds";
import { Metric } from "../metric/metric";
import { tooltipAttributes } from '../../services/utils'

type Props = {
    data: ValidatorWithBond[]
}

export const ValidatorBondsTable: React.FC<Props> = ({ data }) => {

    const totalMarinadeStake = data.reduce((sum, { validator }) => sum + selectTotalMarinadeStake(validator), 0)
    const totalProtectedStake = data.reduce((sum, validatorWithBond) => sum + selectProtectedStake(validatorWithBond), 0)
    const effectiveBalance = Math.round(data.reduce((sum, { bond }) => sum + (bond ? selectEffectiveAmount(bond) : 0), 0))
    const totalFundedBonds = data.filter(({ bond }) => (bond ? selectEffectiveAmount(bond) : 0) > 0).length

    return <div className={styles.tableWrap}>
        <div className={styles.metricWrap}>
            <Metric label="Bonds funded" value={totalFundedBonds.toLocaleString()}
                {...tooltipAttributes("Count of currently funded bonds")} />
            <Metric label="Bonds balance" value={`☉ ${formatSolAmount(effectiveBalance)}`}
                {...tooltipAttributes("Total effective amount of SOL deposited to the bonds")} />
            <Metric label="Marinade stake" value={`☉ ${formatSolAmount(totalMarinadeStake)}`}
                {...tooltipAttributes("How much stake is distributed by Marinade")} />
            <Metric label="Protected stake" value={`☉ ${formatSolAmount(totalProtectedStake)}`}
                {...tooltipAttributes("How much of Marinade's stake is protected by validators' deposits to the bonds")} />
            <Metric label="Protected stake" value={formatPercentage(totalProtectedStake / totalMarinadeStake)}
                {...tooltipAttributes("How much of Marinade's stake is protected by validators' deposits to the bonds")} />
        </div>
        <Table
            data={data}
            columns={[
                { header: 'Validator', render: ({ validator }) => <span className={styles.pubkey}>{selectVoteAccount(validator)}</span>, compare: (a, b) => selectVoteAccount(a.validator).localeCompare(selectVoteAccount(b.validator)) },
                { header: 'Name', render: ({ validator }) => <span className={styles.pubkey}>{selectName(validator)}</span>, compare: (a, b) => selectName(a.validator).localeCompare(selectName(b.validator)) },
                { header: 'Bond balance [☉]', render: ({ bond }) => <>{formatSolAmount(Number(lamportsToSol(bond?.effective_amount?.toString() ?? '0')))}</>, compare: (a, b) => Number(a.bond?.effective_amount ?? 0) - Number(b.bond?.effective_amount ?? 0), alignment: Alignment.RIGHT },
                { header: 'Marinade stake [☉]', render: ({ validator }) => <span {...tooltipAttributes(`Native: ${formatSolAmount(selectNativeMarinadeStake(validator))}, Liquid: ${formatSolAmount(selectLiquidMarinadeStake(validator))}`)}>{formatSolAmount(selectTotalMarinadeStake(validator))}</span>, compare: (a, b) => selectTotalMarinadeStake(a.validator) - selectTotalMarinadeStake(b.validator), alignment: Alignment.RIGHT },
                { header: 'Protected stake [☉]', render: (validatorWithBond) => <>{formatSolAmount(selectProtectedStake(validatorWithBond))}</>, compare: (a, b) => selectProtectedStake(a) - selectProtectedStake(b), alignment: Alignment.RIGHT },
                { header: 'Protected stake [%]', render: (validatorWithBond) => <>{formatPercentage(selectProtectedStakePct(validatorWithBond))}</>, compare: (a, b) => selectProtectedStakePct(a) - selectProtectedStakePct(b), alignment: Alignment.RIGHT },
                { header: 'Max protected stake [☉]', render: ({ bond }) => <>{formatSolAmount(bond ? selectMaxProtectedStake(bond) : 0)}</>, compare: (a, b) => (a.bond ? selectMaxProtectedStake(a.bond) : 0) - (b.bond ? selectMaxProtectedStake(b.bond) : 0), alignment: Alignment.RIGHT },
            ]}
            defaultOrder={[
                [2, OrderDirection.DESC],
                [3, OrderDirection.DESC],
            ]} />
    </div>
};
