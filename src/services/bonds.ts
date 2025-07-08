import { lamportsToSol } from "src/format";

export type BondRecord = {
    pubkey: string,
    vote_account: string,
    authority: string,
    cpmpe: number,
    updated_at: string,
    epoch: number,
    funded_amount: number,
    effective_amount: number,
    max_stake_wanted: number,
    remaining_witdraw_request_amount: number,
    remainining_settlement_claim_amount: number,
}

export const selectEffectiveAmount = (bond: BondRecord) => Number(lamportsToSol(bond.effective_amount.toString()))

export type BondsResponse = {
    bonds: BondRecord[]
}

export const fetchBonds = async (): Promise<BondsResponse> => {
    const res = await fetch("https://validator-bonds-api.marinade.finance/bonds");
    return res.json();
};
