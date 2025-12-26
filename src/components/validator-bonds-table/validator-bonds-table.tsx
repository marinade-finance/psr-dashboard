import round from 'lodash.round'
import { UserLevel } from "src/components/navigation/navigation";
import React from "react";
import styles from './validator-bonds-table.module.css'
import { Alignment, OrderDirection, Table } from "../table/table";
import { formatBps, formatPercentage, formatSolAmount, lamportsToSol } from "src/format";
import { ValidatorWithBond, selectProtectedStake, selectMaxStakeWanted, selectMaxProtectedStake } from "src/services/validator-with-bond";
import { selectLiquidMarinadeStake, selectName, selectNativeMarinadeStake, selectTotalMarinadeStake, selectVoteAccount } from "src/services/validators";
import { selectEffectiveBid, selectEffectiveCost } from "src/services/sam";
import { BondRecord, selectEffectiveAmount } from "src/services/bonds";
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
    let expertColumns: any[] = []
    if (level === UserLevel.Expert) {
        expertMetrics = <>
            <Metric label="Max Protectable Stake" value={formatPercentage(totalMaxProtectedStake / totalMarinadeStake)}
                {...tooltipAttributes("How much of Marinade's stake can be potentially protected if all bonds in the system are used")} />
        </>
        expertColumns = [
            {
                header: 'Max protected stake [☉]',
                render: (entry: ValidatorWithBond) => <>{formatSolAmount(selectMaxProtectedStake(entry))}</>,
                compare: (a: ValidatorWithBond, b: ValidatorWithBond) => selectMaxProtectedStake(a) - selectMaxProtectedStake(b), alignment: Alignment.RIGHT
            },
            {
                header: 'Protected stake [%]',
                render: (validatorWithBond: ValidatorWithBond) => {
                    const stake = selectNativeMarinadeStake(validatorWithBond.validator)
                    return <>{ formatPercentage(stake > 0 ? selectProtectedStake(validatorWithBond) / stake : 0) }</>
                },
                compare: (a: ValidatorWithBond, b: ValidatorWithBond) => selectProtectedStake(a) - selectProtectedStake(b),
                alignment: Alignment.RIGHT
            },
        ]
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
                {
                    header: 'Validator',
                    headerAttrsFn: () => tooltipAttributes('Validator Vote Account'),
                    render: ({ validator }) => <span className={styles.pubkey}>{selectVoteAccount(validator)}</span>,
                    compare: (a, b) => selectVoteAccount(a.validator).localeCompare(selectVoteAccount(b.validator))
                },
                { header: 'Name', render: ({ validator }) => <span className={styles.pubkey}>{selectName(validator)}</span>, compare: (a, b) => selectName(a.validator).localeCompare(selectName(b.validator)) },
                { header: 'Bond balance [☉]', render: ({ bond }) => <>{formatSolAmount(Number(lamportsToSol(bond?.effective_amount?.toString() ?? '0')))}</>, compare: (a, b) => Number(a.bond?.effective_amount ?? 0) - Number(b.bond?.effective_amount ?? 0), alignment: Alignment.RIGHT },
                {
                    header: 'Max Stake Wanted [☉]',
                    headerAttrsFn: () => tooltipAttributes("The max-stake-wanted parameter set up in contract. If not set up, max stake is not limited. The validator won't get more stake than what they set up here. No already delegated stake will be lost by decreasing this setting."),
                    render: ({ bond }) => {
                      const maxStakeWanted = bond ? selectMaxStakeWanted(bond) : 0
                      return <>{ maxStakeWanted > 0 ? formatSolAmount(maxStakeWanted) : '-' }</>
                    },
                    compare: ({ bond: a }, { bond: b }) => a && b ? selectMaxStakeWanted(a) - selectMaxStakeWanted(b) : undefined,
                    alignment: Alignment.RIGHT
                },
                {
                    header: 'Bond Comm.',
                    headerAttrsFn: () => tooltipAttributes(
                        "Current commission settings in the bond configuration. If the configured commission is lower " + 
                        "than the on-chain commission, the difference is drawn from the funded bond.<br/>" +
                        "Ordered by in-bond inflation commission."
                    ),
                    cellAttrsFn: ({bond}) => tooltipAttributes(
                        `Inflation commission: ${formatBps(bond?.inflation_commission_bps)}<br/>` +
                        `MEV commission: ${formatBps(bond?.mev_commission_bps)}<br/>` +
                        `Block rewards commission: ${formatBps(bond?.block_commission_bps)}`
                    ),
                    render: ({bond}) => <>{formatBps(bond?.inflation_commission_bps)} / {formatBps(bond?.mev_commission_bps)} / {formatBps(bond?.block_commission_bps)} </>,
                    compare: compareBondCommissions,
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
                    headerAttrsFn: () => tooltipAttributes("Estimated total cost per epoch for the SAM stake that this validator received. " +
                        "This estimation does not consider the commission bidding never claims more than the real rewards earned in the epoch. " +
                        "And the potential penalties for rapid bid changes. (sorts by Eff. Bid)"
                    ),
                    cellAttrsFn: () => tooltipAttributes("Assumed cost per epoch for the SAM stake that this validator received."),
                    render: ({ auction }) => <>{auction ? round(selectEffectiveCost(auction), 1) : '-'}</>,
                    compare: ({ auction: a }, { auction: b }) => a && b ? selectEffectiveBid(a) - selectEffectiveBid(b) : undefined,
                    alignment: Alignment.RIGHT
                },
                ...expertColumns
            ]}
            defaultOrder={[
                [2, OrderDirection.DESC],
                [4, OrderDirection.DESC],
            ]} />
    </div>
};

function compareBondCommissions({bond: aBond}: ValidatorWithBond, {bond: bBond} : ValidatorWithBond): number | undefined {
  const aVal = aBond?.inflation_commission_bps
  const bVal = bBond?.inflation_commission_bps
  // Both null/undefined - equal
  if (aVal == null && bVal == null) return 0
  // Only a is null - always push to end (use Infinity so it stays at end regardless of sort direction)
  if (aVal == null) return Infinity
  // Only b is null - always push to end (use -Infinity so it stays at end regardless of sort direction)
  if (bVal == null) return -Infinity
  // Both have values - normal numeric sort
  return aVal - bVal
}