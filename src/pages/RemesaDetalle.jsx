import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Download, 
  Send, 
  Trash2, 
  Building2,
  FileText,
  Calendar,
  CreditCard
} from 'lucide-react'
import { Button } from '../components/ui'
import { EstadoRemesaBadge, RecibosTable } from '../features/remesas/components'
import { 
  useRemesa, 
  useGenerarXML, 
  useActualizarEstadoRemesa,
  useEliminarRemesa 
} from '../hooks/useRemesas'
import { useToast } from '../components/ui/Toast'

export default function RemesaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const { data: remesa, isLoading, error } = useRemesa(id)
  const generarXMLMutation = useGenerarXML()
  const actualizarEstadoMutation = useActualizarEstadoRemesa()
  const eliminarMutation = useEliminarRemesa()

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0)
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-ES')
  }

  const formatIBAN = (iban) => {
    if (!iban) return '-'
    return iban.match(/.{1,4}/g)?.join(' ') || iban
  }

  const handleGenerarXML = async () => {
    try {
      await generarXMLMutation.mutateAsync(id)
      showToast('Fichero XML generado correctamente', 'success')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  const handleDescargarXML = () => {
    if (!remesa?.fichero_xml) {
      showToast('No hay fichero XML disponible', 'error')
      return
    }

    const blob = new Blob([remesa.fichero_xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = remesa.fichero_nombre || `${remesa.referencia}.xml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    showToast('Fichero descargado correctamente', 'success')
  }

  const handleMarcarEnviada = async () => {
    try {
      await actualizarEstadoMutation.mutateAsync({
        remesaId: id,
        estado: 'enviada',
        fechaEnvioBanco: new Date().toISOString().split('T')[0]
      })
      showToast('Remesa marcada como enviada', 'success')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  const handleEliminar = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta remesa?')) return

    try {
      await eliminarMutation.mutateAsync(id)
      showToast('Remesa eliminada', 'success')
      navigate('/remesas')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !remesa) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          Error al cargar la remesa
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/remesas')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">
                {remesa.referencia}
              </h1>
              <EstadoRemesaBadge estado={remesa.estado} />
            </div>
            <p className="text-gray-500 mt-1">{remesa.descripcion}</p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <Calendar className="w-4 h-4" />
            Datos de la remesa
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Referencia:</dt>
              <dd className="font-mono">{remesa.referencia}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Fecha creación:</dt>
              <dd>{formatDate(remesa.fecha_creacion)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Fecha cobro:</dt>
              <dd className="font-medium">{formatDate(remesa.fecha_cobro)}</dd>
            </div>
            {remesa.fecha_envio_banco && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Enviada al banco:</dt>
                <dd>{formatDate(remesa.fecha_envio_banco)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <CreditCard className="w-4 h-4" />
            Cuenta de cobro
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">IBAN:</dt>
              <dd className="font-mono text-xs">{formatIBAN(remesa.iban_cobro)}</dd>
            </div>
            {remesa.bic_cobro && (
              <div className="flex justify-between">
                <dt className="text-gray-500">BIC:</dt>
                <dd className="font-mono">{remesa.bic_cobro}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Totales */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-900">{remesa.num_recibos}</div>
            <div className="text-sm text-blue-700">Recibos</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-900">{formatCurrency(remesa.importe_total)}</div>
            <div className="text-sm text-blue-700">Importe Total</div>
          </div>
          {remesa.num_cobrados > 0 && (
            <div className="text-center">
              <div className="text-3xl font-bold text-green-700">{remesa.num_cobrados}</div>
              <div className="text-sm text-green-600">Cobrados</div>
            </div>
          )}
          {remesa.num_rechazados > 0 && (
            <div className="text-center">
              <div className="text-3xl font-bold text-red-700">{remesa.num_rechazados}</div>
              <div className="text-sm text-red-600">Rechazados</div>
            </div>
          )}
        </div>
      </div>

      {/* Recibos */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Recibos incluidos
          </h2>
        </div>
        <RecibosTable recibos={remesa.recibos || []} />
      </div>

      {/* Acciones */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-sm font-medium text-gray-700 mb-3">Acciones</div>
        <div className="flex flex-wrap gap-3">
          {remesa.estado === 'borrador' && (
            <Button onClick={handleGenerarXML} disabled={generarXMLMutation.isPending}>
              <FileText className="w-4 h-4 mr-1" />
              {generarXMLMutation.isPending ? 'Generando...' : 'Generar XML SEPA'}
            </Button>
          )}
          
          {remesa.fichero_xml && (
            <Button variant="outline" onClick={handleDescargarXML}>
              <Download className="w-4 h-4 mr-1" />
              Descargar XML
            </Button>
          )}

          {remesa.estado === 'generada' && (
            <Button 
              variant="outline" 
              onClick={handleMarcarEnviada}
              disabled={actualizarEstadoMutation.isPending}
            >
              <Send className="w-4 h-4 mr-1" />
              Marcar como enviada
            </Button>
          )}

          {remesa.estado === 'borrador' && (
            <Button 
              variant="ghost" 
              className="text-red-600 hover:text-red-700"
              onClick={handleEliminar}
              disabled={eliminarMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Eliminar remesa
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}



