import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Send, ArrowLeft, CloudUpload } from 'lucide-react'
import { Button, Checkbox } from '../components/ui'
import { useToast } from '../components/ui/Toast'
import {
  EnvioFacturasTable,
  EnvioFilters,
  EnvioProgress
} from '../features/envios/components'
import {
  useFacturasPendientesEnvio,
  useEnviarFacturasMasivo
} from '../hooks/useEnvios'

export default function EnviarFacturas() {
  const navigate = useNavigate()
  const toast = useToast()
  
  const [filtros, setFiltros] = useState({
    comunidadId: null,
    estado: 'pendiente'
  })
  const [selectedIds, setSelectedIds] = useState([])
  const [subirOneDrive, setSubirOneDrive] = useState(true)
  const [modoTest, setModoTest] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [progress, setProgress] = useState(null)
  const [resultados, setResultados] = useState(null)
  const [isCompleted, setIsCompleted] = useState(false)

  const { data: facturas = [], isLoading, refetch } = useFacturasPendientesEnvio(filtros)
  const enviarMasivo = useEnviarFacturasMasivo()

  const facturasConEmail = facturas.filter(
    f => f.cliente_email && f.estado_envio !== 'enviado'
  )

  const handleEnviar = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Selecciona al menos una factura para enviar')
      return
    }

    setShowProgress(true)
    setIsCompleted(false)
    setResultados(null)
    setProgress({ actual: 0, total: selectedIds.length, porcentaje: 0 })

    try {
      const result = await enviarMasivo.mutateAsync({
        facturaIds: selectedIds,
        onProgress: (p) => setProgress(p),
        modoTest
      })

      setResultados(result)
      setIsCompleted(true)
      setSelectedIds([])
      
      if (result.exitosos > 0) {
        toast.success(`${result.exitosos} facturas enviadas correctamente`)
      }
      if (result.fallidos > 0) {
        toast.error(`${result.fallidos} facturas no se pudieron enviar`)
      }
      
      refetch()
    } catch (error) {
      toast.error('Error al enviar facturas: ' + error.message)
      setShowProgress(false)
    }
  }

  const handleCloseProgress = () => {
    setShowProgress(false)
    setProgress(null)
    setResultados(null)
    setIsCompleted(false)
  }

  const handleViewFactura = (facturaId) => {
    navigate(`/facturacion/facturas/${facturaId}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/facturacion/facturas')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Mail className="text-primary-500" />
              Envío de Facturas
            </h1>
            <p className="text-gray-500">
              Selecciona las facturas emitidas para enviar por email
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <EnvioFilters filtros={filtros} onFiltrosChange={setFiltros} />

      {/* Toggle de Modo Test */}
      <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <input
          type="checkbox"
          id="modo-test"
          checked={modoTest}
          onChange={(e) => setModoTest(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="modo-test" className="flex items-center gap-2 cursor-pointer flex-1">
          <span className="text-sm font-medium text-yellow-900">
            🧪 Modo Test (usar direcciones delivered+X@resend.dev)
          </span>
        </label>
        {modoTest && (
          <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
            Los emails NO se enviarán a clientes reales
          </span>
        )}
      </div>

      {/* Resumen */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-800 font-medium">
              {facturasConEmail.length} facturas pendientes de envío con email válido
            </p>
            {selectedIds.length > 0 && (
              <p className="text-primary-600 text-sm mt-1">
                {selectedIds.length} facturas seleccionadas
              </p>
            )}
          </div>
          <Button
            onClick={() => setSelectedIds(facturasConEmail.map(f => f.id))}
            variant="outline"
            size="sm"
          >
            Seleccionar todas
          </Button>
        </div>
      </div>

      {/* Tabla de facturas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <EnvioFacturasTable
          facturas={facturas}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onViewFactura={handleViewFactura}
          isLoading={isLoading}
        />
      </div>

      {/* Opciones de envío */}
      {selectedIds.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={subirOneDrive}
                onChange={(e) => setSubirOneDrive(e.target.checked)}
                id="subir_onedrive"
              />
              <label htmlFor="subir_onedrive" className="text-sm text-gray-700 flex items-center gap-2">
                <CloudUpload size={16} className="text-gray-400" />
                Subir automáticamente a OneDrive después de enviar
              </label>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedIds([])}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEnviar}
                isLoading={enviarMasivo.isPending}
                className="flex items-center gap-2"
              >
                <Send size={18} />
                Enviar {selectedIds.length} facturas
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de progreso */}
      <EnvioProgress
        isOpen={showProgress}
        onClose={handleCloseProgress}
        progress={progress}
        resultados={resultados}
        isCompleted={isCompleted}
        modoTest={modoTest}
        onCancel={() => {
          // En una implementación real, aquí se cancelaría el proceso
          handleCloseProgress()
        }}
      />
    </div>
  )
}



