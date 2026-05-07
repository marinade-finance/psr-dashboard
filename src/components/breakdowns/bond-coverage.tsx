import React from 'react'

import { pay, pmpe, stake } from 'src/format'
import { computeBondCoverageMetrics } from 'src/services/breakdowns'

import { CalcCard, CalcRow, OkRow, SectionHeader } from './shared'

import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'
import type { BondHealthState } from 'src/services/breakdowns'

type Props = {
  validator: AuctionValidator
  dsSamConfig: DsSamConfig
  winningTotalPmpe: number
  bondState: BondHealthState
  isSimulated?: boolean
  onGoToSim?: () => void
}

const statusLine = (
  state: BondHealthState,
  topUpToMin: number,
  topUpToIdeal: number,
): { label: string; tone: 'red' | 'yellow' | 'green' } => {
  if (state === 'critical') {
    return {
      label:
        topUpToMin > 0
          ? `Penalty imminent. Top up ${pay(topUpToMin)} to avoid it.`
          : 'Penalty imminent. Top up to avoid it.',
      tone: 'red',
    }
  }
  if (state === 'watch') {
    return {
      label:
        topUpToIdeal > 0
          ? `Bond covers current stake. Top up ${pay(topUpToIdeal)} for more stake.`
          : 'Bond covers current stake. Top up for more stake.',
      tone: 'yellow',
    }
  }
  return {
    label: 'Bond has enough coverage. Keep it topped up.',
    tone: 'green',
  }
}

export const BondCoverageBreakdown: React.FC<Props> = ({
  validator,
  dsSamConfig,
  winningTotalPmpe,
  bondState,
  isSimulated,
  onGoToSim,
}) => {
  const m = computeBondCoverageMetrics(
    validator,
    dsSamConfig.minBondEpochs,
    dsSamConfig.idealBondEpochs,
    winningTotalPmpe,
    dsSamConfig.bondRiskFeeMult,
  )
  const status = statusLine(bondState, m.topUpToMin, m.topUpToIdeal)

  const cta = onGoToSim ? (
    <button
      className="text-xs text-primary hover:underline"
      onClick={onGoToSim}
    >
      Simulate commission or bid changes →
    </button>
  ) : null

  return (
    <CalcCard
      title="Bond Coverage Calculation"
      guideTo="/docs"
      isSimulated={isSimulated}
      status={status}
      cta={cta}
    >
      <table className="w-full">
        <tbody>
          <SectionHeader title="Rates" />
          <CalcRow
            label="Expected max effective bid PMPE"
            secondary={pmpe(m.expectedMaxEffBidPmpe)}
            value=""
          />
          <CalcRow
            label="On-chain distributed rewards PMPE"
            secondary={pmpe(m.onchainDistributedPmpe)}
            value=""
          />

          <SectionHeader title={`Minimum Coverage (${m.minEp} epochs)`} />
          <CalcRow
            label="Claimable bond balance"
            value={pay(m.claimableBondBalanceSol)}
            bold
          />
          <CalcRow
            label="Activated Marinade stake"
            secondary={stake(m.marinadeActivatedStakeSol)}
            value=""
          />
          <CalcRow
            label="Projected exposed stake"
            secondary={stake(m.projectedExposedStakeSol)}
            value=""
          />
          <CalcRow
            label="Minimum unprotected reserve"
            value={pay(m.minUnprotectedReserveSol)}
          />
          <CalcRow
            label="On-chain distributed reserve"
            value={pay(m.onchainBase)}
          />
          <CalcRow label="Minimum bid coverage" value={pay(m.minCoverageBid)} />
          <CalcRow label="Minimum required" value={pay(m.floorBase)} bold />
          {m.topUpToMin > 0 ? (
            <CalcRow
              label="Top-up to minimum coverage"
              value={pay(m.topUpToMin)}
              bold
              large
              accent="red"
            />
          ) : (
            <OkRow message="You have enough bond to cover the minimum." />
          )}

          <SectionHeader title={`Ideal Coverage (${m.idealEp} epochs)`} />
          <CalcRow label="Bond balance" value={pay(m.bondBalanceSol)} bold />
          <CalcRow
            label="Projected exposed stake"
            secondary={stake(m.projectedExposedStakeSol)}
            value=""
          />
          <CalcRow
            label="Ideal unprotected reserve"
            value={pay(m.idealUnprotectedReserveSol)}
          />
          <CalcRow
            label="On-chain distributed reserve"
            value={pay(m.onchainBase)}
          />
          <CalcRow label="Ideal bid coverage" value={pay(m.idealCoverageBid)} />
          <CalcRow label="Ideal required" value={pay(m.requiredIdeal)} bold />
          {m.topUpToIdeal > 0 ? (
            <CalcRow
              label="To get more stake, top up"
              value={pay(m.topUpToIdeal)}
              bold
              large
              accent="yellow"
            />
          ) : (
            <OkRow message="Bond has enough coverage to receive more stake." />
          )}
        </tbody>
      </table>
    </CalcCard>
  )
}
