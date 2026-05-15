import React from 'react'

import { pay, payCta, pmpe, stake } from 'src/format'
import { computeBondCoverage } from 'src/services/bond-coverage'

import { CalcCard } from './card'
import { CalcRow, OkRow, SectionHeader } from './row'

import type {
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'
import type { BondHealthState } from 'src/services/bond-health'

type Props = {
  title: string
  guideTo?: string
  validator: AuctionValidator
  dsSamConfig: DsSamConfig
  winningTotalPmpe: number
  bondState: BondHealthState
  bondRiskFeeSol: number
  isSimulated?: boolean
  onGoToSim?: () => void
}

const statusLine = (
  state: BondHealthState,
  topUpToAvoidFee: number,
  topUpToKeepStake: number,
  topUpToIdealKeep: number,
  bondRiskFeeSol: number,
): { label: string; tone: 'red' | 'yellow' | 'green' } => {
  if (state === 'critical') {
    const feeStr =
      bondRiskFeeSol > 0
        ? `Estimated bond risk fee: ${pay(bondRiskFeeSol)}.`
        : 'Bond below penalty threshold.'
    const topUpStr =
      topUpToAvoidFee > 0
        ? ` Top up ${payCta(topUpToAvoidFee)} to avoid the fee.`
        : ''
    return { label: `${feeStr}${topUpStr}`, tone: 'red' }
  } else if (state === 'watch') {
    const text =
      topUpToKeepStake > 0
        ? `Top up ${payCta(topUpToKeepStake)} to keep your stake.`
        : topUpToIdealKeep > 0
          ? `Top up ${payCta(topUpToIdealKeep)} for more stake.`
          : ''
    if (text) return { label: text, tone: 'yellow' }
    return { label: 'Bond covers current stake.', tone: 'yellow' }
  } else if (state === 'soft') {
    if (topUpToIdealKeep > 0)
      return {
        label: `Bond covers current stake. Top up ${payCta(topUpToIdealKeep)} for more.`,
        tone: 'yellow',
      }
    return { label: 'Bond meets ideal coverage.', tone: 'green' }
  } else {
    return {
      label: 'Bond has enough coverage. Keep it topped up.',
      tone: 'green',
    }
  }
}

export const BondCoverageBreakdown: React.FC<Props> = ({
  title,
  guideTo,
  validator,
  dsSamConfig,
  winningTotalPmpe,
  bondState,
  bondRiskFeeSol,
  isSimulated,
  onGoToSim,
}) => {
  const coverage = computeBondCoverage(
    validator,
    dsSamConfig.minBondEpochs,
    dsSamConfig.idealBondEpochs,
    winningTotalPmpe,
    dsSamConfig.bondRiskFeeMult,
  )
  const status = statusLine(
    bondState,
    coverage.topUpToAvoidFee,
    coverage.topUpToKeepStake,
    coverage.topUpToIdealKeep,
    bondRiskFeeSol,
  )

  // Risk section is informational; show only when the projected basis matters
  // (some undelegation already queued) or a fee/top-up is actually outstanding.
  const showRiskSection =
    bondRiskFeeSol > 0 ||
    coverage.topUpToAvoidFee > 0 ||
    coverage.carriedPaidUndelegationSol > 0

  const tip = onGoToSim ? (
    <button
      className="text-xs text-primary hover:underline"
      onClick={onGoToSim}
    >
      Simulate commission or bid changes →
    </button>
  ) : null

  return (
    <CalcCard
      title={title}
      guideTo={guideTo}
      isSimulated={isSimulated}
      status={status}
      tip={tip}
    >
      <table className="w-full">
        <tbody>
          <SectionHeader title="Rates" />
          <CalcRow
            label="Expected max effective bid PMPE"
            secondary={pmpe(coverage.expectedMaxEffBidPmpe)}
          />
          <CalcRow
            label="On-chain distributed rewards PMPE"
            secondary={pmpe(coverage.onchainDistributedPmpe)}
          />

          <SectionHeader
            title={`Keep stake (${coverage.minEp} epochs)`}
            help={`What the bond needs to keep your stake for the next ${coverage.minEp} epochs. Fall short — you pay a bond risk fee AND are scheduled to lose stake immediately.`}
          />
          <CalcRow
            label="Claimable bond balance"
            value={pay(coverage.claimableBondBalanceSol)}
            bold
          />
          <CalcRow
            label="Active Marinade stake"
            secondary={stake(coverage.marinadeActivatedStakeSol)}
          />
          <CalcRow
            label="Current exposed stake"
            secondary={stake(coverage.currentExposedStakeSol)}
          />
          <CalcRow
            label="Held for bid payments"
            value={pay(coverage.heldForBidKeep)}
          />
          <CalcRow
            label="Held for reward payouts"
            value={pay(coverage.rewardsGuaranteeKeep)}
          />
          <CalcRow
            label="Minimum required"
            value={pay(coverage.floorBaseKeep)}
            bold
          />
          {coverage.topUpToKeepStake > 0 ? (
            <CalcRow
              label="Top up to keep your stake"
              value={payCta(coverage.topUpToKeepStake)}
              total
              severity="warning"
            />
          ) : (
            <OkRow message="Bond covers current stake." />
          )}

          <SectionHeader
            title={`Grow stake (${coverage.idealEp} epochs)`}
            help={
              'What the bond needs for the pool to feel comfortable giving you more stake.'
            }
          />
          <CalcRow
            label="Bond balance"
            value={pay(coverage.bondBalanceSol)}
            bold
          />
          <CalcRow
            label="Current exposed stake"
            secondary={stake(coverage.currentExposedStakeSol)}
          />
          <CalcRow
            label="Held for bid payments"
            value={pay(coverage.heldForBidIdeal)}
          />
          <CalcRow
            label="Held for reward payouts"
            value={pay(coverage.rewardsGuaranteeIdeal)}
          />
          <CalcRow
            label="Ideal required"
            value={pay(coverage.requiredIdealKeep)}
            bold
          />
          {coverage.topUpToIdealKeep > 0 ? (
            <CalcRow
              label="Top up for more stake"
              value={payCta(coverage.topUpToIdealKeep)}
              total
              severity="warning"
            />
          ) : (
            <OkRow message="Bond meets ideal coverage." />
          )}

          {showRiskSection && (
            <>
              <SectionHeader
                title="Bond Risk"
                help="How much bond-risk fee gets charged this epoch, and the top-up needed to avoid it."
              />
              {coverage.carriedPaidUndelegationSol > 0 && (
                <>
                  <CalcRow
                    label="Paid undelegation pending"
                    secondary={stake(coverage.carriedPaidUndelegationSol)}
                  />
                  <CalcRow
                    label="Projected exposed stake (after undelegation)"
                    secondary={stake(coverage.projectedExposedStakeSol)}
                  />
                </>
              )}
              <CalcRow
                label="Penalty trigger threshold"
                value={pay(coverage.floorBaseProjected)}
                bold
              />
              {coverage.topUpToAvoidFee > 0 && (
                <CalcRow
                  label="Top up to avoid the fee"
                  value={payCta(coverage.topUpToAvoidFee)}
                  total
                  severity="error"
                />
              )}
              {bondRiskFeeSol > 0 && (
                <CalcRow
                  label="Estimated bond risk fee this epoch"
                  value={pay(bondRiskFeeSol)}
                  bold
                  severity="error"
                />
              )}
              {coverage.topUpToAvoidFee === 0 && bondRiskFeeSol === 0 && (
                <OkRow message="Bond above the penalty threshold." />
              )}
            </>
          )}
        </tbody>
      </table>
    </CalcCard>
  )
}
