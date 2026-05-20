import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import TagManager from 'react-gtm-module'
import {
  createBrowserRouter,
  RouterProvider,
  useRouteError,
} from 'react-router-dom'

import { Navigation, UserLevel } from './components/navigation/navigation'
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
    <Navigation>
      <div role="alert" className="p-8 max-w-prose mx-auto">
        <h1 className="text-xl font-semibold mb-2">Oops!</h1>
        <p>Sorry, an unexpected error has occurred.</p>
        <p>
          <i>{error.statusText ?? error.message}</i>
        </p>
      </div>
    </Navigation>
  )
}

// Catch-all for unknown paths so React Router renders the ErrorPage instead
// of a blank screen. Matches anything not claimed by the routes above.
const NotFoundPage = () => (
  <Navigation>
    <div role="alert" className="p-8 max-w-prose mx-auto">
      <h1 className="text-xl font-semibold mb-2">Page not found</h1>
      <p>That route doesn&apos;t exist. Use the navigation above.</p>
    </div>
  </Navigation>
)

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
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

const queryClient = new QueryClient()

const Root = () => {
  // Prefetch all tab data so navigation is instant. Running here (not at
  // module top-level) means a rejection bubbles to the route's error
  // boundary instead of being silently swallowed before React mounts.
  // Test routes bring their own QueryClient seeded with fixtures and must
  // never touch the network — skip the prefetch so we don't fire upstream
  // calls before the test wrapper mounts.
  useEffect(() => {
    if (window.location.pathname.startsWith('/test-')) return
    void queryClient.prefetchQuery({
      queryKey: ['sam', 0],
      queryFn: () => loadSam(null),
    })
    void queryClient.prefetchQuery({
      queryKey: ['bonds'],
      queryFn: fetchValidatorsWithBonds,
    })
    void queryClient.prefetchQuery({
      queryKey: ['protected-events'],
      queryFn: fetchProtectedEventsWithValidator,
    })
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

createRoot(rootElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
