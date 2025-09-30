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
import { UserLevel } from "./components/navigation/navigation";
import { SamPage } from "./pages/sam";
import TagManager from 'react-gtm-module'

const tagManagerArgs = {
  gtmId: 'GTM-TTZLQF7'
}

TagManager.initialize(tagManagerArgs)

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
        element: <SamPage level={UserLevel.Basic} />,
        errorElement: <ErrorPage />,
    },
    {
        path: "/bonds",
        element: <ValidatorBondsPage />,
        errorElement: <ErrorPage />,
    },
    {
        path: "/protected-events",
        element: <ProtectedEventsPage />,
        errorElement: <ErrorPage />,
    },
    {
        path: "/expert-",
        element: <SamPage level={UserLevel.Expert} />,
        errorElement: <ErrorPage />,
    },
    {
        path: "/expert-bonds",
        element: <ValidatorBondsPage level={UserLevel.Expert} />,
        errorElement: <ErrorPage />,
    },
    {
        path: "/expert-protected-events",
        element: <ProtectedEventsPage level={UserLevel.Expert} />,
        errorElement: <ErrorPage />,
    },
]);

const queryClient = new QueryClient();

ReactDOM.render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <Tooltip id="tooltip" style={{ zIndex: 2, width: 400 }} />
        </QueryClientProvider>
    </React.StrictMode>, document.getElementById("root"));
