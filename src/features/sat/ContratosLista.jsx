import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Eye } from 'lucide-react'
import { useContratos, useClientesSimple } from '@/hooks'
import {
  Button, Card, CardContent, EmptyState, LoadingSpinner,
  DataTable, SearchInput, Badge, Select,
} from '@/components/ui'

const ESTADO_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'activo', label: 'Activo' },
  { value: 'suspendido', label: 'Suspendido' },
  { value: 'finalizado', label: 'Finalizado' },
]

const TIPO_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'mantenimiento_preventivo', label: 'Preventivo' },
  { value: 'mantenimiento_correctivo', label: 'Correctivo' },
  { value: 'mantenimiento_integral', label: 'Integral' },
  { value: 'garantia', label: 'Garantía' },
]

const ESTADO_VARIANTS = {
  activo: 'success',
  borrador: 'warning',
  suspendido: 'danger',
  finalizado: 'default',
}

const TIPO_LABELS = {
  mantenimiento_preventivo: 'Preventivo',
  mantenimiento_correctivo: 'Correctivo',
  mantenimiento_integral: 'Integral',
  garantia: 'Garantía',
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ContratosLista() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  const { data: contratos, isLoading, error } = useContratos({
    search: search || undefined,
    estado: filtroEstado || undefined,
  })

  // Filtro por tipo en cliente (la vista no lo tiene como filtro directo)
  const filtered = filtroTipo
    ? contratos?.filter((c) => c.tipo === filtroTipo) ?? []
    : contratos ?? []

  const columns = [
    {
      key: 'numero_contrato',
      header: 'Nº Contrato',
      render: (value) => (
        <span className="font-mono text-xs font-medium text-gray-900">{value}</span>
      ),
    },
    {
      key: 'titulo',
      header: 'Título',
      render: (value) => (
        <span className="text-sm text-gray-900 truncate max-w-[200px] block">{value}</span>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (value) => (
        <span className="text-xs text-gray-600">{TIPO_LABELS[value] || value}</span>
      ),
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
      key: 'cliente_nombre',
      header: 'Cliente',
      render: (value) => (
        <span className="text-sm text-gray-600 truncate max-w-[150px] block">{value || '-'}</span>
      ),
    },
    {
      key: 'fecha_inicio',
      header: 'Vigencia',
      render: (value, row) => (
        <span className="text-xs text-gray-500">
          {formatDate(value)} — {formatDate(row.fecha_fin)}
        </span>
      ),
    },
    {
      key: 'precio_mensual',
      header: 'Precio',
      render: (value) => (
        <span className="text-sm font-medium text-gray-900">
          {value ? `${Number(value).toFixed(2)} €/mes` : '-'}
        </span>
      ),
    },
    {
      key: 'total_intervenciones',
      header: 'Interv.',
      render: (value) => (
        <span className="text-xs text-gray-500">{value ?? 0}</span>
      ),
    },
    {
      key: 'acciones',
      header: '',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/sat/contratos/${row.id}`)}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-red-600">
          Error al cargar contratos: {error.message}
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Contratos de Mantenimiento</h1>
          <p className="page-description">Gestión de contratos de servicio técnico</p>
        </div>
        <Button onClick={() => navigate('/sat/contratos/nuevo')}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Contrato
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nº contrato, título, cliente..."
            />
            <Select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              {ESTADO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <Select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : !filtered.length ? (
          <CardContent className="p-0">
            <EmptyState
              icon={FileText}
              title="Sin contratos"
              description={search ? 'No se encontraron contratos con ese criterio' : 'Crea el primer contrato de mantenimiento.'}
              action={!search && (
                <Button onClick={() => navigate('/sat/contratos/nuevo')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Contrato
                </Button>
              )}
            />
          </CardContent>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            onRowClick={(row) => navigate(`/sat/contratos/${row.id}`)}
          />
        )}
      </Card>
    </div>
  )
}
