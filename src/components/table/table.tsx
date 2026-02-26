import React, { useEffect, useMemo, useState } from 'react'

import { HelpTip } from '../help-tip/help-tip'

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
    case Alignment.RIGHT:
      return 'text-right'
    default:
      return 'text-left'
  }
}

const colorClassName = (color?: Color) => {
  switch (color) {
    case Color.RED:
      return 'bg-destructive-light'
    case Color.GREEN:
      return 'bg-primary-light-10'
    case Color.YELLOW:
      return 'bg-warning-light'
    default:
      return 'bg-[unset]'
  }
}

const renderHeader: <Item>(
  columns: Column<Item>[],
  onSort: (i: number) => void,
  userOrder: [number, OrderDirection] | null,
  defaultOrder: Order[],
  showRowNumber: boolean,
) => JSX.Element = (
  columns,
  onSort,
  userOrder,
  defaultOrder,
  showRowNumber: boolean,
) => {
  const [userOrderColumn, userOrderDirection] = userOrder ?? [null, null]
  const [defaultOrderColumn, defaultOrderDirection] = defaultOrder[0] ?? [
    null,
    null,
  ]

  return (
    <tr>
      {showRowNumber ? <td>#</td> : null}
      {columns.map((column, i) => {
        const isUserSorted = userOrderColumn === i
        const isDefaultSorted = !userOrder && defaultOrderColumn === i

        let indicatorClass = 'ml-1 text-[10px] opacity-40'
        let indicator = ''

        if (isUserSorted) {
          indicatorClass = 'ml-1 text-[10px] opacity-100 text-primary'
          indicator = userOrderDirection === OrderDirection.ASC ? '▲' : '▼'
        } else if (isDefaultSorted) {
          indicatorClass = 'ml-1 text-[10px] opacity-60 text-muted-foreground'
          indicator = defaultOrderDirection === OrderDirection.ASC ? '▲' : '▼'
        }

        return (
          <th
            key={i}
            className={alignmentClassName(column.alignment)}
            onClick={() => onSort(i)}
            {...(column.headerAttrsFn ? column.headerAttrsFn() : {})}
          >
            {column.header}
            {column.tooltip && <HelpTip text={column.tooltip} />}
            <span className={indicatorClass}>{indicator}</span>
          </th>
        )
      })}
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
  tooltip?: string
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
  onOrderChange?: (order: Order[]) => void
  presorted?: boolean
}

export const Table: <Item>(props: Props<Item>) => JSX.Element = ({
  data,
  columns,
  defaultOrder,
  showRowNumber,
  rowAttrsFn,
  rowNumberRender,
  onOrderChange,
  presorted,
}) => {
  const [userOrder, setUserOrder] = useState<Order | null>(null)

  const order: [number, OrderDirection][] = useMemo(() => {
    if (userOrder) {
      return [userOrder, ...defaultOrder]
    }
    return [...defaultOrder]
  }, [userOrder, defaultOrder])

  useEffect(() => {
    onOrderChange?.(order)
  }, [order, onOrderChange])

  const sortedData = useMemo(() => {
    if (presorted) {
      return data
    }
    const items = [...data]
    items.sort((a, b) => {
      for (const [columnIndex, orderDirection] of order) {
        const compareResult = columns[columnIndex].compare(a, b)
        if (compareResult !== undefined && compareResult !== 0) {
          if (compareResult === Infinity) return 1
          if (compareResult === -Infinity) return -1
          return orderDirection === OrderDirection.ASC
            ? compareResult
            : -compareResult
        }
      }
      return 0
    })
    return items
  }, [order, data, presorted])

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
    <table className="relative border-collapse border-spacing-0 w-full [&_thead]:sticky [&_thead]:top-0 [&_thead]:bg-background-page [&_thead]:text-muted-foreground [&_thead]:cursor-pointer [&_thead]:select-none [&_thead]:z-[1] [&_tbody]:bg-card [&_th]:relative [&_th]:px-4 [&_th]:py-3 [&_th]:whitespace-nowrap [&_th]:text-2xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:border-b [&_th]:border-border [&_td]:relative [&_td]:px-4 [&_td]:py-0.5 [&_td]:whitespace-nowrap [&_td]:text-sm [&_td]:font-mono [&_td]:border-b [&_td]:border-border-grid [&_tbody_tr:hover]:bg-primary-light-05 [&_tbody_tr:last-child_td]:border-b-0">
      <thead>
        {renderHeader(
          columns,
          onSort,
          userOrder,
          defaultOrder,
          showRowNumber ?? false,
        )}
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
