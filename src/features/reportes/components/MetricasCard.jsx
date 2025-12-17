import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export function MetricasCard({ 
  titulo, 
  valor, 
  valorAnterior,
  formato = 'numero',
  icono: Icon,
  color = 'blue'
}) {
  const formatValue = (val) => {
    if (formato === 'moneda') {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
      }).format(val || 0)
    }
    if (formato === 'porcentaje') {
      return `${(val || 0).toFixed(1)}%`
    }
    return new Intl.NumberFormat('es-ES').format(val || 0)
  }

  const calcularVariacion = () => {
    if (!valorAnterior || valorAnterior === 0) return null
    return ((valor - valorAnterior) / valorAnterior) * 100
  }

  const variacion = calcularVariacion()

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{titulo}</span>
        {Icon && (
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-gray-900">
          {formatValue(valor)}
        </span>
        
        {variacion !== null && (
          <div className={`flex items-center text-sm ${
            variacion > 0 ? 'text-green-600' : variacion < 0 ? 'text-red-600' : 'text-gray-500'
          }`}>
            {variacion > 0 ? (
              <TrendingUp className="w-4 h-4 mr-1" />
            ) : variacion < 0 ? (
              <TrendingDown className="w-4 h-4 mr-1" />
            ) : (
              <Minus className="w-4 h-4 mr-1" />
            )}
            <span>{Math.abs(variacion).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

