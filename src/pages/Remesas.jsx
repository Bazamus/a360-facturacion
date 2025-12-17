import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Download, Building2 } from 'lucide-react'
import { Button, Select } from '../components/ui'
import { RemesasTable } from '../features/remesas/components'
import { useRemesas } from '../hooks/useRemesas'
import { useToast } from '../components/ui/Toast'

export default function Remesas() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [filtros, setFiltros] = useState({
    estado: '',
    año: new Date().getFullYear().toString()
  })

  const { data: remesas = [], isLoading } = useRemesas(filtros)

  const handleDescargarXML = (remesa) => {
    if (!remesa.fichero_xml) {
      showToast('No hay fichero XML disponible', 'error')
      return
    }

    const blob = new Blob([remesa.fichero_xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = remesa.fichero_nombre || `${remesa.referencia}.xml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    showToast('Fichero descargado correctamente', 'success')
  }

  const opcionesEstado = [
    { value: '', label: 'Todos los estados' },
    { value: 'borrador', label: 'Borrador' },
    { value: 'generada', label: 'Generada' },
    { value: 'enviada', label: 'Enviada' },
    { value: 'procesada', label: 'Procesada' },
    { value: 'parcial', label: 'Parcial' },
    { value: 'completada', label: 'Completada' },
    { value: 'rechazada', label: 'Rechazada' }
  ]

  const opcionesAño = []
  const añoActual = new Date().getFullYear()
  for (let i = añoActual; i >= añoActual - 5; i--) {
    opcionesAño.push({ value: i.toString(), label: i.toString() })
  }

  // Calcular totales
  const totalRemesas = remesas.length
  const totalImporte = remesas.reduce((sum, r) => sum + parseFloat(r.importe_total || 0), 0)
  const totalRecibos = remesas.reduce((sum, r) => sum + (r.num_recibos || 0), 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Remesas Bancarias SEPA
          </h1>
          <p className="text-gray-500 mt-1">
            Gestión de remesas para cobro por domiciliación
          </p>
        </div>
        <Button onClick={() => navigate('/remesas/crear')} className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Remesa
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Remesas</div>
          <div className="text-2xl font-bold text-gray-900">{totalRemesas}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Recibos</div>
          <div className="text-2xl font-bold text-gray-900">{totalRecibos}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Importe Total</div>
          <div className="text-2xl font-bold text-gray-900">
            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalImporte)}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Estado:</span>
            <Select
              value={filtros.estado}
              onChange={(e) => setFiltros(f => ({ ...f, estado: e.target.value }))}
              options={opcionesEstado}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Año:</span>
            <Select
              value={filtros.año}
              onChange={(e) => setFiltros(f => ({ ...f, año: e.target.value }))}
              options={opcionesAño}
              className="w-28"
            />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border border-gray-200">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">Cargando remesas...</p>
          </div>
        ) : (
          <RemesasTable 
            remesas={remesas} 
            onDescargar={handleDescargarXML}
          />
        )}
      </div>

      {/* Leyenda de estados */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Estados de remesa:</div>
        <div className="flex flex-wrap gap-4 text-xs">
          <span>📝 Borrador</span>
          <span>📄 Generada</span>
          <span>📤 Enviada</span>
          <span>⚙️ Procesada</span>
          <span>⚠️ Parcial</span>
          <span>✅ Completada</span>
          <span>❌ Rechazada</span>
        </div>
      </div>
    </div>
  )
}

