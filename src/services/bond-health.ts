// Moved to @marinade.finance/ds-sam-calc — re-exported here so existing
// imports from 'src/services/bond-health' keep resolving.
export {
  bondHealthFromAuction,
  effectiveBondRunway,
  bondUtilizationPct,
  BOND_URGENT_EPOCHS,
  type BondHealthState,
} from '@marinade.finance/ds-sam-calc'
