import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ticket, Plus, ChevronRight, ArrowLeft } from 'lucide-react'
import { useTickets } from '@/hooks'
import { useAuth } from '@/features/auth/AuthContext'
import { TecnicoBottomNav } from '../tecnico/TecnicoBottomNav'
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
  const { isTecnico } = useAuth()
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

  // ──────────────────────────────────────────────
  // VISTA MÓVIL para técnico
  // ──────────────────────────────────────────────
  if (isTecnico) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Cabecera móvil */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate('/sat/mi-agenda')}
              className="p-2 rounded-xl bg-gray-100 text-gray-600 active:bg-gray-200 flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-base font-bold text-gray-900 flex-1">Tickets</h1>
            {totalCount > 0 && (
              <span className="text-xs text-gray-400">{totalCount} tickets</span>
            )}
          </div>

          {/* Búsqueda */}
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Buscar por número, asunto o cliente..."
            className="w-full pl-3 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
          />

          {/* Filtro estado — chips horizontales */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {ESTADO_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => { setFiltroEstado(o.value); setPage(0) }}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  filtroEstado === o.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de tickets — tarjetas */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : !tickets.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Ticket className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-gray-700 font-medium mb-1">Sin tickets</h3>
            <p className="text-gray-400 text-sm">
              {search ? 'No se encontraron resultados.' : 'No hay tickets asignados.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 bg-white">
            {tickets.map((row) => (
              <button
                key={row.id}
                onClick={() => navigate(`/sat/tickets/${row.id}`)}
                className="w-full text-left px-4 py-3.5 flex items-start gap-3 active:bg-gray-50 transition-colors"
              >
                {/* Indicador de prioridad */}
                <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                  row.prioridad === 'urgente' || row.prioridad === 'critica' ? 'bg-red-500' :
                  row.prioridad === 'alta' ? 'bg-orange-400' :
                  'bg-gray-200'
                }`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-mono text-xs text-gray-400">{row.numero_ticket}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      row.estado === 'resuelto' || row.estado === 'cerrado' ? 'bg-green-100 text-green-700' :
                      row.estado === 'en_progreso' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {row.estado?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{row.asunto}</p>

                  {row.cliente_nombre && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{row.cliente_nombre}</p>
                  )}

                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-400">
                      {TIPO_LABELS[row.tipo] || row.tipo}
                    </p>
                    {row.num_comentarios > 0 && (
                      <span className="text-xs text-gray-400">· {row.num_comentarios} comentarios</span>
                    )}
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0 mt-1" />
              </button>
            ))}
          </div>
        )}

        <TecnicoBottomNav />
      </div>
    )
  }

  // ──────────────────────────────────────────────
  // VISTA DESKTOP (admin / encargado)
  // ──────────────────────────────────────────────
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
