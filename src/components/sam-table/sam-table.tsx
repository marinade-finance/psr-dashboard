import React from "react";
import styles from './sam-table.module.css'
import { Alignment, Color, OrderDirection, Table } from "../table/table";
import { formatPercentage, formatSolAmount } from "src/format";
import { Metric } from "../metric/metric";
import { AuctionResult } from "@marinade.finance/ds-sam-sdk";
import { selectBid, selectBondSize, selectCommission, selectEffectiveBid, selectConstraintText, selectMaxAPY, selectMevCommission, selectSamDistributedStake, selectSamTargetStake, selectVoteAccount, selectWinningAPY, bondColorState, bondTooltip, selectMaxWantedStake, selectEffectiveCost } from "src/services/sam";
import { tooltipAttributes } from '../../services/utils'

type Props = {
    auctionResult: AuctionResult
    epochsPerYear: number
}

export const SamTable: React.FC<Props> = ({ auctionResult, epochsPerYear }) => {
    console.log(auctionResult)
    const { auctionData: { validators } } = auctionResult
    const samDistributedStake = Math.round(selectSamDistributedStake(validators))
    const winningAPY = selectWinningAPY(auctionResult, epochsPerYear)

    const validatorsWithBond = validators.filter((validator) => selectBondSize(validator) > 0)

    return <div className={styles.tableWrap}>
        <div className={styles.metricWrap}>
            <Metric 
                label="SAM stake"
                value={`☉ ${formatSolAmount(samDistributedStake)}`}
                {...tooltipAttributes("How much stake is distributed by Marinade to validators based on SAM")} />
            <Metric
                label="Auction winning APY"
                value={`☉ ${formatPercentage(winningAPY)}`}
                {...tooltipAttributes("Estimated APY of the last validator winning the auction based on ideal count of epochs in the year")}
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
                    render: (validator) => <>{`${selectBid(validator)}`}</>,
                    compare: (a, b) => selectBid(a) - selectBid(b),
                    alignment: Alignment.RIGHT
                },
                { 
                    header: 'Bond [☉]',
                    render: (validator) => <>{formatSolAmount(selectBondSize(validator))}</>,
                    compare: (a, b) => selectBondSize(a) - selectBondSize(b),
                    alignment: Alignment.RIGHT,
                    background: (validator) => bondColorState(validator),
                    cellAttrsFn: (validator) => tooltipAttributes(bondTooltip(bondColorState(validator)))
                },
                { 
                    header: 'Max APY',
                    render: (validator) => <>{formatPercentage(selectMaxAPY(validator, epochsPerYear)).replace('Infinity%', '∞')}</>,
                    compare: (a, b) => selectMaxAPY(a, epochsPerYear) - selectMaxAPY(b, epochsPerYear),
                    alignment: Alignment.RIGHT
                },
                { 
                    header: 'SAM stake [☉]',
                    cellAttrsFn: (validator) => tooltipAttributes(selectConstraintText(validator)),
                    render: (validator) => <>{formatSolAmount(Math.round(selectSamTargetStake(validator)))}</>,
                    compare: (a, b) => selectSamTargetStake(a) - selectSamTargetStake(b),
                    alignment: Alignment.RIGHT
                },
                { 
                    header: 'Wanted stake [☉]',
                    render: (validator) => <>{formatSolAmount(Math.round(selectMaxWantedStake(validator)))}</>,
                    compare: (a, b) => selectMaxWantedStake(a) - selectMaxWantedStake(b),
                    alignment: Alignment.RIGHT
                },
                {
                    header: 'Effective bid [☉]',
                    render: (validator) => <>{selectEffectiveBid(validator)}</>,
                    compare: (a, b) => selectEffectiveBid(a) - selectEffectiveBid(b),
                    alignment: Alignment.RIGHT
                },
                {
                    header: 'Effective cost [☉]',
                    render: (validator) => <>{selectEffectiveCost(validator)}</>,
                    compare: (a, b) => selectEffectiveBid(a) - selectEffectiveBid(b),
                    alignment: Alignment.RIGHT
                },
            ]}
            defaultOrder={[
                [5, OrderDirection.DESC],
                [4, OrderDirection.DESC],
            ]}
            showRowNumber={true} />
    </div>
};
