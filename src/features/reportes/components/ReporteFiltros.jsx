import { useState } from 'react'
import { Button, Select, Input, CommunityPicker } from '../../../components/ui'
import { useComunidades } from '../../../hooks/useComunidades'
import { RotateCcw, Calendar } from 'lucide-react'

export function ReporteFiltros({ filtros, onChange, tipo }) {
  const { data: comunidades = [] } = useComunidades()
  const [mostrarPresets, setMostrarPresets] = useState(false)

  const handleChange = (field, value) => {
    onChange({ ...filtros, [field]: value })
  }

  const handleReset = () => {
    onChange({
      comunidadId: '',
      fechaInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      fechaFin: new Date().toISOString().split('T')[0],
      estado: ''
    })
  }

  const aplicarPreset = (preset) => {
    const hoy = new Date()
    let fechaInicio, fechaFin

    switch (preset) {
      case 'hoy':
        fechaInicio = fechaFin = hoy.toISOString().split('T')[0]
        break
      case 'ultima_semana':
        fechaInicio = new Date(hoy.setDate(hoy.getDate() - 7)).toISOString().split('T')[0]
        fechaFin = new Date().toISOString().split('T')[0]
        break
      case 'ultimo_mes':
        fechaInicio = new Date(hoy.setMonth(hoy.getMonth() - 1)).toISOString().split('T')[0]
        fechaFin = new Date().toISOString().split('T')[0]
        break
      case 'ultimo_trimestre':
        fechaInicio = new Date(hoy.setMonth(hoy.getMonth() - 3)).toISOString().split('T')[0]
        fechaFin = new Date().toISOString().split('T')[0]
        break
      case 'ultimo_año':
        fechaInicio = new Date(hoy.setFullYear(hoy.getFullYear() - 1)).toISOString().split('T')[0]
        fechaFin = new Date().toISOString().split('T')[0]
        break
      case 'mes_actual':
        fechaInicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
        fechaFin = new Date().toISOString().split('T')[0]
        break
      case 'año_actual':
        fechaInicio = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
        fechaFin = new Date().toISOString().split('T')[0]
        break
      default:
        return
    }

    onChange({ ...filtros, fechaInicio, fechaFin })
    setMostrarPresets(false)
  }

  const presets = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'ultima_semana', label: 'Última semana' },
    { value: 'ultimo_mes', label: 'Último mes' },
    { value: 'mes_actual', label: 'Mes actual' },
    { value: 'ultimo_trimestre', label: 'Último trimestre' },
    { value: 'año_actual', label: 'Año actual' },
    { value: 'ultimo_año', label: 'Último año' }
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
      {/* Barra de acciones */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarPresets(!mostrarPresets)}
            className="gap-1"
          >
            <Calendar className="w-4 h-4" />
            Presets de Fechas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-1"
          >
            <RotateCcw className="w-4 h-4" />
            Limpiar Filtros
          </Button>
        </div>
      </div>

      {/* Presets de fechas */}
      {mostrarPresets && (
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Selecciona un periodo:</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => aplicarPreset(preset.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Comunidad */}
        <div>
          <CommunityPicker
            value={filtros.comunidadId || ''}
            onChange={(id) => handleChange('comunidadId', id)}
            comunidades={comunidades}
            placeholder="Todas las comunidades"
            allowEmpty
            label="Comunidad"
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



