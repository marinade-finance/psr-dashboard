# ds-sam-sdk changes

```
export class DsSamSDK {
  readonly config: DsSamConfig
  private readonly debug: Debug
  private readonly dataProvider: DataProvider

  constructor (config: Partial<DsSamConfig> = {}, dataProviderBuilder = defaultDataProviderBuilder) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    DsSamSDK.validateConfig(this.config)
    this.dataProvider = dataProviderBuilder(this.config)
    this.debug = new Debug(new Set(this.config.debugVoteAccounts))
  }

...
  async auction (dataOverrides: SourceDataOverrides | null = null): Promise<Auction> {
    const aggregatedData = await this.getAggregatedData(dataOverrides)
    const constraints = this.getAuctionConstraints(aggregatedData, this.debug)
    const auctionData: AuctionData = {
      ...aggregatedData,
      validators: this.transformValidators(aggregatedData),
    }
    return new Auction(auctionData, constraints, this.config, this.debug)
  }

  async run (dataOverrides: SourceDataOverrides | null = null): Promise<AuctionResult> {
    const auction = await this.auction(dataOverrides)
    const result = auction.evaluate()
    console.log(`==============================\n${this.debug.formatInfo()}\n${this.debug.formatEvents()}\n==============================`)
    return result
  }

  async runFinalOnly (dataOverrides: SourceDataOverrides | null = null): Promise<AuctionResult> {
    const auction = await this.auction(dataOverrides)
    const result = auction.evaluateFinal()
    console.log(`==============================\n${this.debug.formatInfo()}\n${this.debug.formatEvents()}\n==============================`)
    return result
  }

  async getAggregatedData (dataOverrides: SourceDataOverrides | null = null): Promise<AggregatedData> {
    const sourceData = this.config.inputsSource === InputsSource.FILES ? this.dataProvider.parseCachedSourceData() : await this.dataProvider.fetchSourceData()
    return this.dataProvider.aggregateData(sourceData, dataOverrides)
  }
}

export type SourceDataOverrides = {
  inflationCommissions: Map<string, number>
  mevCommissions: Map<string, number>
  blockRewardsCommissions: Map<string, number>
  cpmpes: Map<string, number>
}
```

# PSR Dashboard changes

Check how `loadSam` is used from `src/services/sam.ts`
amd loaded for example at `fetchValidatorsWithBonds` in `src/services/validator-with-bond.ts`

Now the change should be within the `src/components/sam-table/sam-table.tsx`.
The idea is to add a button that shows a new data inputs on the page (no new page, no modal windows, just show/hide a new section on the same page).
That will be 'vote account' and setup bidPmpe and commission values for mev, inflation and block rewards.

When the user clicks 'Run SAM' button, those values should be passed to the `run` method of the `DsSamSDK` as `dataOverrides` parameter
for validator matching the vote account.
When a vote account that we have loaded already in the table is passed in then we show in the input fields the existing values for that validator (bid, commissions)

Commission is defined as

```
      const bond = data.bonds.bonds.find(({ vote_account }) => validator.vote_account === vote_account)
      const mev = data.mevInfo.validators.find(({ vote_account }) => validator.vote_account === vote_account)
      const override = data.overrides?.validators.find(({ voteAccount }) => validator.vote_account === voteAccount)

      const inflationCommissionOverride = dataOverrides?.inflationCommissions?.get(validator.vote_account)
      const mevCommissionOverride = dataOverrides?.mevCommissions?.get(validator.vote_account)
      const blockRewardsCommissionOverride = dataOverrides?.blockRewardsCommissions?.get(validator.vote_account)
      const bondCpmpeOverride = dataOverrides?.cpmpes?.get(validator.vote_account)

      const validatorMndeVotes = (validatorsMndeVotes.get(validator.vote_account) ?? new Decimal(0))
      const validatorMndeStakeCapIncrease = (mndeStakeCapIncreases.get(validator.vote_account) ?? new Decimal(0))

      const inflationCommissionOverrideDec = inflationCommissionOverride !== undefined ? inflationCommissionOverride / 100 : null
      const mevCommissionOverrideDec = mevCommissionOverride !== undefined ? mevCommissionOverride / 10_000 : null
      const blockRewardsCommissionOverrideDec = blockRewardsCommissionOverride !== undefined ? blockRewardsCommissionOverride / 10_000 : null
      const bidCpmpeOverrideDec = bondCpmpeOverride !== undefined ? bondCpmpeOverride / 1e9 : null

      const inflationCommissionInBondDec = bond?.inflation_commission_bps ? Number(bond.inflation_commission_bps) / 10_000 : null
      const mevCommissionInBondDec = bond?.mev_commission_bps ? Number(bond.mev_commission_bps) / 10_000 : null
      const blockRewardsCommissionInBondDec = bond?.block_commission_bps ? Number(bond.block_commission_bps) / 10_000 : null

      const inflationCommissionOnchainDec = (validator.commission_effective ?? validator.commission_advertised ?? 100) / 100
      const mevCommissionOnchainDec = mev ? mev.mev_commission_bps / 10_000 : null

      // data to be applied in calculation of rev share as it considers the overrides and bond commissions (note: it can be negative)
      let inflationCommissionDec = inflationCommissionOverrideDec ?? Math.min(inflationCommissionInBondDec ?? Infinity, inflationCommissionOnchainDec)
      let mevCommissionDec = mevCommissionOverrideDec ?? (mevCommissionInBondDec != null && mevCommissionInBondDec < (mevCommissionOnchainDec ?? 1)
        ? mevCommissionInBondDec
        : mevCommissionOnchainDec)
      let blockRewardsCommissionDec = blockRewardsCommissionOverrideDec ?? blockRewardsCommissionInBondDec

      const bidCpmpeDec = bidCpmpeOverrideDec ?? (bond ? new Decimal(bond.cpmpe).div(1e9).toNumber() : null)
```

This should be then defined as special method in ds-sam-sdk but for the first attempt we can just apply this logic to the dashboard codebase.
