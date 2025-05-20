import round from 'lodash.round'
import React from "react";
import styles from './sam-table.module.css'
import { Alignment, Color, OrderDirection, Table } from "../table/table";
import { formatPercentage, formatSolAmount } from "src/format";
import { Metric } from "../metric/metric";
import { AuctionResult, DsSamConfig } from "@marinade.finance/ds-sam-sdk";
import { selectBid, selectBondSize, selectCommission, selectEffectiveBid, selectConstraintText, selectMaxAPY, selectMevCommission, selectSamDistributedStake, selectSamTargetStake, selectVoteAccount, selectWinningAPY, bondColorState, bondTooltip, selectEffectiveCost, selectSpendRobustReputation, spendRobustReputationTooltip, selectMaxSamStake, maxSamStakeTooltip } from "src/services/sam";
import { tooltipAttributes } from '../../services/utils'
import { ComplexMetric } from "../complex-metric/complex-metric";

type Props = {
    auctionResult: AuctionResult
    epochsPerYear: number
    dsSamConfig: DsSamConfig
}

export const SamTable: React.FC<Props> = ({ auctionResult, epochsPerYear, dsSamConfig }) => {
    console.log(auctionResult)
    const { auctionData: { validators } } = auctionResult
    const samDistributedStake = Math.round(selectSamDistributedStake(validators))
    const winningAPY = selectWinningAPY(auctionResult, epochsPerYear)

    const validatorsWithBond = validators.filter((validator) => selectBondSize(validator) > 0).map((v) => {
        return {
            ...v,
            bondState: bondColorState(v)
        }
    })

    const samStakeValidators = validatorsWithBond.filter((v) => v.auctionStake.marinadeSamTargetSol)
    const maxTvlDelegation = dsSamConfig.maxMarinadeTvlSharePerValidatorDec * samDistributedStake

    return <div className={styles.tableWrap}>
        <div className={styles.metricWrap}>
            <Metric 
                label="SAM stake"
                value={`☉ ${formatSolAmount(samDistributedStake, 0)}`}
                {...tooltipAttributes("How much stake is distributed by Marinade to validators based on SAM")} />
            <Metric
                label="Auction winning APY"
                value={`☉ ${formatPercentage(winningAPY)}`}
                {...tooltipAttributes("Estimated APY of the last validator winning the auction based on ideal count of epochs in the year")}
            />
            <ComplexMetric
                label="Winning validators"
                value={<div><span>{samStakeValidators.length}</span> / <span>{validatorsWithBond.length}</span></div>}
                {...tooltipAttributes("Number of validators that won stake in this SAM auction")}
            />
        </div>
        <Table
            data={validatorsWithBond}
            columns={[
                { 
                    header: 'Validator', 
                    render: (validator) => <span className={styles.pubkey}>{selectVoteAccount(validator)}</span>,
                    compare: (a, b) => selectVoteAccount(a).localeCompare(selectVoteAccount(b)) 
                },
                { 
                    header: 'Comm.',
                    render: (validator) => <>{formatPercentage(selectCommission(validator), 0)}</>,
                    compare: (a, b) => selectCommission(a) - selectCommission(b),
                    alignment: Alignment.RIGHT 
                },
                { 
                    header: 'MEV',
                    render: (validator) => <>{selectMevCommission(validator) === null ? '-' : formatPercentage(selectMevCommission(validator), 0)}</>,
                    compare: (a, b) => (selectMevCommission(a) ?? 100) - (selectMevCommission(b) ?? 100),
                    alignment: Alignment.RIGHT
                },
                {
                    header: 'Bid',
                    cellAttrsFn: () => tooltipAttributes("Maximum bid for 1000 SOL set by the validator."),
                    render: (validator) => <>{`${selectBid(validator)}`}</>,
                    compare: (a, b) => selectBid(a) - selectBid(b),
                    alignment: Alignment.RIGHT
                },
                { 
                    header: 'Bond [☉]',
                    render: (validator) => <>{formatSolAmount(selectBondSize(validator), 0)}</>,
                    compare: (a, b) => selectBondSize(a) - selectBondSize(b),
                    alignment: Alignment.RIGHT,
                    cellAttrsFn: (validator) => tooltipAttributes(bondTooltip(validator.bondState))
                },
                {
                    header: 'Rep.',
                    render: (validator) => <>{formatSolAmount(selectSpendRobustReputation(validator), 0)}</>,
                    compare: (a, b) => selectSpendRobustReputation(a) - selectSpendRobustReputation(b),
                    alignment: Alignment.RIGHT,
                    cellAttrsFn: (validator) => tooltipAttributes(spendRobustReputationTooltip(validator))
                },
                {
                    header: 'Future Max SAM Stake [☉]',
                    render: (validator) => <>{formatSolAmount(selectMaxSamStake(validator), 0)}</>,
                    compare: (a, b) => selectMaxSamStake(a) - selectMaxSamStake(b),
                    alignment: Alignment.RIGHT,
                    cellAttrsFn: (validator) => tooltipAttributes(maxSamStakeTooltip(validator, {maxTvlDelegation, minBondBalanceSol: dsSamConfig.minBondBalanceSol}))
                },
                { 
                    header: 'Max APY',
                    cellAttrsFn: () => tooltipAttributes("Calculated APY using the bid of this validator."),
                    render: (validator) => <>{formatPercentage(selectMaxAPY(validator, epochsPerYear))}</>,
                    compare: (a, b) => selectMaxAPY(a, epochsPerYear) - selectMaxAPY(b, epochsPerYear),
                    alignment: Alignment.RIGHT
                },
                { 
                    header: 'SAM Stake [☉]',
                    cellAttrsFn: (validator) => tooltipAttributes(selectConstraintText(validator)),
                    render: (validator) => <>{formatSolAmount(selectSamTargetStake(validator), 0)}</>,
                    compare: (a, b) => selectSamTargetStake(a) - selectSamTargetStake(b),
                    alignment: Alignment.RIGHT
                },
                {
                    header: 'Eff. bid [☉]',
                    cellAttrsFn: () => tooltipAttributes("Bid for 1000 SOL that the validator would be paying based on the current Auction Winning APY."),
                    render: (validator) => <>{round(selectEffectiveBid(validator), 4)}</>,
                    compare: (a, b) => selectEffectiveBid(a) - selectEffectiveBid(b),
                    alignment: Alignment.RIGHT
                },
                {
                    header: 'Eff. cost [☉]',
                    cellAttrsFn: () => tooltipAttributes("Total cost per epoch for the SAM stake that this validator has active."),
                    render: (validator) => <>{round(selectEffectiveCost(validator), 1)}</>,
                    compare: (a, b) => selectEffectiveBid(a) - selectEffectiveBid(b),
                    alignment: Alignment.RIGHT
                },
            ]}
            defaultOrder={[
                [3, OrderDirection.DESC],
                [4, OrderDirection.DESC],
            ]}
            showRowNumber={true} />
    </div>
};
