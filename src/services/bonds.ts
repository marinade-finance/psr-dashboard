import { lamportsToSol } from "src/format";

export type BondRecord = {
    pubkey: string,
    vote_account: string,
    authority: string,
    cpmpe: string,
    updated_at: string,
    epoch: number,
    funded_amount: string,
    effective_amount: string,
    remaining_witdraw_request_amount: string,
    remainining_settlement_claim_amount: string,
}

export const selectEffectiveAmount = (bond: BondRecord) => Number(lamportsToSol(bond.effective_amount))
export const selectMaxProtectedStake = (bond: BondRecord) => Math.round(selectEffectiveAmount(bond) * 10_000)

export type BondsResponse = {
    bonds: BondRecord[]
}

export const fetchBonds = async (): Promise<BondsResponse> => {
    const res = await fetch("https://validator-bonds-api.marinade.finance/bonds");
    return res.json();
};
