// Regression guard for BOND_CHIP label mapping: soft tier must render "Adequate", not "OK".
// Tests bondCoverageLabel and BOND_CHIP display text per health tier.
import { describe, expect, it } from 'vitest'

import { bondCoverageLabel } from '../../validator-detail/validator-detail'
import { BOND_CHIP } from '../sam-table'

import type { BondCoverage } from 'src/services/bond-coverage'

// Regression: soft tier label was 'OK', which collided with the imperative
// "OK" mood (everything is fine) when the actual meaning is "bond covers the
// stake but is below the ideal coverage tier". Renamed to 'Adequate'.

describe("soft bond tier label is 'Adequate', not 'OK'", () => {
  it('sam-table BOND_CHIP soft label', () => {
    expect(BOND_CHIP.soft.label).toBe('Adequate')
    expect(BOND_CHIP.soft.label).not.toBe('OK')
  })

  it('validator-detail bondCoverageLabel: soft + no top-up → "Adequate"', () => {
    const coverage = {
      topUpToAvoidFee: 0,
      topUpToKeepStake: 0,
      topUpToIdealKeep: 0,
    } as unknown as BondCoverage
    expect(bondCoverageLabel('soft', coverage)).toBe('Adequate')
    expect(bondCoverageLabel('soft', coverage)).not.toBe('OK')
  })
})
