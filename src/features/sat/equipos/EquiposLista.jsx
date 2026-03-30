import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cpu, Plus, AlertTriangle, Shield } from 'lucide-react'
import { useEquipos } from '@/hooks/useEquipos'
import {
  Button, Card, CardContent, EmptyState, LoadingSpinner,
  DataTable, SearchInput, Badge, Select,
} from '@/components/ui'

const TIPO_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'caldera', label: 'Caldera' },
  { value: 'grupo_presion', label: 'Grupo de Presión' },
  { value: 'aerotermia', label: 'Aerotermia' },
  { value: 'aire_acondicionado', label: 'Aire Acondicionado' },
  { value: 'bomba_calor', label: 'Bomba de Calor' },
  { value: 'calentador', label: 'Calentador' },
  { value: 'ascensor', label: 'Ascensor' },
  { value: 'sistema_solar', label: 'Sistema Solar' },
  { value: 'otro', label: 'Otro' },
]

const ESTADO_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
  { value: 'en_reparacion', label: 'En reparación' },
  { value: 'retirado', label: 'Retirado' },
]

const ESTADO_VARIANTS = {
  activo: 'success', inactivo: 'default', en_reparacion: 'warning', retirado: 'danger',
}

const TIPO_LABELS = {
  caldera: 'Caldera', grupo_presion: 'Grupo Presión', aerotermia: 'Aerotermia',
  aire_acondicionado: 'Aire Acond.', bomba_calor: 'Bomba Calor', calentador: 'Calentador',
  radiador: 'Radiador', termostato: 'Termostato', ascensor: 'Ascensor',
  sistema_solar: 'Solar', otro: 'Otro',
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function EquiposLista() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const { data: equipos, isLoading, error } = useEquipos({
    search: search || undefined,
    tipo: filtroTipo || undefined,
    estado: filtroEstado || undefined,
  })

  const columns = [
    {
      key: 'nombre',
      header: 'Equipo',
      render: (value, row) => (
        <div>
          <span className="text-sm font-medium text-gray-900">{value}</span>
          {row.marca && <span className="text-xs text-gray-500 ml-2">{row.marca} {row.modelo || ''}</span>}
        </div>
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
      key: 'comunidad_nombre',
      header: 'Comunidad',
      render: (value) => (
        <span className="text-sm text-gray-600 truncate max-w-[150px] block">{value || '-'}</span>
      ),
    },
    {
      key: 'numero_serie',
      header: 'Nº Serie',
      render: (value) => (
        <span className="font-mono text-xs text-gray-500">{value || '-'}</span>
      ),
    },
    {
      key: 'en_garantia',
      header: 'Garantía',
      render: (value, row) => value ? (
        <Badge variant="success" className="text-[10px]">
          <Shield className="h-3 w-3 mr-0.5" /> Vigente
        </Badge>
      ) : row.fecha_garantia_fin ? (
        <span className="text-xs text-gray-400">Expirada</span>
      ) : null,
    },
    {
      key: 'num_intervenciones',
      header: 'Interv.',
      render: (value) => (
        <span className="text-xs text-gray-500">{value || 0}</span>
      ),
    },
  ]

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-red-600">
          Error al cargar equipos: {error.message}
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Equipos</h1>
          <p className="page-description">Inventario de equipos e instalaciones de clientes</p>
        </div>
        <Button onClick={() => navigate('/sat/equipos/nuevo')}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Equipo
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre, marca, modelo, nº serie..."
            />
            <Select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              {ESTADO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner size="lg" /></div>
        ) : !equipos?.length ? (
          <CardContent className="p-0">
            <EmptyState
              icon={Cpu}
              title="Sin equipos"
              description={search ? 'No se encontraron equipos con ese criterio' : 'Registra el primer equipo.'}
              action={!search && (
                <Button onClick={() => navigate('/sat/equipos/nuevo')}>
                  <Plus className="h-4 w-4 mr-2" /> Nuevo Equipo
                </Button>
              )}
            />
          </CardContent>
        ) : (
          <DataTable
            data={equipos}
            columns={columns}
            onRowClick={(row) => navigate(`/sat/equipos/${row.id}`)}
          />
        )}
      </Card>
    </div>
  )
}
