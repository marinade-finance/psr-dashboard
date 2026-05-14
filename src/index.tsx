import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import TagManager from 'react-gtm-module'
import { QueryClient, QueryClientProvider } from 'react-query'
import {
  createBrowserRouter,
  RouterProvider,
  useRouteError,
} from 'react-router-dom'

import { UserLevel } from './components/navigation/navigation'
import { TooltipProvider } from './components/ui/tooltip'
import { DocsPage } from './pages/docs'
import { ProtectedEventsPage } from './pages/protected-events'
import { SamPage } from './pages/stake-auction-marketplace'
import { TestBondsPage } from './pages/test-bonds'
import { TestProtectedEventsPage } from './pages/test-protected-events'
import { TestSamPage } from './pages/test-stake-auction-marketplace'
import { ValidatorBondsPage } from './pages/validator-bonds'
import { loadSam } from './services/sam'
import { fetchValidatorsWithBonds } from './services/validator-with-bond'
import { fetchProtectedEventsWithValidator } from './services/validator-with-protected_event'

const tagManagerArgs = {
  gtmId: 'GTM-TTZLQF7',
}

TagManager.initialize(tagManagerArgs)

const ErrorPage = () => {
  const error = useRouteError() as { statusText?: string; message?: string }

  return (
    <div>
      <h1>Oops!</h1>
      <p>Sorry, an unexpected error has occurred.</p>
      <p>
        <i>{error.statusText ?? error.message}</i>
      </p>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <SamPage level={UserLevel.Basic} />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/bonds',
    element: <ValidatorBondsPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/protected-events',
    element: <ProtectedEventsPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/expert-',
    element: <SamPage level={UserLevel.Expert} />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/expert-bonds',
    element: <ValidatorBondsPage level={UserLevel.Expert} />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/expert-protected-events',
    element: <ProtectedEventsPage level={UserLevel.Expert} />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/test-',
    element: <TestSamPage level={UserLevel.Basic} />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/test-bonds',
    element: <TestBondsPage level={UserLevel.Basic} />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/test-protected-events',
    element: <TestProtectedEventsPage level={UserLevel.Basic} />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/docs',
    element: <DocsPage level={UserLevel.Basic} />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/expert-docs',
    element: <DocsPage level={UserLevel.Expert} />,
    errorElement: <ErrorPage />,
  },
])

const queryClient = new QueryClient()

// Prefetch all tab data in background so navigation is instant
void queryClient.prefetchQuery(['sam', 0], () => loadSam(null))
void queryClient.prefetchQuery('bonds', fetchValidatorsWithBonds)
void queryClient.prefetchQuery(
  'protected-events',
  fetchProtectedEventsWithValidator,
)

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
