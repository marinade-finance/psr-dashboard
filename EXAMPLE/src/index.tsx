/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */

import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import { QueryClient, QueryClientProvider } from 'react-query'
import {
  createBrowserRouter,
  RouterProvider,
  useRouteError,
} from 'react-router-dom'
import { Tooltip } from 'react-tooltip'

import 'react-tooltip/dist/react-tooltip.css'
import { BondsPage } from './pages/bonds'
import { SelectPage } from './pages/select'

const ErrorPage = () => {
  const error: any = useRouteError()

  return (
    <div>
      <h1>Oops!</h1>
      <p>Sorry, an unexpected error has occurred.</p>
      <p>
        <i>{error.statusText || error.message}</i>
      </p>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <BondsPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/select',
    element: <SelectPage />,
    errorElement: <ErrorPage />,
  },
])

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // don't refetch for 5 mins
      cacheTime: 10 * 60 * 1000, // keep in cache for 10 mins
    },
  },
})

ReactDOM.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Tooltip id="tooltip" style={{ zIndex: 2, width: 400 }} />
    </QueryClientProvider>
  </React.StrictMode>,
  document.getElementById('root'),
)
