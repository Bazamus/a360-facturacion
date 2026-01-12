import { useState } from 'react'
import { Mail, Calendar, RefreshCw } from 'lucide-react'
import { Select } from '../components/ui'
import { useToast } from '../components/ui/Toast'
import {
  EnviosStats,
  EnviosRecientes,
  RebotesPendientes
} from '../features/envios/components'
import {
  useEnviosStats,
  useEnviosRecientes,
  useRebotesPendientes,
  useReintentarEnvio
} from '../hooks/useEnvios'

export default function EnviosDashboard() {
  const toast = useToast()
  const [periodo, setPeriodo] = useState(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    return {
      fechaInicio: firstDay.toISOString(),
      fechaFin: null,
      label: `${now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`
    }
  })

  const { data: stats, isLoading: statsLoading } = useEnviosStats({
    fechaInicio: periodo.fechaInicio,
    fechaFin: periodo.fechaFin
  })
  const { data: enviosRecientes, isLoading: recientesLoading, refetch: refetchRecientes } = useEnviosRecientes(10)
  const { data: rebotes, isLoading: rebotesLoading } = useRebotesPendientes()
  const reintentarEnvio = useReintentarEnvio()

  const handlePeriodoChange = (value) => {
    const now = new Date()
    let fechaInicio = null
    let label = ''

    switch (value) {
      case 'mes_actual':
        fechaInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        label = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
        break
      case 'mes_anterior':
        fechaInicio = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
        const mesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        label = mesAnterior.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
        break
      case 'trimestre':
        fechaInicio = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString()
        label = 'Último trimestre'
        break
      case 'año':
        fechaInicio = new Date(now.getFullYear(), 0, 1).toISOString()
        label = `Año ${now.getFullYear()}`
        break
      default:
        fechaInicio = null
        label = 'Todo el tiempo'
    }

    setPeriodo({ fechaInicio, fechaFin: null, label })
  }

  const handleReintentar = async (envioId) => {
    try {
      await reintentarEnvio.mutateAsync(envioId)
      toast.success('Envío reintentado correctamente')
    } catch (error) {
      toast.error('Error al reintentar: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="text-primary-500" />
            Dashboard de Envíos
          </h1>
          <p className="text-gray-500">
            Seguimiento y estadísticas de envío de facturas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-gray-400" />
          <Select
            value="mes_actual"
            onChange={(e) => handlePeriodoChange(e.target.value)}
            className="w-48"
          >
            <option value="mes_actual">Mes actual</option>
            <option value="mes_anterior">Mes anterior</option>
            <option value="trimestre">Último trimestre</option>
            <option value="año">Este año</option>
            <option value="todo">Todo el tiempo</option>
          </Select>
        </div>
      </div>

      {/* Estadísticas */}
      <EnviosStats stats={stats || {}} />

      {/* Grid de contenido */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Envíos recientes */}
        <EnviosRecientes
          envios={enviosRecientes || []}
          isLoading={recientesLoading}
          onRefresh={refetchRecientes}
        />

        {/* Rebotes pendientes */}
        {(rebotes?.length > 0 || rebotesLoading) && (
          <RebotesPendientes
            rebotes={rebotes || []}
            isLoading={rebotesLoading}
            onReintentar={handleReintentar}
          />
        )}
      </div>

      {/* Información adicional si no hay rebotes */}
      {!rebotesLoading && (!rebotes || rebotes.length === 0) && (
        <div className="lg:col-span-1">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Mail className="text-green-600" size={24} />
            </div>
            <h3 className="font-semibold text-green-800">
              Sin rebotes pendientes
            </h3>
            <p className="text-green-600 text-sm mt-1">
              Todos los emails han sido entregados correctamente
            </p>
          </div>
        </div>
      )}
    </div>
  )
}



