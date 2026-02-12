import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, FileText, Mail, Search, X, ArrowUpDown, ArrowUp, ArrowDown, Download, Loader2 } from 'lucide-react'
import { Button, Card, Badge, Select, Input } from '@/components/ui'
import { EstadoBadge } from './EstadoBadge'
import { formatCurrency, formatDate } from '../utils/calculos'
import { useFacturas } from '@/hooks/useFacturas'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { descargarFacturaPDF } from '@/features/facturacion/pdf'
import { useToast } from '@/components/ui/Toast'

// Header ordenable
function SortHeader({ field, currentSort, currentDirection, onSort, children, align = 'left' }) {
  const isActive = currentSort === field
  const Icon = isActive
    ? (currentDirection === 'asc' ? ArrowUp : ArrowDown)
    : ArrowUpDown

  return (
    <th
      className={`px-3 py-3 text-${align} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        <span>{children}</span>
        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
      </div>
    </th>
  )
}

export function FacturasEmbedded({
  clienteId,
  comunidadId,
  showCliente = false,
  showComunidad = false
}) {
  const navigate = useNavigate()
  const toast = useToast()

  // Estado para descarga PDF
  const [descargandoPDF, setDescargandoPDF] = useState(null)

  // Descargar PDF directamente
  const handleDescargarPDF = async (factura) => {
    setDescargandoPDF(factura.id)
    try {
      // Obtener datos completos de la factura
      const { data: facturaCompleta, error: errFactura } = await supabase
        .from('facturas')
        .select(`
          *,
          comunidad:comunidades(id, nombre, codigo, cif, direccion, cp, ciudad, provincia),
          ubicacion:ubicaciones(id, nombre),
          contador:contadores(id, numero_serie),
          cliente:clientes(id, codigo_cliente, nombre, apellidos, nif, email, telefono, direccion_correspondencia, cp_correspondencia, ciudad_correspondencia, provincia_correspondencia, iban)
        `)
        .eq('id', factura.id)
        .single()

      if (errFactura) throw errFactura

      // Obtener líneas
      const { data: lineas, error: errLineas } = await supabase
        .from('facturas_lineas')
        .select(`*, concepto:conceptos(id, codigo, nombre, unidad_medida)`)
        .eq('factura_id', factura.id)
        .order('orden')

      if (errLineas) throw errLineas

      // Obtener histórico consumo
      const { data: historico, error: errHist } = await supabase
        .from('facturas_consumo_historico')
        .select('*')
        .eq('factura_id', factura.id)
        .order('orden')

      if (errHist) throw errHist

      descargarFacturaPDF(facturaCompleta, lineas || [], historico || [])
    } catch (error) {
      console.error('Error descargando PDF:', error)
      toast.error('Error al descargar PDF')
    } finally {
      setDescargandoPDF(null)
    }
  }

  // Filtros
  const [estado, setEstado] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('fecha_factura')
  const [sortDirection, setSortDirection] = useState('desc')

  // Calcular fechas según periodo
  const { fechaDesde, fechaHasta } = useMemo(() => {
    const hoy = new Date()
    let desde = ''
    let hasta = ''

    switch (periodo) {
      case 'mes_actual': {
        desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0]
        hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0]
        break
      }
      case 'mes_anterior': {
        desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).toISOString().split('T')[0]
        hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0).toISOString().split('T')[0]
        break
      }
      case 'trimestre': {
        desde = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1).toISOString().split('T')[0]
        hasta = hoy.toISOString().split('T')[0]
        break
      }
      case 'anio': {
        desde = new Date(hoy.getFullYear(), 0, 1).toISOString().split('T')[0]
        hasta = hoy.toISOString().split('T')[0]
        break
      }
      default:
        break
    }

    return { fechaDesde: desde, fechaHasta: hasta }
  }, [periodo])

  // Fetch facturas
  const { data: facturas, isLoading } = useFacturas({
    clienteId,
    comunidadId,
    estado: estado || undefined,
    search: search || undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
    sortBy,
    sortDirection,
    limit: 500
  })

  const listaFacturas = Array.isArray(facturas) ? facturas : facturas?.data || []

  // Calcular resumen
  const resumen = useMemo(() => {
    const total = listaFacturas.reduce((sum, f) => sum + (f.total || 0), 0)
    const pendiente = listaFacturas.filter(f => f.estado === 'emitida').reduce((sum, f) => sum + (f.total || 0), 0)
    const cobrado = listaFacturas.filter(f => f.estado === 'pagada').reduce((sum, f) => sum + (f.total || 0), 0)
    const count = listaFacturas.length

    return { total, pendiente, cobrado, count }
  }, [listaFacturas])

  // Ordenar
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDirection('desc')
    }
  }

  // Limpiar filtros
  const hayFiltros = estado || periodo || search
  const limpiarFiltros = () => {
    setEstado('')
    setPeriodo('')
    setSearch('')
  }

  return (
    <div className="space-y-4">
      {/* Cards de resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border rounded-lg p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Facturado</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(resumen.total)}</p>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pendiente</p>
          <p className="text-lg font-bold text-blue-600 mt-1">{formatCurrency(resumen.pendiente)}</p>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Cobrado</p>
          <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(resumen.cobrado)}</p>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">N. Facturas</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{resumen.count}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="w-40">
          <Select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            <option value="">Todo el tiempo</option>
            <option value="mes_actual">Mes actual</option>
            <option value="mes_anterior">Mes anterior</option>
            <option value="trimestre">Ultimo trimestre</option>
            <option value="anio">Este ano</option>
          </Select>
        </div>

        <div className="w-36">
          <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="borrador">Borradores</option>
            <option value="emitida">Emitidas</option>
            <option value="pagada">Pagadas</option>
            <option value="anulada">Anuladas</option>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px] max-w-xs relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar factura, NIF..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {hayFiltros && (
          <button
            onClick={limpiarFiltros}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      {isLoading ? (
        <Card className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-500">Cargando facturas...</span>
          </div>
        </Card>
      ) : listaFacturas.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {hayFiltros
              ? 'No se encontraron facturas con los filtros aplicados'
              : 'No hay facturas generadas'}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <SortHeader field="numero_completo" currentSort={sortBy} currentDirection={sortDirection} onSort={handleSort}>
                    N. Factura
                  </SortHeader>
                  <SortHeader field="fecha_factura" currentSort={sortBy} currentDirection={sortDirection} onSort={handleSort}>
                    Fecha
                  </SortHeader>
                  {showCliente && (
                    <SortHeader field="cliente_nombre" currentSort={sortBy} currentDirection={sortDirection} onSort={handleSort}>
                      Cliente
                    </SortHeader>
                  )}
                  {showComunidad && (
                    <SortHeader field="comunidad_nombre" currentSort={sortBy} currentDirection={sortDirection} onSort={handleSort}>
                      Comunidad
                    </SortHeader>
                  )}
                  <SortHeader field="total" currentSort={sortBy} currentDirection={sortDirection} onSort={handleSort} align="right">
                    Total
                  </SortHeader>
                  <SortHeader field="estado" currentSort={sortBy} currentDirection={sortDirection} onSort={handleSort} align="center">
                    Estado
                  </SortHeader>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {listaFacturas.map(factura => (
                  <tr key={factura.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Link
                        to={`/facturacion/facturas/${factura.id}`}
                        className="font-mono font-medium text-primary-600 hover:text-primary-800 text-sm"
                      >
                        {factura.numero_completo || '-- Borrador --'}
                      </Link>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(factura.fecha_factura)}
                    </td>
                    {showCliente && (
                      <td className="px-3 py-3">
                        <Link
                          to={`/clientes/${factura.cliente_id}`}
                          className="text-sm font-medium text-gray-900 hover:text-primary-600 truncate block max-w-[180px]"
                        >
                          {factura.cliente_nombre}
                        </Link>
                        <span className="text-xs text-gray-500">{factura.cliente_nif}</span>
                      </td>
                    )}
                    {showComunidad && (
                      <td className="px-3 py-3">
                        <Link
                          to={`/comunidades/${factura.comunidad_id}`}
                          className="text-sm text-gray-900 hover:text-primary-600 truncate block max-w-[150px]"
                        >
                          {factura.comunidad_nombre}
                        </Link>
                        <span className="text-xs text-gray-500">{factura.comunidad_codigo}</span>
                      </td>
                    )}
                    <td className="px-3 py-3 whitespace-nowrap text-right">
                      <span className="font-semibold text-gray-900 text-sm">
                        {formatCurrency(factura.total)}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <EstadoBadge estado={factura.estado} size="sm" />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/facturacion/facturas/${factura.id}`)}
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {['emitida', 'pagada', 'anulada'].includes(factura.estado) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDescargarPDF(factura)}
                            title="Descargar PDF"
                            disabled={descargandoPDF === factura.id}
                          >
                            {descargandoPDF === factura.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Download className="w-4 h-4" />
                            }
                          </Button>
                        )}

                        {factura.estado === 'emitida' && factura.cliente_email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/facturacion/facturas/${factura.id}`)}
                            title={factura.email_enviado
                              ? `Enviada el ${formatDate(factura.fecha_email_enviado)}`
                              : 'Enviar por email'}
                          >
                            <Mail className={`w-4 h-4 ${factura.email_enviado ? 'text-green-500' : 'text-gray-400'}`} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
