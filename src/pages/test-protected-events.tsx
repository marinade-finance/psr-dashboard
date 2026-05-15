import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useState } from 'react'

import { TEST_PROTECTED_EVENTS } from 'src/fixtures/test-protected-events'
import { ProtectedEventsPage } from 'src/pages/protected-events'

import type { UserLevelProps } from 'src/components/navigation/navigation'

export const TestProtectedEventsPage: React.FC<UserLevelProps> = ({
  level,
}) => {
  const [queryClient] = useState(() => {
    const queryClient = new QueryClient({
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
    queryClient.setQueryData(['protected-events'], TEST_PROTECTED_EVENTS)
    queryClient.setQueryData(['notifications-broadcast'], null)
    return queryClient
  })
  return (
    <QueryClientProvider client={queryClient}>
      <ProtectedEventsPage level={level} />
    </QueryClientProvider>
  )
}
