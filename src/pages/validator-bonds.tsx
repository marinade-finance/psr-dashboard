import React, { useEffect, useMemo, useState } from "react";
import styles from './validator-bonds.module.css'
import { Navigation } from "src/components/navigation/navigation";
import { ValidatorBondsTable } from "src/components/validator-bonds-table/validator-bonds-table";
import { useQuery } from "react-query";
import { fetchValidatorsWithBonds } from "src/services/validator-with-bond";
import { selectTotalMarinadeStake } from "src/services/validators";
import { Loader } from "src/components/loader/loader";

export const ValidatorBondsPage: React.FC = () => {
    const { data, status } = useQuery("bonds", fetchValidatorsWithBonds);

    return <div className={styles.page}>
        <Navigation />
        {status === "error" && <p>Error fetching data</p>}
        {status === "loading" && <Loader />}
        {status === "success" && <ValidatorBondsTable data={data.filter(({ validator, bond }) => selectTotalMarinadeStake(validator) > 0 || Number(bond?.effective_amount) > 0)} />}
    </div>
};
