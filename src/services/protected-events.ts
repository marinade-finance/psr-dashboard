import { formatPercentage, formatSolAmount, lamportsToSol } from "src/format"

export type SettlementFunder = 'ValidatorBond' | 'Marinade'

export type SettlementMeta = {
    funder: SettlementFunder
}

export namespace SettlementReason {
    export namespace ProtectedEvent {
        export type CommissionSamIncreaseReason = {
            vote_account: string,
            actual_inflation_commission: number,
            expected_inflation_commission: number,
            actual_mev_commission: number,
            expected_mev_commission: number,
            expected_epr: number,
            actual_epr: number,
            epr_loss_bps: number,
            stake: number,
        }
        export type CommissionIncrease = {
            vote_account: string,
            previous_commission: number,
            current_commission: number,
            expected_epr: number,
            actual_epr: number,
            epr_loss_bps: number,
            stake: number,
        }
        export type LowCredits = {
            vote_account: string,
            expected_credits: number,
            actual_credits: number,
            commission: number,
            expected_epr: number,
            actual_epr: number,
            epr_loss_bps: number,
            stake: number,
        }
    }

    export type CommissionIncreaseReason = { CommissionIncrease: ProtectedEvent.CommissionIncrease }
    export type LowCreditsReason = { LowCredits: ProtectedEvent.LowCredits }
    export type DowntimeRevenueImpactReason = { DowntimeRevenueImpact: ProtectedEvent.LowCredits }
    export type CommissionSamIncreaseReason = { CommissionSamIncrease: ProtectedEvent.CommissionSamIncreaseReason }
    export type ProtectedEventReason = CommissionIncreaseReason | LowCreditsReason | DowntimeRevenueImpactReason | CommissionSamIncreaseReason

    export const isCommissionIncreaseReason = (e: ProtectedEventReason): e is CommissionIncreaseReason => 'CommissionIncrease' in (e as any)
    export const isLowCreditsReason = (e: ProtectedEventReason): e is LowCreditsReason => 'LowCredits' in (e as any)
    export const isDowntimeRevenueImpactReason = (e: ProtectedEventReason): e is DowntimeRevenueImpactReason => 'DowntimeRevenueImpact' in (e as any)
    export const isCommissionSamIncreaseReason = (e: ProtectedEventReason): e is CommissionSamIncreaseReason => 'CommissionSamIncrease' in (e as any)
}
export type SettlementReason = { ProtectedEvent: SettlementReason.ProtectedEventReason }

export type ProtectedEvent = {
    epoch: number
    amount: number
    vote_account: string,
    meta: SettlementMeta,
    reason: SettlementReason,
}

export type ProtectedEventsResponse = {
    protected_events: ProtectedEvent[]
}

export const selectProtectedStakeReason = (protectedEvent: ProtectedEvent) => {
    const reason = protectedEvent.reason.ProtectedEvent
    if (SettlementReason.isCommissionIncreaseReason(reason)) {
        return `Commission ${reason.CommissionIncrease.previous_commission}% -> ${reason.CommissionIncrease.current_commission}%`
    }
    if (SettlementReason.isCommissionSamIncreaseReason(reason)) {
        return `Inflation Commission ${reason.CommissionSamIncrease.expected_inflation_commission * 100}% -> ${reason.CommissionSamIncrease.actual_inflation_commission * 100}%; MEV Commission ${reason.CommissionSamIncrease.expected_mev_commission * 100}% -> ${reason.CommissionSamIncrease.actual_mev_commission * 100}%`
    }
    if (SettlementReason.isLowCreditsReason(reason)) {
        return `Uptime ${formatPercentage(reason.LowCredits.actual_credits / reason.LowCredits.expected_credits)}`
    }
    if (SettlementReason.isDowntimeRevenueImpactReason(reason)) {
        return `Uptime ${formatPercentage(reason.DowntimeRevenueImpact.actual_credits / reason.DowntimeRevenueImpact.expected_credits)}`
    }
    console.log('unsupported event:', protectedEvent)
    return 'Unsupported'
}

export const selectEprLossBps = (protectedEvent: ProtectedEvent) => {
    const reason = protectedEvent.reason.ProtectedEvent
    if (SettlementReason.isCommissionIncreaseReason(reason)) {
        // return reason.CommissionIncrease.epr_loss_bps
        return 10000 - 10000 * (100 - reason.CommissionIncrease.current_commission) / (100 - reason.CommissionIncrease.previous_commission)
    }
    if (SettlementReason.isLowCreditsReason(reason)) {
        return reason.LowCredits.epr_loss_bps
    }
    return 0
}

export const selectAmount = (protectedEvent: ProtectedEvent) => Number(protectedEvent.amount / 1e9)

export const fetchProtectedEvents = async (): Promise<ProtectedEventsResponse> => {
    const res = await fetch("https://validator-bonds-api.marinade.finance/protected-events");
    return res.json();
};
