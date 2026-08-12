import type { NetworkConcentration } from 'src/services/cluster-stats'

// Network shares for /test-concentration. Names match the ASOs and countries
// in `test-validators.ts` so the comparison column actually joins, plus groups
// Marinade doesn't stake to (Amazon Web Services, Brazil) — real network data
// always covers groups outside the auction, and the table must not invent
// rows for them.
//
// Several fixture groups are deliberately absent here (Contabo GmbH on the
// ASO side; Finland / Czechia / Australia on the country side) so the "no
// network share" em-dash path stays covered on both dimensions.
export const TEST_NETWORK_CONCENTRATION: NetworkConcentration = {
  epoch: 1015,
  totalActivatedStakeSol: 434_931_020,
  shareByAso: new Map<string, number>([
    ['Teraswitch Networks Inc.', 0.2734],
    ['Latitude.sh', 0.1431],
    ['Cherry Servers', 0.131],
    ['Amazon Web Services', 0.0433],
    ['Hetzner Online GmbH', 0.0261],
    ['OVH SAS', 0.02],
    ['Google Cloud', 0.0155],
    ['Equinix', 0.0083],
    ['Vultr Holdings LLC', 0.0058],
  ]),
  shareByCountry: new Map<string, number>([
    ['Germany', 0.3291],
    ['Netherlands', 0.2],
    ['United States', 0.174],
    ['United Kingdom', 0.0658],
    ['Japan', 0.0552],
    ['Lithuania', 0.0457],
    ['Singapore', 0.0435],
    ['Brazil', 0.0052],
    ['France', 0.009],
  ]),
}
