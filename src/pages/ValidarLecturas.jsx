import React, { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check, X, ArrowLeft, Filter, Trash2 } from 'lucide-react'
import { Button, Card, LoadingSpinner } from '@/components/ui'
import { ValidacionStats, ValidacionTable, DetallePanel } from '@/features/lecturas/components'
import { contarPorEstado } from '@/features/lecturas/utils/alertDetector'
import { 
  useImportacion, 
  useImportacionDetalle,
  useConfirmarImportacion,
  useDescartarFilas,
  useUpdateImportacion
} from '@/hooks/useLecturas'
import { useToast } from '@/components/ui/Toast'

const FILTROS = [
  { value: 'todas', label: 'Todas' },
  { value: 'valido', label: 'Válidas' },
  { value: 'alerta', label: 'Con alertas' },
  { value: 'error', label: 'Errores' }
]

export default function ValidarLecturas() {
  const { id: importacionId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [selectedIds, setSelectedIds] = useState(new Set())
  const [filter, setFilter] = useState('todas')
  const [detailFila, setDetailFila] = useState(null)

  const { data: importacion, isLoading: loadingImportacion } = useImportacion(importacionId)
  const { 
    data: detalles, 
    isLoading: loadingDetalles,
    refetch: refetchDetalles 
  } = useImportacionDetalle(importacionId)
  
  const confirmarImportacion = useConfirmarImportacion()
  const descartarFilas = useDescartarFilas()
  const updateImportacion = useUpdateImportacion()

  // Calcular estadísticas
  const stats = useMemo(() => {
    if (!detalles) return { total: 0, validas: 0, conAlertas: 0, errores: 0 }
    return contarPorEstado(detalles)
  }, [detalles])

  // Filas confirmables seleccionadas
  const filasConfirmables = useMemo(() => {
    if (!detalles) return []
    return detalles.filter(f => 
      selectedIds.has(f.id) && 
      (f.estado === 'valido' || (f.estado === 'alerta' && !f.alertas?.some(a => a.bloquea)))
    )
  }, [detalles, selectedIds])

  const handleConfirmar = async () => {
    if (filasConfirmables.length === 0) {
      toast.error('No hay lecturas seleccionadas para confirmar')
      return
    }

    try {
      const result = await confirmarImportacion.mutateAsync(importacionId)
      toast.success(`${result.count} lecturas confirmadas correctamente`)
      navigate('/lecturas/historial')
    } catch (error) {
      toast.error(`Error al confirmar: ${error.message}`)
    }
  }

  const handleDescartar = async () => {
    if (selectedIds.size === 0) {
      toast.error('Selecciona las filas a descartar')
      return
    }

    if (!confirm(`¿Descartar ${selectedIds.size} filas seleccionadas?`)) return

    try {
      await descartarFilas.mutateAsync({
        ids: Array.from(selectedIds),
        importacionId
      })
      toast.success('Filas descartadas')
      setSelectedIds(new Set())
    } catch (error) {
      toast.error(`Error: ${error.message}`)
    }
  }

  const handleCancelar = async () => {
    if (!confirm('¿Cancelar esta importación? Los datos se perderán.')) return

    try {
      await updateImportacion.mutateAsync({
        id: importacionId,
        estado: 'cancelado'
      })
      toast.success('Importación cancelada')
      navigate('/lecturas/historial')
    } catch (error) {
      toast.error(`Error: ${error.message}`)
    }
  }

  if (loadingImportacion || loadingDetalles) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!importacion) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Importación no encontrada</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/lecturas/historial')}
        >
          Volver al historial
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/lecturas/historial')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Validación de Lecturas</h1>
            <p className="text-gray-500 mt-1">
              {importacion.comunidad?.nombre} - {importacion.nombre_archivo}
            </p>
          </div>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={handleCancelar}
        >
          <X className="w-4 h-4 mr-2" />
          Cancelar importación
        </Button>
      </div>

      {/* Estadísticas */}
      <ValidacionStats stats={stats} />

      {/* Filtros y acciones */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="flex gap-1">
              {FILTROS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filter === f.value
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <span className="text-sm text-gray-500">
                  {selectedIds.size} seleccionadas
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDescartar}
                  isLoading={descartarFilas.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Descartar
                </Button>
              </>
            )}
            <Button
              onClick={handleConfirmar}
              disabled={filasConfirmables.length === 0}
              isLoading={confirmarImportacion.isPending}
            >
              <Check className="w-4 h-4 mr-2" />
              Confirmar {filasConfirmables.length > 0 ? `(${filasConfirmables.length})` : ''}
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabla */}
      <ValidacionTable
        filas={detalles || []}
        selectedIds={selectedIds}
        onSelectChange={setSelectedIds}
        onSelectAll={setSelectedIds}
        onViewDetail={setDetailFila}
        filter={filter}
      />

      {/* Panel de detalle */}
      {detailFila && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setDetailFila(null)}
          />
          <DetallePanel
            fila={detailFila}
            onClose={() => setDetailFila(null)}
            onUpdate={() => {
              refetchDetalles()
              setDetailFila(null)
            }}
          />
        </>
      )}
    </div>
  )
}

