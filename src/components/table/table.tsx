import React, { useEffect, useMemo, useState } from "react";
import styles from './table.module.css'

export const enum OrderDirection {
    ASC, DESC
}

export type Order = [number, OrderDirection]

export enum Alignment {
    LEFT, RIGHT
}

const alignmentClassName = (alignment?: Alignment) => {
    switch (alignment) {
        case Alignment.LEFT: return styles.left
        case Alignment.RIGHT: return styles.right
        default: return styles.left
    }
}

const renderHeader: <Item>(columns: Column<Item>[], onSort: (i: number) => void, userOrder: [number, OrderDirection] | null) => JSX.Element = (columns, onSort, userOrder) => {
    const [orderColumn, orderDirection] = userOrder ?? [null, null]
    return <tr>
        {columns.map((column, i) => <th key={i} className={alignmentClassName(column.alignment)} onClick={() => onSort(i)}>
            {column.header}
            <span>{orderColumn === i
                ? (orderDirection === OrderDirection.ASC ? '▴' : '▾')
                : '\u00A0'
            }</span>
        </th>)}
    </tr>
}

const renderRows: <Item>(_: Item[], __: Column<Item>[]) => JSX.Element[] = (items, columns) => items.map((item, i) => renderRow(item, columns, i))

const renderRow: <Item>(_: Item, columns: Column<Item>[], index: number) => JSX.Element = (item, columns, index) => {
    return <tr key={index}>
        {columns.map((column, i) => <td key={i} className={alignmentClassName(column.alignment)}>{column.render(item)}</td>)}
    </tr>
}

type Column<Item> = {
    header: string
    render: (item: Item) => JSX.Element
    compare: (a: Item, b: Item) => number
    alignment?: Alignment
}

type Props<Item> = {
    data: Item[]
    columns: Column<Item>[]
    defaultOrder: Order[]
}

export const Table: <Item>(props: Props<Item>) => JSX.Element = ({ data, columns, defaultOrder }) => {
    const [userOrder, setUserOrder] = useState(null)

    const order: [number, OrderDirection][] = useMemo(() => {
        if (userOrder) {
            return [userOrder, ...defaultOrder]
        }
        return [...defaultOrder]
    }, [userOrder, defaultOrder])

    const sortedData = useMemo(() => {
        const items = [...data]
        items.sort((a, b) => {
            for (const [columnIndex, orderDirection] of order) {
                const compareResult = columns[columnIndex].compare(a, b)
                if (compareResult !== 0) {
                    return orderDirection === OrderDirection.ASC ? compareResult : -compareResult
                }
            }
            return 0
        })
        return items
    }, [order, data])

    const onSort = (columnIndex: number) => {
        const [prevColumn, prevOrder] = userOrder ?? [null, null]
        if (columnIndex === prevColumn) {
            if (prevOrder === OrderDirection.ASC) {
                setUserOrder([columnIndex, OrderDirection.DESC])
            } else {
                setUserOrder(null)
            }
        } else {
            setUserOrder([columnIndex, OrderDirection.ASC])
        }
    }

    return <table className={styles.table}>
        <thead>
            {renderHeader(columns, onSort, userOrder)}
        </thead>
        <tbody>
            {renderRows(sortedData, columns)}
        </tbody>
    </table>
};
