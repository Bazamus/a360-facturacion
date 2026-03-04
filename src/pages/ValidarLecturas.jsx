import React, { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { Check, X, ArrowLeft, Filter, Trash2, FileSpreadsheet } from 'lucide-react'
import { Button, Card, LoadingSpinner } from '@/components/ui'
import { ValidacionStats, ValidacionTable, DetallePanel, agruparPorContador } from '@/features/lecturas/components'
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

/** Formato decimal europeo: coma como separador (ej. 0,25  456,28) */
function formatEuropean(value, decimals = 2) {
  if (value == null || Number.isNaN(Number(value))) return ''
  const num = Number(value)
  const fixed = num.toFixed(decimals)
  return fixed.replace('.', ',')
}

/** Nombre de archivo seguro a partir de comunidad: ej. 309_VI_TORRE_VIANA_1_LECTURA */
function nombreArchivoLecturas(comunidad) {
  if (!comunidad) return 'LECTURA'
  const codigo = (comunidad.codigo ?? '').toString().trim()
  const nombre = (comunidad.nombre ?? '')
    .replace(/\s+/g, '_')
    .replace(/[/\\:*?"<>|]/g, '')
    .trim()
  const base = nombre ? `${codigo}_${nombre}` : codigo || 'LECTURA'
  return `${base}_LECTURA`
}

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

  // Datos agrupados y filtrados (misma lógica que la tabla) para exportar a Excel
  const datosParaExportar = useMemo(() => {
    if (!detalles) return []
    const agrupadas = agruparPorContador(detalles)
    return agrupadas.filter(grupo => {
      if (filter === 'todas' || filter === 'todos') return true
      if (filter === 'valido') return grupo.estado === 'valido'
      if (filter === 'alerta') return grupo.estado === 'alerta'
      if (filter === 'error') return grupo.estado === 'error'
      return true
    })
  }, [detalles, filter])

  // Orden de columnas de conceptos para Excel (único, alfabético)
  const columnasConceptosExport = useMemo(() => {
    const codigos = new Set()
    datosParaExportar.forEach(grupo => {
      grupo.conceptos.forEach(c => codigos.add(c.concepto_codigo))
    })
    return Array.from(codigos).sort()
  }, [datosParaExportar])

  const getEstadoLabel = (estado) => {
    switch (estado) {
      case 'valido': return 'Válida'
      case 'alerta': return 'Con alertas'
      case 'error': return 'Error'
      default: return estado || '—'
    }
  }

  const handleExportarExcel = () => {
    const filasExcel = datosParaExportar.map(grupo => {
      const mapConceptos = {}
      grupo.conceptos.forEach(c => {
        mapConceptos[c.concepto_codigo] = formatEuropean(c.consumo_calculado, 1)
      })
      const row = {
        PORTAL: grupo.portal ?? '—',
        VIVIENDA: grupo.vivienda ?? '—',
        CLIENTE: grupo.cliente_nombre || 'Sin asignar',
        CONTADOR: grupo.numero_contador ?? '—'
      }
      columnasConceptosExport.forEach(cod => {
        row[cod] = mapConceptos[cod] ?? ''
      })
      row.ESTADO = getEstadoLabel(grupo.estado)
      return row
    })

    const ws = XLSX.utils.json_to_sheet(filasExcel)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Validación lecturas')
    const baseNombre = nombreArchivoLecturas(importacion?.comunidad)
    const nombreArchivo = `${baseNombre}.xlsx`
    XLSX.writeFile(wb, nombreArchivo)
    toast.success(`${filasExcel.length} filas exportadas a Excel`)
  }

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
              variant="outline"
              size="sm"
              onClick={handleExportarExcel}
              disabled={!datosParaExportar.length}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar a Excel
            </Button>
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




