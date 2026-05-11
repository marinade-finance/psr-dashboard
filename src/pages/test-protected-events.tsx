import React from 'react'

import { Navigation } from 'src/components/navigation/navigation'
import { ProtectedEventsTable } from 'src/components/protected-events-table/protected-events-table'
import { TEST_PROTECTED_EVENTS } from 'src/fixtures/test-protected-events'

import type { UserLevel } from 'src/components/navigation/navigation'

type Props = {
  level: UserLevel
}

export const TestProtectedEventsPage: React.FC<Props> = ({ level }) => (
  <div className="min-h-screen bg-background-page">
    <Navigation level={level} />
    <div className="px-4 py-6 max-w-[1920px] mx-auto">
      <ProtectedEventsTable data={TEST_PROTECTED_EVENTS} level={level} />
    </div>
  </div>
)
