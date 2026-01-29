import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from './Button'
import { Select } from './Select'

/**
 * Componente de paginación completo
 * @param {Object} props
 * @param {number} props.currentPage - Página actual (1-indexed)
 * @param {number} props.totalPages - Total de páginas
 * @param {number} props.totalItems - Total de registros
 * @param {number} props.itemsPerPage - Registros por página
 * @param {Function} props.onPageChange - Callback cuando cambia la página
 * @param {Function} props.onItemsPerPageChange - Callback cuando cambia registros por página
 * @param {Array} props.pageSizeOptions - Opciones de registros por página
 * @param {boolean} props.showPageSizeSelector - Mostrar selector de registros por página
 * @param {boolean} props.showInfo - Mostrar información de registros
 */
export function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 50,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [25, 50, 100, 200],
  showPageSizeSelector = true,
  showInfo = true
}) {
  // Calcular rango de registros mostrados
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  // Generar array de páginas a mostrar
  const getPageNumbers = () => {
    const pages = []
    const maxPagesToShow = 7 // Máximo de números de página a mostrar

    if (totalPages <= maxPagesToShow) {
      // Mostrar todas las páginas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Mostrar páginas con ellipsis
      if (currentPage <= 4) {
        // Al inicio
        for (let i = 1; i <= 5; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 3) {
        // Al final
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
      } else {
        // En el medio
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return
    onPageChange?.(page)
  }

  const handleItemsPerPageChange = (e) => {
    const newSize = parseInt(e.target.value)
    onItemsPerPageChange?.(newSize)
  }

  if (totalPages <= 1 && !showPageSizeSelector) {
    return null // No mostrar paginación si solo hay 1 página
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white border-t border-gray-200">
      {/* Información de registros */}
      {showInfo && (
        <div className="text-sm text-gray-700">
          Mostrando <span className="font-medium">{startItem}</span> a{' '}
          <span className="font-medium">{endItem}</span> de{' '}
          <span className="font-medium">{totalItems}</span> registros
        </div>
      )}

      {/* Controles de paginación */}
      <div className="flex items-center gap-2">
        {/* Primera página */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          title="Primera página"
          className="p-2"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>

        {/* Página anterior */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Página anterior"
          className="p-2"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Números de página */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((page, index) =>
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handlePageChange(page)}
                className="min-w-[2.5rem]"
              >
                {page}
              </Button>
            )
          )}
        </div>

        {/* Indicador de página en móviles */}
        <div className="sm:hidden px-3 py-1 text-sm font-medium text-gray-700">
          Pág. {currentPage} / {totalPages}
        </div>

        {/* Página siguiente */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Página siguiente"
          className="p-2"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Última página */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="Última página"
          className="p-2"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Selector de registros por página */}
      {showPageSizeSelector && (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span>Mostrar</span>
          <Select
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            className="py-1 text-sm"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
          <span>por página</span>
        </div>
      )}
    </div>
  )
}
