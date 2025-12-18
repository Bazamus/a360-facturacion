import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Calendar, FileText, CheckCircle } from 'lucide-react'
import { Button, Input, Select } from '../components/ui'
import { FacturasRemesaTable } from '../features/remesas/components'
import { 
  useFacturasParaRemesa, 
  useCrearRemesa,
  useConfiguracionSEPA 
} from '../hooks/useRemesas'
import { useComunidades } from '../hooks/useComunidades'
import { useToast } from '../components/ui/Toast'

export default function CrearRemesa() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  
  const [paso, setPaso] = useState(1)
  const [fechaCobro, setFechaCobro] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [filtros, setFiltros] = useState({ comunidadId: '', fechaInicio: '', fechaFin: '' })
  const [seleccionadas, setSeleccionadas] = useState([])

  const { data: comunidades = [] } = useComunidades()
  const { data: config } = useConfiguracionSEPA()
  const { data: facturas = [], isLoading: loadingFacturas } = useFacturasParaRemesa(filtros)
  const crearRemesaMutation = useCrearRemesa()

  // Calcular fecha mínima de cobro
  const diasAntelacion = config?.dias_antelacion_cobro || 5
  const fechaMinima = new Date()
  fechaMinima.setDate(fechaMinima.getDate() + diasAntelacion)
  const fechaMinimaStr = fechaMinima.toISOString().split('T')[0]

  // Totales
  const facturasSeleccionadas = facturas.filter(f => seleccionadas.includes(f.id))
  const importeTotal = facturasSeleccionadas.reduce((sum, f) => sum + parseFloat(f.total || 0), 0)

  const handleCrear = async () => {
    if (seleccionadas.length === 0) {
      showToast('Selecciona al menos una factura', 'error')
      return
    }

    if (!fechaCobro) {
      showToast('Indica la fecha de cobro', 'error')
      return
    }

    try {
      const resultado = await crearRemesaMutation.mutateAsync({
        facturaIds: seleccionadas,
        fechaCobro,
        descripcion
      })

      showToast(`Remesa creada con ${resultado.incluidas} recibos`, 'success')
      navigate(`/remesas/${resultado.remesa.id}`)
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  const opcionesComunidad = [
    { value: '', label: 'Todas las comunidades' },
    ...comunidades.map(c => ({ value: c.id, label: c.nombre }))
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/remesas')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Crear Remesa Bancaria
          </h1>
          <p className="text-gray-500">Selecciona las facturas para incluir en la remesa SEPA</p>
        </div>
      </div>

      {/* Paso 1: Configuración */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Paso 1: Configuración
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de cobro *
            </label>
            <Input
              type="date"
              value={fechaCobro}
              onChange={(e) => setFechaCobro(e.target.value)}
              min={fechaMinimaStr}
            />
            <p className="text-xs text-gray-500 mt-1">
              Mínimo {diasAntelacion} días de antelación
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <Input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Remesa Diciembre 2025"
            />
          </div>
        </div>

        {config && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
            <div className="font-medium text-gray-700 mb-1">Cuenta de cobro:</div>
            <div className="font-mono">{config.iban_principal}</div>
            <div className="text-gray-500">{config.nombre_banco}</div>
          </div>
        )}
      </div>

      {/* Paso 2: Selección de facturas */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Paso 2: Selección de Facturas
        </h2>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Select
            value={filtros.comunidadId}
            onChange={(e) => setFiltros(f => ({ ...f, comunidadId: e.target.value }))}
            options={opcionesComunidad}
          />
          <Input
            type="date"
            value={filtros.fechaInicio}
            onChange={(e) => setFiltros(f => ({ ...f, fechaInicio: e.target.value }))}
            placeholder="Desde"
          />
          <Input
            type="date"
            value={filtros.fechaFin}
            onChange={(e) => setFiltros(f => ({ ...f, fechaFin: e.target.value }))}
            placeholder="Hasta"
          />
        </div>

        {/* Info */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            Facturas con domiciliación pendientes de cobro: <span className="font-medium">{facturas.length}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const validas = facturas.filter(f => f.estado_remesa === 'valido').map(f => f.id)
              setSeleccionadas(validas)
            }}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Seleccionar todas válidas ({facturas.filter(f => f.estado_remesa === 'valido').length})
          </Button>
        </div>

        {/* Tabla */}
        {loadingFacturas ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : (
          <FacturasRemesaTable
            facturas={facturas}
            seleccionadas={seleccionadas}
            onSeleccionar={setSeleccionadas}
            onSeleccionarTodas={setSeleccionadas}
          />
        )}

        {/* Excluidas */}
        {facturas.filter(f => f.estado_remesa !== 'valido').length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            ⚠️ {facturas.filter(f => f.estado_remesa !== 'valido').length} facturas excluidas por falta de mandato SEPA o IBAN
          </div>
        )}
      </div>

      {/* Resumen */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm font-medium text-blue-900 mb-2">Resumen de Remesa</div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-blue-900">{seleccionadas.length}</span>
            <span className="text-blue-700 ml-2">recibos a incluir</span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-blue-900">
              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(importeTotal)}
            </span>
            <span className="text-blue-700 ml-2">importe total</span>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => navigate('/remesas')}>
          Cancelar
        </Button>
        <Button 
          onClick={handleCrear}
          disabled={seleccionadas.length === 0 || !fechaCobro || crearRemesaMutation.isPending}
        >
          {crearRemesaMutation.isPending ? 'Creando...' : 'Crear remesa en borrador →'}
        </Button>
      </div>
    </div>
  )
}



