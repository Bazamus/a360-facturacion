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
  Loader2,
  CheckCircle2,
  Clock,
  Trash2
} from 'lucide-react'
import { Button, Card, Modal, Badge } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { EstadoBadge } from '@/features/facturacion/components'
import { getBadgeVariant } from '@/utils/estadosCliente'
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
  useMarcarPagada,
  useEliminarFacturas
} from '@/hooks/useFacturas'
import { useEnviarFactura } from '@/hooks/useEnvios'

export default function FacturaDetalle({ showPdf = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [anularModal, setAnularModal] = useState(false)
  const [motivoAnulacion, setMotivoAnulacion] = useState('')
  const [eliminarModal, setEliminarModal] = useState(false)
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [modoTestEmail, setModoTestEmail] = useState(false)

  const { data: factura, isLoading, refetch } = useFactura(id)
  const { data: lineas } = useFacturaLineas(id)
  const { data: historico } = useFacturaHistoricoConsumo(id)

  const emitirFactura = useEmitirFactura()
  const anularFactura = useAnularFactura()
  const marcarPagada = useMarcarPagada()
  const enviarFactura = useEnviarFactura()
  const eliminarFacturas = useEliminarFacturas()

  const handleDescargarPDF = async () => {
    if (!factura) return
    
    try {
      setGenerandoPDF(true)
      // Pequeño delay para mostrar el spinner
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Debug: mostrar datos que se pasan al PDF
      console.log('=== GENERANDO PDF v2 ===')
      console.log('Factura:', factura)
      console.log('Líneas:', lineas)
      console.log('Histórico:', historico)
      
      descargarFacturaPDF(factura, lineas || [], historico || [])
      toast.success('PDF descargado correctamente (v2)')
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

  const handleEliminar = async () => {
    try {
      const result = await eliminarFacturas.mutateAsync([id])
      toast.success(`Factura eliminada. Nueva secuencia: ${result.nuevo_numero_secuencia}`)
      navigate('/facturacion/facturas')
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
              {factura.email_enviado && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                  <Mail size={12} />
                  Enviada
                </span>
              )}
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
              <Button
                variant={factura.email_enviado ? "ghost" : "outline"}
                onClick={() => setEmailModalOpen(true)}
                disabled={!factura.cliente_email}
                title={!factura.cliente_email ? 'Cliente sin email configurado' : ''}
              >
                <Mail className={`w-4 h-4 mr-2 ${factura.email_enviado ? 'text-green-500' : ''}`} />
                {factura.email_enviado ? 'Reenviar' : 'Enviar por email'}
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

          {/* Eliminar - solo emitidas/pagadas/anuladas */}
          {['emitida', 'pagada', 'anulada'].includes(factura.estado) && (
            <Button
              variant="danger"
              onClick={() => setEliminarModal(true)}
              title="Eliminar factura completamente"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar Permanentemente
            </Button>
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
              <dt className="text-gray-500 text-sm">Estado</dt>
              <dd>
                {factura.cliente_estado_nombre ? (
                  <Badge variant={getBadgeVariant(factura.cliente_estado_color)}>
                    {factura.cliente_estado_nombre}
                  </Badge>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 text-sm">Código Cliente</dt>
              <dd className="font-mono">{factura.cliente?.codigo_cliente || '-'}</dd>
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

            {/* Estado de envío por email */}
            {factura.estado !== 'borrador' && (
              <div className="mt-4 pt-4 border-t">
                <dt className="text-gray-500 text-sm mb-2">Estado de envío</dt>
                <dd>
                  {factura.email_enviado ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 size={18} />
                      <div>
                        <p className="font-medium">Enviada por email</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(factura.fecha_email_enviado)}
                        </p>
                      </div>
                    </div>
                  ) : factura.cliente_email ? (
                    <div className="flex items-center gap-2 text-amber-600">
                      <Clock size={18} />
                      <p className="font-medium">Pendiente de envío</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Mail size={18} />
                      <p className="text-sm">Sin email configurado</p>
                    </div>
                  )}
                </dd>
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
                    {!linea.es_termino_fijo && linea.contador_numero_serie && (
                      <div className="text-sm text-gray-500 mt-1">
                        <span className="font-mono">{linea.contador_numero_serie}</span>
                        <span className="mx-2">·</span>
                        Lect. ant: {Number(linea.lectura_anterior || 0).toFixed(2)} ({formatDate(linea.fecha_lectura_anterior)})
                        <span className="mx-1">→</span>
                        Actual: {Number(linea.lectura_actual || 0).toFixed(2)} ({formatDate(linea.fecha_lectura_actual)})
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
        open={anularModal}
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

      {/* Modal eliminar permanentemente */}
      <Modal
        open={eliminarModal}
        onClose={() => setEliminarModal(false)}
        title="⚠️ Eliminar Factura Permanentemente"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertTriangle className="w-6 h-6 text-red-600 mb-2" />
            <h3 className="font-bold text-red-900 mb-2">ADVERTENCIA: Esta acción es IRREVERSIBLE</h3>
            <ul className="text-sm text-red-800 space-y-1">
              <li>• La factura se eliminará completamente de la base de datos</li>
              <li>• Las lecturas asociadas quedarán disponibles para refacturar</li>
              <li>• El número de factura se eliminará de la serie</li>
              <li>• Solo se puede eliminar si es la última factura emitida</li>
              <li>• No se podrá recuperar esta información</li>
            </ul>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <p><strong>Factura:</strong> {factura.numero_completo}</p>
            <p><strong>Cliente:</strong> {factura.cliente_nombre}</p>
            <p><strong>Total:</strong> {formatCurrency(factura.total)}</p>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEliminarModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleEliminar}
              disabled={eliminarFacturas.isPending}
            >
              {eliminarFacturas.isPending ? 'Eliminando...' : 'Confirmar Eliminación'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal enviar email */}
      <Modal
        open={emailModalOpen}
        onClose={() => { setEmailModalOpen(false); setModoTestEmail(false) }}
        title={factura?.email_enviado ? "Reenviar Factura" : "Enviar Factura por Email"}
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p><strong>Factura:</strong> {factura?.numero_completo}</p>
            <p><strong>Destinatario:</strong> {factura?.cliente_email}</p>
            <p><strong>Total:</strong> {formatCurrency(factura?.total)}</p>
          </div>

          {factura?.email_enviado && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              Esta factura ya fue enviada el {formatDate(factura.fecha_email_enviado)}.
              ¿Deseas enviarla nuevamente?
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <input
              type="checkbox"
              id="modo-test-detail"
              checked={modoTestEmail}
              onChange={(e) => setModoTestEmail(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="modo-test-detail" className="text-sm text-yellow-800">
              Modo test (envía a dirección de prueba, no al cliente real)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => { setEmailModalOpen(false); setModoTestEmail(false) }}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                try {
                  await enviarFactura.mutateAsync({
                    facturaId: factura.id,
                    modoTest: modoTestEmail
                  })
                  toast.success('Factura enviada correctamente')
                  setEmailModalOpen(false)
                  setModoTestEmail(false)
                  refetch()
                } catch (error) {
                  toast.error(`Error: ${error.message}`)
                }
              }}
              isLoading={enviarFactura.isPending}
            >
              <Mail className="w-4 h-4 mr-2" />
              {factura?.email_enviado ? 'Reenviar' : 'Enviar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}



