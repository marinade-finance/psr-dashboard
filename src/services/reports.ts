export type ReportValidator = {
  validatorVoteAccount: string
  totalAmountStakedLamports: number
  totalStakeDeltaLamports: number
  operationsCount: number
  successfulOperations: number
  failedOperations: number
}

export type ReportSection = {
  fromEpoch: number
  toEpoch: number
  lastReportTimestampUnix: number
  totalStakeDeltaLamports: number
  totalStakedLamports: number
  reserveBalanceBeforeLamports: number
  totalReportRuns: number
  totalTransactionsProcessed: number
  totalTransactionsOk: number
  totalTransactionsErr: number
  validators: ReportValidator[]
}

export type ReportsSummary = {
  fromEpoch: number
  toEpoch: number
  stakes: ReportSection | null
  unstakes: ReportSection | null
}

export type ValidatorStakeChange = {
  stakedLamports: number
  unstakedLamports: number
  netLamports: number
}

const REPORTS_SUMMARY_URL =
  'https://scoring.marinade.finance/api/v1/reports/summary'

export const fetchReportsSummary = async (): Promise<{
  stakeChanges: Map<string, ValidatorStakeChange>
  fromEpoch: number
  toEpoch: number
}> => {
  // First call to discover current epoch
  const latestRes = await fetch(REPORTS_SUMMARY_URL)
  const latest: ReportsSummary = (await latestRes.json()) as ReportsSummary
  const currentEpoch = latest.toEpoch

  // Fetch covering last 2 epochs if the default only returned one
  let summary = latest
  if (latest.fromEpoch === latest.toEpoch) {
    const res = await fetch(
      `${REPORTS_SUMMARY_URL}?fromEpoch=${currentEpoch - 1}&toEpoch=${currentEpoch}`,
    )
    summary = (await res.json()) as ReportsSummary
  }

  return processReportsSummary(summary)
}

const processReportsSummary = (
  summary: ReportsSummary,
): {
  stakeChanges: Map<string, ValidatorStakeChange>
  fromEpoch: number
  toEpoch: number
} => {
  const stakeChanges = new Map<string, ValidatorStakeChange>()

  if (summary.stakes) {
    for (const v of summary.stakes.validators) {
      const existing = stakeChanges.get(v.validatorVoteAccount) ?? {
        stakedLamports: 0,
        unstakedLamports: 0,
        netLamports: 0,
      }
      existing.stakedLamports += v.totalStakeDeltaLamports
      existing.netLamports = existing.stakedLamports - existing.unstakedLamports
      stakeChanges.set(v.validatorVoteAccount, existing)
    }
  }

  if (summary.unstakes) {
    for (const v of summary.unstakes.validators) {
      const existing = stakeChanges.get(v.validatorVoteAccount) ?? {
        stakedLamports: 0,
        unstakedLamports: 0,
        netLamports: 0,
      }
      existing.unstakedLamports += v.totalStakeDeltaLamports
      existing.netLamports = existing.stakedLamports - existing.unstakedLamports
      stakeChanges.set(v.validatorVoteAccount, existing)
    }
  }

  return {
    stakeChanges,
    fromEpoch: summary.fromEpoch,
    toEpoch: summary.toEpoch,
  }
}
