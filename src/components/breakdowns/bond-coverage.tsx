import React from 'react'

import { cost, topUp, pay, pmpe, stake } from 'src/format'

import { CalcCard, type CardStatus } from './card'
import { CalcRow, OkRow, SectionHeader } from './row'

import type { BondCoverage } from 'src/services/bond-coverage'
import type { BondHealthState } from 'src/services/bond-health'

type Props = {
  title: string
  guideTo?: string
  coverage: BondCoverage
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
): CardStatus => {
  if (state === 'no-bond') {
    return { label: 'No bond posted. Post a bond to qualify.', tone: 'red' }
  }
  if (state === 'critical') {
    const feeStr =
      bondRiskFeeSol > 0
        ? `Estimated bond risk fee: ${pay(bondRiskFeeSol)}.`
        : 'Your bond is too thin to back your stake, so a bond risk fee can be charged and stake will be undelegated.'
    const topUpStr =
      topUpToAvoidFee > 0
        ? ` Top up ${topUp(topUpToAvoidFee)} to avoid the fee.`
        : ''
    return { label: `${feeStr}${topUpStr}`, tone: 'red' }
  } else if (state === 'watch') {
    const text =
      topUpToKeepStake > 0
        ? `Top up ${topUp(topUpToKeepStake)} to keep your stake.`
        : topUpToIdealKeep > 0
          ? `Top up ${topUp(topUpToIdealKeep)} to grow stake.`
          : ''
    if (text) return { label: text, tone: 'yellow' }
    return { label: 'Bond covers current stake.', tone: 'yellow' }
  } else if (state === 'soft') {
    if (topUpToIdealKeep > 0)
      return {
        label: `Bond covers current stake. Top up ${topUp(topUpToIdealKeep)} to grow stake.`,
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
  coverage,
  bondState,
  bondRiskFeeSol,
  isSimulated,
  onGoToSim,
}) => {
  const status = statusLine(
    bondState,
    coverage.topUpToAvoidFee,
    coverage.topUpToKeepStake,
    coverage.topUpToIdealKeep,
    bondRiskFeeSol,
  )

  // Show the penalty math whenever the bond is at risk (critical/watch) so
  // the user can SEE the threshold, how the fee is computed and the top-up
  // to avoid it — not only once a fee is already outstanding. Also keep it
  // visible if a fee/top-up is live or the projected basis matters
  // (undelegation already queued).
  const showRiskSection =
    bondState === 'critical' ||
    bondState === 'watch' ||
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
      <table className="w-full max-w-[34rem]">
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
            title="Minimum bond to keep stake"
            help={`What the bond needs to keep your stake for the next ${coverage.minEp} epochs. Fall short — you pay a bond risk fee AND are scheduled to lose stake immediately.`}
          />
          <CalcRow
            label="Minimum bond epochs"
            secondary={`${coverage.minEp} epochs`}
          />
          <CalcRow
            label="Claimable bond balance"
            help="The bond SOL the protocol can draw against right now to cover fees or shortfalls. Excludes amounts locked in pending operations."
            value={cost(coverage.claimableBondBalanceSol)}
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
              value={topUp(coverage.topUpToKeepStake)}
              total
              severity="warning"
            />
          ) : (
            <OkRow message="Bond covers current stake." />
          )}

          <SectionHeader
            title="Ideal bond to grow stake"
            help={
              'What the bond needs for the pool to feel comfortable giving you more stake.'
            }
          />
          <CalcRow
            label="Ideal bond epochs"
            secondary={`${coverage.idealEp} epochs`}
          />
          <CalcRow
            label="Bond balance"
            help="Total SOL you've deposited as bond — gross, before subtracting amounts locked in pending operations."
            value={cost(coverage.bondBalanceSol)}
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
              label="Top up to grow stake"
              value={topUp(coverage.topUpToIdealKeep)}
              total
              severity="warning"
            />
          ) : (
            <OkRow message="Bond meets ideal coverage." />
          )}

          {showRiskSection && (
            <>
              <SectionHeader
                title="Bond risk fee"
                help="How much bond-risk fee gets charged this epoch, and the top-up needed to avoid it."
              />
              {coverage.carriedPaidUndelegationSol > 0 && (
                <>
                  <CalcRow
                    label="Paid undelegation pending"
                    secondary={stake(coverage.carriedPaidUndelegationSol)}
                  />
                  <CalcRow
                    label="Projected exposed stake"
                    help="Your current exposed stake minus the paid undelegation already scheduled. This is the basis the penalty threshold uses, not today's stake."
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
                  value={topUp(coverage.topUpToAvoidFee)}
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
