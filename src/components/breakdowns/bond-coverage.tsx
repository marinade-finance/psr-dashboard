import React from 'react'

import { bondSol, pmpe, stake, topUp } from 'src/format'
import { bondAdvice } from 'src/services/tip-engine'

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
  bondBalanceSol: number
  minBondBalanceSol: number
  // Signed delta from the auction's redelegation pass. When positive on a
  // 'soft' bond, the canonical "top up to grow stake" CTA contradicts the
  // truthful "stake is already arriving" — see statusLine().
  expectedStakeDeltaSol?: number
  isSimulated?: boolean
  onGoToSim?: () => void
}

// Banner text is NOT re-worded here — it is the canonical bondAdvice()
// string, byte-identical to the sam-table Next Step pill and the
// validator-detail header for the same validator state.
const statusLine = (
  state: BondHealthState,
  coverage: BondCoverage,
  bondRiskFeeSol: number,
  minBondBalanceSol: number,
  bondBalanceSol: number,
  expectedStakeDeltaSol: number,
): CardStatus => {
  // Soft bond is advisory. When stake is already arriving the canonical
  // "top up to grow stake" reads as a contradiction next to the +N SOL on
  // the Stake card. The truthful banner here is the inflow line — the
  // ideal top-up still shows in the section table below for users who
  // want to lift the ceiling.
  if (state === 'soft' && expectedStakeDeltaSol > 0) {
    return {
      label: `${stake(expectedStakeDeltaSol)} arriving next epoch — bond covers it.`,
      tone: 'green',
    }
  }
  const advice = bondAdvice(
    coverage,
    state,
    bondRiskFeeSol,
    minBondBalanceSol,
    bondBalanceSol,
  )
  return { label: advice.text, tone: advice.tone }
}

