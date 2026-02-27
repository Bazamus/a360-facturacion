import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'
import { LoadingSpinner } from './LoadingSpinner'
import { EmptyState } from './EmptyState'

export function DataTable({
  data = [],
  columns = [],
  loading = false,
  emptyMessage = 'No hay datos',
  emptyDescription,
  pageSize = 10,
  onRowClick,
  sortable = true,
  className,
  // Server-side pagination props
  totalCount,
  page,
  onPageChange
}) {
  const isServerSide = totalCount != null && page != null && onPageChange != null

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [currentPage, setCurrentPage] = useState(1)

  const effectivePage = isServerSide ? page : currentPage
  const effectiveSetPage = isServerSide ? onPageChange : setCurrentPage

  // Ordenar datos (solo client-side)
  const sortedData = useMemo(() => {
    if (isServerSide || !sortConfig.key) return data

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (aValue == null) return 1
      if (bValue == null) return -1

      if (typeof aValue === 'string') {
        const compare = aValue.localeCompare(bValue, 'es', { sensitivity: 'base' })
        return sortConfig.direction === 'asc' ? compare : -compare
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortConfig, isServerSide])

  // Paginar datos (solo client-side)
  const paginatedData = useMemo(() => {
    if (isServerSide) return data
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize, isServerSide, data])

  const effectiveTotalCount = isServerSide ? totalCount : data.length
  const totalPages = Math.ceil(effectiveTotalCount / pageSize)

  const handleSort = (key) => {
    if (!sortable) return
    
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!data.length) {
    return (
      <EmptyState
        title={emptyMessage}
        description={emptyDescription}
      />
    )
  }

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    sortable && column.sortable !== false && 'cursor-pointer hover:bg-gray-100 select-none',
                    column.className
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {sortable && column.sortable !== false && sortConfig.key === column.key && (
                      sortConfig.direction === 'asc' 
                        ? <ChevronUp className="h-4 w-4" />
                        : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-gray-50'
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-3 py-2.5 text-sm text-gray-900',
                      !column.cellClassName?.includes('whitespace') && 'whitespace-nowrap',
                      column.cellClassName
                    )}
                  >
                    {column.render 
                      ? column.render(row[column.key], row)
                      : row[column.key] ?? '-'
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Mostrando {((effectivePage - 1) * pageSize) + 1} - {Math.min(effectivePage * pageSize, effectiveTotalCount)} de {effectiveTotalCount}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => effectiveSetPage(isServerSide ? effectivePage - 1 : p => Math.max(1, p - 1))}
              disabled={effectivePage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-700">
              Página {effectivePage} de {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => effectiveSetPage(isServerSide ? effectivePage + 1 : p => Math.min(totalPages, p + 1))}
              disabled={effectivePage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}






