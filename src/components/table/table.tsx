import React, { useMemo, useState } from 'react'

import { cn } from 'src/class_utils'
import { HelpTip } from 'src/components/help-tip/help-tip'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Table as UiTable,
} from 'src/components/ui/table'
import { Color } from 'src/services/types'

import type { HTMLAttributes, ReactNode } from 'react'

export { Color }

// Canonical card chrome for any page that drops a generic Table inside a
// content section. Bundles the outer surface (rounded card, border, shadow),
// the horizontal scroll behaviour, and the muted row-hover override that the
// non-SAM tables share. SAM table has its own bespoke wrapper and does not
// use this.
export const TABLE_SHELL_HOVER = '[&_tbody_tr:hover]:bg-secondary' as const

export function TableShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}): React.ReactElement {
  return (
    <div
      className={cn(
        'bg-card rounded-xl border border-border shadow-card overflow-hidden overflow-x-auto',
        className,
      )}
    >
      {children}
    </div>
  )
}

export const enum OrderDirection {
  ASC,
  DESC,
}

export type Order = [number, OrderDirection]

export enum Alignment {
  LEFT,
  RIGHT,
}

const TABLE_BASE = [
  'relative border-separate [border-spacing:0]',
  '[&_thead]:sticky [&_thead]:top-0 [&_thead]:bg-muted',
  '[&_thead]:text-foreground [&_thead]:cursor-pointer',
  '[&_thead]:select-none [&_thead]:z-[1]',
  '[&_thead]:border-b [&_thead]:border-border-grid',
  '[&_thead_th:first-child]:rounded-tl-xl',
  '[&_thead_th:last-child]:rounded-tr-xl',
  '[&_tbody]:bg-card',
  '[&_tbody_tr]:bg-card',
  // content-visibility: auto lets the browser skip layout/paint of off-screen
  // rows entirely (Chrome 85+/Safari 18+). Combined with contain-intrinsic-size
  // it reserves space so scroll height stays accurate. For tables with 1000+
  // rows (protected-events) this cuts the synchronous layout cost on mount
  // from hundreds of ms to ~zero — the browser only lays out what's visible.
  '[&_tbody_tr]:[content-visibility:auto]',
  '[&_tbody_tr]:[contain-intrinsic-size:auto_44px]',
  '[&_th]:relative [&_th]:px-3.5 [&_th]:py-[11px] [&_th]:whitespace-nowrap [&_th]:text-xs [&_th]:font-medium [&_th]:tracking-[0.06em] [&_th]:text-muted-foreground',
  '[&_td]:relative [&_td]:px-3.5 [&_td]:py-3 [&_td]:whitespace-nowrap [&_td]:align-top',
  '[&_tbody_tr:hover]:bg-primary-light',
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
      return 'bg-cell-grey'
    default:
      return ''
  }
}

function renderHeader<Item>(
  columns: Column<Item>[],
  onSort: (i: number) => void,
  userOrder: [number, OrderDirection] | null,
  defaultOrder: Order[],
  showRowNumber: boolean,
): React.ReactElement {
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
        let indicator = ''
        if (isUserSorted) {
          indicator = userOrderDirection === OrderDirection.ASC ? '▲' : '▼'
        } else if (isDefaultSorted) {
          indicator = defaultOrderDirection === OrderDirection.ASC ? '▲' : '▼'
        }
        const isSortable = column.sortable !== false && !!column.compare

        return (
          <TableHead
            key={i}
            className={alignmentClassName(column.alignment)}
            onClick={isSortable ? () => onSort(i) : undefined}
            style={isSortable ? undefined : { cursor: 'default' }}
            {...(column.headerAttrsFn ? column.headerAttrsFn() : {})}
          >
            {column.header}
            {column.headerHelp && (
              <HelpTip
                text={column.headerHelp}
                guideTo={column.headerGuideTo}
              />
            )}
            {isSortable && (
              <span
                className={cn(
                  'ml-1 text-xs opacity-40',
                  isUserSorted && 'opacity-100! text-primary!',
                  isDefaultSorted && 'opacity-60! text-muted-foreground!',
                )}
              >
                {indicator}
              </span>
            )}
          </TableHead>
        )
      })}
    </TableRow>
  )
}

function renderRows<Item>(
  items: Item[],
  columns: Column<Item>[],
  showRowNumber: boolean,
  rowAttrsFn?: (
    item: Item,
    index: number,
  ) => HTMLAttributes<HTMLTableRowElement>,
): React.ReactElement[] {
  return items.map((item, i) =>
    renderRow(item, columns, i, showRowNumber, rowAttrsFn),
  )
}

function renderRow<Item>(
  item: Item,
  columns: Column<Item>[],
  index: number,
  showRowNumber: boolean,
  rowAttrsFn?: (
    item: Item,
    index: number,
  ) => HTMLAttributes<HTMLTableRowElement>,
): React.ReactElement {
  return (
    <TableRow key={index} {...(rowAttrsFn ? rowAttrsFn(item, index) : {})}>
      {showRowNumber ? <TableCell>{index + 1}</TableCell> : null}
      {columns.map((column, i) => {
        const cellAttrs = column.cellAttrsFn ? column.cellAttrsFn(item) : {}
        const { className: cellClassName, ...restCellAttrs } = cellAttrs
        return (
          <TableCell
            {...restCellAttrs}
            key={i}
            className={cn(
              alignmentClassName(column.alignment),
              column.background && colorClassName(column.background(item)),
              cellClassName,
            )}
          >
            {column.render(item, index)}
          </TableCell>
        )
      })}
    </TableRow>
  )
}

type Column<Item> = {
  header: string
  headerHelp?: string
  headerGuideTo?: string
  headerAttrsFn?: () => HTMLAttributes<HTMLTableCellElement>
  cellAttrsFn?: (item: Item) => HTMLAttributes<HTMLTableCellElement>
  render: (item: Item, index?: number) => React.ReactElement
  compare?: (a: Item, b: Item) => number
  sortable?: boolean
  background?: (item: Item) => Color | undefined
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
  className?: string
}

export const Table: <Item>(props: Props<Item>) => React.ReactElement = ({
  data,
  columns,
  defaultOrder,
  showRowNumber,
  rowAttrsFn,
  className,
}) => {
  const [userOrder, setUserOrder] = useState<Order | null>(null)

  // Callers typically pass `defaultOrder` as an inline array literal, so its
  // identity churns every parent render. Key the memo by content instead, so
  // sorting only re-runs when the actual columns/directions change.
  const defaultOrderKey = JSON.stringify(defaultOrder)
  const order: [number, OrderDirection][] = useMemo(() => {
    if (userOrder) {
      return [userOrder, ...defaultOrder]
    }
    return [...defaultOrder]
  }, [userOrder, defaultOrderKey])

  // `columns` is deliberately omitted from deps: call sites pass inline array
  // literals, so including it would re-sort on every parent render. Sort
  // results are stable as long as comparators derive their result from the
  // row data passed in (a, b) — that contract holds for all current consumers.
  const sortedData = useMemo(() => {
    const items = [...data]
    items.sort((a, b) => {
      for (const [columnIndex, orderDirection] of order) {
        const compareResult = columns[columnIndex].compare?.(a, b)
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
  }, [order, data])

  const onSort = (columnIndex: number) => {
    const column = columns[columnIndex]
    if (column.sortable === false || !column.compare) return
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
    <UiTable className={cn(TABLE_BASE, className)}>
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
        {renderRows(sortedData, columns, showRowNumber ?? false, rowAttrsFn)}
      </TableBody>
    </UiTable>
  )
}
