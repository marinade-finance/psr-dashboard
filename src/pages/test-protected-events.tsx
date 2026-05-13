import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'

import { TEST_PROTECTED_EVENTS } from 'src/fixtures/test-protected-events'
import { ProtectedEventsPage } from 'src/pages/protected-events'

import type { UserLevelProps } from 'src/components/navigation/navigation'

export const TestProtectedEventsPage: React.FC<UserLevelProps> = ({
  level,
}) => {
  const [client] = useState(() => {
    const c = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: Infinity,
          refetchInterval: false,
          refetchOnMount: false,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          retry: false,
        },
      },
    })
    c.setQueryData('protected-events', TEST_PROTECTED_EVENTS)
    c.setQueryData('notifications-broadcast', null)
    return c
  })
  return (
    <QueryClientProvider client={client}>
      <ProtectedEventsPage level={level} />
    </QueryClientProvider>
  )
}
