import React, { useState, useMemo } from 'react'
import { Calendar, Info } from 'lucide-react'
import { Card } from '@/components/ui'

// Generar lista de meses para selector
function generarMeses(numMeses = 12) {
  const meses = []
  const hoy = new Date()
  
  for (let i = 0; i < numMeses; i++) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    meses.push({
      value: fecha.toISOString().slice(0, 7), // YYYY-MM
      label: fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
      inicio: new Date(fecha.getFullYear(), fecha.getMonth(), 1).toISOString().split('T')[0],
      fin: new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).toISOString().split('T')[0]
    })
  }
  
  return meses
}

export function PeriodoSelector({ value, onChange }) {
  const [modo, setModo] = useState('mes') // 'mes' o 'personalizado'
  const meses = useMemo(() => generarMeses(12), [])

  const handleMesChange = (mesValue) => {
    const mes = meses.find(m => m.value === mesValue)
    if (mes) {
      onChange({
        inicio: mes.inicio,
        fin: mes.fin,
        label: mes.label
      })
    }
  }

  const handleFechaChange = (campo, valor) => {
    onChange({
      ...value,
      [campo]: valor,
      label: 'Periodo personalizado'
    })
  }

  // Encontrar el mes seleccionado actual
  const mesActual = meses.find(m => m.inicio === value?.inicio && m.fin === value?.fin)?.value || ''

  return (
    <Card className="p-4">
      {/* Título y tooltip explicativo */}
      <div className="mb-3 flex items-start gap-2">
        <h3 className="text-sm font-medium text-gray-700">
          Rango de búsqueda de lecturas
        </h3>
        <div className="group relative">
          <Info className="w-4 h-4 text-gray-400 cursor-help" />
          <div className="absolute left-0 top-6 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            Filtra las lecturas pendientes dentro de este rango. El período real de facturación se calculará automáticamente desde las fechas de cada lectura (anterior → actual).
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Selector de modo */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="modo-periodo"
              checked={modo === 'mes'}
              onChange={() => setModo('mes')}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm">Mes completo</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="modo-periodo"
              checked={modo === 'personalizado'}
              onChange={() => setModo('personalizado')}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm">Personalizado</span>
          </label>
        </div>

        <div className="h-8 w-px bg-gray-200" />

        {/* Selector de mes */}
        {modo === 'mes' && (
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <select
              value={mesActual}
              onChange={(e) => handleMesChange(e.target.value)}
              className="rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Selecciona un mes</option>
              {meses.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Fechas personalizadas */}
        {modo === 'personalizado' && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Desde:</label>
              <input
                type="date"
                value={value?.inicio || ''}
                onChange={(e) => handleFechaChange('inicio', e.target.value)}
                className="rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Hasta:</label>
              <input
                type="date"
                value={value?.fin || ''}
                onChange={(e) => handleFechaChange('fin', e.target.value)}
                className="rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Mostrar periodo seleccionado */}
        {value?.inicio && value?.fin && (
          <div className="ml-auto text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded">
            {new Date(value.inicio).toLocaleDateString('es-ES')} - {new Date(value.fin).toLocaleDateString('es-ES')}
          </div>
        )}
      </div>
    </Card>
  )
}



