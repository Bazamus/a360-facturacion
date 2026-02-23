import { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { normalizeForSearch } from '@/utils/normalizeSearch'
import { cn } from '@/lib/utils'

const emptyId = ''

/**
 * Selector de comunidad con modal y búsqueda por indicio de texto.
 * Búsqueda insensible a mayúsculas y acentos.
 */
export function CommunityPicker({
  value,
  onChange,
  comunidades = [],
  placeholder = 'Selecciona una comunidad',
  allowEmpty = false,
  label,
  className
}) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const searchInputRef = useRef(null)

  const selectedComunidad = useMemo(
    () => (value ? comunidades.find((c) => c.id === value) : null),
    [comunidades, value]
  )

  const displayText = selectedComunidad
    ? `${selectedComunidad.codigo} - ${selectedComunidad.nombre}`
    : placeholder

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return comunidades
    const normalized = normalizeForSearch(searchTerm)
    return comunidades.filter((c) => {
      const full = `${c.codigo || ''} ${c.nombre || ''}`.trim()
      return normalizeForSearch(full).includes(normalized)
    })
  }, [comunidades, searchTerm])

  useEffect(() => {
    if (open) {
      setSearchTerm('')
      const t = setTimeout(() => searchInputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  const handleSelect = (id) => {
    onChange(id === emptyId ? '' : id)
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
        onClick={() => setOpen(true)}
        className={cn(
          'w-full flex items-center justify-between gap-2',
          'px-3 py-2 text-sm text-left border rounded-lg',
          'bg-white border-gray-300 transition-colors',
          'hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          !displayText || displayText === placeholder
            ? 'text-gray-500'
            : 'text-gray-900'
        )}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Seleccionar comunidad"
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
              placeholder="Buscar por código o nombre..."
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="max-h-[50vh] overflow-y-auto border border-gray-200 rounded-lg">
            {allowEmpty && (
              <button
                type="button"
                onClick={() => handleSelect(emptyId)}
                className={cn(
                  'w-full px-4 py-3 text-left text-sm border-b border-gray-100',
                  'hover:bg-gray-50 text-gray-500 font-medium'
                )}
              >
                Todas las comunidades
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No hay coincidencias
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c.id)}
                  className={cn(
                    'w-full px-4 py-3 text-left text-sm transition-colors',
                    'hover:bg-gray-50 border-b border-gray-100 last:border-b-0',
                    value === c.id && 'bg-primary-50 text-primary-800'
                  )}
                >
                  {c.codigo} - {c.nombre}
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
