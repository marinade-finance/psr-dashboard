import React, { useEffect, useMemo, useState } from 'react'

import { cn } from 'src/lib/utils'

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
  GREY,
}

const TABLE_BASE = [
  'relative border-collapse [border-spacing:0]',
  '[&_thead]:sticky [&_thead]:top-0 [&_thead]:bg-card',
  '[&_thead]:text-foreground [&_thead]:cursor-pointer',
  '[&_thead]:select-none [&_thead]:z-[1]',
  '[&_tbody]:bg-background-page',
  '[&_th]:relative [&_th]:px-4 [&_th]:py-2 [&_th]:whitespace-nowrap',
  '[&_td]:relative [&_td]:px-4 [&_td]:py-1 [&_td]:whitespace-nowrap',
  '[&_tbody_tr:hover]:bg-secondary',
].join(' ')

function alignmentClassName(alignment?: Alignment): string {
  return alignment === Alignment.RIGHT ? 'text-right' : 'text-left'
}

function colorClassName(color?: Color): string {
  switch (color) {
    case Color.RED:
      return 'bg-cell-red'
    case Color.GREEN:
      return 'bg-cell-green'
    case Color.YELLOW:
      return 'bg-cell-yellow'
    case Color.GREY:
      return 'grey bg-cell-grey'
    default:
      return ''
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
  // Get the primary default order column (first in defaultOrder array)
  const [defaultOrderColumn, defaultOrderDirection] = defaultOrder[0] ?? [
    null,
    null,
  ]

  return (
    <tr>
      {showRowNumber ? <th>#</th> : null}
      {columns.map((column, i) => {
        const isUserSorted = userOrderColumn === i
        const isDefaultSorted = !userOrder && defaultOrderColumn === i

        const isActive = isUserSorted
        const isDefault = isDefaultSorted
        let indicator = ''

        if (isUserSorted) {
          indicator = userOrderDirection === OrderDirection.ASC ? '▲' : '▼'
        } else if (isDefaultSorted) {
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
            <span
              className={cn(
                'ml-1 text-[10px] opacity-40',
                isActive && '!opacity-100 !text-primary',
                isDefault && '!opacity-60 !text-muted-foreground',
              )}
            >
              {indicator}
            </span>
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
          className={cn(
            alignmentClassName(column.alignment),
            column.background && colorClassName(column.background(item)),
          )}
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
  onOrderChange?: (order: Order[]) => void
  presorted?: boolean // Skip internal sorting when data is already sorted
  caption?: React.ReactNode
  className?: string
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
  caption,
  className,
}) => {
  const [userOrder, setUserOrder] = useState<Order | null>(null)

  const order: [number, OrderDirection][] = useMemo(() => {
    if (userOrder) {
      return [userOrder, ...defaultOrder]
    }
    return [...defaultOrder]
  }, [userOrder, defaultOrder])

  // Notify parent when order changes
  useEffect(() => {
    onOrderChange?.(order)
  }, [order, onOrderChange])

  const sortedData = useMemo(() => {
    // Skip sorting if data is presorted (e.g., has special rows like ghosts)
    if (presorted) {
      return data
    }
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
    <table className={cn(TABLE_BASE, className)}>
      {caption && <caption>{caption}</caption>}
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
