import { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { normalizeForSearch } from '@/utils/normalizeSearch'
import { cn } from '@/lib/utils'

/**
 * Selector con modal y búsqueda por indicio de texto.
 * Búsqueda insensible a mayúsculas y acentos.
 * @param {Object} props
 * @param {string} props.value - Valor seleccionado (value del option)
 * @param {function(string): void} props.onChange - Callback con el value elegido
 * @param {Array<{ value: string, label: string }>} props.options - Opciones a mostrar
 * @param {string} [props.placeholder] - Texto cuando no hay selección
 * @param {boolean} [props.allowEmpty] - Si se puede elegir opción vacía
 * @param {string} [props.label] - Etiqueta del campo
 * @param {string} [props.modalTitle] - Título del modal
 * @param {string} [props.searchPlaceholder] - Placeholder del input de búsqueda
 * @param {string} [props.emptyOptionLabel] - Texto de la opción vacía (si allowEmpty)
 * @param {string} [props.className] - Clases del contenedor
 * @param {boolean} [props.disabled] - Deshabilitar el disparador
 */
export function SearchablePicker({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  allowEmpty = false,
  label,
  modalTitle = 'Seleccionar',
  searchPlaceholder = 'Buscar...',
  emptyOptionLabel = 'Ninguna',
  className,
  disabled = false
}) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const searchInputRef = useRef(null)

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value]
  )

  const displayText = selectedOption ? selectedOption.label : placeholder

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return options
    const normalized = normalizeForSearch(searchTerm)
    return options.filter((o) =>
      normalizeForSearch(o.label || '').includes(normalized)
    )
  }, [options, searchTerm])

  useEffect(() => {
    if (open) {
      setSearchTerm('')
      const t = setTimeout(() => searchInputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  const handleSelect = (selectedValue) => {
    onChange(selectedValue === '' ? '' : selectedValue)
    setOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      {label && (
        <label className="block text-xs font-medium text-gray-500 mb-1">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between gap-2',
          'px-3 py-2 text-sm text-left border rounded-lg',
          'bg-white border-gray-300 transition-colors',
          'hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          (disabled || !displayText || displayText === placeholder)
            ? 'text-gray-500'
            : 'text-gray-900',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={modalTitle}
        size="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="max-h-[50vh] overflow-y-auto border border-gray-200 rounded-lg">
            {allowEmpty && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={cn(
                  'w-full px-4 py-3 text-left text-sm border-b border-gray-100',
                  'hover:bg-gray-50 text-gray-500 font-medium'
                )}
              >
                {emptyOptionLabel}
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No hay coincidencias
              </div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => handleSelect(o.value)}
                  className={cn(
                    'w-full px-4 py-3 text-left text-sm transition-colors',
                    'hover:bg-gray-50 border-b border-gray-100 last:border-b-0',
                    value === o.value && 'bg-primary-50 text-primary-800'
                  )}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
