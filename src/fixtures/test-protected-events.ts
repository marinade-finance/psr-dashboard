import type { ProtectedEventWithValidator } from 'src/services/validator-with-protected_event'

import type { Validator } from 'src/services/validators'

const SOL = 1_000_000_000

function makeValidator(voteAccount: string, name: string): Validator {
  return {
    vote_account: voteAccount,
    info_name: name,
    dc_country_iso: 'US',
    marinade_stake: String(50_000 * SOL),
    marinade_native_stake: '0',
    activated_stake: String(50_000 * SOL),
    epoch_stats: [],
  }
}

const va = Array.from(
  { length: 10 },
  (_, i) =>
    `PsrTest${String(i + 1).padStart(2, '0')}111111111111111111111111111111111111111`,
)

const validators = va.map((v, i) => makeValidator(v, `PSR Validator ${i + 1}`))

export const TEST_PROTECTED_EVENTS: ProtectedEventWithValidator[] = [
  // CommissionIncrease — FACT — ValidatorBond
  {
    status: 'fact',
    protectedEvent: {
      epoch: 695,
      amount: 12.5 * SOL,
      vote_account: va[0],
      meta: { funder: 'ValidatorBond' },
      reason: {
        ProtectedEvent: {
          CommissionIncrease: {
            vote_account: va[0],
            previous_commission: 5,
            current_commission: 10,
            expected_epr: 0.065,
            actual_epr: 0.06,
            epr_loss_bps: 50,
            stake: 50_000 * SOL,
          },
        },
      },
    },
    validator: validators[0],
  },
  // LowCredits — FACT — Marinade
  {
    status: 'fact',
    protectedEvent: {
      epoch: 695,
      amount: 8.3 * SOL,
      vote_account: va[1],
      meta: { funder: 'Marinade' },
      reason: {
        ProtectedEvent: {
          LowCredits: {
            vote_account: va[1],
            expected_credits: 432_000,
            actual_credits: 380_000,
            commission: 5,
            expected_epr: 0.065,
            actual_epr: 0.057,
            epr_loss_bps: 80,
            stake: 50_000 * SOL,
          },
        },
      },
    },
    validator: validators[1],
  },
  // DowntimeRevenueImpact — FACT — ValidatorBond
  {
    status: 'fact',
    protectedEvent: {
      epoch: 696,
      amount: 3.1 * SOL,
      vote_account: va[2],
      meta: { funder: 'ValidatorBond' },
      reason: {
        ProtectedEvent: {
          DowntimeRevenueImpact: {
            vote_account: va[2],
            expected_credits: 432_000,
            actual_credits: 410_000,
            commission: 5,
            expected_epr: 0.065,
            actual_epr: 0.062,
            epr_loss_bps: 30,
            stake: 50_000 * SOL,
          },
        },
      },
    },
    validator: validators[2],
  },
  // CommissionSamIncrease — FACT — Marinade
  {
    status: 'fact',
    protectedEvent: {
      epoch: 696,
      amount: 5.7 * SOL,
      vote_account: va[3],
      meta: { funder: 'Marinade' },
      reason: {
        ProtectedEvent: {
          CommissionSamIncrease: {
            vote_account: va[3],
            expected_inflation_commission: 0.05,
            actual_inflation_commission: 0.08,
            expected_mev_commission: 0.05,
            actual_mev_commission: 0.05,
            expected_epr: 0.065,
            actual_epr: 0.061,
            epr_loss_bps: 40,
            stake: 50_000 * SOL,
          },
        },
      },
    },
    validator: validators[3],
  },
  // Bidding — FACT
  {
    status: 'fact',
    protectedEvent: {
      epoch: 697,
      amount: 22.4 * SOL,
      vote_account: va[4],
      meta: { funder: 'ValidatorBond' },
      reason: 'Bidding',
    },
    validator: validators[4],
  },
  // BidTooLowPenalty — FACT
  {
    status: 'fact',
    protectedEvent: {
      epoch: 697,
      amount: 1.8 * SOL,
      vote_account: va[5],
      meta: { funder: 'Marinade' },
      reason: 'BidTooLowPenalty',
    },
    validator: validators[5],
  },
  // BlacklistPenalty — FACT
  {
    status: 'fact',
    protectedEvent: {
      epoch: 698,
      amount: 4.2 * SOL,
      vote_account: va[6],
      meta: { funder: 'Marinade' },
      reason: 'BlacklistPenalty',
    },
    validator: validators[6],
  },
  // BondRiskFee — FACT
  {
    status: 'fact',
    protectedEvent: {
      epoch: 698,
      amount: 0.5 * SOL,
      vote_account: va[7],
      meta: { funder: 'ValidatorBond' },
      reason: 'BondRiskFee',
    },
    validator: validators[7],
  },
  // ESTIMATE (current epoch)
  {
    status: 'estimate',
    protectedEvent: {
      epoch: 700,
      amount: 7.9 * SOL,
      vote_account: va[8],
      meta: { funder: 'ValidatorBond' },
      reason: {
        ProtectedEvent: {
          LowCredits: {
            vote_account: va[8],
            expected_credits: 432_000,
            actual_credits: 350_000,
            commission: 7,
            expected_epr: 0.065,
            actual_epr: 0.054,
            epr_loss_bps: 110,
            stake: 50_000 * SOL,
          },
        },
      },
    },
    validator: validators[8],
  },
  // DRYRUN (historical)
  {
    status: 'dryrun',
    protectedEvent: {
      epoch: 605,
      amount: 2.1 * SOL,
      vote_account: va[9],
      meta: { funder: 'Marinade' },
      reason: {
        ProtectedEvent: {
          CommissionIncrease: {
            vote_account: va[9],
            previous_commission: 0,
            current_commission: 5,
            expected_epr: 0.07,
            actual_epr: 0.065,
            epr_loss_bps: 50,
            stake: 50_000 * SOL,
          },
        },
      },
    },
    validator: validators[9],
  },
  // Unknown validator (null)
  {
    status: 'fact',
    protectedEvent: {
      epoch: 699,
      amount: 0.9 * SOL,
      vote_account: 'UnknownValidator1111111111111111111111111111',
      meta: { funder: 'Marinade' },
      reason: 'BondRiskFee',
    },
    validator: null,
  },
]
