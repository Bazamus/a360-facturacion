import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, CheckSquare, X } from 'lucide-react'
import { Button, Card, Modal } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { FacturasTable, FacturaFilters, EstadoBadge } from '@/features/facturacion/components'
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

  const { data: comunidades } = useComunidades()
  const { data: facturas, isLoading } = useFacturas(filters)
  const { data: stats } = useEstadisticasFacturacion(filters)
  const deleteFactura = useDeleteFactura()
  const marcarPagada = useMarcarPagada()
  const emitirMasivo = useEmitirFacturasMasivo()

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

      // Descargar PDF directamente (aunque falten datos, el PDF se genera)
      descargarFacturaPDF(factura, lineas || [], historico || [])

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
          <Button onClick={() => navigate('/facturacion/generar')}>
            <Plus className="w-4 h-4 mr-2" />
            Generar Facturas
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
      />

      {/* Modal eliminar */}
      <Modal
        isOpen={deleteModal.open}
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
        isOpen={pagarModal.open}
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
              <Button
                onClick={handleEmitirMasivo}
                disabled={emitiendo}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                {emitiendo ? 'Emitiendo...' : 'Emitir facturas'}
              </Button>
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
    </div>
  )
}



