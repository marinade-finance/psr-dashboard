import React, { useMemo, useState } from 'react'

import styles from './table.module.css'

import type { HTMLAttributes } from 'react'

export const enum OrderDirection {
  ASC,
  DESC,
}

export type Order = [number, OrderDirection]

export enum Alignment {
  LEFT,
  RIGHT,
}

export enum Color {
  RED,
  GREEN,
  YELLOW,
}

const alignmentClassName = (alignment?: Alignment) => {
  switch (alignment) {
    case Alignment.LEFT:
      return styles.left
    case Alignment.RIGHT:
      return styles.right
    default:
      return styles.left
  }
}

const colorClassName = (color?: Color) => {
  switch (color) {
    case Color.RED:
      return styles.red
    case Color.GREEN:
      return styles.green
    case Color.YELLOW:
      return styles.yellow
    default:
      return styles.noBg
  }
}

const renderHeader: <Item>(
  columns: Column<Item>[],
  onSort: (i: number) => void,
  userOrder: [number, OrderDirection] | null,
  showRowNumber: boolean,
) => JSX.Element = (columns, onSort, userOrder, showRowNumber: boolean) => {
  const [orderColumn, orderDirection] = userOrder ?? [null, null]
  return (
    <tr>
      {showRowNumber ? <td>#</td> : null}
      {columns.map((column, i) => (
        <th
          key={i}
          className={alignmentClassName(column.alignment)}
          onClick={() => onSort(i)}
          {...(column.headerAttrsFn ? column.headerAttrsFn() : {})}
        >
          {column.header}
          <span>
            {orderColumn === i
              ? orderDirection === OrderDirection.ASC
                ? '▴'
                : '▾'
              : '\u00A0'}
          </span>
        </th>
      ))}
    </tr>
  )
}

const renderRows: <Item>(
  _: Item[],
  __: Column<Item>[],
  ___: boolean,
  ____?: (item: Item, index: number) => HTMLAttributes<HTMLTableRowElement>,
  _____?: (item: Item, index: number) => JSX.Element,
) => JSX.Element[] = (
  items,
  columns,
  showRowNumber,
  rowAttrsFn,
  rowNumberRender,
) =>
  items.map((item, i) =>
    renderRow(item, columns, i, showRowNumber, rowAttrsFn, rowNumberRender),
  )

const renderRow: <Item>(
  _: Item,
  columns: Column<Item>[],
  index: number,
  showRowNumber: boolean,
  rowAttrsFn?: (
    item: Item,
    index: number,
  ) => HTMLAttributes<HTMLTableRowElement>,
  rowNumberRender?: (item: Item, index: number) => JSX.Element,
) => JSX.Element = (
  item,
  columns,
  index,
  showRowNumber,
  rowAttrsFn,
  rowNumberRender,
) => {
  return (
    <tr key={index} {...(rowAttrsFn ? rowAttrsFn(item, index) : {})}>
      {showRowNumber ? (
        <td>
          {rowNumberRender ? rowNumberRender(item, index) : <>{index + 1}</>}
        </td>
      ) : null}
      {columns.map((column, i) => (
        <td
          {...(column.cellAttrsFn ? column.cellAttrsFn(item) : {})}
          key={i}
          className={`${alignmentClassName(column.alignment)} ${column.background ? colorClassName(column.background(item)) : ''}`}
        >
          {column.render(item, index)}
        </td>
      ))}
    </tr>
  )
}

type Column<Item> = {
  header: string
  headerAttrsFn?: () => HTMLAttributes<HTMLTableCellElement>
  cellAttrsFn?: (item: Item) => HTMLAttributes<HTMLTableCellElement>
  render: (item: Item, index?: number) => JSX.Element
  compare: (a: Item, b: Item) => number
  background?: (item: Item) => Color
  alignment?: Alignment
}

type Props<Item> = {
  data: Item[]
  columns: Column<Item>[]
  defaultOrder: Order[]
  showRowNumber?: boolean
  rowAttrsFn?: (
    item: Item,
    index: number,
  ) => HTMLAttributes<HTMLTableRowElement>
  rowNumberRender?: (item: Item, index: number) => JSX.Element
}

export const Table: <Item>(props: Props<Item>) => JSX.Element = ({
  data,
  columns,
  defaultOrder,
  showRowNumber,
  rowAttrsFn,
  rowNumberRender,
}) => {
  const [userOrder, setUserOrder] = useState<Order | null>(null)

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
        if (compareResult !== undefined && compareResult !== 0) {
          // Handle special null values - Infinity means "a is null, always goes to end"
          if (compareResult === Infinity) return 1
          // -Infinity means "b is null, always goes to end"
          if (compareResult === -Infinity) return -1
          // Normal comparison - apply sort direction
          return orderDirection === OrderDirection.ASC
            ? compareResult
            : -compareResult
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

  return (
    <table className={styles.table}>
      <thead>
        {renderHeader(columns, onSort, userOrder, showRowNumber ?? false)}
      </thead>
      <tbody>
        {renderRows(
          sortedData,
          columns,
          showRowNumber ?? false,
          rowAttrsFn,
          rowNumberRender,
        )}
      </tbody>
    </table>
  )
}
