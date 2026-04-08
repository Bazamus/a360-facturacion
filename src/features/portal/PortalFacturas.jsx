import { useState } from 'react'
import { usePortalFacturas } from '@/hooks/usePortal'
import { Card, CardContent, Badge, LoadingSpinner, Select, DataTable, EmptyState } from '@/components/ui'
import { FileText, Download, Eye } from 'lucide-react'

const ESTADO_VARIANTS = { emitida: 'warning', pagada: 'success' }

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

  const { data: result, isLoading, error } = usePortalFacturas({
    anio: anio || undefined,
    estado: estado || undefined,
    page,
  })

  // Debug: ver qué devuelve el RPC
  if (result) console.log('Portal facturas result:', result)
  if (error) console.error('Portal facturas error:', error)

  // El RPC devuelve {data: [...], count: N} - manejar ambos formatos
  const facturas = Array.isArray(result?.data) ? result.data : (Array.isArray(result) ? result : [])
  const totalCount = result?.count ?? facturas.length

  // Años disponibles
  const anios = []
  for (let y = currentYear; y >= currentYear - 5; y--) anios.push(y.toString())

  const columns = [
    {
      key: 'numero',
      header: 'Nº Factura',
      render: (value, row) => (
        <span className="font-mono text-sm font-medium text-gray-900">
          {row.serie}/{value || '-'}
        </span>
      ),
    },
    {
      key: 'fecha_factura',
      header: 'Fecha',
      render: (value) => <span className="text-sm text-gray-600">{formatDate(value)}</span>,
    },
    {
      key: 'periodo_inicio',
      header: 'Período',
      render: (_, row) => (
        <span className="text-xs text-gray-500">{formatPeriodo(row.periodo_inicio, row.periodo_fin)}</span>
      ),
    },
    {
      key: 'base_imponible',
      header: 'Base',
      render: (value) => <span className="text-sm text-gray-600">{Number(value || 0).toFixed(2)} €</span>,
    },
    {
      key: 'importe_iva',
      header: 'IVA',
      render: (value) => <span className="text-sm text-gray-600">{Number(value || 0).toFixed(2)} €</span>,
    },
    {
      key: 'total',
      header: 'Total',
      render: (value) => <span className="text-sm font-semibold text-gray-900">{Number(value || 0).toFixed(2)} €</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (value) => (
        <Badge variant={ESTADO_VARIANTS[value] || 'default'} className="text-xs capitalize">
          {value}
        </Badge>
      ),
    },
    {
      key: 'pdf_url',
      header: '',
      sortable: false,
      render: (value) => value ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="h-3.5 w-3.5" />
          PDF
        </a>
      ) : (
        <span className="text-xs text-gray-400">Sin PDF</span>
      ),
    },
  ]

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

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={anio} onChange={(e) => { setAnio(e.target.value); setPage(0) }} className="w-32">
              <option value="">Todos</option>
              {anios.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
            <Select value={estado} onChange={(e) => { setEstado(e.target.value); setPage(0) }} className="w-40">
              <option value="">Todos los estados</option>
              <option value="emitida">Pendiente de pago</option>
              <option value="pagada">Pagada</option>
            </Select>
            {totalCount > 0 && (
              <span className="text-xs text-gray-500 ml-auto">{totalCount} factura(s)</span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner size="lg" /></div>
        ) : !facturas.length ? (
          <CardContent className="p-0">
            <EmptyState
              icon={FileText}
              title="Sin facturas"
              description="No hay facturas disponibles con los filtros seleccionados"
            />
          </CardContent>
        ) : (
          <DataTable
            data={facturas}
            columns={columns}
            totalCount={totalCount}
            page={page}
            pageSize={20}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  )
}
