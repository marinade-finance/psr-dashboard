import round from 'lodash.round'
import React, { useMemo, useState } from 'react'

import { UserLevel } from 'src/components/navigation/navigation'
import {
  formatBps,
  formatPercentage,
  formatSolAmount,
  lamportsToSol,
} from 'src/format'
import { selectEffectiveAmount } from 'src/services/bonds'
import { selectEffectiveBid, selectEffectiveCost } from 'src/services/sam'
import {
  selectProtectedStake,
  selectMaxStakeWanted,
  selectMaxProtectedStake,
} from 'src/services/validator-with-bond'
import {
  selectLiquidMarinadeStake,
  selectName,
  selectNativeMarinadeStake,
  selectTotalMarinadeStake,
  selectVoteAccount,
} from 'src/services/validators'

import { HelpTip } from '../help-tip/help-tip'
import { Metric } from '../metric/metric'
import {
  ShadTable,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../ui/table'

import type { ValidatorWithBond } from 'src/services/validator-with-bond'

type Props = {
  data: ValidatorWithBond[]
  level: UserLevel
}

type SortConfig = { column: string; direction: 'asc' | 'desc' } | null

const HEAD_CLS =
  'px-3.5 py-[11px] text-[11px] font-medium tracking-[0.06em] bg-muted uppercase cursor-pointer select-none'

export const ValidatorBondsTable: React.FC<Props> = ({ data, level }) => {
  const [sort, setSort] = useState<SortConfig>({
    column: 'bondBalance',
    direction: 'desc',
  })

  const handleSort = (column: string) => {
    setSort((prev) => {
      if (prev?.column === column) {
        if (prev.direction === 'asc') return { column, direction: 'desc' }
        if (prev.direction === 'desc') return null
      }
      return { column, direction: 'asc' }
    })
  }

  const sortIndicator = (column: string) => {
    if (sort?.column !== column) return null
    return (
      <span className="text-primary ml-1">
        {sort.direction === 'asc' ? '▲' : '▼'}
      </span>
    )
  }

  const totalMarinadeStake = data.reduce(
    (sum, { validator }) => sum + selectTotalMarinadeStake(validator),
    0,
  )
  const totalProtectedStake = data.reduce(
    (sum, validatorWithBond) => sum + selectProtectedStake(validatorWithBond),
    0,
  )
  const totalMaxProtectedStake = data.reduce(
    (sum, entry) => sum + selectMaxProtectedStake(entry),
    0,
  )
  const effectiveBalance = Math.round(
    data.reduce(
      (sum, { bond }) => sum + (bond ? selectEffectiveAmount(bond) : 0),
      0,
    ),
  )
  const totalFundedBonds = data.filter(
    ({ bond }) => (bond ? selectEffectiveAmount(bond) : 0) > 0,
  ).length

  const sortedData = useMemo(() => {
    if (!sort) return data
    const sorted = [...data]
    const dir = sort.direction === 'asc' ? 1 : -1

    sorted.sort((a, b) => {
      let cmp = 0
      switch (sort.column) {
        case 'validator':
          cmp = (selectName(a.validator) || selectVoteAccount(a.validator)).localeCompare(
            selectName(b.validator) || selectVoteAccount(b.validator),
          )
          break
        case 'bondBalance':
          cmp =
            Number(a.bond?.effective_amount ?? 0) -
            Number(b.bond?.effective_amount ?? 0)
          break
        case 'maxStakeWanted': {
          const aVal = a.bond ? selectMaxStakeWanted(a.bond) : 0
          const bVal = b.bond ? selectMaxStakeWanted(b.bond) : 0
          cmp = aVal - bVal
          break
        }
        case 'bondComm': {
          const aVal = a.bond?.inflation_commission_bps
          const bVal = b.bond?.inflation_commission_bps
          if (aVal == null && bVal == null) cmp = 0
          else if (aVal == null) cmp = 1
          else if (bVal == null) cmp = -1
          else cmp = aVal - bVal
          break
        }
        case 'marinadeStake':
          cmp =
            selectTotalMarinadeStake(a.validator) -
            selectTotalMarinadeStake(b.validator)
          break
        case 'effCost': {
          const aVal = a.auction ? selectEffectiveBid(a.auction) : -Infinity
          const bVal = b.auction ? selectEffectiveBid(b.auction) : -Infinity
          cmp = aVal - bVal
          break
        }
        case 'maxProtectedStake':
          cmp = selectMaxProtectedStake(a) - selectMaxProtectedStake(b)
          break
        case 'protectedStakePct':
          cmp = selectProtectedStake(a) - selectProtectedStake(b)
          break
      }
      return cmp * dir
    })
    return sorted
  }, [data, sort])

  const isExpert = level === UserLevel.Expert

  return (
    <div className="relative">
      <div className="grid grid-cols-4 gap-3 mb-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <HelpTip text="Count of currently funded bonds">
          <Metric
            label="Bonds Funded"
            value={totalFundedBonds.toLocaleString()}
          />
        </HelpTip>
        <HelpTip text="Total effective amount of SOL deposited to the bonds">
          <Metric
            label="Bonds Balance"
            value={`☉ ${formatSolAmount(effectiveBalance)}`}
          />
        </HelpTip>
        <HelpTip text="How much stake is distributed by Marinade">
          <Metric
            label="Marinade Stake"
            value={`☉ ${formatSolAmount(totalMarinadeStake)}`}
          />
        </HelpTip>
        <HelpTip text="How much of Marinade's stake is protected by validators' deposits to the bonds">
          <Metric
            label="Protected Stake"
            value={formatPercentage(totalProtectedStake / totalMarinadeStake)}
          />
        </HelpTip>
        {isExpert && (
          <HelpTip text="How much of Marinade's stake can be potentially protected if all bonds in the system are used">
            <Metric
              label="Max Protectable Stake"
              value={formatPercentage(
                totalMaxProtectedStake / totalMarinadeStake,
              )}
            />
          </HelpTip>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
        <ShadTable className="font-sans text-[13px]">
          <TableHeader>
            <TableRow className="border-b border-border-grid">
              <TableHead
                className={`${HEAD_CLS} text-left min-w-[200px]`}
                onClick={() => handleSort('validator')}
              >
                Validator{sortIndicator('validator')}
              </TableHead>
              <TableHead
                className={`${HEAD_CLS} text-right`}
                onClick={() => handleSort('bondBalance')}
              >
                Bond Balance{sortIndicator('bondBalance')}
              </TableHead>
              <TableHead
                className={`${HEAD_CLS} text-right`}
                onClick={() => handleSort('maxStakeWanted')}
              >
                Max Stake Wanted{sortIndicator('maxStakeWanted')}
              </TableHead>
              <TableHead
                className={`${HEAD_CLS} text-right`}
                onClick={() => handleSort('bondComm')}
              >
                Bond Comm.{sortIndicator('bondComm')}
                <HelpTip
                  text={
                    'Current commission settings in the bond configuration. If the configured commission is lower ' +
                    'than the on-chain commission, the difference is drawn from the funded bond.<br/>' +
                    'Ordered by in-bond inflation commission.'
                  }
                />
              </TableHead>
              <TableHead
                className={`${HEAD_CLS} text-right`}
                onClick={() => handleSort('marinadeStake')}
              >
                Marinade Stake{sortIndicator('marinadeStake')}
              </TableHead>
              <TableHead
                className={`${HEAD_CLS} text-right`}
                onClick={() => handleSort('effCost')}
              >
                Eff. Cost{sortIndicator('effCost')}
                <HelpTip text="Estimated total cost per epoch for the SAM stake that this validator received. This estimation does not consider the commission bidding never claims more than the real rewards earned in the epoch. And the potential penalties for rapid bid changes." />
              </TableHead>
              {isExpert && (
                <>
                  <TableHead
                    className={`${HEAD_CLS} text-right`}
                    onClick={() => handleSort('maxProtectedStake')}
                  >
                    Max Protected Stake{sortIndicator('maxProtectedStake')}
                  </TableHead>
                  <TableHead
                    className={`${HEAD_CLS} text-right`}
                    onClick={() => handleSort('protectedStakePct')}
                  >
                    Protected Stake %{sortIndicator('protectedStakePct')}
                  </TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((entry) => {
              const { validator, bond, auction } = entry
              const voteAccount = selectVoteAccount(validator)
              const name = selectName(validator)
              const bondBalance = Number(
                lamportsToSol(bond?.effective_amount?.toString() ?? '0'),
              )
              const maxStakeWanted = bond ? selectMaxStakeWanted(bond) : 0
              const inf = bond?.inflation_commission_bps
              const mev = bond?.mev_commission_bps
              const block = bond?.block_commission_bps
              const totalStake = selectTotalMarinadeStake(validator)
              const nativeStake = selectNativeMarinadeStake(validator)
              const liquidStake = selectLiquidMarinadeStake(validator)

              return (
                <TableRow
                  key={voteAccount}
                  className="border-b border-border-grid bg-card transition-colors duration-[120ms] hover:bg-primary-light-05"
                >
                  {/* Validator: name + address */}
                  <TableCell className="px-3.5 py-3 min-w-[200px]">
                    <div className="font-medium text-foreground text-[13px] truncate max-w-[240px]">
                      {name || voteAccount.slice(0, 12) + '…'}
                    </div>
                    <div className="text-muted-foreground text-[11px] font-mono truncate">
                      {voteAccount.slice(0, 12)}…
                    </div>
                  </TableCell>

                  {/* Bond Balance */}
                  <TableCell className="px-3.5 py-3 text-right font-mono font-semibold text-[13px]">
                    ☉ {formatSolAmount(bondBalance)}
                  </TableCell>

                  {/* Max Stake Wanted */}
                  <TableCell className="px-3.5 py-3 text-right font-mono text-[13px]">
                    {maxStakeWanted > 0 ? (
                      formatSolAmount(maxStakeWanted)
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Bond Commission */}
                  <TableCell className="px-3.5 py-3 text-right font-mono text-[13px]">
                    {inf == null && mev == null && block == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <HelpTip
                        text={
                          `Inflation commission: ${formatBps(inf)}<br/>` +
                          `MEV commission: ${formatBps(mev)}<br/>` +
                          `Block rewards commission: ${formatBps(block)}`
                        }
                      >
                        <span>
                          {formatBps(inf)} / {formatBps(mev)} /{' '}
                          {formatBps(block)}
                        </span>
                      </HelpTip>
                    )}
                  </TableCell>

                  {/* Marinade Stake */}
                  <TableCell className="px-3.5 py-3 text-right font-mono font-semibold text-[13px]">
                    <HelpTip
                      text={`Native: ${formatSolAmount(nativeStake)}, Liquid: ${formatSolAmount(liquidStake)}`}
                    >
                      <span>☉ {formatSolAmount(totalStake)}</span>
                    </HelpTip>
                  </TableCell>

                  {/* Eff. Cost */}
                  <TableCell className="px-3.5 py-3 text-right font-mono text-[13px]">
                    <HelpTip text="Assumed cost per epoch for the SAM stake that this validator received.">
                      <span>
                        {auction
                          ? `☉ ${round(selectEffectiveCost(auction), 1)}`
                          : <span className="text-muted-foreground">-</span>}
                      </span>
                    </HelpTip>
                  </TableCell>

                  {/* Expert columns */}
                  {isExpert && (
                    <>
                      <TableCell className="px-3.5 py-3 text-right font-mono text-[13px]">
                        {formatSolAmount(selectMaxProtectedStake(entry))}
                      </TableCell>
                      <TableCell className="px-3.5 py-3 text-right font-mono text-[13px]">
                        {formatPercentage(
                          nativeStake > 0
                            ? selectProtectedStake(entry) / nativeStake
                            : 0,
                        )}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </ShadTable>
      </div>
    </div>
  )
}
