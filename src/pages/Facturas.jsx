import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, CheckSquare, X, Download, FileSpreadsheet, FilePlus } from 'lucide-react'
import { Button, Card, Modal } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { FacturasTable, FacturaFilters, EstadoBadge, ModalExportarFacturas, ProgressoExportacion } from '@/features/facturacion/components'
import { formatCurrency, formatDate } from '@/features/facturacion/utils/calculos'
import { descargarFacturaPDF } from '@/features/facturacion/pdf'
import { supabase } from '@/lib/supabase'
import { useComunidades } from '@/hooks/useComunidades'
import {
  useFacturas,
  useDeleteFactura,
  useMarcarPagada,
  useEstadisticasFacturacion,
  useEmitirFacturasMasivo
} from '@/hooks/useFacturas'
import { useExportarFacturas } from '@/features/facturacion/hooks/useExportarFacturas'

export default function Facturas() {
  const navigate = useNavigate()
  const toast = useToast()

  const [filters, setFilters] = useState({
    comunidadId: '',
    estado: '',
    search: ''
  })
  const [deleteModal, setDeleteModal] = useState({ open: false, factura: null })
  const [pagarModal, setPagarModal] = useState({ open: false, factura: null })
  const [selectedIds, setSelectedIds] = useState([])
  const [emitiendo, setEmitiendo] = useState(false)
  const [descargandoPDF, setDescargandoPDF] = useState(null) // ID de la factura siendo descargada
  const [modo, setModo] = useState('emision') // 'emision' | 'descarga'
  const [descargandoPDFs, setDescargandoPDFs] = useState(false)
  const [progresoDescarga, setProgresoDescarga] = useState({ actual: 0, total: 0 })

  const { data: comunidades } = useComunidades()
  const { data: facturas, isLoading } = useFacturas(filters)
  const { data: stats } = useEstadisticasFacturacion(filters)
  const deleteFactura = useDeleteFactura()
  const marcarPagada = useMarcarPagada()
  const emitirMasivo = useEmitirFacturasMasivo()
  const { exportar } = useExportarFacturas()

  // Estados para exportación
  const [modalExport, setModalExport] = useState(false)
  const [progresoExportacion, setProgresoExportacion] = useState(null)

  // Contar borradores para mostrar botón de emisión rápida
  const borradoresCount = facturas?.filter(f => f.estado === 'borrador').length || 0

  // Handlers
  const handleView = (factura) => {
    navigate(`/facturacion/facturas/${factura.id}`)
  }

  const handleEdit = (factura) => {
    navigate(`/facturacion/facturas/${factura.id}/editar`)
  }

  const handleDelete = async () => {
    try {
      await deleteFactura.mutateAsync(deleteModal.factura.id)
      toast.success('Factura eliminada')
      setDeleteModal({ open: false, factura: null })
    } catch (error) {
      toast.error(`Error: ${error.message}`)
    }
  }

  const handleMarcarPagada = async () => {
    try {
      await marcarPagada.mutateAsync({ facturaId: pagarModal.factura.id })
      toast.success('Factura marcada como pagada')
      setPagarModal({ open: false, factura: null })
    } catch (error) {
      toast.error(`Error: ${error.message}`)
    }
  }

  const handlePDF = async (factura) => {
    try {
      setDescargandoPDF(factura.id)

      // Obtener factura completa con todos los campos (incluyendo dirección)
      const { data: facturaCompleta, error: facturaError } = await supabase
        .from('facturas')
        .select('*')
        .eq('id', factura.id)
        .single()

      if (facturaError) {
        console.error('Error al obtener factura completa:', facturaError)
        throw facturaError
      }

      // Obtener líneas de la factura
      const { data: lineas, error: lineasError } = await supabase
        .from('facturas_lineas')
        .select('*')
        .eq('factura_id', factura.id)
        .order('orden')

      if (lineasError) {
        console.error('Error al obtener líneas:', lineasError)
      }

      // Obtener histórico de consumo
      const { data: historico, error: historicoError } = await supabase
        .from('v_historico_consumo_factura')
        .select('*')
        .eq('factura_id', factura.id)
        .order('fecha_lectura')

      if (historicoError) {
        console.error('Error al obtener histórico:', historicoError)
      }

      // Descargar PDF con la factura completa que incluye todos los campos
      descargarFacturaPDF(facturaCompleta, lineas || [], historico || [])

      toast.success('PDF descargado correctamente')
    } catch (error) {
      console.error('Error descargando PDF:', error)
      toast.error('Error al descargar el PDF')
    } finally {
      setDescargandoPDF(null)
    }
  }

  const handleEmail = (factura) => {
    toast.info('Funcionalidad de envío por email disponible en Fase 4')
  }

  const clearFilters = () => {
    setFilters({ comunidadId: '', estado: '', search: '' })
  }

  // Handler emisión masiva
  const handleEmitirMasivo = async () => {
    if (selectedIds.length === 0) return

    const confirmar = window.confirm(
      `¿Emitir ${selectedIds.length} factura${selectedIds.length > 1 ? 's' : ''}? Esta acción no se puede deshacer.`
    )

    if (!confirmar) return

    setEmitiendo(true)
    try {
      const resultado = await emitirMasivo.mutateAsync(selectedIds)

      const exitosas = resultado.filter(r => r.success).length
      const fallidas = resultado.filter(r => !r.success).length

      if (fallidas === 0) {
        toast.success(`${exitosas} factura${exitosas > 1 ? 's' : ''} emitida${exitosas > 1 ? 's' : ''} correctamente`)
      } else {
        toast.warning(`${exitosas} emitidas correctamente, ${fallidas} con errores`)
      }

      setSelectedIds([])
    } catch (error) {
      toast.error('Error al emitir facturas: ' + error.message)
    } finally {
      setEmitiendo(false)
    }
  }

  // Handler seleccionar todos los borradores
  const handleSeleccionarTodosBorradores = () => {
    const borradoresIds = facturas
      ?.filter(f => f.estado === 'borrador')
      .map(f => f.id) || []

    setSelectedIds(borradoresIds)
  }

  // Handler abrir modal de exportación
  const handleAbrirModalExportar = () => {
    if (!facturas || facturas.length === 0) {
      toast.error('No hay facturas para exportar')
      return
    }
    setModalExport(true)
  }

  // Handler exportar a Excel con configuración
  const handleExportarExcel = async (config) => {
    try {
      setModalExport(false)
      setProgresoExportacion({ current: 0, total: 100, message: 'Iniciando...' })

      await exportar.mutateAsync({
        facturas,
        config,
        onProgress: (progreso) => {
          setProgresoExportacion(progreso)
        }
      })

      toast.success(`${facturas.length} factura${facturas.length > 1 ? 's' : ''} exportada${facturas.length > 1 ? 's' : ''} a Excel`)

      // Limpiar progreso después de un delay
      setTimeout(() => {
        setProgresoExportacion(null)
      }, 1000)
    } catch (error) {
      console.error('Error exportando facturas:', error)
      toast.error('Error al exportar facturas: ' + error.message)
      setProgresoExportacion(null)
    }
  }

  // Handler descarga masiva de PDFs
  const handleDescargarPDFsMasivo = async () => {
    if (selectedIds.length === 0) return

    // Validar límite máximo
    if (selectedIds.length > 100) {
      toast.error('Máximo 100 facturas por descarga')
      return
    }

    // Advertencia si >20 facturas
    if (selectedIds.length > 20) {
      const confirmar = window.confirm(
        `Vas a descargar ${selectedIds.length} PDFs. Esto puede tardar varios minutos. ¿Continuar?`
      )
      if (!confirmar) return
    }

    setDescargandoPDFs(true)
    setProgresoDescarga({ actual: 0, total: selectedIds.length })

    try {
      // Importar JSZip dinámicamente
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const folder = zip.folder("facturas")

      const facturasSeleccionadas = facturas.filter(f => selectedIds.includes(f.id))

      // Generar cada PDF
      for (let i = 0; i < facturasSeleccionadas.length; i++) {
        const factura = facturasSeleccionadas[i]
        setProgresoDescarga({ actual: i + 1, total: selectedIds.length })

        // Obtener factura completa con todos los campos (incluyendo dirección)
        const { data: facturaCompleta } = await supabase
          .from('facturas')
          .select('*')
          .eq('id', factura.id)
          .single()

        // Fetch líneas de la factura
        const { data: lineas } = await supabase
          .from('facturas_lineas')
          .select('*')
          .eq('factura_id', factura.id)
          .order('orden')

        // Fetch histórico de consumo
        const { data: historico } = await supabase
          .from('v_historico_consumo_factura')
          .select('*')
          .eq('factura_id', factura.id)
          .order('fecha_lectura')

        // Generar PDF como blob usando la factura completa
        const { getFacturaPDFBlob } = await import('@/features/facturacion/pdf')
        const pdfBlob = await getFacturaPDFBlob(facturaCompleta || factura, lineas || [], historico || [])

        // Nombre de archivo sanitizado
        const nombreArchivo = `${factura.numero_completo}_${factura.cliente_nombre}.pdf`
          .replace(/[/\\?%*:|"<>]/g, '-')
          .replace(/\s+/g, '_')

        folder.file(nombreArchivo, pdfBlob)
      }

      // Generar y descargar ZIP
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      })

      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Facturas_${new Date().toISOString().split('T')[0]}.zip`
      link.click()
      URL.revokeObjectURL(url)

      toast.success(`${facturasSeleccionadas.length} PDFs descargados en ZIP correctamente`)
      setSelectedIds([])
    } catch (error) {
      console.error('Error descargando PDFs:', error)
      toast.error('Error al generar los PDFs: ' + error.message)
    } finally {
      setDescargandoPDFs(false)
      setProgresoDescarga({ actual: 0, total: 0 })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
          <p className="text-gray-500 mt-1">
            Gestión de facturas emitidas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleAbrirModalExportar}
            disabled={!facturas || facturas.length === 0 || exportar.isPending}
            title="Exportar facturas a Excel"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button onClick={() => navigate('/facturacion/generar')}>
            <Plus className="w-4 h-4 mr-2" />
            Generar Facturas
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/facturacion/facturas/nueva')}
            title="Crear factura manual sin lecturas"
          >
            <FilePlus className="w-4 h-4 mr-2" />
            Factura Manual
          </Button>
          {borradoresCount > 0 && (
            <Button
              variant="outline"
              onClick={handleSeleccionarTodosBorradores}
              title="Seleccionar todos los borradores para emitir"
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              Emitir {borradoresCount} borrador{borradoresCount > 1 ? 'es' : ''}
            </Button>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Borradores</div>
            <div className="text-2xl font-bold text-gray-600">{stats.borradores}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Emitidas</div>
            <div className="text-2xl font-bold text-blue-600">{stats.emitidas}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Pagadas</div>
            <div className="text-2xl font-bold text-green-600">{stats.pagadas}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Importe Total</div>
            <div className="text-xl font-bold">{formatCurrency(stats.importeTotal)}</div>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <FacturaFilters
        comunidades={comunidades || []}
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
      />

      {/* Toggle de Modo */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border">
        <span className="text-sm font-medium text-gray-700">Modo:</span>
        <div className="flex gap-2">
          <Button
            variant={modo === 'emision' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => { setModo('emision'); setSelectedIds([]) }}
          >
            Emisión masiva
          </Button>
          <Button
            variant={modo === 'descarga' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => { setModo('descarga'); setSelectedIds([]) }}
          >
            Descarga masiva
          </Button>
        </div>
        <span className="text-xs text-gray-500">
          {modo === 'emision'
            ? 'Selecciona borradores para emitir'
            : 'Selecciona facturas emitidas para descargar PDFs'}
        </span>
      </div>

      {/* Tabla de facturas */}
      <FacturasTable
        facturas={facturas || []}
        isLoading={isLoading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={(f) => setDeleteModal({ open: true, factura: f })}
        onPDF={handlePDF}
        onEmail={handleEmail}
        onMarcarPagada={(f) => setPagarModal({ open: true, factura: f })}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        modo={modo}
      />

      {/* Modal eliminar */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, factura: null })}
        title="Eliminar factura"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            ¿Estás seguro de que deseas eliminar esta factura en borrador?
          </p>
          {deleteModal.factura && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p><strong>Cliente:</strong> {deleteModal.factura.cliente_nombre}</p>
              <p><strong>Total:</strong> {formatCurrency(deleteModal.factura.total)}</p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ open: false, factura: null })}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleteFactura.isPending}
            >
              {deleteFactura.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal marcar pagada */}
      <Modal
        open={pagarModal.open}
        onClose={() => setPagarModal({ open: false, factura: null })}
        title="Marcar como pagada"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            ¿Confirmas que esta factura ha sido cobrada?
          </p>
          {pagarModal.factura && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p><strong>Nº Factura:</strong> {pagarModal.factura.numero_completo}</p>
              <p><strong>Cliente:</strong> {pagarModal.factura.cliente_nombre}</p>
              <p><strong>Total:</strong> {formatCurrency(pagarModal.factura.total)}</p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setPagarModal({ open: false, factura: null })}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMarcarPagada}
              disabled={marcarPagada.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {marcarPagada.isPending ? 'Procesando...' : 'Confirmar pago'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Barra de acciones masivas flotante */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <Card className="shadow-2xl border-2">
            <div className="flex items-center gap-4 px-6 py-4">
              <span className="text-sm font-medium text-gray-700">
                {selectedIds.length} factura{selectedIds.length > 1 ? 's' : ''} seleccionada{selectedIds.length > 1 ? 's' : ''}
              </span>
              <div className="h-6 w-px bg-gray-300"></div>

              {modo === 'emision' ? (
                <Button
                  onClick={handleEmitirMasivo}
                  disabled={emitiendo}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {emitiendo ? 'Emitiendo...' : 'Emitir facturas'}
                </Button>
              ) : (
                <Button
                  onClick={handleDescargarPDFsMasivo}
                  disabled={descargandoPDFs}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {descargandoPDFs
                    ? `Descargando ${progresoDescarga.actual}/${progresoDescarga.total}...`
                    : 'Descargar PDFs (ZIP)'}
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                title="Cancelar selección"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de exportación */}
      <ModalExportarFacturas
        isOpen={modalExport}
        onClose={() => setModalExport(false)}
        onExport={handleExportarExcel}
        totalFacturas={facturas?.length || 0}
        isExporting={exportar.isPending}
      />

      {/* Indicador de progreso */}
      <ProgressoExportacion progreso={progresoExportacion} />
    </div>
  )
}