export const BondCoverageBreakdown: React.FC<Props> = ({
  title,
  guideTo,
  coverage,
  bondState,
  bondRiskFeeSol,
  bondBalanceSol,
  minBondBalanceSol,
  expectedStakeDeltaSol = 0,
  isSimulated,
  onGoToSim,
}) => {
  const baseStatus = statusLine(
    bondState,
    coverage,
    bondRiskFeeSol,
    minBondBalanceSol,
    bondBalanceSol,
    expectedStakeDeltaSol,
  )
  const status: CardStatus = onGoToSim
    ? {
        ...baseStatus,
        action: { label: 'Simulate →', tone: 'yellow', onClick: onGoToSim },
      }
    : baseStatus

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

  return (
    <CalcCard
      title={title}
      guideTo={guideTo}
      isSimulated={isSimulated}
      status={status}
    >
      <table className="w-full max-w-[34rem]">
        <tbody>
          {showRiskSection && (
            <>
              <SectionHeader
                title="Bond risk fee"
                help="The fee starts when your claimable bond falls below the trigger threshold. Below: the threshold and its parts, the bond it is measured against, and the top-up that clears it."
              />
              {coverage.carriedPaidUndelegationSol > 0 && (
                <>
                  <CalcRow
                    label="Paid undelegation pending"
                    help="Stake the protocol has already decided to pull back from this validator next epoch. It still counts as exposed today, but the projected threshold below subtracts it."
                    col1={stake(coverage.carriedPaidUndelegationSol)}
                  />
                  <CalcRow
                    label="Projected exposed stake"
                    help="Current exposed stake minus the paid undelegation already scheduled. The penalty threshold uses this projected stake, not today's stake."
                    col1={stake(coverage.projectedExposedStakeSol)}
                  />
                </>
              )}
              <CalcRow
                label="Minimum unprotected reserve"
                help="A fixed reserve included in the trigger threshold on top of the stake-sized requirement. Below the threshold, the fee fires."
                col2={bondSol(coverage.minUnprotectedReserveSol)}
              />
              <CalcRow
                label="Minimum bond on projected stake"
                help="Projected exposed stake times the minimum bond rate — the stake-sized part of the threshold."
                col2={bondSol(
                  coverage.floorBaseProjected -
                    coverage.minUnprotectedReserveSol,
                )}
              />
              <CalcRow
                label="Penalty trigger threshold"
                help="Threshold where bond risk fee starts: reserve plus required bond."
                col2={bondSol(coverage.floorBaseProjected)}
                bold
              />
              <CalcRow
                label="Claimable bond balance"
                help="The bond the protocol can draw against right now. The fee triggers when this falls below the threshold above."
                col2={bondSol(coverage.claimableBondBalanceSol)}
                bold
              />
              {coverage.topUpToAvoidFee > 0 && (
                <CalcRow
                  label="Top up to avoid the fee"
                  col2={topUp(coverage.topUpToAvoidFee)}
                  total
                  severity="error"
                />
              )}
              {bondRiskFeeSol > 0 && (
                <CalcRow
                  label="Estimated bond risk fee this epoch"
                  help="Charged when the bond is below the threshold. The amount scales with the shortfall and the protocol's bond-risk rate."
                  col2={bondSol(bondRiskFeeSol)}
                  bold
                  severity="error"
                />
              )}
              {coverage.topUpToAvoidFee === 0 && bondRiskFeeSol === 0 && (
                <OkRow message="Claimable bond is above the penalty threshold." />
              )}
            </>
          )}

          <SectionHeader
            title="Rates"
            help="Two per-epoch rates that size the bond. The bid rate is what winners pay this epoch. The rewards rate is what your validator hands stakers from its own block rewards. Both are quoted per 1000 SOL of stake."
            unit="PMPE"
          />
          <CalcRow
            label="Expected max effective bid"
            help="The highest per-epoch bid winners are expected to pay this epoch. The bond must hold enough to cover this rate against your stake."
            col2={pmpe(coverage.expectedMaxEffBidPmpe)}
          />
          <CalcRow
            label="On-chain distributed rewards"
            help="The rewards your validator pays stakers directly each epoch. The bond must hold enough to make stakers whole if you ever skip this payout."
            col2={pmpe(coverage.onchainDistributedPmpe)}
          />

          <SectionHeader
            title={`Minimum bond to keep stake — ${coverage.minEp} epochs`}
            help={`What the bond needs to keep your stake for the next ${coverage.minEp} epochs. Fall short and the protocol pulls stake back to a size your bond can cover.`}
          />
          <CalcRow
            label="Claimable bond balance"
            help="The bond SOL the protocol can draw against right now to cover fees or shortfalls. Excludes amounts locked in pending operations."
            col2={bondSol(coverage.claimableBondBalanceSol)}
            bold
          />
          <CalcRow
            label="Active Marinade stake"
            col1={stake(coverage.marinadeActivatedStakeSol)}
          />
          <CalcRow
            label="Current exposed stake"
            col1={stake(coverage.currentExposedStakeSol)}
          />
          <CalcRow
            label="Bond held for bid payments"
            help="Bid times exposed stake over the covered window, plus a fixed reserve for the unprotected slice."
            col2={bondSol(coverage.heldForBidKeep)}
          />
          <CalcRow
            label="Bond held for reward payouts"
            help="One epoch of stakers' rewards, reserved so the bid-payments slice stays untouched if a payout is missed."
            col2={bondSol(coverage.rewardsGuaranteeKeep)}
          />
          <CalcRow
            label="Minimum bond required"
            col2={bondSol(coverage.floorBaseKeep)}
            bold
          />
          {coverage.topUpToKeepStake > 0 ? (
            <CalcRow
              label="Top up to keep your stake"
              col2={topUp(coverage.topUpToKeepStake)}
              total
              severity="warning"
            />
          ) : (
            <OkRow message="Bond covers current stake." />
          )}

          <SectionHeader
            title={`Ideal bond to grow stake — ${coverage.idealEp} epochs`}
            help={
              'What the bond needs for the pool to feel comfortable giving you more stake.'
            }
          />
          <CalcRow
            label="Bond balance"
            col2={bondSol(coverage.bondBalanceSol)}
            bold
          />
          <CalcRow
            label="Current exposed stake"
            col1={stake(coverage.currentExposedStakeSol)}
          />
          <CalcRow
            label="Bond held for bid payments"
            help="Bid times exposed stake over the longer ideal window, plus a fixed reserve for the unprotected slice."
            col2={bondSol(coverage.heldForBidIdeal)}
          />
          <CalcRow
            label="Bond held for reward payouts"
            help="One epoch of stakers' rewards — currently the same size as the keep-stake reserve (see bugs.md #1: the ideal reserve isn't yet scaled to the ideal window)."
            col2={bondSol(coverage.rewardsGuaranteeIdeal)}
          />
          <CalcRow
            label="Ideal bond required"
            col2={bondSol(coverage.requiredIdealKeep)}
            bold
          />
          {coverage.topUpToIdealKeep > 0 ? (
            <CalcRow
              label="Top up to grow stake"
              col2={topUp(coverage.topUpToIdealKeep)}
              total
              severity="warning"
            />
          ) : (
            <OkRow message="Bond meets ideal coverage." />
          )}
        </tbody>
      </table>
    </CalcCard>
  )
}
