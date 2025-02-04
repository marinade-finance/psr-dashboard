import React from "react";
import styles from './sam.module.css'
import { Navigation } from "src/components/navigation/navigation";
import { useQuery } from "react-query";
import { loadSam } from "src/services/sam";
import { Loader } from "src/components/loader/loader";
import { SamTable } from "src/components/sam-table/sam-table";

export const SamPage: React.FC = () => {
    const { data, status } = useQuery("sam", loadSam);

    return <div className={styles.page}>
        <Navigation />
        {status === "error" && <p>Error fetching data</p>}
        {status === "loading" && <Loader />}
        {status === "success" && <SamTable auctionResult={data.auctionResult} epochsPerYear={data.epochsPerYear} />}
    </div>
};
