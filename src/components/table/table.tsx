import React, { useEffect, useMemo, useState } from 'react'

import { Card } from 'src/components/ui/card'
import {
  ShadTable,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from 'src/components/ui/table'

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
      return 'text-right font-mono'
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
    <TableRow>
      {showRowNumber ? <TableHead>#</TableHead> : null}
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
          <TableHead
            key={i}
            className={alignmentClassName(column.alignment)}
            onClick={() => onSort(i)}
            {...(column.headerAttrsFn ? column.headerAttrsFn() : {})}
          >
            {column.header}
            {column.tooltip && <HelpTip text={column.tooltip} />}
            <span className={indicatorClass}>{indicator}</span>
          </TableHead>
        )
      })}
    </TableRow>
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
    <TableRow key={index} {...(rowAttrsFn ? rowAttrsFn(item, index) : {})}>
      {showRowNumber ? (
        <TableCell>
          {rowNumberRender ? rowNumberRender(item, index) : <>{index + 1}</>}
        </TableCell>
      ) : null}
      {columns.map((column, i) => (
        <TableCell
          {...(column.cellAttrsFn ? column.cellAttrsFn(item) : {})}
          key={i}
          className={`${alignmentClassName(column.alignment)} ${column.background ? colorClassName(column.background(item)) : ''}`}
        >
          {column.render(item, index)}
        </TableCell>
      ))}
    </TableRow>
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
    <Card className="overflow-hidden p-0">
      <ShadTable className="font-sans text-[13px]">
        <TableHeader>
          {renderHeader(
            columns,
            onSort,
            userOrder,
            defaultOrder,
            showRowNumber ?? false,
          )}
        </TableHeader>
        <TableBody>
          {renderRows(
            sortedData,
            columns,
            showRowNumber ?? false,
            rowAttrsFn,
            rowNumberRender,
          )}
        </TableBody>
      </ShadTable>
    </Card>
  )
}
