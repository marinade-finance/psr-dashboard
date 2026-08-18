// Moved to @marinade.finance/ds-sam-calc — re-exported here so existing
// imports from 'src/services/calculations' keep resolving. The APY helpers that
// used to live here are gone: ts-common's pmpeToApy / apyFromPriceRatio take a
// real epoch duration rather than an epoch count, so callers annualize with those.
export {
  blockRewardsSharedFrac,
  bondGaugeScaleMax,
  bondGaugeCriticalFrac,
} from '@marinade.finance/ds-sam-calc'
