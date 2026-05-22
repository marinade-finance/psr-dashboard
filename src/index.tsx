import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import TagManager from 'react-gtm-module'
import {
  createBrowserRouter,
  RouterProvider,
  useRouteError,
} from 'react-router-dom'

import { Navigation } from './components/navigation/navigation'
import { TooltipProvider } from './components/ui/tooltip'
import { DocsPage } from './pages/docs'
import { ProtectedEventsPage } from './pages/protected-events'
import { SamPage } from './pages/stake-auction-marketplace'
import { TestBondsPage } from './pages/test-bonds'
import { TestProtectedEventsPage } from './pages/test-protected-events'
import { TestSamPage } from './pages/test-stake-auction-marketplace'
import { ValidatorBondsPage } from './pages/validator-bonds'
import { ErrorBoundary, initSentry } from './sentry'

initSentry()

const tagManagerArgs = {
  gtmId: 'GTM-TTZLQF7',
}

TagManager.initialize(tagManagerArgs)

// Last-resort fallback rendered by the top-level ErrorBoundary when a thrown
// error escapes every route's errorElement. Plain HTML — no React-router or
// react-query in scope, so it always renders even if those providers crashed
// during init.
const FatalError: React.FC<{ resetError: () => void }> = ({ resetError }) => (
  <div
    role="alert"
    style={{ padding: '2rem', maxWidth: '40rem', margin: 'auto' }}
  >
    <h1>Something broke.</h1>
    <p>
      An unexpected error took down the dashboard. The error has been logged.
    </p>
    <button type="button" onClick={resetError}>
      Try again
    </button>
  </div>
)

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
    element: <SamPage level={'basic'} />,
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
    element: <SamPage level={'expert'} />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/expert-bonds',
    element: <ValidatorBondsPage level={'expert'} />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/expert-protected-events',
    element: <ProtectedEventsPage level={'expert'} />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/test-',
    element: <TestSamPage level={'basic'} />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/test-bonds',
    element: <TestBondsPage level={'basic'} />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/test-protected-events',
    element: <TestProtectedEventsPage level={'basic'} />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/docs',
    element: <DocsPage level={'basic'} />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/expert-docs',
    element: <DocsPage level={'expert'} />,
    errorElement: <ErrorPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

// Defaults tuned for a long-dwell dashboard whose underlying data updates
// per Solana epoch (~48h). Stock v5 defaults (`staleTime: 0`,
// `refetchOnWindowFocus: true`, `retry: 3`) would refetch the heavy
// `loadSam` path on every tab focus and amplify transient failures into
// minutes of retry storms.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const Root = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>
  </QueryClientProvider>
)

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary
      fallback={fallbackProps => (
        <FatalError resetError={() => fallbackProps.resetError()} />
      )}
    >
      <Root />
    </ErrorBoundary>
  </React.StrictMode>,
)
