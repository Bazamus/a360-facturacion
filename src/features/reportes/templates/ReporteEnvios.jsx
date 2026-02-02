import { Card } from '@/components/ui'
import { LineChart, PieChart } from '../components/charts'
import { formatNumber } from '@/lib/utils'
import { Mail, CheckCircle2, Eye, AlertTriangle, XCircle } from 'lucide-react'

export function ReporteEnvios({ stats = {}, evolucion = [] }) {
  const totalEnviados = stats.total_enviados || 0
  const totalEntregados = stats.total_entregados || 0
  const totalAbiertos = stats.total_abiertos || 0
  const totalRebotados = stats.total_rebotados || 0
  const totalFallidos = stats.total_fallidos || 0

  const tasaEntrega = totalEnviados > 0 ? (totalEntregados / totalEnviados) * 100 : 0
  const tasaApertura = totalEntregados > 0 ? (totalAbiertos / totalEntregados) * 100 : 0
  const tasaRebote = totalEnviados > 0 ? (totalRebotados / totalEnviados) * 100 : 0

  // Datos para gráfico de distribución
  const datosDistribucion = [
    { name: 'Entregados', value: totalEntregados },
    { name: 'Abiertos', value: totalAbiertos },
    { name: 'Rebotados', value: totalRebotados },
    { name: 'Fallidos', value: totalFallidos }
  ].filter(item => item.value > 0)

  // Datos para evolución temporal
  const datosEvolucion = evolucion.map(item => ({
    mes: item.mes_nombre || item.mes,
    enviados: item.total_enviados || 0,
    entregados: item.total_entregados || 0,
    abiertos: item.total_abiertos || 0
  }))

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-medium text-blue-900">Total Enviados</h3>
          </div>
          <p className="text-3xl font-bold text-blue-900">
            {formatNumber(totalEnviados)}
          </p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-medium text-green-900">Entregados</h3>
          </div>
          <p className="text-3xl font-bold text-green-900">
            {formatNumber(totalEntregados)}
          </p>
          <p className="text-xs text-green-700 mt-1">
            {tasaEntrega.toFixed(1)}% de enviados
          </p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-600 rounded-lg">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-medium text-emerald-900">Abiertos</h3>
          </div>
          <p className="text-3xl font-bold text-emerald-900">
            {formatNumber(totalAbiertos)}
          </p>
          <p className="text-xs text-emerald-700 mt-1">
            {tasaApertura.toFixed(1)}% de entregados
          </p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-600 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-medium text-amber-900">Rebotados</h3>
          </div>
          <p className="text-3xl font-bold text-amber-900">
            {formatNumber(totalRebotados)}
          </p>
          <p className="text-xs text-amber-700 mt-1">
            {tasaRebote.toFixed(1)}% de enviados
          </p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-600 rounded-lg">
              <XCircle className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-medium text-red-900">Fallidos</h3>
          </div>
          <p className="text-3xl font-bold text-red-900">
            {formatNumber(totalFallidos)}
          </p>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución de estados */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Distribución de Estados
          </h3>
          {datosDistribucion.length > 0 ? (
            <PieChart data={datosDistribucion} height={300} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              No hay datos disponibles
            </div>
          )}
        </Card>

        {/* Evolución temporal */}
        {evolucion.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Evolución de Envíos
            </h3>
            <LineChart
              data={datosEvolucion}
              lines={[
                { dataKey: 'enviados', name: 'Enviados', color: '#3b82f6' },
                { dataKey: 'entregados', name: 'Entregados', color: '#10b981' },
                { dataKey: 'abiertos', name: 'Abiertos', color: '#059669' }
              ]}
              height={300}
              xDataKey="mes"
            />
          </Card>
        )}
      </div>

      {/* Resumen de métricas */}
      <Card className="p-6 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rendimiento de Envíos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Tasa de Entrega</h4>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-gray-900">{tasaEntrega.toFixed(1)}%</span>
              <span className="text-sm text-gray-500 mb-1">
                de {formatNumber(totalEnviados)} enviados
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${tasaEntrega}%` }}
              />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Tasa de Apertura</h4>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-gray-900">{tasaApertura.toFixed(1)}%</span>
              <span className="text-sm text-gray-500 mb-1">
                de {formatNumber(totalEntregados)} entregados
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${tasaApertura}%` }}
              />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Tasa de Rebote</h4>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-gray-900">{tasaRebote.toFixed(1)}%</span>
              <span className="text-sm text-gray-500 mb-1">
                de {formatNumber(totalEnviados)} enviados
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${tasaRebote}%` }}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
