import { useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, BarChart3, Download } from 'lucide-react'
import { Button, Select, Card } from '../components/ui'
import { ReporteFiltros, ExportButtons } from '../features/reportes/components'
import { ReporteComparativo } from '../features/reportes/templates/ReporteComparativo'
import { ReporteCashFlow } from '../features/reportes/templates/ReporteCashFlow'
import { ReporteEnvios } from '../features/reportes/templates/ReporteEnvios'
import { DataTable } from '../components/ui'
import { 
  useReporteConsumos, 
  useReporteFacturacion, 
  useReporteMorosidad,
  useReporteComparativo,
  useReporteCashFlow,
  useProyeccionCobros,
  useEvolucionEnvios,
  useExportarExcel,
  useExportarCSV,
  calcularRangoFechas
} from '../hooks/useReportes'
import { useEnviosStats } from '../hooks/useEnvios'
import { useToast } from '../components/ui/Toast'
import { descargarReportePDF } from '../features/reportes/services/pdfService'

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
  
  // Para reporte comparativo
  const [periodo1Selector, setPeriodo1Selector] = useState('mes_anterior')
  const [periodo2Selector, setPeriodo2Selector] = useState('mes_actual')

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

  // Columnas según tipo para DataTable
  const columnas = useMemo(() => {
    switch (tipo) {
      case 'consumos':
        return [
          { 
            key: 'fecha_lectura', 
            header: 'Fecha', 
            render: (value) => new Date(value).toLocaleDateString('es-ES')
          },
          { key: 'ubicacion', header: 'Ubicación' },
          { key: 'concepto', header: 'Concepto' },
          { 
            key: 'consumo', 
            header: 'Consumo', 
            cellClassName: 'text-right',
            render: (value) => `${parseFloat(value || 0).toFixed(3)} m³`
          },
          { key: 'cliente', header: 'Cliente' },
          { key: 'comunidad', header: 'Comunidad' }
        ]
      case 'facturacion':
        return [
          { key: 'numero_completo', header: 'Nº Factura' },
          { 
            key: 'fecha_factura', 
            header: 'Fecha', 
            render: (value) => new Date(value).toLocaleDateString('es-ES') 
          },
          { key: 'cliente_nombre', header: 'Cliente' },
          { 
            key: 'base_imponible', 
            header: 'Base', 
            cellClassName: 'text-right',
            render: (value) => `${parseFloat(value || 0).toFixed(2)} €` 
          },
          { 
            key: 'importe_iva', 
            header: 'IVA', 
            cellClassName: 'text-right',
            render: (value) => `${parseFloat(value || 0).toFixed(2)} €` 
          },
          { 
            key: 'total', 
            header: 'Total', 
            cellClassName: 'text-right font-medium',
            render: (value) => `${parseFloat(value || 0).toFixed(2)} €` 
          },
          { key: 'estado', header: 'Estado' }
        ]
      case 'morosidad':
        return [
          { key: 'cliente', header: 'Cliente' },
          { key: 'nif', header: 'NIF' },
          { key: 'comunidad', header: 'Comunidad' },
          { 
            key: 'num_facturas_pendientes', 
            header: 'Facturas', 
            cellClassName: 'text-center' 
          },
          { 
            key: 'importe_pendiente', 
            header: 'Pendiente', 
            cellClassName: 'text-right',
            render: (value) => `${parseFloat(value || 0).toFixed(2)} €` 
          },
          { 
            key: 'dias_mora_max', 
            header: 'Días Mora', 
            cellClassName: 'text-center' 
          }
        ]
      default:
        return []
    }
  }, [tipo])

  // Queries para reporte comparativo
  const periodo1Rango = calcularRangoFechas(periodo1Selector)
  const periodo2Rango = calcularRangoFechas(periodo2Selector)
  const comparativoQuery = useReporteComparativo(periodo1Rango, periodo2Rango)

  // Queries para Cash Flow
  const cashFlowQuery = useReporteCashFlow({
    comunidadId: filtros.comunidadId,
    meses: 12,
    enabled: vistaPrevia && tipo === 'cashflow'
  })
  const proyeccionQuery = useProyeccionCobros({
    diasHorizonte: 90,
    enabled: vistaPrevia && tipo === 'cashflow'
  })

  const opcionesTipo = [
    { value: 'consumos', label: 'Consumos' },
    { value: 'facturacion', label: 'Facturación' },
    { value: 'morosidad', label: 'Morosidad' },
    { value: 'comparativo', label: 'Comparativa Temporal' },
    { value: 'cashflow', label: 'Cash Flow' }
  ]

  const opcionesPeriodo = [
    { value: 'mes_actual', label: 'Mes actual' },
    { value: 'mes_anterior', label: 'Mes anterior' },
    { value: 'trimestre', label: 'Último trimestre' },
    { value: 'año_actual', label: 'Año actual' }
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

  const handleExportPDF = async () => {
    if (datos.length === 0) {
      showToast('No hay datos para exportar', 'error')
      return
    }

    try {
      const tipoNombre = tipo.charAt(0).toUpperCase() + tipo.slice(1)
      const periodo = filtros.fechaInicio && filtros.fechaFin
        ? `${new Date(filtros.fechaInicio).toLocaleDateString('es-ES')} - ${new Date(filtros.fechaFin).toLocaleDateString('es-ES')}`
        : 'Todos los periodos'

      await descargarReportePDF({
        titulo: `Reporte de ${tipoNombre}`,
        subtitulo: `Sistema de Facturación A360`,
        periodo,
        datos,
        columnas,
        totales: totales ? Object.values(totales) : null
      }, `Reporte_${tipo}_${new Date().toISOString().split('T')[0]}.pdf`)

      showToast('PDF generado correctamente', 'success')
    } catch (error) {
      console.error('Error al generar PDF:', error)
      showToast('Error al generar PDF: ' + error.message, 'error')
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
      {tipo === 'comparativo' ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Seleccionar Periodos a Comparar
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Periodo 1
              </label>
              <Select
                value={periodo1Selector}
                onChange={(e) => setPeriodo1Selector(e.target.value)}
                options={opcionesPeriodo}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Periodo 2
              </label>
              <Select
                value={periodo2Selector}
                onChange={(e) => setPeriodo2Selector(e.target.value)}
                options={opcionesPeriodo}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleGenerarVistaPrevia}>
              Generar Comparativa
            </Button>
          </div>
        </Card>
      ) : (
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
      )}

      {/* Resultados - Reporte Comparativo */}
      {vistaPrevia && tipo === 'comparativo' && (
        <ReporteComparativo
          periodo1={{
            label: opcionesPeriodo.find(p => p.value === periodo1Selector)?.label,
            ...periodo1Rango
          }}
          periodo2={{
            label: opcionesPeriodo.find(p => p.value === periodo2Selector)?.label,
            ...periodo2Rango
          }}
          datos1={comparativoQuery.data?.periodo1}
          datos2={comparativoQuery.data?.periodo2}
        />
      )}

      {/* Resultados - Cash Flow */}
      {vistaPrevia && tipo === 'cashflow' && (
        <ReporteCashFlow
          datos={cashFlowQuery.data || []}
          proyeccion={proyeccionQuery.data || []}
        />
      )}

      {/* Resultados - Estadísticas de Envíos */}
      {vistaPrevia && tipo === 'envios' && (
        <ReporteEnvios
          stats={statsEnviosQuery.data || {}}
          evolucion={evolucionEnviosQuery.data || []}
        />
      )}

      {/* Resultados - Otros Reportes */}
      {vistaPrevia && tipo !== 'comparativo' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Resultados ({datos.length} registros)
            </h2>
            <ExportButtons
              onExportExcel={handleExportExcel}
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
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

          <DataTable
            columns={columnas}
            data={datos}
            loading={isLoading}
            emptyMessage="No hay datos para los filtros seleccionados"
            pageSize={50}
            sortable={true}
          />
        </div>
      )}
    </div>
  )
}



