import React, { useEffect, useMemo, useState } from "react";
import styles from './protected-events.module.css'
import { Navigation } from "src/components/navigation/navigation";
import { ProtectedEventsTable } from "src/components/protected-events-table/protected-events-table";
import { useQuery } from "react-query";
import { fetchProtectedEventsWithValidator } from "src/services/validator-with-protected_event";
import { Loader } from "src/components/loader/loader";

export const ProtectedEventsPage: React.FC = () => {
    const { data, status } = useQuery("protected-events", fetchProtectedEventsWithValidator);

    return <div className={styles.page}>
        <Navigation />
        {status === "error" && <p>Error fetching data</p>}
        {status === "loading" && <Loader />}
        {status === "success" && <ProtectedEventsTable data={data} />}
    </div>
};
