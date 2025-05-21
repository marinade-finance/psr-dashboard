import React from "react";
import styles from './sam.module.css'
import { Navigation, UserLevel } from "src/components/navigation/navigation";
import { useQuery } from "react-query";
import { loadSam } from "src/services/sam";
import { Loader } from "src/components/loader/loader";
import { SamTable } from "src/components/sam-table/sam-table";

type Props = {
    level: UserLevel
}

export const SamPage: React.FC<Props> = ({ level }) => {
    const { data, status } = useQuery("sam", loadSam);

    return <div className={styles.page}>
        <Navigation level={level} />
        {status === "error" && <p>Error fetching data</p>}
        {status === "loading" && <Loader />}
        {status === "success" && <SamTable auctionResult={data.auctionResult} epochsPerYear={data.epochsPerYear} dsSamConfig={data.dcSamConfig} level={level} />}
    </div>
};
