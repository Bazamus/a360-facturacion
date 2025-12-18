import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  BarChart3, 
  TrendingUp, 
  Euro, 
  FileText, 
  Users, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react'
import { Button, Select } from '../components/ui'
import { 
  MetricasCard, 
  GraficoComunidades, 
  GraficoEvolucion 
} from '../features/reportes/components'
import { 
  useDashboardMetricas, 
  useEvolucionFacturacion,
  calcularRangoFechas 
} from '../hooks/useReportes'

export default function ReportesDashboard() {
  const navigate = useNavigate()
  const [periodo, setPeriodo] = useState('mes_actual')
  
  const rangoFechas = calcularRangoFechas(periodo)
  const { data: metricas, isLoading, refetch } = useDashboardMetricas(rangoFechas)
  const { data: evolucion = [] } = useEvolucionFacturacion()

  const opcionesPeriodo = [
    { value: 'mes_actual', label: 'Mes actual' },
    { value: 'mes_anterior', label: 'Mes anterior' },
    { value: 'trimestre', label: 'Último trimestre' },
    { value: 'año_actual', label: 'Año actual' }
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Dashboard de Reportes
          </h1>
          <p className="text-gray-500 mt-1">
            Métricas y análisis de facturación
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            options={opcionesPeriodo}
            className="w-40"
          />
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricasCard
              titulo="Facturado"
              valor={metricas?.facturacion?.total_facturado || 0}
              formato="moneda"
              icono={Euro}
              color="blue"
            />
            <MetricasCard
              titulo="Facturas"
              valor={metricas?.facturacion?.num_facturas || 0}
              formato="numero"
              icono={FileText}
              color="green"
            />
            <MetricasCard
              titulo="Ticket Medio"
              valor={metricas?.facturacion?.ticket_medio || 0}
              formato="moneda"
              icono={TrendingUp}
              color="purple"
            />
            <MetricasCard
              titulo="Tasa de Cobro"
              valor={metricas?.cobro?.tasa_cobro || 0}
              formato="porcentaje"
              icono={Users}
              color="amber"
            />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Facturación por comunidad */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Facturación por Comunidad
              </h2>
              <GraficoComunidades datos={metricas?.topComunidades || []} />
            </div>

            {/* Evolución mensual */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Evolución Mensual
              </h2>
              <GraficoEvolucion datos={evolucion} />
            </div>
          </div>

          {/* Métricas de cobro */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700">Cobrado</span>
                <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                  {metricas?.cobro?.num_cobradas || 0} facturas
                </span>
              </div>
              <div className="text-2xl font-bold text-green-800 mt-2">
                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
                  .format(metricas?.cobro?.total_cobrado || 0)}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-700">Pendiente</span>
                <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                  {metricas?.cobro?.num_pendientes || 0} facturas
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-800 mt-2">
                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
                  .format(metricas?.cobro?.total_pendiente || 0)}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">Lecturas</span>
                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                  {metricas?.consumo?.contadores_con_lectura || 0} contadores
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-800 mt-2">
                {metricas?.consumo?.total_lecturas || 0}
              </div>
            </div>
          </div>

          {/* Reportes disponibles */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Reportes Disponibles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/reportes/generar?tipo=consumos')}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="font-medium">Consumos</span>
                </div>
                <p className="text-sm text-gray-500">
                  Por vivienda, comunidad o comparativo
                </p>
              </button>

              <button
                onClick={() => navigate('/reportes/generar?tipo=facturacion')}
                className="p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="font-medium">Facturación</span>
                </div>
                <p className="text-sm text-gray-500">
                  Facturas emitidas, estado de cobro
                </p>
              </button>

              <button
                onClick={() => navigate('/reportes/generar?tipo=morosidad')}
                className="p-4 border border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="font-medium">Morosidad</span>
                </div>
                <p className="text-sm text-gray-500">
                  Clientes con facturas vencidas
                </p>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}



