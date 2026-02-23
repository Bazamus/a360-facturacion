import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, Plus, Eye, Edit2, AlertTriangle,
} from 'lucide-react'
import { useIntervenciones, useUsuarios } from '@/hooks'
import {
  Button, Card, CardContent, EmptyState, LoadingSpinner,
  DataTable, SearchInput, Badge, Select, Pagination,
} from '@/components/ui'

const ESTADO_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'asignada', label: 'Asignada' },
  { value: 'programada', label: 'Programada' },
  { value: 'en_camino', label: 'En camino' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'completada', label: 'Completada' },
  { value: 'facturada', label: 'Facturada' },
  { value: 'cancelada', label: 'Cancelada' },
]

const TIPO_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'correctiva', label: 'Correctiva' },
  { value: 'preventiva', label: 'Preventiva' },
  { value: 'instalacion', label: 'Instalación' },
  { value: 'inspeccion', label: 'Inspección' },
  { value: 'urgencia', label: 'Urgencia' },
]

const PRIORIDAD_VARIANTS = {
  urgente: 'danger',
  alta: 'warning',
  normal: 'default',
  baja: 'info',
}

const ESTADO_VARIANTS = {
  pendiente: 'warning',
  asignada: 'info',
  programada: 'info',
  en_camino: 'primary',
  en_curso: 'primary',
  completada: 'success',
  facturada: 'success',
  cancelada: 'default',
}

const TIPO_LABELS = {
  correctiva: 'Correctiva',
  preventiva: 'Preventiva',
  instalacion: 'Instalación',
  inspeccion: 'Inspección',
  urgencia: 'Urgencia',
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

const PAGE_SIZE = 20

export function IntervencionesLista() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroTecnico, setFiltroTecnico] = useState('')
  const [page, setPage] = useState(0)

  const { data: usuarios } = useUsuarios()
  const tecnicos = usuarios?.filter((u) => u.rol === 'tecnico' || u.rol === 'encargado') ?? []

  const { data: resultado, isLoading, error } = useIntervenciones({
    search,
    estado: filtroEstado || undefined,
    tipo: filtroTipo || undefined,
    tecnicoId: filtroTecnico || undefined,
    page,
    pageSize: PAGE_SIZE,
  })

  const intervenciones = resultado?.data ?? []
  const totalCount = resultado?.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const columns = [
    {
      key: 'numero_parte',
      header: 'Nº Parte',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          {row.tipo === 'urgencia' && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
          <span className="font-mono text-xs font-medium text-gray-900">{value}</span>
        </div>
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
      key: 'prioridad',
      header: 'Prioridad',
      render: (value) => (
        <Badge variant={PRIORIDAD_VARIANTS[value] || 'default'} className="text-xs capitalize">
          {value}
        </Badge>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (value) => (
        <Badge variant={ESTADO_VARIANTS[value] || 'default'} className="text-xs capitalize">
          {value?.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'tecnico_nombre',
      header: 'Técnico',
      render: (value) => (
        <span className="text-sm text-gray-600">{value || '-'}</span>
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
      key: 'created_at',
      header: 'Fecha',
      render: (value) => (
        <span className="text-xs text-gray-500">{formatDate(value)}</span>
      ),
    },
    {
      key: 'acciones',
      header: '',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/sat/intervenciones/${row.id}`)}
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
          Error al cargar intervenciones: {error.message}
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Intervenciones</h1>
          <p className="page-description">Partes de trabajo y gestión de intervenciones técnicas</p>
        </div>
        <Button onClick={() => navigate('/sat/intervenciones/nueva')}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Intervención
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(0) }}
              placeholder="Buscar por nº parte, título, cliente..."
            />
            <Select
              value={filtroEstado}
              onChange={(e) => { setFiltroEstado(e.target.value); setPage(0) }}
            >
              {ESTADO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <Select
              value={filtroTipo}
              onChange={(e) => { setFiltroTipo(e.target.value); setPage(0) }}
            >
              {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <Select
              value={filtroTecnico}
              onChange={(e) => { setFiltroTecnico(e.target.value); setPage(0) }}
            >
              <option value="">Todos los técnicos</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre_completo}</option>
              ))}
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : !intervenciones.length ? (
          <CardContent className="p-0">
            <EmptyState
              icon={ClipboardList}
              title="Sin intervenciones"
              description={search ? 'No se encontraron intervenciones con ese criterio' : 'Crea la primera intervención para comenzar.'}
              action={!search && (
                <Button onClick={() => navigate('/sat/intervenciones/nueva')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Intervención
                </Button>
              )}
            />
          </CardContent>
        ) : (
          <DataTable
            data={intervenciones}
            columns={columns}
            onRowClick={(row) => navigate(`/sat/intervenciones/${row.id}`)}
            pageSize={PAGE_SIZE}
          />
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200">
            <Pagination
              currentPage={page + 1}
              totalPages={totalPages}
              totalItems={totalCount}
              itemsPerPage={PAGE_SIZE}
              onPageChange={(p) => setPage(p - 1)}
              showPageSizeSelector={false}
              showInfo={true}
            />
          </div>
        )}
      </Card>
    </div>
  )
}
