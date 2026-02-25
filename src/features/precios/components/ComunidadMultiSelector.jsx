import { useState, useMemo } from 'react'
import { Search, X, Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Multi-selector de comunidades con búsqueda y "Seleccionar todas"
 */
export function ComunidadMultiSelector({
  comunidades = [],
  selected = [],
  onChange,
  filtroReferencia,
  className
}) {
  const [open, setOpen] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const filtradas = useMemo(() => {
    let list = comunidades
    if (filtroReferencia) {
      list = list.filter(c => c.referencia_energia === filtroReferencia)
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      list = list.filter(c =>
        c.nombre.toLowerCase().includes(q) ||
        c.codigo.toLowerCase().includes(q)
      )
    }
    return list
  }, [comunidades, filtroReferencia, busqueda])

  const sinReferencia = useMemo(() => {
    if (!filtroReferencia) return []
    return comunidades.filter(c => !c.referencia_energia)
  }, [comunidades, filtroReferencia])

  const allSelected = filtradas.length > 0 && filtradas.every(c => selected.includes(c.id))

  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  const toggleAll = () => {
    if (allSelected) {
      const filtradasIds = filtradas.map(c => c.id)
      onChange(selected.filter(s => !filtradasIds.includes(s)))
    } else {
      const newIds = filtradas.map(c => c.id)
      onChange([...new Set([...selected, ...newIds])])
    }
  }

  return (
    <div className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <span className={selected.length ? 'text-gray-900' : 'text-gray-400'}>
          {selected.length
            ? `${selected.length} comunidad${selected.length > 1 ? 'es' : ''} seleccionada${selected.length > 1 ? 's' : ''}`
            : 'Seleccionar comunidades...'}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Badges de seleccionadas */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selected.slice(0, 5).map(id => {
            const com = comunidades.find(c => c.id === id)
            if (!com) return null
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700"
              >
                {com.codigo}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggle(id) }}
                  className="hover:text-primary-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
          {selected.length > 5 && (
            <span className="text-xs text-gray-500 py-0.5">
              +{selected.length - 5} más
            </span>
          )}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-64 overflow-hidden flex flex-col">
          {/* Búsqueda */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Buscar comunidad..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Warning sin referencia */}
          {filtroReferencia && sinReferencia.length > 0 && (
            <div className="px-3 py-1.5 bg-amber-50 text-xs text-amber-700 border-b border-amber-100">
              {sinReferencia.length} comunidad{sinReferencia.length > 1 ? 'es' : ''} sin referencia energética configurada
            </div>
          )}

          {/* Seleccionar todas */}
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 border-b border-gray-100"
          >
            <div className={cn(
              'h-4 w-4 rounded border flex items-center justify-center',
              allSelected ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
            )}>
              {allSelected && <Check className="h-3 w-3 text-white" />}
            </div>
            Seleccionar todas ({filtradas.length})
          </button>

          {/* Lista */}
          <div className="overflow-y-auto flex-1">
            {filtradas.map(com => {
              const isSelected = selected.includes(com.id)
              return (
                <button
                  key={com.id}
                  type="button"
                  onClick={() => toggle(com.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50',
                    isSelected && 'bg-primary-50'
                  )}
                >
                  <div className={cn(
                    'h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center',
                    isSelected ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                  )}>
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-gray-900">{com.codigo}</span>
                    <span className="ml-2 text-gray-500 truncate">{com.nombre}</span>
                  </div>
                </button>
              )
            })}
            {filtradas.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                No se encontraron comunidades
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
      )}
    </div>
  )
}
