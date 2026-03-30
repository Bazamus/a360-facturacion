import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ticket, Plus, Eye } from 'lucide-react'
import { useTickets, useUsuarios } from '@/hooks'
import {
  Button, Card, CardContent, EmptyState, LoadingSpinner,
  DataTable, SearchInput, Badge, Select,
} from '@/components/ui'

const ESTADO_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'abierto', label: 'Abierto' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'esperando_cliente', label: 'Esperando cliente' },
  { value: 'esperando_material', label: 'Esperando material' },
  { value: 'resuelto', label: 'Resuelto' },
  { value: 'cerrado', label: 'Cerrado' },
]

const PRIORIDAD_OPTIONS = [
  { value: '', label: 'Todas las prioridades' },
  { value: 'baja', label: 'Baja' },
  { value: 'normal', label: 'Normal' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'critica', label: 'Crítica' },
]

const ESTADO_VARIANTS = {
  abierto: 'warning',
  en_progreso: 'info',
  esperando_cliente: 'default',
  esperando_material: 'default',
  resuelto: 'success',
  cerrado: 'default',
}

const PRIORIDAD_VARIANTS = {
  baja: 'default',
  normal: 'info',
  alta: 'warning',
  urgente: 'danger',
  critica: 'danger',
}

const TIPO_LABELS = {
  incidencia: 'Incidencia',
  consulta: 'Consulta',
  solicitud: 'Solicitud',
  queja: 'Queja',
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function TicketsLista() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroPrioridad, setFiltroPrioridad] = useState('')
  const [page, setPage] = useState(0)

  const { data: result, isLoading, error } = useTickets({
    search: search || undefined,
    estado: filtroEstado || undefined,
    prioridad: filtroPrioridad || undefined,
    page,
  })

  const tickets = result?.data ?? []
  const totalCount = result?.count ?? 0

  const columns = [
    {
      key: 'numero_ticket',
      header: 'Nº Ticket',
      render: (value) => (
        <span className="font-mono text-xs font-medium text-gray-900">{value}</span>
      ),
    },
    {
      key: 'asunto',
      header: 'Asunto',
      render: (value) => (
        <span className="text-sm text-gray-900 truncate max-w-[250px] block">{value}</span>
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
      key: 'cliente_nombre',
      header: 'Cliente',
      render: (value) => (
        <span className="text-sm text-gray-600 truncate max-w-[150px] block">{value || '-'}</span>
      ),
    },
    {
      key: 'asignado_nombre',
      header: 'Asignado',
      render: (value) => (
        <span className="text-sm text-gray-600">{value || 'Sin asignar'}</span>
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
      key: 'num_comentarios',
      header: '',
      sortable: false,
      render: (value) => value > 0 ? (
        <span className="text-xs text-gray-400">{value} com.</span>
      ) : null,
    },
  ]

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-red-600">
          Error al cargar tickets: {error.message}
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Tickets</h1>
          <p className="page-description">Gestión de incidencias y solicitudes de clientes</p>
        </div>
        <Button onClick={() => navigate('/sat/tickets/nuevo')}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Ticket
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nº ticket, asunto, cliente..."
            />
            <Select
              value={filtroEstado}
              onChange={(e) => { setFiltroEstado(e.target.value); setPage(0) }}
            >
              {ESTADO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <Select
              value={filtroPrioridad}
              onChange={(e) => { setFiltroPrioridad(e.target.value); setPage(0) }}
            >
              {PRIORIDAD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : !tickets.length ? (
          <CardContent className="p-0">
            <EmptyState
              icon={Ticket}
              title="Sin tickets"
              description={search ? 'No se encontraron tickets con ese criterio' : 'Crea el primer ticket de soporte.'}
              action={!search && (
                <Button onClick={() => navigate('/sat/tickets/nuevo')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Ticket
                </Button>
              )}
            />
          </CardContent>
        ) : (
          <DataTable
            data={tickets}
            columns={columns}
            onRowClick={(row) => navigate(`/sat/tickets/${row.id}`)}
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
