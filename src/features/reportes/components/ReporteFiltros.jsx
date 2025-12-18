import { useState } from 'react'
import { Button, Select, Input } from '../../../components/ui'
import { useComunidades } from '../../../hooks/useComunidades'

export function ReporteFiltros({ filtros, onChange, tipo }) {
  const { data: comunidades = [] } = useComunidades()

  const handleChange = (field, value) => {
    onChange({ ...filtros, [field]: value })
  }

  const opcionesComunidad = [
    { value: '', label: 'Todas las comunidades' },
    ...comunidades.map(c => ({ value: c.id, label: c.nombre }))
  ]

  const opcionesEstado = [
    { value: '', label: 'Todos los estados' },
    { value: 'borrador', label: 'Borrador' },
    { value: 'emitida', label: 'Emitida' },
    { value: 'pagada', label: 'Pagada' },
    { value: 'anulada', label: 'Anulada' }
  ]

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Comunidad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comunidad
          </label>
          <Select
            value={filtros.comunidadId || ''}
            onChange={(e) => handleChange('comunidadId', e.target.value)}
            options={opcionesComunidad}
          />
        </div>

        {/* Fecha Inicio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Desde
          </label>
          <Input
            type="date"
            value={filtros.fechaInicio || ''}
            onChange={(e) => handleChange('fechaInicio', e.target.value)}
          />
        </div>

        {/* Fecha Fin */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hasta
          </label>
          <Input
            type="date"
            value={filtros.fechaFin || ''}
            onChange={(e) => handleChange('fechaFin', e.target.value)}
          />
        </div>

        {/* Estado (solo para facturación) */}
        {tipo === 'facturacion' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <Select
              value={filtros.estado || ''}
              onChange={(e) => handleChange('estado', e.target.value)}
              options={opcionesEstado}
            />
          </div>
        )}
      </div>
    </div>
  )
}



