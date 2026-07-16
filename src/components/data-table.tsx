'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  searchFields?: string[];
  searchPlaceholder?: string;
  pageSize?: number;
  className?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  searchable = true,
  searchFields = [],
  searchPlaceholder = 'Search...',
  pageSize = 10,
  className,
  emptyMessage = 'No data found',
  onRowClick,
  keyExtractor,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredData = useMemo(() => {
    let result = [...data];

    if (searchable && searchQuery && searchFields.length > 0) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const value = getNestedValue(item, field);
          if (value == null) return false;
          return String(value).toLowerCase().includes(query);
        })
      );
    }

    if (sortColumn) {
      const col = columns.find((c) => c.key === sortColumn);
      if (col?.sortable) {
        result.sort((a, b) => {
          const aVal = getNestedValue(a, sortColumn);
          const bVal = getNestedValue(b, sortColumn);
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
          if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
          }
          return sortDirection === 'asc'
            ? String(aVal).localeCompare(String(bVal))
            : String(bVal).localeCompare(String(aVal));
        });
      }
    }

    return result;
  }, [data, searchQuery, searchFields, sortColumn, sortDirection, columns, searchable]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortColumn === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(key);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 w-full sm:w-72"
          />
        </div>
      )}

      <ScrollArea className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    col.sortable && 'cursor-pointer select-none hover:bg-muted/50',
                    col.className
                  )}
                  onClick={() => handleSort(col.key, col.sortable)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortColumn === col.key && (
                      <span className="text-muted-foreground">
                        {sortDirection === 'asc' ? ' \u2191' : ' \u2193'}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => (
                <TableRow
                  key={keyExtractor(row)}
                  className={cn(onRowClick && 'cursor-pointer hover:bg-muted/50')}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {Math.min((currentPage - 1) * pageSize + 1, filteredData.length)} to{' '}
            {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function getNestedValue(obj: unknown, path: string): unknown {
  if (obj == null) return undefined;
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
