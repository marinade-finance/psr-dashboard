import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import TagManager from 'react-gtm-module'
import { QueryClient, QueryClientProvider } from 'react-query'
import {
  createBrowserRouter,
  RouterProvider,
  useRouteError,
} from 'react-router-dom'

import { Loader } from './components/loader/loader'
import { UserLevel } from './components/navigation/navigation'
import { TooltipProvider } from './components/ui/tooltip'

// Eager load SAM (main page — needs to be fast)
import { SamPage } from './pages/sam'

// Lazy load secondary pages
const ProtectedEventsPage = lazy(() =>
  import('./pages/protected-events').then(m => ({
    default: m.ProtectedEventsPage,
  })),
)
const ValidatorBondsPage = lazy(() =>
  import('./pages/validator-bonds').then(m => ({
    default: m.ValidatorBondsPage,
  })),
)

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

const LazyFallback = () => (
  <div className="min-h-screen bg-background-page flex items-center justify-center">
    <Loader />
  </div>
)

const router = createBrowserRouter([
  {
    path: '/',
    element: <SamPage level={UserLevel.Basic} />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/bonds',
    element: (
      <Suspense fallback={<LazyFallback />}>
        <ValidatorBondsPage />
      </Suspense>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/protected-events',
    element: (
      <Suspense fallback={<LazyFallback />}>
        <ProtectedEventsPage />
      </Suspense>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/expert-',
    element: <SamPage level={UserLevel.Expert} />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/expert-bonds',
    element: (
      <Suspense fallback={<LazyFallback />}>
        <ValidatorBondsPage level={UserLevel.Expert} />
      </Suspense>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/expert-protected-events',
    element: (
      <Suspense fallback={<LazyFallback />}>
        <ProtectedEventsPage level={UserLevel.Expert} />
      </Suspense>
    ),
    errorElement: <ErrorPage />,
  },
])

const queryClient = new QueryClient()

ReactDOM.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>,
  document.getElementById('root'),
)
