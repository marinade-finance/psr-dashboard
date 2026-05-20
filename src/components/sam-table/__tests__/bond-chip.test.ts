// Regression guard for BOND_CHIP label mapping: 4 tiers, no 'soft'/'Adequate'.
import { describe, expect, it } from 'vitest'

import { BOND_CHIP } from '../sam-table'

describe('BOND_CHIP covers exactly the 4 health tiers', () => {
  it('has no-bond tier', () => {
    expect(BOND_CHIP['no-bond'].label).toBe('No bond')
  })

  it('has critical tier (red)', () => {
    expect(BOND_CHIP.critical.label).toBe('Critical')
    expect(BOND_CHIP.critical.bar).toContain('destructive')
  })

  it('has watch tier (yellow)', () => {
    expect(BOND_CHIP.watch.label).toBe('Watch')
    expect(BOND_CHIP.watch.bar).toContain('warning')
  })

  it('has healthy tier (green)', () => {
    expect(BOND_CHIP.healthy.label).toBe('Healthy')
    expect(BOND_CHIP.healthy.bar).toContain('primary')
  })

  it('does not have a soft/Adequate tier', () => {
    expect(Object.keys(BOND_CHIP)).not.toContain('soft')
  })
})
