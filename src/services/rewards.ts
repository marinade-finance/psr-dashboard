export type EpochRewards = [number, number]

export type RewardsResponse = {
    rewards_mev: EpochRewards[]
    rewards_inflation_est: EpochRewards[]
}

export const fetchRewards = async (): Promise<RewardsResponse> => {
    const res = await fetch(`https://validators-api.marinade.finance/rewards`);
    return res.json();
};
