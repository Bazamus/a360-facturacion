import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  FileText, 
  Mail, 
  CreditCard, 
  XCircle, 
  Download,
  Calendar,
  Building2,
  User,
  Gauge,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { Button, Card, Modal } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { EstadoBadge } from '@/features/facturacion/components'
import { descargarFacturaPDF } from '@/features/facturacion/pdf'
import { 
  formatCurrency, 
  formatDate, 
  formatCantidad,
  formatIBAN,
  getMetodoPagoLabel 
} from '@/features/facturacion/utils/calculos'
import { 
  useFactura, 
  useFacturaLineas,
  useFacturaHistoricoConsumo,
  useEmitirFactura,
  useAnularFactura,
  useMarcarPagada 
} from '@/hooks/useFacturas'

export default function FacturaDetalle({ showPdf = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [anularModal, setAnularModal] = useState(false)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  const [generandoPDF, setGenerandoPDF] = useState(false)

  const { data: factura, isLoading } = useFactura(id)
  const { data: lineas } = useFacturaLineas(id)
  const { data: historico } = useFacturaHistoricoConsumo(id)

  const emitirFactura = useEmitirFactura()
  const anularFactura = useAnularFactura()
  const marcarPagada = useMarcarPagada()

  const handleDescargarPDF = async () => {
    if (!factura) return
    
    try {
      setGenerandoPDF(true)
      // Pequeño delay para mostrar el spinner
      await new Promise(resolve => setTimeout(resolve, 100))
      
      descargarFacturaPDF(factura, lineas || [], historico || [])
      toast.success('PDF descargado correctamente')
    } catch (error) {
      console.error('Error generando PDF:', error)
      toast.error('Error al generar el PDF')
    } finally {
      setGenerandoPDF(false)
    }
  }

  const handleEmitir = async () => {
    try {
      const result = await emitirFactura.mutateAsync(id)
      toast.success(`Factura emitida con número ${result.numero_completo}`)
    } catch (error) {
      toast.error(`Error al emitir: ${error.message}`)
    }
  }

  const handleAnular = async () => {
    if (!motivoAnulacion.trim()) {
      toast.error('Indica el motivo de anulación')
      return
    }

    try {
      await anularFactura.mutateAsync({ facturaId: id, motivo: motivoAnulacion })
      toast.success('Factura anulada')
      setAnularModal(false)
      setMotivoAnulacion('')
    } catch (error) {
      toast.error(`Error: ${error.message}`)
    }
  }

  const handleMarcarPagada = async () => {
    try {
      await marcarPagada.mutateAsync({ facturaId: id })
      toast.success('Factura marcada como pagada')
    } catch (error) {
      toast.error(`Error: ${error.message}`)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!factura) {
    return (
      <div className="text-center p-12">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <p className="text-gray-500">Factura no encontrada</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
          Volver
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/facturacion/facturas')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {factura.numero_completo || 'Factura en borrador'}
              </h1>
              <EstadoBadge estado={factura.estado} />
            </div>
            <p className="text-gray-500 mt-1">
              {formatDate(factura.fecha_factura)} · {factura.comunidad?.nombre}
            </p>
          </div>
        </div>
        
        {/* Acciones según estado */}
        <div className="flex items-center gap-2">
          {factura.estado === 'borrador' && (
            <Button onClick={handleEmitir} disabled={emitirFactura.isPending}>
              <FileText className="w-4 h-4 mr-2" />
              {emitirFactura.isPending ? 'Emitiendo...' : 'Emitir factura'}
            </Button>
          )}

          {factura.estado === 'emitida' && (
            <>
              <Button variant="outline" onClick={() => toast.info('Disponible en Fase 4')}>
                <Mail className="w-4 h-4 mr-2" />
                Enviar por email
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={handleMarcarPagada}
                disabled={marcarPagada.isPending}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Marcar pagada
              </Button>
              <Button 
                variant="outline" 
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => setAnularModal(true)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Anular
              </Button>
            </>
          )}

          {['emitida', 'pagada'].includes(factura.estado) && (
            <Button 
              variant="outline" 
              onClick={handleDescargarPDF}
              disabled={generandoPDF}
            >
              {generandoPDF ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {generandoPDF ? 'Generando...' : 'Descargar PDF'}
            </Button>
          )}
        </div>
      </div>

      {/* Información general */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datos de la factura */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            Datos de la Factura
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Número</dt>
              <dd className="font-mono font-medium">{factura.numero_completo || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Fecha emisión</dt>
              <dd>{formatDate(factura.fecha_factura)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Fecha vencimiento</dt>
              <dd>{formatDate(factura.fecha_vencimiento)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Periodo</dt>
              <dd>
                {formatDate(factura.periodo_inicio)} - {formatDate(factura.periodo_fin)}
                {factura.es_periodo_parcial && (
                  <span className="text-xs text-amber-600 ml-1">(Parcial)</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Método de pago</dt>
              <dd>{getMetodoPagoLabel(factura.metodo_pago)}</dd>
            </div>
            {factura.fecha_pago && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Fecha de pago</dt>
                <dd className="text-green-600 font-medium">{formatDate(factura.fecha_pago)}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Datos del cliente */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            Datos del Cliente
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-gray-500 text-sm">Nombre</dt>
              <dd className="font-medium">{factura.cliente_nombre}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-sm">NIF</dt>
              <dd>{factura.cliente_nif}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-sm">Dirección</dt>
              <dd>{factura.cliente_direccion}</dd>
              <dd className="text-sm text-gray-500">
                {factura.cliente_cp} {factura.cliente_ciudad}
                {factura.cliente_provincia && `, ${factura.cliente_provincia}`}
              </dd>
            </div>
            {factura.cliente_iban && (
              <div>
                <dt className="text-gray-500 text-sm">IBAN</dt>
                <dd className="font-mono text-sm">{formatIBAN(factura.cliente_iban)}</dd>
              </div>
            )}
            {factura.cliente_email && (
              <div>
                <dt className="text-gray-500 text-sm">Email</dt>
                <dd className="text-blue-600">{factura.cliente_email}</dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      {/* Líneas de factura */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Gauge className="w-5 h-5 text-gray-400" />
            Detalle de Consumos
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Concepto
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Precio Unit.
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lineas?.map(linea => (
                <tr key={linea.id}>
                  <td className="px-6 py-4">
                    <div className="font-medium">{linea.concepto_nombre}</div>
                    {!linea.es_termino_fijo && (
                      <div className="text-sm text-gray-500 mt-1">
                        <span className="font-mono">{linea.contador_numero_serie}</span>
                        <span className="mx-2">·</span>
                        Lect. ant: {Number(linea.lectura_anterior).toFixed(2)} ({formatDate(linea.fecha_lectura_anterior)})
                        <span className="mx-1">→</span>
                        Actual: {Number(linea.lectura_actual).toFixed(2)} ({formatDate(linea.fecha_lectura_actual)})
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    {formatCantidad(linea.cantidad, linea.unidad_medida, linea.es_termino_fijo ? 2 : 4)}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    {formatCurrency(linea.precio_unitario)}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap font-medium">
                    {formatCurrency(linea.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan="3" className="px-6 py-3 text-right text-sm text-gray-500">
                  Base imponible
                </td>
                <td className="px-6 py-3 text-right font-medium">
                  {formatCurrency(factura.base_imponible)}
                </td>
              </tr>
              <tr>
                <td colSpan="3" className="px-6 py-3 text-right text-sm text-gray-500">
                  IVA ({factura.porcentaje_iva}%)
                </td>
                <td className="px-6 py-3 text-right font-medium">
                  {formatCurrency(factura.importe_iva)}
                </td>
              </tr>
              <tr className="bg-blue-50">
                <td colSpan="3" className="px-6 py-3 text-right text-sm font-semibold">
                  TOTAL
                </td>
                <td className="px-6 py-3 text-right text-lg font-bold text-blue-700">
                  {formatCurrency(factura.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Motivo de anulación si aplica */}
      {factura.estado === 'anulada' && factura.motivo_anulacion && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-700">Factura anulada</p>
              <p className="text-red-600 text-sm mt-1">{factura.motivo_anulacion}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Modal anular */}
      <Modal
        isOpen={anularModal}
        onClose={() => setAnularModal(false)}
        title="Anular factura"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Esta acción anulará la factura y liberará las lecturas para poder refacturarlas.
            Esta acción no se puede deshacer.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo de anulación *
            </label>
            <textarea
              value={motivoAnulacion}
              onChange={(e) => setMotivoAnulacion(e.target.value)}
              className="w-full rounded-lg border-gray-300 focus:border-red-500 focus:ring-red-500"
              rows={3}
              placeholder="Indica el motivo de la anulación..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAnularModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleAnular}
              disabled={anularFactura.isPending || !motivoAnulacion.trim()}
            >
              {anularFactura.isPending ? 'Anulando...' : 'Anular factura'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}



