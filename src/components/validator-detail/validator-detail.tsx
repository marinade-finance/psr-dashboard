import React, { useMemo, useState } from 'react'

import { HelpTip } from 'src/components/help-tip/help-tip'
import { formatPercentage, formatSolAmount } from 'src/format'
import { HELP_TEXT } from 'src/services/help-text'
import { selectVoteAccount, selectWinningAPY } from 'src/services/sam'
import {
  getApyBreakdown,
  getBondHealth,
  getBondHealthStyle,
  getValidatorTip,
  getTipStyle,
  calculateBondUtilization,
  formatStakeDelta,
} from 'src/services/tip-engine'

import styles from './validator-detail.module.css'

import type {
  AuctionResult,
  AuctionValidator,
  DsSamConfig,
} from '@marinade.finance/ds-sam-sdk'

interface ValidatorDetailProps {
  validator: AuctionValidator
  auctionResult: AuctionResult
  dsSamConfig: DsSamConfig
  epochsPerYear: number
  rank: number
  totalValidators: number
  onClose: () => void
  onSimulate: (
    inflationCommission: number | null,
    mevCommission: number | null,
    blockRewardsCommission: number | null,
    bidPmpe: number | null,
  ) => void
  isCalculating: boolean
}

export const ValidatorDetail = ({
  validator,
  auctionResult,
  dsSamConfig: _dsSamConfig,
  epochsPerYear,
  rank,
  totalValidators,
  onClose,
  onSimulate,
  isCalculating,
}: ValidatorDetailProps) => {
  const winningApy = selectWinningAPY(auctionResult, epochsPerYear)
  const apyBreakdown = getApyBreakdown(validator, epochsPerYear)
  const bondUtilPct = calculateBondUtilization(validator)
  const bondRunway = validator.bondGoodForNEpochs ?? 0
  const bondHealth = getBondHealth(bondUtilPct, bondRunway)
  const healthStyle = getBondHealthStyle(bondHealth)
  const tip = getValidatorTip(validator, winningApy, epochsPerYear)
  const tipStyle = getTipStyle(tip.urgency)
  const delta = formatStakeDelta(validator)

  const inSet = validator.auctionStake.marinadeSamTargetSol > 0
  const currentMaxApy = apyBreakdown.total

  const [editBid, setEditBid] = useState(validator.revShare.bidPmpe.toString())
  const [editInflation, setEditInflation] = useState(
    (validator.inflationCommissionDec * 100).toString(),
  )
  const [editMev, setEditMev] = useState(
    validator.mevCommissionDec !== null
      ? (validator.mevCommissionDec * 100).toString()
      : '',
  )
  const [editBlock, setEditBlock] = useState(
    validator.blockRewardsCommissionDec !== null
      ? (validator.blockRewardsCommissionDec * 100).toString()
      : '',
  )

  const handleRunSimulation = () => {
    const bidValue = parseFloat(editBid)
    const inflationValue = parseFloat(editInflation) / 100
    const mevValue = editMev ? parseFloat(editMev) / 100 : null
    const blockValue = editBlock ? parseFloat(editBlock) / 100 : null

    onSimulate(
      !isNaN(inflationValue) ? inflationValue : null,
      mevValue,
      blockValue,
      !isNaN(bidValue) ? bidValue : null,
    )
  }

  const constraintText = useMemo(() => {
    if (!inSet) {
      const gap = (winningApy - currentMaxApy).toFixed(2)
      return `APY ${gap}% below winning threshold`
    }
    return (
      validator.lastCapConstraint?.constraintName || 'Meeting all constraints'
    )
  }, [validator, inSet, winningApy, currentMaxApy])

  const positionPct = inSet
    ? ((totalValidators - rank + 1) / totalValidators) * 100
    : 0

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.rank}>#{rank}</span>
            <span className={styles.voteAccount}>
              {selectVoteAccount(validator).slice(0, 12)}...
            </span>
            <span
              className={styles.statusBadge}
              style={{
                background: inSet
                  ? 'var(--primary-light)'
                  : 'var(--destructive-light)',
                color: inSet ? 'var(--primary)' : 'var(--destructive)',
              }}
            >
              {inSet ? 'In Set' : 'Out of Set'}
            </span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.leftColumn}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Why Rank #{rank}?
                <HelpTip text="The primary constraint limiting your stake allocation. Improving this metric will improve your rank." />
              </h3>
              <p className={styles.constraintText}>{constraintText}</p>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Position vs Winning APY
                <HelpTip text={HELP_TEXT.winningApy} />
              </h3>
              <div className={styles.gaugeContainer}>
                <div className={styles.gaugeBar}>
                  <div
                    className={styles.gaugeFill}
                    style={{ width: `${Math.min(positionPct, 100)}%` }}
                  />
                  <div
                    className={styles.gaugeLine}
                    style={{
                      left: `${(winningApy / (winningApy * 1.5)) * 100}%`,
                    }}
                  />
                </div>
                <div className={styles.gaugeLabels}>
                  <span>0%</span>
                  <span className={styles.winningLabel}>
                    Winning: {formatPercentage(winningApy, 2)}
                  </span>
                  <span>You: {formatPercentage(currentMaxApy, 2)}</span>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                APY Composition
                <HelpTip text={HELP_TEXT.maxApy} />
              </h3>
              <div className={styles.apyBar}>
                <div
                  className={styles.apySegment}
                  style={{
                    width: `${(apyBreakdown.inflation / apyBreakdown.total) * 100}%`,
                    background: 'var(--chart-1)',
                  }}
                  title={`Inflation: ${formatPercentage(apyBreakdown.inflation, 2)}`}
                />
                <div
                  className={styles.apySegment}
                  style={{
                    width: `${(apyBreakdown.mev / apyBreakdown.total) * 100}%`,
                    background: 'var(--chart-2)',
                  }}
                  title={`MEV: ${formatPercentage(apyBreakdown.mev, 2)}`}
                />
                <div
                  className={styles.apySegment}
                  style={{
                    width: `${(apyBreakdown.blockRewards / apyBreakdown.total) * 100}%`,
                    background: 'var(--chart-3)',
                  }}
                  title={`Block Rewards: ${formatPercentage(apyBreakdown.blockRewards, 2)}`}
                />
                <div
                  className={styles.apySegment}
                  style={{
                    width: `${(apyBreakdown.stakeBid / apyBreakdown.total) * 100}%`,
                    background: 'var(--chart-4)',
                  }}
                  title={`Stake Bid: ${formatPercentage(apyBreakdown.stakeBid, 2)}`}
                />
              </div>
              <div className={styles.apyLegend}>
                <span>
                  <span
                    className={styles.dot}
                    style={{ background: 'var(--chart-1)' }}
                  />
                  Inflation {formatPercentage(apyBreakdown.inflation, 2)}
                </span>
                <span>
                  <span
                    className={styles.dot}
                    style={{ background: 'var(--chart-2)' }}
                  />
                  MEV {formatPercentage(apyBreakdown.mev, 2)}
                </span>
                <span>
                  <span
                    className={styles.dot}
                    style={{ background: 'var(--chart-3)' }}
                  />
                  Blocks {formatPercentage(apyBreakdown.blockRewards, 2)}
                </span>
                <span>
                  <span
                    className={styles.dot}
                    style={{ background: 'var(--chart-4)' }}
                  />
                  Bid {formatPercentage(apyBreakdown.stakeBid, 2)}
                </span>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Next Step
                <HelpTip text="Actionable recommendation based on your current position and constraints." />
              </h3>
              <div
                className={styles.tipCard}
                style={{
                  background: tipStyle.bg,
                  borderLeftColor: tipStyle.color,
                }}
              >
                <span className={styles.tipIcon}>{tipStyle.icon}</span>
                <span className={styles.tipText}>{tip.text}</span>
              </div>
            </div>
          </div>

          <div className={styles.rightColumn}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                What-If Simulation
                <HelpTip text={HELP_TEXT.simulation} />
              </h3>
              <div className={styles.simForm}>
                <div className={styles.simField}>
                  <label>Stake Bid (PMPE)</label>
                  <input
                    type="number"
                    value={editBid}
                    onChange={e => setEditBid(e.target.value)}
                    step="0.001"
                    min="0"
                  />
                </div>
                <div className={styles.simField}>
                  <label>Inflation Commission %</label>
                  <input
                    type="number"
                    value={editInflation}
                    onChange={e => setEditInflation(e.target.value)}
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </div>
                <div className={styles.simField}>
                  <label>MEV Commission %</label>
                  <input
                    type="number"
                    value={editMev}
                    onChange={e => setEditMev(e.target.value)}
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="N/A"
                  />
                </div>
                <div className={styles.simField}>
                  <label>Block Rewards Commission %</label>
                  <input
                    type="number"
                    value={editBlock}
                    onChange={e => setEditBlock(e.target.value)}
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="N/A"
                  />
                </div>
                <button
                  className={styles.simButton}
                  onClick={handleRunSimulation}
                  disabled={isCalculating}
                >
                  {isCalculating ? 'Simulating...' : 'Run Simulation'}
                </button>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Bond Health
                <HelpTip text={HELP_TEXT.bondHealth} />
              </h3>
              <div className={styles.bondCard}>
                <div className={styles.bondHeader}>
                  <span
                    className={styles.bondStatus}
                    style={{
                      color: healthStyle.color,
                      background: healthStyle.bg,
                    }}
                  >
                    {healthStyle.label}
                  </span>
                  <span className={styles.bondBalance}>
                    {formatSolAmount(validator.bondBalanceSol, 0)} SOL
                  </span>
                </div>
                <div className={styles.bondMetrics}>
                  <div className={styles.bondMetric}>
                    <span className={styles.bondMetricLabel}>Utilization</span>
                    <span className={styles.bondMetricValue}>
                      {bondUtilPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className={styles.bondMetric}>
                    <span className={styles.bondMetricLabel}>Runway</span>
                    <span className={styles.bondMetricValue}>
                      {bondRunway} epochs
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Stake Overview</h3>
              <div className={styles.stakeMetrics}>
                <div className={styles.stakeMetric}>
                  <span className={styles.stakeLabel}>Active Stake</span>
                  <span className={styles.stakeValue}>
                    {formatSolAmount(validator.marinadeActivatedStakeSol, 0)}
                  </span>
                </div>
                <div className={styles.stakeMetric}>
                  <span className={styles.stakeLabel}>Target Stake</span>
                  <span className={styles.stakeValue}>
                    {formatSolAmount(
                      validator.auctionStake.marinadeSamTargetSol,
                      0,
                    )}
                  </span>
                </div>
                <div className={styles.stakeMetric}>
                  <span className={styles.stakeLabel}>Stake Delta</span>
                  <span
                    className={styles.stakeValue}
                    style={{ color: delta.color }}
                  >
                    {delta.arrow} {delta.text}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
