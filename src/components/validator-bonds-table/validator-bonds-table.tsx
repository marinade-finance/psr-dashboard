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

import type { ValidatorWithBond } from 'src/services/validator-with-bond'

type Props = {
  data: ValidatorWithBond[]
  level: UserLevel
}

type SortConfig = { column: string; direction: 'asc' | 'desc' } | null

// Pad/truncate string to exact width
const pad = (s: string, w: number): string =>
  s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length)
const rpad = (s: string, w: number): string =>
  s.length >= w ? s.slice(0, w) : ' '.repeat(w - s.length) + s

// Column widths
const W = {
  validator: 22,
  bondBal: 12,
  maxWanted: 12,
  comm: 16,
  mrnStake: 12,
  effCost: 10,
  maxProt: 14,
  protPct: 10,
}
const SEP = ' │ '

export const ValidatorBondsTable: React.FC<Props> = ({ data, level }) => {
  const [sort, setSort] = useState<SortConfig>({
    column: 'bondBalance',
    direction: 'desc',
  })

  const handleSort = (column: string) => {
    setSort(prev => {
      if (prev?.column === column) {
        if (prev.direction === 'asc') return { column, direction: 'desc' }
        if (prev.direction === 'desc') return null
      }
      return { column, direction: 'asc' }
    })
  }

  const sortArrow = (column: string) => {
    if (sort?.column !== column) return ''
    return sort.direction === 'asc' ? ' ▲' : ' ▼'
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
          cmp = (
            selectName(a.validator) || selectVoteAccount(a.validator)
          ).localeCompare(
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

  // Build header columns
  const cols = [
    { key: 'validator', label: 'VALIDATOR', width: W.validator, align: 'left' as const },
    { key: 'bondBalance', label: 'BOND BAL', width: W.bondBal, align: 'right' as const },
    { key: 'maxStakeWanted', label: 'MAX WANTED', width: W.maxWanted, align: 'right' as const },
    { key: 'bondComm', label: 'COMM', width: W.comm, align: 'right' as const },
    { key: 'marinadeStake', label: 'MRN STAKE', width: W.mrnStake, align: 'right' as const },
    { key: 'effCost', label: 'EFF COST', width: W.effCost, align: 'right' as const },
  ]
  if (isExpert) {
    cols.push(
      { key: 'maxProtectedStake', label: 'MAX PROT', width: W.maxProt, align: 'right' as const },
      { key: 'protectedStakePct', label: 'PROT %', width: W.protPct, align: 'right' as const },
    )
  }

  const headerLine = cols
    .map(c => '─'.repeat(c.width))
    .join('─┼─')

  const renderHeader = () => {
    return cols.map((c, i) => {
      const label = c.label + sortArrow(c.key)
      const text = c.align === 'right' ? rpad(label, c.width) : pad(label, c.width)
      return (
        <React.Fragment key={c.key}>
          {i > 0 && <span className="text-muted-foreground">{SEP}</span>}
          <span
            className="cursor-pointer select-none"
            onClick={() => handleSort(c.key)}
          >
            {text}
          </span>
          {c.key === 'bondComm' && (
            <HelpTip
              text={
                'Current commission settings in the bond configuration. If the configured commission is lower ' +
                'than the on-chain commission, the difference is drawn from the funded bond.'
              }
            />
          )}
          {c.key === 'effCost' && (
            <HelpTip text="Estimated total cost per epoch for the SAM stake that this validator received." />
          )}
        </React.Fragment>
      )
    })
  }

  return (
    <div className="w-full font-mono text-[12px] leading-[1.6] text-foreground">
      {/* Stats */}
      <div className="mb-4 whitespace-pre leading-[1.8]">
        <span className="text-muted-foreground">{':: '}</span>
        BONDS FUNDED{' '}
        <span className="font-bold">{totalFundedBonds.toLocaleString()}</span>
        {'    '}
        <span className="text-muted-foreground">{':: '}</span>
        BONDS BALANCE{' '}
        <span className="font-bold">{formatSolAmount(effectiveBalance)}◎</span>
        {'    '}
        <span className="text-muted-foreground">{':: '}</span>
        MARINADE STAKE{' '}
        <span className="font-bold">{formatSolAmount(totalMarinadeStake)}◎</span>
        {'    '}
        <span className="text-muted-foreground">{':: '}</span>
        PROTECTED STAKE{' '}
        <span className="font-bold">
          {formatPercentage(totalProtectedStake / totalMarinadeStake)}
        </span>
        <HelpTip text="How much of Marinade's stake is protected by validators' deposits to the bonds" />
        {isExpert && (
          <>
            {'    '}
            <span className="text-muted-foreground">{':: '}</span>
            MAX PROTECTABLE{' '}
            <span className="font-bold">
              {formatPercentage(totalMaxProtectedStake / totalMarinadeStake)}
            </span>
            <HelpTip text="How much of Marinade's stake can be potentially protected if all bonds in the system are used" />
          </>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto whitespace-pre">
        {/* Header */}
        <div className="text-muted-foreground">{renderHeader()}</div>
        <div className="text-muted-foreground">{headerLine}</div>

        {/* Rows */}
        {sortedData.map(entry => {
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

          const validatorStr = pad(
            name || voteAccount.slice(0, 18) + '…',
            W.validator,
          )
          const bondBalStr = rpad(`${formatSolAmount(bondBalance)}◎`, W.bondBal)
          const maxWantedStr = rpad(
            maxStakeWanted > 0 ? formatSolAmount(maxStakeWanted) : '-',
            W.maxWanted,
          )
          const commStr =
            inf == null && mev == null && block == null
              ? rpad('—', W.comm)
              : rpad(
                  `${formatBps(inf)}/${formatBps(mev)}/${formatBps(block)}`,
                  W.comm,
                )
          const stakeStr = rpad(`${formatSolAmount(totalStake)}◎`, W.mrnStake)
          const costStr = rpad(
            auction ? `${round(selectEffectiveCost(auction), 1)}◎` : '-',
            W.effCost,
          )

          const expertCols = isExpert
            ? [
                rpad(formatSolAmount(selectMaxProtectedStake(entry)), W.maxProt),
                rpad(
                  formatPercentage(
                    nativeStake > 0
                      ? selectProtectedStake(entry) / nativeStake
                      : 0,
                  ),
                  W.protPct,
                ),
              ]
            : []

          const allCells = [validatorStr, bondBalStr, maxWantedStr, commStr, stakeStr, costStr, ...expertCols]

          return (
            <div
              key={voteAccount}
              className="cursor-pointer hover:opacity-70"
            >
              {allCells.map((cell, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-muted-foreground">{SEP}</span>}
                  <span>{cell}</span>
                </React.Fragment>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
