import { useMemo } from 'react'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { Card } from '@/components/ui'
import { BarChart } from '../components/charts'
import { formatCurrency, formatNumber } from '@/lib/utils'

export function ReporteComparativo({ periodo1, periodo2, datos1, datos2 }) {
  // Calcular variaciones
  const comparativa = useMemo(() => {
    if (!datos1 || !datos2) return null

    const calcularVariacion = (actual, anterior) => {
      if (!anterior || anterior === 0) return { valor: 0, porcentaje: 0 }
      const diferencia = actual - anterior
      const porcentaje = (diferencia / anterior) * 100
      return { valor: diferencia, porcentaje }
    }

    return {
      facturacion: {
        periodo1: datos1.facturacion?.total_facturado || 0,
        periodo2: datos2.facturacion?.total_facturado || 0,
        variacion: calcularVariacion(
          datos2.facturacion?.total_facturado || 0,
          datos1.facturacion?.total_facturado || 0
        )
      },
      numFacturas: {
        periodo1: datos1.facturacion?.num_facturas || 0,
        periodo2: datos2.facturacion?.num_facturas || 0,
        variacion: calcularVariacion(
          datos2.facturacion?.num_facturas || 0,
          datos1.facturacion?.num_facturas || 0
        )
      },
      ticketMedio: {
        periodo1: datos1.facturacion?.ticket_medio || 0,
        periodo2: datos2.facturacion?.ticket_medio || 0,
        variacion: calcularVariacion(
          datos2.facturacion?.ticket_medio || 0,
          datos1.facturacion?.ticket_medio || 0
        )
      },
      cobrado: {
        periodo1: datos1.cobro?.total_cobrado || 0,
        periodo2: datos2.cobro?.total_cobrado || 0,
        variacion: calcularVariacion(
          datos2.cobro?.total_cobrado || 0,
          datos1.cobro?.total_cobrado || 0
        )
      },
      tasaCobro: {
        periodo1: datos1.cobro?.tasa_cobro || 0,
        periodo2: datos2.cobro?.tasa_cobro || 0,
        variacion: calcularVariacion(
          datos2.cobro?.tasa_cobro || 0,
          datos1.cobro?.tasa_cobro || 0
        )
      }
    }
  }, [datos1, datos2])

  // Datos para gráfico comparativo
  const datosGrafico = useMemo(() => {
    if (!comparativa) return []

    return [
      {
        name: 'Facturación',
        [periodo1.label]: comparativa.facturacion.periodo1,
        [periodo2.label]: comparativa.facturacion.periodo2
      },
      {
        name: 'Cobrado',
        [periodo1.label]: comparativa.cobrado.periodo1,
        [periodo2.label]: comparativa.cobrado.periodo2
      },
      {
        name: 'Ticket Medio',
        [periodo1.label]: comparativa.ticketMedio.periodo1,
        [periodo2.label]: comparativa.ticketMedio.periodo2
      }
    ]
  }, [comparativa, periodo1, periodo2])

  const IndicadorVariacion = ({ variacion, esMoneda = false }) => {
    const { valor, porcentaje } = variacion
    const esPositivo = porcentaje > 0
    const esCero = porcentaje === 0

    return (
      <div className={`flex items-center gap-2 text-sm ${
        esPositivo ? 'text-green-600' : esCero ? 'text-gray-500' : 'text-red-600'
      }`}>
        {esPositivo ? (
          <ArrowUp className="w-4 h-4" />
        ) : esCero ? (
          <Minus className="w-4 h-4" />
        ) : (
          <ArrowDown className="w-4 h-4" />
        )}
        <span className="font-medium">
          {esPositivo ? '+' : ''}{porcentaje.toFixed(1)}%
        </span>
        <span className="text-xs text-gray-500">
          ({esPositivo ? '+' : ''}{esMoneda ? formatCurrency(valor) : formatNumber(valor)})
        </span>
      </div>
    )
  }

  if (!comparativa) {
    return (
      <div className="text-center py-12 text-gray-500">
        Selecciona dos periodos para comparar
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Comparativa de Periodos</h2>
          <p className="text-gray-500 mt-1">
            {periodo1.label} vs {periodo2.label}
          </p>
        </div>
      </div>

      {/* Métricas comparativas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Facturación */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Facturación Total</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400">{periodo1.label}</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(comparativa.facturacion.periodo1)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">{periodo2.label}</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(comparativa.facturacion.periodo2)}
              </p>
            </div>
            <IndicadorVariacion variacion={comparativa.facturacion.variacion} esMoneda />
          </div>
        </Card>

        {/* Número de facturas */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Número de Facturas</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400">{periodo1.label}</p>
              <p className="text-xl font-bold text-gray-900">
                {formatNumber(comparativa.numFacturas.periodo1)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">{periodo2.label}</p>
              <p className="text-xl font-bold text-gray-900">
                {formatNumber(comparativa.numFacturas.periodo2)}
              </p>
            </div>
            <IndicadorVariacion variacion={comparativa.numFacturas.variacion} />
          </div>
        </Card>

        {/* Ticket medio */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Ticket Medio</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400">{periodo1.label}</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(comparativa.ticketMedio.periodo1)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">{periodo2.label}</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(comparativa.ticketMedio.periodo2)}
              </p>
            </div>
            <IndicadorVariacion variacion={comparativa.ticketMedio.variacion} esMoneda />
          </div>
        </Card>

        {/* Cobrado */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Total Cobrado</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400">{periodo1.label}</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(comparativa.cobrado.periodo1)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">{periodo2.label}</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(comparativa.cobrado.periodo2)}
              </p>
            </div>
            <IndicadorVariacion variacion={comparativa.cobrado.variacion} esMoneda />
          </div>
        </Card>

        {/* Tasa de cobro */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Tasa de Cobro</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400">{periodo1.label}</p>
              <p className="text-xl font-bold text-gray-900">
                {comparativa.tasaCobro.periodo1.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">{periodo2.label}</p>
              <p className="text-xl font-bold text-gray-900">
                {comparativa.tasaCobro.periodo2.toFixed(1)}%
              </p>
            </div>
            <IndicadorVariacion variacion={comparativa.tasaCobro.variacion} />
          </div>
        </Card>
      </div>

      {/* Gráfico comparativo */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Comparativa Visual
        </h3>
        <BarChart
          data={datosGrafico}
          bars={[
            { dataKey: periodo1.label, name: periodo1.label, color: '#3b82f6' },
            { dataKey: periodo2.label, name: periodo2.label, color: '#10b981' }
          ]}
          height={350}
          layout="horizontal"
        />
      </Card>

      {/* Resumen de variaciones */}
      <Card className="p-6 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h3>
        <div className="space-y-2 text-sm">
          <p className="text-gray-700">
            La facturación ha{' '}
            <span className={comparativa.facturacion.variacion.porcentaje >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
              {comparativa.facturacion.variacion.porcentaje >= 0 ? 'aumentado' : 'disminuido'}
            </span>{' '}
            un {Math.abs(comparativa.facturacion.variacion.porcentaje).toFixed(1)}% entre periodos.
          </p>
          <p className="text-gray-700">
            El número de facturas es{' '}
            <span className={comparativa.numFacturas.variacion.porcentaje >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
              {Math.abs(comparativa.numFacturas.variacion.porcentaje).toFixed(1)}%{' '}
              {comparativa.numFacturas.variacion.porcentaje >= 0 ? 'mayor' : 'menor'}
            </span>{' '}
            en el segundo periodo.
          </p>
          <p className="text-gray-700">
            La tasa de cobro{' '}
            {comparativa.tasaCobro.variacion.porcentaje === 0 ? (
              <span className="text-gray-600 font-semibold">se mantiene igual</span>
            ) : (
              <>
                ha{' '}
                <span className={comparativa.tasaCobro.variacion.porcentaje > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {comparativa.tasaCobro.variacion.porcentaje > 0 ? 'mejorado' : 'empeorado'}
                </span>{' '}
                {Math.abs(comparativa.tasaCobro.variacion.porcentaje).toFixed(1)} puntos porcentuales
              </>
            )}.
          </p>
        </div>
      </Card>
    </div>
  )
}
