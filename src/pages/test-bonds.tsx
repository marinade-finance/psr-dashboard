import React from 'react'

import { Navigation } from 'src/components/navigation/navigation'
import { ValidatorBondsTable } from 'src/components/validator-bonds-table/validator-bonds-table'
import { TEST_BONDS_DATA } from 'src/fixtures/test-bonds'

import type { UserLevel } from 'src/components/navigation/navigation'

type Props = {
  level: UserLevel
}

export const TestBondsPage: React.FC<Props> = ({ level }) => (
  <div className="min-h-screen bg-background-page">
    <Navigation level={level} />
    <div className="px-4 py-6 max-w-[1920px] mx-auto">
      <ValidatorBondsTable data={TEST_BONDS_DATA} level={level} />
    </div>
  </div>
)
