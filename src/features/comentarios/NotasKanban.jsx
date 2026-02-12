import { useState, useMemo } from 'react'
import { NotaCard, ESTADO_CONFIG } from './NotaCard'
import { useUpdateComentario } from '@/hooks/useComentarios'
import { useToast } from '@/components/ui/Toast'

const COLUMNAS = [
  { key: 'abierto', headerBg: 'bg-yellow-50 border-yellow-200', dotColor: 'bg-yellow-400' },
  { key: 'en_progreso', headerBg: 'bg-blue-50 border-blue-200', dotColor: 'bg-blue-400' },
  { key: 'resuelto', headerBg: 'bg-green-50 border-green-200', dotColor: 'bg-green-400' }
]

export function NotasKanban({ notas = [], onEdit, onDelete, onTogglePin, canModify, canEditDelete }) {
  const toast = useToast()
  const updateMutation = useUpdateComentario()
  const [dragOverColumn, setDragOverColumn] = useState(null)

  // Agrupar notas por estado
  const columnas = useMemo(() => {
    const grouped = { abierto: [], en_progreso: [], resuelto: [] }
    notas.forEach(nota => {
      if (grouped[nota.estado]) {
        grouped[nota.estado].push(nota)
      }
    })
    return grouped
  }, [notas])

  // Drag and Drop handlers
  const handleDragOver = (e, estado) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(estado)
  }

  const handleDragLeave = (e) => {
    // Solo limpiar si salimos de la columna, no de un hijo
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null)
    }
  }

  const handleDrop = async (e, nuevoEstado) => {
    e.preventDefault()
    setDragOverColumn(null)
    const notaId = e.dataTransfer.getData('text/plain')

    if (!notaId) return

    // Verificar que el estado es diferente
    const nota = notas.find(n => n.id === notaId)
    if (!nota || nota.estado === nuevoEstado) return

    try {
      await updateMutation.mutateAsync({ id: notaId, estado: nuevoEstado })
    } catch (error) {
      toast.error('Error al cambiar estado')
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[400px]">
      {COLUMNAS.map(({ key, headerBg, dotColor }) => {
        const config = ESTADO_CONFIG[key]
        const items = columnas[key] || []
        const isDragOver = dragOverColumn === key

        return (
          <div
            key={key}
            className={`flex flex-col rounded-xl border-2 transition-all duration-200 ${
              isDragOver
                ? 'border-primary-400 bg-primary-50/50 shadow-lg'
                : 'border-gray-200 bg-gray-50/50'
            }`}
            onDragOver={(e) => handleDragOver(e, key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, key)}
          >
            {/* Header de columna */}
            <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl border-b ${headerBg}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                <h3 className="text-sm font-semibold text-gray-700">{config.label}</h3>
              </div>
              <span className="text-xs font-medium text-gray-500 bg-white/80 px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            </div>

            {/* Contenido scrollable */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[200px]">
              {items.length === 0 ? (
                <div className={`flex items-center justify-center h-24 rounded-lg border-2 border-dashed transition-colors ${
                  isDragOver ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                }`}>
                  <p className="text-xs text-gray-400">
                    {isDragOver ? 'Soltar aqui' : 'Sin notas'}
                  </p>
                </div>
              ) : (
                items.map(nota => (
                  <NotaCard
                    key={nota.id}
                    nota={nota}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onTogglePin={onTogglePin}
                    canModify={canEditDelete ? canEditDelete(nota) : canModify(nota)}
                    draggable={canModify(nota)}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
