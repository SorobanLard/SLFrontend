'use client';

import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Column<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (item: T, index: number) => React.ReactNode;
};

export type SortDirection = 'asc' | 'desc';

export type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  sortColumn?: string | null;
  sortDirection?: SortDirection;
  onSort?: (columnKey: string) => void;
  emptyMessage?: string;
  emptyCta?: React.ReactNode;
  rowKey?: (item: T, index: number) => string | number;
  className?: string;
};

/**
 * Stably sorts an array by a key extracted by `getValue`.
 * Rows with equal values preserve their original relative order.
 * Uses the index as a tiebreaker to guarantee stability regardless of the
 * JS engine version or sort algorithm.
 */
function stableSort<T>(
  items: T[],
  getValue: (item: T) => unknown,
  direction: SortDirection,
): T[] {
  const indexed = items.map((item, originalIndex) => ({ item, originalIndex }));
  indexed.sort((a, b) => {
    const aVal = getValue(a.item);
    const bVal = getValue(b.item);

    let cmp = 0;
    if (aVal === null || aVal === undefined) cmp = 1;
    else if (bVal === null || bVal === undefined) cmp = -1;
    else if (typeof aVal === 'number' && typeof bVal === 'number') {
      cmp = aVal - bVal;
    } else {
      cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true, sensitivity: 'base' });
    }

    if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
    // Equal values: preserve original order (stability tiebreaker)
    return a.originalIndex - b.originalIndex;
  });
  return indexed.map(({ item }) => item);
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  sortColumn,
  sortDirection = 'asc',
  onSort,
  emptyMessage = 'No data found',
  emptyCta,
  rowKey,
  className,
}: DataTableProps<T>) {
  const handleHeaderClick = (col: Column<T>) => {
    if (col.sortable && onSort) {
      onSort(col.key);
    }
  };

  // Apply a stable client-side sort when a sort column is active.
  // Using a tiebreaker on the original index guarantees rows with equal
  // values never reshuffle between renders (#133).
  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;
    return stableSort(
      data,
      (item) => (item as Record<string, unknown>)[sortColumn],
      sortDirection,
    );
  }, [data, sortColumn, sortDirection]);

  return (
    <div className={cn('w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-[#D5D2F6] bg-white shadow-sm', className)}>
      <div
        data-testid="datatable-scroll-container"
        role="region"
        aria-label="Scrollable data table"
        tabIndex={0}
        className="w-full max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
      >
        <table className="w-full min-w-full sm:min-w-[600px] text-left text-xs sm:text-sm text-[#26215C]">
          <thead className="border-b border-[#EEEDFE] bg-[#F4F2FF] text-xs font-semibold uppercase tracking-wider text-[#5A5578]">
            <tr>
              {columns.map((col) => {
                const isSorted = sortColumn === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      'px-3 py-3 sm:px-6 sm:py-4 whitespace-nowrap transition-colors',
                      col.className,
                      col.sortable && 'cursor-pointer select-none hover:text-[#26215C]'
                    )}
                    onClick={() => handleHeaderClick(col)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{col.label}</span>
                      {col.sortable ? (
                        <span className="inline-flex text-[#7F77DD]">
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-4 w-4" aria-label="Sorted ascending" />
                            ) : (
                              <ArrowDown className="h-4 w-4" aria-label="Sorted descending" />
                            )
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-50" aria-label="Sort column" />
                          )}
                        </span>
                      ) : null}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEEDFE]">
            {isLoading ? (
              // 5 Skeleton row placeholders
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skeleton-row-${rIdx}`} className="animate-pulse">
                  {columns.map((col, cIdx) => (
                    <td key={`skeleton-cell-${rIdx}-${cIdx}`} className="px-3 py-3 sm:px-6 sm:py-4">
                      <div className="h-4 w-3/4 rounded-md bg-[#EEEDFE]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 sm:px-6 sm:py-12 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                    <div className="rounded-full bg-[#F4F2FF] p-4 text-[#7F77DD]">
                      <Inbox className="h-8 w-8" />
                    </div>
                    <p className="mt-3 text-base font-semibold text-[#26215C]">{emptyMessage}</p>
                    {emptyCta ? <div className="mt-4">{emptyCta}</div> : null}
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows with #EEEDFE hover highlight
              sortedData.map((item, rIdx) => {
                const key = rowKey ? rowKey(item, rIdx) : (item as Record<string, unknown>).id ? String((item as Record<string, unknown>).id) : rIdx;
                return (
                  <tr
                    key={key}
                    className="transition-colors hover:bg-[#EEEDFE]/50"
                  >
                    {columns.map((col) => {
                      const val = (item as Record<string, unknown>)[col.key];
                      return (
                        <td key={col.key} className={cn('px-3 py-3 sm:px-6 sm:py-4 font-normal', col.className)}>
                          {col.render ? col.render(item, rIdx) : val !== undefined && val !== null ? String(val) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
