import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { cn } from '@/lib/utils'

/**
 * Tarjeta calculadora de factor de conversión
 * Muestra precio anterior, precio actual y factor resultante
 */
export function FactorCalculator({
  titulo,
  subtitulo,
  unidad = '€/kWh',
  valorAnterior,
  valorActual,
  onValorAnteriorChange,
  onValorActualChange,
  className
}) {
  const factor = useMemo(() => {
    const ant = parseFloat(valorAnterior)
    const act = parseFloat(valorActual)
    if (!ant || ant <= 0 || !act || act <= 0) return null
    return act / ant
  }, [valorAnterior, valorActual])

  const variacion = useMemo(() => {
    if (!factor) return null
    return (factor - 1) * 100
  }, [factor])

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-5', className)}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{titulo}</h3>
        {subtitulo && <p className="text-xs text-gray-500 mt-0.5">{subtitulo}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <FormField label={`Precio anterior (${unidad})`}>
          <Input
            type="number"
            step="0.000001"
            min="0"
            placeholder="0.000000"
            value={valorAnterior}
            onChange={(e) => onValorAnteriorChange(e.target.value)}
          />
        </FormField>

        <FormField label={`Precio actual (${unidad})`}>
          <Input
            type="number"
            step="0.000001"
            min="0"
            placeholder="0.000000"
            value={valorActual}
            onChange={(e) => onValorActualChange(e.target.value)}
          />
        </FormField>
      </div>

      {/* Factor resultante */}
      <div className={cn(
        'rounded-md px-4 py-3 text-center',
        factor
          ? variacion > 0 ? 'bg-amber-50 border border-amber-200' : variacion < 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
          : 'bg-gray-50 border border-gray-200'
      )}>
        <span className="text-xs text-gray-500 block mb-1">Factor de conversión</span>
        <div className="flex items-center justify-center gap-2">
          {factor ? (
            <>
              <span className="text-2xl font-bold text-gray-900">
                {factor.toFixed(5)}
              </span>
              <span className={cn(
                'flex items-center gap-0.5 text-sm font-medium',
                variacion > 0 ? 'text-amber-600' : variacion < 0 ? 'text-green-600' : 'text-gray-500'
              )}>
                {variacion > 0 ? <TrendingUp className="h-4 w-4" /> : variacion < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                {variacion > 0 ? '+' : ''}{variacion.toFixed(2)}%
              </span>
            </>
          ) : (
            <span className="text-lg text-gray-400">—</span>
          )}
        </div>
      </div>
    </div>
  )
}
