import { useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, BarChart3, Download } from 'lucide-react'
import { Button, Select } from '../components/ui'
import { ReporteFiltros, ExportButtons } from '../features/reportes/components'
import { DataTable } from '../components/ui'
import { 
  useReporteConsumos, 
  useReporteFacturacion, 
  useReporteMorosidad,
  useExportarExcel,
  useExportarCSV
} from '../hooks/useReportes'
import { useToast } from '../components/ui/Toast'

export default function GenerarReporte() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()
  
  const tipoInicial = searchParams.get('tipo') || 'facturacion'
  const [tipo, setTipo] = useState(tipoInicial)
  const [filtros, setFiltros] = useState({
    comunidadId: '',
    fechaInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
    estado: ''
  })
  const [vistaPrevia, setVistaPrevia] = useState(false)

  // Queries
  const consumosQuery = useReporteConsumos({
    ...filtros,
    enabled: vistaPrevia && tipo === 'consumos'
  })
  
  const facturacionQuery = useReporteFacturacion({
    ...filtros,
    enabled: vistaPrevia && tipo === 'facturacion'
  })
  
  const morosidadQuery = useReporteMorosidad({
    comunidadId: filtros.comunidadId,
    enabled: vistaPrevia && tipo === 'morosidad'
  })

  const exportarExcel = useExportarExcel()
  const exportarCSV = useExportarCSV()

  // Datos según tipo
  const datos = useMemo(() => {
    switch (tipo) {
      case 'consumos':
        return consumosQuery.data || []
      case 'facturacion':
        return facturacionQuery.data?.data || []
      case 'morosidad':
        return morosidadQuery.data?.data || []
      default:
        return []
    }
  }, [tipo, consumosQuery.data, facturacionQuery.data, morosidadQuery.data])

  const totales = useMemo(() => {
    if (tipo === 'facturacion') return facturacionQuery.data?.totales
    if (tipo === 'morosidad') return morosidadQuery.data?.totales
    return null
  }, [tipo, facturacionQuery.data, morosidadQuery.data])

  const isLoading = consumosQuery.isLoading || facturacionQuery.isLoading || morosidadQuery.isLoading

  // Columnas según tipo
  const columnas = useMemo(() => {
    switch (tipo) {
      case 'consumos':
        return [
          { key: 'fecha_lectura', label: 'Fecha', render: (v) => new Date(v).toLocaleDateString('es-ES') },
          { key: 'ubicacion', label: 'Ubicación' },
          { key: 'concepto', label: 'Concepto' },
          { key: 'consumo', label: 'Consumo', className: 'text-right' },
          { key: 'cliente', label: 'Cliente' },
          { key: 'comunidad', label: 'Comunidad' }
        ]
      case 'facturacion':
        return [
          { key: 'numero_completo', label: 'Nº Factura' },
          { key: 'fecha_factura', label: 'Fecha', render: (v) => new Date(v).toLocaleDateString('es-ES') },
          { key: 'cliente_nombre', label: 'Cliente' },
          { key: 'base_imponible', label: 'Base', className: 'text-right', render: (v) => `${parseFloat(v).toFixed(2)} €` },
          { key: 'importe_iva', label: 'IVA', className: 'text-right', render: (v) => `${parseFloat(v).toFixed(2)} €` },
          { key: 'total', label: 'Total', className: 'text-right font-medium', render: (v) => `${parseFloat(v).toFixed(2)} €` },
          { key: 'estado', label: 'Estado' }
        ]
      case 'morosidad':
        return [
          { key: 'cliente', label: 'Cliente' },
          { key: 'nif', label: 'NIF' },
          { key: 'comunidad', label: 'Comunidad' },
          { key: 'num_facturas_pendientes', label: 'Facturas', className: 'text-center' },
          { key: 'importe_pendiente', label: 'Pendiente', className: 'text-right', render: (v) => `${parseFloat(v).toFixed(2)} €` },
          { key: 'dias_mora_max', label: 'Días Mora', className: 'text-center' }
        ]
      default:
        return []
    }
  }, [tipo])

  const opcionesTipo = [
    { value: 'consumos', label: 'Consumos' },
    { value: 'facturacion', label: 'Facturación' },
    { value: 'morosidad', label: 'Morosidad' }
  ]

  const handleGenerarVistaPrevia = () => {
    setVistaPrevia(true)
  }

  const handleExportExcel = async () => {
    if (datos.length === 0) {
      showToast('No hay datos para exportar', 'error')
      return
    }

    try {
      await exportarExcel.mutateAsync({
        data: datos,
        nombreArchivo: `Reporte_${tipo}_${new Date().toISOString().split('T')[0]}`,
        nombreHoja: tipo.charAt(0).toUpperCase() + tipo.slice(1)
      })
      showToast('Excel exportado correctamente', 'success')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  const handleExportCSV = async () => {
    if (datos.length === 0) {
      showToast('No hay datos para exportar', 'error')
      return
    }

    try {
      await exportarCSV.mutateAsync({
        data: datos,
        nombreArchivo: `Reporte_${tipo}_${new Date().toISOString().split('T')[0]}`
      })
      showToast('CSV exportado correctamente', 'success')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/reportes')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Generar Reporte
          </h1>
          <p className="text-gray-500">Configura y genera el reporte deseado</p>
        </div>
      </div>

      {/* Tipo de reporte */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Tipo de Reporte
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {opcionesTipo.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                setTipo(opt.value)
                setVistaPrevia(false)
              }}
              className={`p-4 border rounded-lg text-left transition-colors ${
                tipo === opt.value 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className={`font-medium ${tipo === opt.value ? 'text-blue-700' : 'text-gray-700'}`}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Filtros
        </h2>
        <ReporteFiltros 
          filtros={filtros} 
          onChange={setFiltros} 
          tipo={tipo}
        />
        <div className="mt-4 flex justify-end">
          <Button onClick={handleGenerarVistaPrevia}>
            Generar Vista Previa
          </Button>
        </div>
      </div>

      {/* Resultados */}
      {vistaPrevia && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Resultados ({datos.length} registros)
            </h2>
            <ExportButtons
              onExportExcel={handleExportExcel}
              onExportCSV={handleExportCSV}
              disabled={datos.length === 0}
              isLoading={exportarExcel.isPending || exportarCSV.isPending}
            />
          </div>

          {/* Totales */}
          {totales && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 flex flex-wrap gap-6 text-sm">
              {tipo === 'facturacion' && (
                <>
                  <div>
                    <span className="text-gray-500">Facturas:</span>
                    <span className="ml-2 font-medium">{totales.numFacturas}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Base:</span>
                    <span className="ml-2 font-medium">{totales.baseImponible.toFixed(2)} €</span>
                  </div>
                  <div>
                    <span className="text-gray-500">IVA:</span>
                    <span className="ml-2 font-medium">{totales.iva.toFixed(2)} €</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total:</span>
                    <span className="ml-2 font-bold text-blue-600">{totales.total.toFixed(2)} €</span>
                  </div>
                </>
              )}
              {tipo === 'morosidad' && (
                <>
                  <div>
                    <span className="text-gray-500">Clientes:</span>
                    <span className="ml-2 font-medium">{totales.numClientes}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Facturas:</span>
                    <span className="ml-2 font-medium">{totales.numFacturas}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Importe pendiente:</span>
                    <span className="ml-2 font-bold text-red-600">{totales.importeTotal.toFixed(2)} €</span>
                  </div>
                </>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : datos.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No hay datos para los filtros seleccionados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {columnas.map(col => (
                      <th key={col.key} className={`px-4 py-3 text-left font-medium text-gray-600 ${col.className || ''}`}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {datos.slice(0, 100).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {columnas.map(col => (
                        <td key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                          {col.render ? col.render(row[col.key], row) : row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {datos.length > 100 && (
                <div className="p-4 text-center text-sm text-gray-500 bg-gray-50">
                  Mostrando 100 de {datos.length} registros. Exporta a Excel/CSV para ver todos.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

