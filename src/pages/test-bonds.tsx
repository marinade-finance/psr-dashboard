import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useState } from 'react'

import { TEST_BONDS_DATA } from 'src/fixtures/test-bonds'
import { ValidatorBondsPage } from 'src/pages/validator-bonds'

import type { UserLevelProps } from 'src/components/navigation/navigation'

export const TestBondsPage: React.FC<UserLevelProps> = ({ level }) => {
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
    queryClient.setQueryData(['bonds'], TEST_BONDS_DATA)
    queryClient.setQueryData(['notifications-broadcast'], null)
    queryClient.setQueryData(['notifications-all', 'sam_auction'], undefined)
    return queryClient
  })
  return (
    <QueryClientProvider client={queryClient}>
      <ValidatorBondsPage level={level} />
    </QueryClientProvider>
  )
}
