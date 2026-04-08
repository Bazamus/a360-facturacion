import { useState } from 'react'
import { usePortalFacturas, usePortalFacturaDetalle } from '@/hooks/usePortal'
import { Card, CardContent, Badge, LoadingSpinner, Select, EmptyState, Button } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { FileText, Download, ChevronDown, ChevronRight, Package } from 'lucide-react'
import JSZip from 'jszip'

const ESTADO_VARIANTS = { emitida: 'warning', pagada: 'success', anulada: 'danger' }
const ESTADO_LABELS = { emitida: 'Emitida', pagada: 'Pagada', anulada: 'Anulada' }

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatPeriodo(inicio, fin) {
  if (!inicio || !fin) return '-'
  const i = new Date(inicio)
  const f = new Date(fin)
  return `${i.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })} — ${f.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`
}

export function PortalFacturas() {
  const currentYear = new Date().getFullYear()
  const [anio, setAnio] = useState(currentYear.toString())
  const [estado, setEstado] = useState('')
  const [page, setPage] = useState(0)
  const [seleccionados, setSeleccionados] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [descargando, setDescargando] = useState(false)
  const toast = useToast()

  const { data: result, isLoading, error } = usePortalFacturas({
    anio: anio || undefined,
    estado: estado || undefined,
    page,
  })

  const facturas = Array.isArray(result?.data) ? result.data : []
  const totalCount = result?.count ?? facturas.length

  // Años disponibles
  const anios = []
  for (let y = currentYear; y >= currentYear - 5; y--) anios.push(y.toString())

  // Resumen del año seleccionado
  const resumen = facturas.length > 0 ? {
    total: facturas.filter((f) => f.estado !== 'anulada').reduce((s, f) => s + Number(f.total || 0), 0),
    count: facturas.length,
    media: facturas.filter((f) => f.estado !== 'anulada').length > 0
      ? facturas.filter((f) => f.estado !== 'anulada').reduce((s, f) => s + Number(f.total || 0), 0) / 12
      : 0,
  } : null

  // Selección masiva
  const toggleSeleccion = (id) => {
    setSeleccionados((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }
  const toggleTodos = () => {
    const facturasConPdf = facturas.filter((f) => f.pdf_url)
    if (seleccionados.length === facturasConPdf.length) setSeleccionados([])
    else setSeleccionados(facturasConPdf.map((f) => f.id))
  }

  // Descarga individual
  const handleDescargar = (factura) => {
    if (factura.pdf_url) {
      window.open(factura.pdf_url, '_blank')
    } else {
      toast.error('PDF no disponible para esta factura')
    }
  }

  // Descarga masiva ZIP
  const handleDescargarZip = async () => {
    const facturasSeleccionadas = facturas.filter((f) => seleccionados.includes(f.id) && f.pdf_url)
    if (facturasSeleccionadas.length === 0) {
      toast.error('No hay facturas con PDF disponible en la selección')
      return
    }

    setDescargando(true)
    try {
      const zip = new JSZip()
      let ok = 0

      for (const factura of facturasSeleccionadas) {
        try {
          const response = await fetch(factura.pdf_url)
          if (!response.ok) continue
          const blob = await response.blob()
          const nombre = `factura_${factura.serie || 2}_${factura.numero || factura.id}.pdf`
          zip.file(nombre, blob)
          ok++
        } catch {
          // Skip failed downloads
        }
      }

      if (ok === 0) {
        toast.error('No se pudieron descargar los PDFs')
        return
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `facturas_${anio || 'todas'}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${ok} factura(s) descargadas`)
      setSeleccionados([])
    } catch (err) {
      toast.error('Error generando ZIP: ' + err.message)
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mis Facturas</h1>
        <p className="text-sm text-gray-500">Consulta y descarga tus facturas</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          Error: {error.message}
        </div>
      )}

      {/* Resumen anual */}
      {resumen && anio && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{resumen.total.toFixed(2)} €</p>
              <p className="text-xs text-gray-500">Total facturado {anio}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{resumen.media.toFixed(2)} €</p>
              <p className="text-xs text-gray-500">Media mensual</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{resumen.count}</p>
              <p className="text-xs text-gray-500">Nº facturas</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={anio} onChange={(e) => { setAnio(e.target.value); setPage(0) }} className="w-32">
              <option value="">Todos</option>
              {anios.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
            <Select value={estado} onChange={(e) => { setEstado(e.target.value); setPage(0) }} className="w-40">
              <option value="">Todos los estados</option>
              <option value="emitida">Emitida</option>
              <option value="pagada">Pagada</option>
              <option value="anulada">Anulada</option>
            </Select>
            {totalCount > 0 && (
              <span className="text-xs text-gray-500 ml-auto">{totalCount} factura(s)</span>
            )}
          </div>
        </div>

        {/* Barra acciones masivas */}
        {seleccionados.length > 0 && (
          <div className="px-4 py-2.5 bg-primary-50 border-b border-primary-200 flex items-center justify-between">
            <span className="text-sm font-medium text-primary-800">{seleccionados.length} seleccionada(s)</span>
            <Button size="sm" onClick={handleDescargarZip} loading={descargando}>
              <Package className="h-3.5 w-3.5 mr-1" /> Descargar ZIP
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner size="lg" /></div>
        ) : !facturas.length ? (
          <CardContent className="p-0">
            <EmptyState icon={FileText} title="Sin facturas" description="No hay facturas disponibles con los filtros seleccionados" />
          </CardContent>
        ) : (
          <div>
            {/* Header */}
            <div className="grid grid-cols-[40px_1fr_100px_1fr_90px_90px_100px_80px_70px] gap-2 px-4 py-2 text-xs font-medium text-gray-500 border-b bg-gray-50">
              <div>
                <input type="checkbox" checked={seleccionados.length > 0} onChange={toggleTodos}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              </div>
              <div>Nº FACTURA</div>
              <div>FECHA</div>
              <div>PERÍODO</div>
              <div className="text-right">BASE</div>
              <div className="text-right">IVA</div>
              <div className="text-right">TOTAL</div>
              <div className="text-center">ESTADO</div>
              <div></div>
            </div>

            {/* Rows */}
            {facturas.map((f) => (
              <div key={f.id}>
                <div
                  className={`grid grid-cols-[40px_1fr_100px_1fr_90px_90px_100px_80px_70px] gap-2 px-4 py-3 items-center border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                    f.estado === 'anulada' ? 'opacity-60' : ''
                  }`}
                  onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    {f.pdf_url && (
                      <input type="checkbox" checked={seleccionados.includes(f.id)}
                        onChange={() => toggleSeleccion(f.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {expandedId === f.id ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                    <span className="font-mono text-sm font-medium text-gray-900">{f.serie}/{f.numero || '-'}</span>
                  </div>
                  <div className="text-sm text-gray-600">{formatDate(f.fecha_factura)}</div>
                  <div className="text-xs text-gray-500">{formatPeriodo(f.periodo_inicio, f.periodo_fin)}</div>
                  <div className="text-sm text-gray-600 text-right">{Number(f.base_imponible || 0).toFixed(2)} €</div>
                  <div className="text-sm text-gray-600 text-right">{Number(f.importe_iva || 0).toFixed(2)} €</div>
                  <div className={`text-sm font-semibold text-right ${f.estado === 'anulada' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {Number(f.total || 0).toFixed(2)} €
                  </div>
                  <div className="text-center">
                    <Badge variant={ESTADO_VARIANTS[f.estado] || 'default'} className="text-[10px]">
                      {ESTADO_LABELS[f.estado] || f.estado}
                    </Badge>
                  </div>
                  <div className="text-right" onClick={(e) => e.stopPropagation()}>
                    {f.pdf_url ? (
                      <button onClick={() => handleDescargar(f)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded transition-colors">
                        <Download className="h-3 w-3" /> PDF
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-400">Sin PDF</span>
                    )}
                  </div>
                </div>

                {/* Detalle expandible */}
                {expandedId === f.id && <FacturaDetalle facturaId={f.id} />}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function FacturaDetalle({ facturaId }) {
  const { data, isLoading } = usePortalFacturaDetalle(facturaId)

  if (isLoading) {
    return <div className="py-6 flex justify-center bg-gray-50 border-b"><LoadingSpinner size="sm" /></div>
  }

  if (!data) return null

  const factura = data.factura
  const lineas = data.lineas || []

  return (
    <div className="bg-gray-50 border-b px-6 py-4 space-y-4">
      {/* Info general */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <span className="text-xs text-gray-500 block">Cliente</span>
          <span className="font-medium text-gray-900">{factura.cliente_nombre}</span>
        </div>
        <div>
          <span className="text-xs text-gray-500 block">NIF</span>
          <span className="text-gray-700">{factura.cliente_nif}</span>
        </div>
        <div>
          <span className="text-xs text-gray-500 block">Vencimiento</span>
          <span className="text-gray-700">{formatDate(factura.fecha_vencimiento)}</span>
        </div>
        <div>
          <span className="text-xs text-gray-500 block">Forma de pago</span>
          <span className="text-gray-700 capitalize">{factura.metodo_pago?.replace('_', ' ') || '-'}</span>
        </div>
      </div>

      {/* Líneas */}
      {lineas.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="text-left pb-2 font-medium">Concepto</th>
                <th className="text-right pb-2 font-medium">Cantidad</th>
                <th className="text-right pb-2 font-medium">Precio</th>
                <th className="text-right pb-2 font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lineas.map((l, i) => (
                <tr key={i}>
                  <td className="py-2">
                    <span className="text-gray-900">{l.concepto_nombre}</span>
                    {l.consumo != null && l.consumo > 0 && (
                      <span className="text-xs text-gray-500 block">
                        Lectura: {l.lectura_anterior} → {l.lectura_actual} ({l.consumo} {l.unidad_medida})
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right text-gray-600">{Number(l.cantidad).toFixed(2)}</td>
                  <td className="py-2 text-right text-gray-600">{Number(l.precio_unitario).toFixed(4)} €</td>
                  <td className="py-2 text-right font-medium text-gray-900">{Number(l.subtotal).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-300">
              <tr>
                <td colSpan="3" className="py-2 text-right text-xs text-gray-500">Base imponible</td>
                <td className="py-2 text-right font-medium">{Number(factura.base_imponible).toFixed(2)} €</td>
              </tr>
              <tr>
                <td colSpan="3" className="py-1 text-right text-xs text-gray-500">IVA ({factura.porcentaje_iva}%)</td>
                <td className="py-1 text-right">{Number(factura.importe_iva).toFixed(2)} €</td>
              </tr>
              <tr>
                <td colSpan="3" className="py-2 text-right text-sm font-bold text-gray-900">Total</td>
                <td className="py-2 text-right text-sm font-bold text-primary-700">{Number(factura.total).toFixed(2)} €</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
