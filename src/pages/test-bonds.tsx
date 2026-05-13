import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'

import { TEST_BONDS_DATA } from 'src/fixtures/test-bonds'
import { ValidatorBondsPage } from 'src/pages/validator-bonds'

import type { UserLevelProps } from 'src/components/navigation/navigation'

export const TestBondsPage: React.FC<UserLevelProps> = ({ level }) => {
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
    c.setQueryData('bonds', TEST_BONDS_DATA)
    c.setQueryData('notifications-broadcast', null)
    c.setQueryData(['notifications-all', 'sam_auction'], undefined)
    return c
  })
  return (
    <QueryClientProvider client={client}>
      <ValidatorBondsPage level={level} />
    </QueryClientProvider>
  )
}
