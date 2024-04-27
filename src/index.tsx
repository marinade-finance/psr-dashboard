import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { ProtectedEventsPage } from "./pages/protected-events";
import {
    createBrowserRouter,
    RouterProvider,
    useRouteError,
} from "react-router-dom";
import { ValidatorBondsPage } from "./pages/validator-bonds";
import { QueryClient, QueryClientProvider } from "react-query";
import { Tooltip } from "react-tooltip";
import 'react-tooltip/dist/react-tooltip.css'

const ErrorPage = () => {
    const error: any = useRouteError();

    return (
        <div>
            <h1>Oops!</h1>
            <p>Sorry, an unexpected error has occurred.</p>
            <p>
                <i>{error.statusText || error.message}</i>
            </p>
        </div>
    );
}


const router = createBrowserRouter([
    {
        path: "/",
        element: <ValidatorBondsPage />,
        errorElement: <ErrorPage />,
    },
    {
        path: "/protected-events",
        element: <ProtectedEventsPage />,
        errorElement: <ErrorPage />,
    },
]);

const queryClient = new QueryClient();

ReactDOM.render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <Tooltip id="tooltip" style={{ zIndex: 2 }} />
        </QueryClientProvider>
    </React.StrictMode>, document.getElementById("root"));