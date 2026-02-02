import { Card } from '@/components/ui'
import { AreaChart, BarChart } from '../components/charts'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { TrendingUp, TrendingDown, Clock, AlertCircle } from 'lucide-react'

export function ReporteCashFlow({ datos = [], proyeccion = [] }) {
  if (datos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No hay datos de cash flow disponibles
      </div>
    )
  }

  // Preparar datos para gráfico de área
  const datosGrafico = datos.map(item => ({
    mes: item.mes_nombre || item.mes_texto,
    facturado: item.total_facturado || 0,
    cobrado: item.total_cobrado || 0,
    pendiente: item.pendiente_cobro || 0
  }))

  // Preparar datos para proyección
  const datosProyeccion = proyeccion.map(item => ({
    name: item.rango_dias,
    importe: item.importe_total || 0
  }))

  // Calcular métricas totales
  const totales = {
    facturado: datos.reduce((sum, d) => sum + (d.total_facturado || 0), 0),
    cobrado: datos.reduce((sum, d) => sum + (d.total_cobrado || 0), 0),
    pendiente: datos.reduce((sum, d) => sum + (d.pendiente_cobro || 0), 0),
    diasMedioCobro: datos.reduce((sum, d, i, arr) => 
      sum + (d.dias_medio_cobro || 0) / arr.length, 0
    )
  }

  const tasaCobro = totales.facturado > 0 
    ? (totales.cobrado / totales.facturado) * 100 
    : 0

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-medium text-blue-900">Total Facturado</h3>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {formatCurrency(totales.facturado)}
          </p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-600 rounded-lg">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-medium text-green-900">Total Cobrado</h3>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {formatCurrency(totales.cobrado)}
          </p>
          <p className="text-xs text-green-700 mt-1">
            {tasaCobro.toFixed(1)}% del facturado
          </p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-600 rounded-lg">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-medium text-amber-900">Pendiente de Cobro</h3>
          </div>
          <p className="text-2xl font-bold text-amber-900">
            {formatCurrency(totales.pendiente)}
          </p>
          <p className="text-xs text-amber-700 mt-1">
            {(100 - tasaCobro).toFixed(1)}% del facturado
          </p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-medium text-purple-900">Días Medio de Cobro</h3>
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {totales.diasMedioCobro.toFixed(0)} días
          </p>
        </Card>
      </div>

      {/* Gráfico de evolución */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Evolución de Cash Flow
        </h3>
        <AreaChart
          data={datosGrafico}
          areas={[
            { dataKey: 'facturado', name: 'Facturado', color: '#3b82f6' },
            { dataKey: 'cobrado', name: 'Cobrado', color: '#10b981' },
            { dataKey: 'pendiente', name: 'Pendiente', color: '#f59e0b' }
          ]}
          height={350}
          xDataKey="mes"
        />
      </Card>

      {/* Proyección de cobros */}
      {proyeccion.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Proyección de Cobros Pendientes
          </h3>
          <BarChart
            data={datosProyeccion}
            bars={[
              { dataKey: 'importe', name: 'Importe', color: '#f59e0b' }
            ]}
            height={300}
            layout="horizontal"
          />
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            {proyeccion.map((item, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-xs">{item.rango_dias}</p>
                <p className="font-semibold text-gray-900 mt-1">
                  {formatCurrency(item.importe_total)}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {item.num_facturas} fact.
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tabla de datos mensuales */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Detalle Mensual
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600 font-medium">Mes</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Facturas</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Facturado</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Cobrado</th>
                <th className="px-4 py-3 text-right text-gray-600 font-medium">Pendiente</th>
                <th className="px-4 py-3 text-center text-gray-600 font-medium">Tasa Cobro</th>
                <th className="px-4 py-3 text-center text-gray-600 font-medium">Días Cobro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {datos.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{row.mes_nombre}</td>
                  <td className="px-4 py-3 text-right">{row.num_facturas}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(row.total_facturado)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatCurrency(row.total_cobrado)}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(row.pendiente_cobro)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      row.tasa_cobro >= 80 ? 'bg-green-100 text-green-700' :
                      row.tasa_cobro >= 50 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {row.tasa_cobro ? row.tasa_cobro.toFixed(1) : 0}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.dias_medio_cobro ? Math.round(row.dias_medio_cobro) : '-'} días
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
