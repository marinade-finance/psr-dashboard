import React from 'react'

import { pay, payCta, pmpe, stake } from 'src/format'
import { docsPath } from 'src/lib/utils'
import { computeBondCoverageMetrics } from 'src/services/breakdowns'
import { bondStatusText } from 'src/services/tip-engine'

import { CalcCard, CalcRow, OkRow, SectionHeader } from './shared'

import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'
import type { UserLevel } from 'src/components/navigation/navigation'
import type { BondHealthState } from 'src/services/breakdowns'

type Props = {
  validator: AuctionValidator
  dsSamConfig: DsSamConfig
  winningTotalPmpe: number
  bondState: BondHealthState
  bondRiskFeeSol: number
  isSimulated?: boolean
  onGoToSim?: () => void
  level?: UserLevel
}

const statusLine = (
  state: BondHealthState,
  topUpToAvoidFee: number,
  topUpToKeepStake: number,
  topUpToIdealKeep: number,
  bondRiskFeeSol: number,
): { label: string; tone: 'red' | 'yellow' | 'green' } => {
  if (state === 'critical') {
    return {
      label: bondStatusText(
        topUpToAvoidFee,
        topUpToKeepStake,
        topUpToIdealKeep,
        bondRiskFeeSol,
      ),
      tone: 'red',
    }
  }
  if (state === 'watch') {
    const text = bondStatusText(0, topUpToKeepStake, topUpToIdealKeep, 0)
    if (text) return { label: text, tone: 'yellow' }
    return { label: 'Bond covers current stake.', tone: 'yellow' }
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
  bondRiskFeeSol,
  isSimulated,
  onGoToSim,
  level,
}) => {
  const m = computeBondCoverageMetrics(
    validator,
    dsSamConfig.minBondEpochs,
    dsSamConfig.idealBondEpochs,
    winningTotalPmpe,
    dsSamConfig.bondRiskFeeMult,
  )
  const status = statusLine(
    bondState,
    m.topUpToAvoidFee,
    m.topUpToKeepStake,
    m.topUpToIdealKeep,
    bondRiskFeeSol,
  )

  // Risk section is informational; show only when the projected basis matters
  // (some undelegation already queued) or a fee/top-up is actually outstanding.
  const showRiskSection =
    bondRiskFeeSol > 0 ||
    m.topUpToAvoidFee > 0 ||
    m.carriedPaidUndelegationSol > 0

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
      title="Bond Calculation"
      guideTo={`${docsPath(level)}#bond`}
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

          <SectionHeader title={`Bond Coverage — ${m.minEp} epochs`} />
          <CalcRow
            label="Claimable bond balance"
            value={pay(m.claimableBondBalanceSol)}
            bold
          />
          <CalcRow
            label="Active Marinade stake"
            secondary={stake(m.marinadeActivatedStakeSol)}
            value=""
          />
          <CalcRow
            label="Current exposed stake"
            secondary={stake(m.currentExposedStakeSol)}
            value=""
          />
          <CalcRow
            label="Minimum unprotected reserve"
            value={pay(m.minUnprotectedReserveSol)}
          />
          <CalcRow
            label="Minimum bid coverage"
            value={pay(m.minCoverageBidKeep)}
          />
          <CalcRow label="Minimum required" value={pay(m.floorBaseKeep)} bold />
          {m.topUpToKeepStake > 0 ? (
            <CalcRow
              label="Top up to keep your stake"
              value={payCta(m.topUpToKeepStake)}
              bold
              large
              accent="yellow"
              separator
              marker="yellow"
            />
          ) : (
            <OkRow message="Bond covers your current stake." />
          )}

          <SectionHeader title={`Ideal Coverage — ${m.idealEp} epochs`} />
          <CalcRow label="Bond balance" value={pay(m.bondBalanceSol)} bold />
          <CalcRow
            label="Current exposed stake"
            secondary={stake(m.currentExposedStakeSol)}
            value=""
          />
          <CalcRow
            label="Ideal unprotected reserve"
            value={pay(m.idealUnprotectedReserveSol)}
          />
          <CalcRow
            label="Ideal bid coverage"
            value={pay(m.idealCoverageBidKeep)}
          />
          <CalcRow
            label="Ideal required"
            value={pay(m.requiredIdealKeep)}
            bold
          />
          {m.topUpToIdealKeep > 0 ? (
            <CalcRow
              label="Top up for more stake"
              value={payCta(m.topUpToIdealKeep)}
              bold
              large
              accent="yellow"
              separator
              marker="yellow"
            />
          ) : (
            <OkRow message="Bond meets ideal coverage — eligible for more stake." />
          )}

          {showRiskSection && (
            <>
              <SectionHeader title="Bond Risk — after undelegations finalize" />
              {m.carriedPaidUndelegationSol > 0 && (
                <CalcRow
                  label="Carried paid undelegation"
                  secondary={stake(m.carriedPaidUndelegationSol)}
                  value=""
                />
              )}
              <CalcRow
                label="Projected exposed stake"
                secondary={stake(m.projectedExposedStakeSol)}
                value=""
              />
              <CalcRow
                label="Penalty trigger threshold"
                value={pay(m.floorBaseProjected)}
                bold
              />
              {m.topUpToAvoidFee > 0 && (
                <CalcRow
                  label="Top up to avoid the fee"
                  value={payCta(m.topUpToAvoidFee)}
                  bold
                  large
                  accent="red"
                  separator
                  marker="red"
                />
              )}
              {bondRiskFeeSol > 0 && (
                <CalcRow
                  label="Estimated bond risk fee this epoch"
                  value={pay(bondRiskFeeSol)}
                  bold
                  marker="red"
                />
              )}
              {m.topUpToAvoidFee === 0 && bondRiskFeeSol === 0 && (
                <OkRow message="Bond above the penalty threshold." />
              )}
            </>
          )}
        </tbody>
      </table>
    </CalcCard>
  )
}
