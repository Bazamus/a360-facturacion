import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText } from 'lucide-react'
import { Button, Card, Modal } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { FacturasTable, FacturaFilters, EstadoBadge } from '@/features/facturacion/components'
import { formatCurrency, formatDate } from '@/features/facturacion/utils/calculos'
import { useComunidades } from '@/hooks/useComunidades'
import { 
  useFacturas, 
  useDeleteFactura, 
  useMarcarPagada,
  useEstadisticasFacturacion 
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

  const { data: comunidades } = useComunidades()
  const { data: facturas, isLoading } = useFacturas(filters)
  const { data: stats } = useEstadisticasFacturacion(filters)
  const deleteFactura = useDeleteFactura()
  const marcarPagada = useMarcarPagada()

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

  const handlePDF = (factura) => {
    navigate(`/facturacion/facturas/${factura.id}/pdf`)
  }

  const handleEmail = (factura) => {
    toast.info('Funcionalidad de envío por email disponible en Fase 4')
  }

  const clearFilters = () => {
    setFilters({ comunidadId: '', estado: '', search: '' })
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
        <Button onClick={() => navigate('/facturacion/generar')}>
          <Plus className="w-4 h-4 mr-2" />
          Generar Facturas
        </Button>
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
    </div>
  )
}



