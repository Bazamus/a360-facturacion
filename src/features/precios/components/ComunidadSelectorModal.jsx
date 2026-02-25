import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Search, X, Check, Building2, ChevronDown, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Modal de selección de comunidades — diseño moderno con búsqueda y checkboxes
 * Soporta modo multi-select y single-select
 */
export function ComunidadSelectorModal({
  comunidades = [],
  selected = [],
  onChange,
  filtroReferencia,
  mode = 'multi',          // 'multi' | 'single'
  className,
  placeholder,
  label
}) {
  const [open, setOpen] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [highlightIdx, setHighlightIdx] = useState(0)
  const searchRef = useRef(null)
  const listRef = useRef(null)

  // Normalizar selected siempre como array
  const selectedIds = useMemo(() => {
    if (mode === 'single') return (selected != null && selected !== '') ? [selected] : []
    return Array.isArray(selected) ? selected : []
  }, [selected, mode])

  // Filtrar comunidades
  const filtradas = useMemo(() => {
    let list = comunidades
    if (filtroReferencia) {
      list = list.filter(c => c.referencia_energia === filtroReferencia)
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      list = list.filter(c =>
        c.nombre?.toLowerCase().includes(q) ||
        c.codigo?.toLowerCase().includes(q) ||
        c.ciudad?.toLowerCase().includes(q)
      )
    }
    return list
  }, [comunidades, filtroReferencia, busqueda])

  // Comunidades sin referencia (para warning)
  const sinReferencia = useMemo(() => {
    if (!filtroReferencia) return 0
    return comunidades.filter(c => !c.referencia_energia).length
  }, [comunidades, filtroReferencia])

  const allSelected = filtradas.length > 0 && filtradas.every(c => selectedIds.includes(c.id))
  const someSelected = filtradas.some(c => selectedIds.includes(c.id)) && !allSelected

  // Toggle individual
  const toggle = useCallback((id) => {
    if (mode === 'single') {
      onChange(id)
      setOpen(false)
      return
    }
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(s => s !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }, [mode, selectedIds, onChange])

  // Toggle all (solo multi)
  const toggleAll = useCallback(() => {
    if (mode !== 'multi') return
    if (allSelected) {
      const filtradasIds = new Set(filtradas.map(c => c.id))
      onChange(selectedIds.filter(s => !filtradasIds.has(s)))
    } else {
      const newIds = filtradas.map(c => c.id)
      onChange([...new Set([...selectedIds, ...newIds])])
    }
  }, [mode, allSelected, filtradas, selectedIds, onChange])

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    const maxIdx = filtradas.length - 1

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIdx(prev => Math.min(prev + 1, maxIdx))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIdx(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        // Solo actuar si el foco está en el buscador (evita doble-toggle con botones de lista)
        if (document.activeElement === searchRef.current && filtradas[highlightIdx]) {
          toggle(filtradas[highlightIdx].id)
        }
        break
      case 'Escape':
        e.preventDefault()
        e.stopPropagation()  // Evita que el Modal padre también se cierre
        setOpen(false)
        break
      case 'a':
        if ((e.ctrlKey || e.metaKey) && mode === 'multi') {
          e.preventDefault()
          toggleAll()
        }
        break
    }
  }, [filtradas, highlightIdx, toggle, toggleAll, mode])

  // Auto-scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-idx="${highlightIdx}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [highlightIdx])

  // Focus search on open
  useEffect(() => {
    if (open) {
      setBusqueda('')
      setHighlightIdx(0)
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [open])

  // Reset highlight on search change
  useEffect(() => { setHighlightIdx(0) }, [busqueda])

  // Texto del trigger
  const triggerText = useMemo(() => {
    if (mode === 'single') {
      const com = comunidades.find(c => c.id === selected)
      return com ? `${com.codigo} — ${com.nombre}` : null
    }
    if (selectedIds.length === 0) return null
    if (selectedIds.length === 1) {
      const com = comunidades.find(c => c.id === selectedIds[0])
      return com ? `${com.codigo} — ${com.nombre}` : '1 comunidad'
    }
    return `${selectedIds.length} comunidades seleccionadas`
  }, [mode, selected, selectedIds, comunidades])

  const defaultPlaceholder = mode === 'multi' ? 'Seleccionar comunidades...' : 'Seleccionar comunidad...'

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'w-full flex items-center justify-between gap-2 rounded-lg border bg-white px-3.5 py-2.5 text-sm text-left transition-all',
          'hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500',
          triggerText ? 'border-primary-300' : 'border-gray-300',
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className={cn('truncate', triggerText ? 'text-gray-900 font-medium' : 'text-gray-400')}>
            {triggerText || placeholder || defaultPlaceholder}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {mode === 'multi' && selectedIds.length > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary-600 text-[11px] font-bold text-white">
              {selectedIds.length}
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </button>

      {/* Badges (multi only) */}
      {mode === 'multi' && selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedIds.slice(0, 6).map(id => {
            const com = comunidades.find(c => c.id === id)
            if (!com) return null
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-md bg-primary-50 border border-primary-200 px-2 py-0.5 text-xs font-medium text-primary-700"
              >
                {com.codigo}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggle(id) }}
                  className="hover:text-primary-900 ml-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
          {selectedIds.length > 6 && (
            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              +{selectedIds.length - 6} más
            </span>
          )}
        </div>
      )}

      {/* Modal Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center pt-[8vh] p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: 'min(72vh, 600px)' }}
            onKeyDown={handleKeyDown}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {mode === 'multi' ? 'Seleccionar comunidades' : 'Seleccionar comunidad'}
                  </h3>
                  {filtroReferencia && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Filtrado por referencia: <span className="font-medium text-primary-600">{filtroReferencia.replace('_', ' ')}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  className={cn(
                    'w-full rounded-xl border border-gray-200 bg-gray-50/80 py-2.5 pl-10 pr-20 text-sm',
                    'placeholder:text-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 focus:bg-white',
                    'transition-all'
                  )}
                  placeholder="Buscar por código, nombre o ciudad..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-gray-200/80 text-[10px] font-mono text-gray-500 border border-gray-300/50">
                    ↑↓
                  </kbd>
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-gray-200/80 text-[10px] font-mono text-gray-500 border border-gray-300/50">
                    Enter
                  </kbd>
                </div>
              </div>
            </div>

            {/* Warning sin referencia */}
            {filtroReferencia && sinReferencia > 0 && (
              <div className="mx-5 mb-2 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200/70 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                <span className="text-xs text-amber-700">
                  {sinReferencia} comunidad{sinReferencia > 1 ? 'es' : ''} sin referencia energética configurada (no mostrada{sinReferencia > 1 ? 's' : ''})
                </span>
              </div>
            )}

            {/* Select All (multi only) */}
            {mode === 'multi' && filtradas.length > 0 && (
              <div className="mx-5 mb-1">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors group"
                >
                  <div className={cn(
                    'h-[18px] w-[18px] rounded flex-shrink-0 flex items-center justify-center border-2 transition-all',
                    allSelected
                      ? 'bg-primary-600 border-primary-600'
                      : someSelected
                        ? 'bg-primary-100 border-primary-400'
                        : 'border-gray-300 group-hover:border-gray-400'
                  )}>
                    {allSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    {someSelected && !allSelected && <div className="h-1.5 w-1.5 rounded-sm bg-primary-500" />}
                  </div>
                  <span className="font-medium text-gray-700">Seleccionar todas</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {filtradas.length} comunidad{filtradas.length !== 1 ? 'es' : ''}
                    {mode === 'multi' && <span className="hidden sm:inline ml-2 text-gray-300">Ctrl+A</span>}
                  </span>
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="mx-5 border-t border-gray-100" />

            {/* List */}
            <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-1 min-h-0">
              {filtradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Building2 className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm font-medium">No se encontraron comunidades</p>
                  {busqueda && (
                    <p className="text-xs mt-1">
                      Prueba con otro término de búsqueda
                    </p>
                  )}
                </div>
              ) : (
                filtradas.map((com, idx) => {
                  const isSelected = selectedIds.includes(com.id)
                  const isHighlighted = idx === highlightIdx

                  return (
                    <button
                      key={com.id}
                      type="button"
                      data-idx={idx}
                      onClick={() => toggle(com.id)}
                      onMouseEnter={() => setHighlightIdx(idx)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left transition-all',
                        'group',
                        isHighlighted && !isSelected && 'bg-gray-50',
                        isSelected && 'bg-primary-50/70',
                        isHighlighted && isSelected && 'bg-primary-50',
                      )}
                    >
                      {/* Checkbox */}
                      <div className={cn(
                        'h-[18px] w-[18px] rounded flex-shrink-0 flex items-center justify-center border-2 transition-all',
                        isSelected
                          ? 'bg-primary-600 border-primary-600 shadow-sm shadow-primary-200'
                          : 'border-gray-300 group-hover:border-gray-400'
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <span className={cn(
                          'font-mono text-xs font-bold px-2 py-0.5 rounded',
                          isSelected
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-gray-100 text-gray-600'
                        )}>
                          {com.codigo}
                        </span>
                        <span className={cn(
                          'truncate',
                          isSelected ? 'text-primary-900 font-medium' : 'text-gray-700'
                        )}>
                          {com.nombre}
                        </span>
                      </div>

                      {/* Ciudad */}
                      {com.ciudad && (
                        <span className="hidden sm:inline text-xs text-gray-400 flex-shrink-0">
                          {com.ciudad}
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="text-xs text-gray-400">
                {mode === 'multi' && selectedIds.length > 0 && (
                  <span>{selectedIds.length} seleccionada{selectedIds.length !== 1 ? 's' : ''}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {mode === 'multi' && selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-200/70 transition-colors"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm"
                >
                  {mode === 'multi' ? 'Confirmar' : 'Cerrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
