import React, { useEffect, useRef } from 'react'

import styles from './sim-form.module.css'

import type { PendingEdits } from 'src/pages/sam'

type EditField = keyof PendingEdits

type FieldSpec = {
  field: EditField
  label: string
  step: string
  min?: string
  max?: string
}

const FIELDS: FieldSpec[] = [
  { field: 'bidPmpe', label: 'Bid PMPE', step: '0.001', min: '0' },
  {
    field: 'inflationCommissionPct',
    label: 'Inflation commission %',
    step: '0.1',
    min: '0',
    max: '100',
  },
  {
    field: 'mevCommissionPct',
    label: 'MEV commission %',
    step: '0.1',
    min: '0',
    max: '100',
  },
  {
    field: 'blockRewardsCommissionPct',
    label: 'Block-rewards commission %',
    step: '0.1',
    min: '0',
    max: '100',
  },
  { field: 'bondTopUpSol', label: 'Bond top-up Δ SOL', step: '1' },
]

type Props = {
  voteAccount: string
  name: string
  defaults: Record<EditField, string>
  pendingEdits: PendingEdits
  isCalculating: boolean
  onFieldChange: (field: EditField, value: string) => void
  onRunSimulation: () => void
  onCancelEditing: () => void
}

export const SimForm: React.FC<Props> = ({
  voteAccount,
  name,
  defaults,
  pendingEdits,
  isCalculating,
  onFieldChange,
  onRunSimulation,
  onCancelEditing,
}) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCancelEditing()
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onCancelEditing])

  const valFor = (f: EditField) => pendingEdits[f] ?? defaults[f]

  return (
    <div
      ref={ref}
      className={styles.popover}
      onClick={e => e.stopPropagation()}
    >
      <div className={styles.title}>Simulate validator</div>
      <div className={styles.identity}>
        <div className={styles.name}>{name || '—'}</div>
        <div className={styles.vote}>{voteAccount}</div>
      </div>
      {FIELDS.map(spec => (
        <div key={spec.field} className={styles.row}>
          <label htmlFor={`sim-${spec.field}`}>{spec.label}</label>
          <input
            id={`sim-${spec.field}`}
            type="number"
            step={spec.step}
            min={spec.min}
            max={spec.max}
            value={valFor(spec.field)}
            onChange={e => onFieldChange(spec.field, e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onRunSimulation()
              else if (e.key === 'Escape') onCancelEditing()
            }}
          />
        </div>
      ))}
      <div className={styles.buttons}>
        <button
          className={styles.cancelBtn}
          onClick={onCancelEditing}
          disabled={isCalculating}
        >
          Cancel
        </button>
        <button
          className={styles.simulateBtn}
          onClick={onRunSimulation}
          disabled={isCalculating}
        >
          {isCalculating ? 'Simulating' : 'Simulate'}
        </button>
      </div>
    </div>
  )
}
