import { useState } from 'react'
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom'
import { Users, Plus, Eye, Edit2, Ban, CheckCircle } from 'lucide-react'
import { 
  useClientes, 
  useCliente, 
  useCreateCliente, 
  useUpdateCliente,
  useToggleBloqueoCliente 
} from '@/hooks'
import { 
  Button, 
  Card, 
  CardContent, 
  EmptyState, 
  LoadingSpinner,
  DataTable,
  SearchInput,
  Badge,
  Breadcrumb,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { ClienteForm } from '@/features/clientes/ClienteForm'
import { formatIBAN, formatDate } from '@/lib/utils'

export function ClientesPage() {
  return (
    <Routes>
      <Route index element={<ClientesList />} />
      <Route path="nuevo" element={<ClienteNuevo />} />
      <Route path=":id" element={<ClienteDetail />} />
      <Route path=":id/editar" element={<ClienteEditar />} />
    </Routes>
  )
}

function ClientesList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [soloActivos, setSoloActivos] = useState(true)
  const toast = useToast()

  const { data: clientes, isLoading, error } = useClientes({ 
    search,
    tipo: filtroTipo || undefined,
    activo: soloActivos ? true : undefined
  })

  const columns = [
    {
      key: 'nombre',
      header: 'Cliente',
      render: (_, row) => (
        <div>
          <p className="font-medium text-gray-900">
            {row.nombre} {row.apellidos}
          </p>
          <p className="text-xs text-gray-500">{row.nif}</p>
        </div>
      )
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (value) => (
        <Badge variant={value === 'propietario' ? 'primary' : 'info'}>
          {value === 'propietario' ? 'Propietario' : 'Inquilino'}
        </Badge>
      )
    },
    {
      key: 'email',
      header: 'Email',
      render: (value) => value || '-'
    },
    {
      key: 'telefono',
      header: 'Teléfono',
      render: (value) => value || '-'
    },
    {
      key: 'ubicacion',
      header: 'Ubicación',
      render: (_, row) => {
        const ubicacionActual = row.ubicaciones_clientes?.find(uc => uc.es_actual)
        if (!ubicacionActual?.ubicacion) return '-'
        
        const { ubicacion } = ubicacionActual
        return (
          <div className="text-sm">
            <p>{ubicacion.agrupacion?.comunidad?.nombre}</p>
            <p className="text-gray-500">
              {ubicacion.agrupacion?.nombre} - {ubicacion.nombre}
            </p>
          </div>
        )
      },
      sortable: false
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (_, row) => (
        <div className="flex flex-col gap-1">
          {row.bloqueado && (
            <Badge variant="danger">Bloqueado</Badge>
          )}
          {!row.activo && (
            <Badge variant="default">Inactivo</Badge>
          )}
          {row.activo && !row.bloqueado && (
            <Badge variant="success">Activo</Badge>
          )}
        </div>
      )
    },
    {
      key: 'acciones',
      header: '',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <Link
            to={`/clientes/${row.id}`}
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <Link
            to={`/clientes/${row.id}/editar`}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <Edit2 className="h-4 w-4" />
          </Link>
        </div>
      )
    }
  ]

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-red-600">
          Error al cargar clientes: {error.message}
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-description">
            Gestiona propietarios e inquilinos
          </p>
        </div>
        <Button onClick={() => navigate('/clientes/nuevo')}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      <Card>
        {/* Filtros */}
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre o NIF..."
            className="w-64"
          />
          
          <Select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="w-40"
          >
            <option value="">Todos los tipos</option>
            <option value="propietario">Propietarios</option>
            <option value="inquilino">Inquilinos</option>
          </Select>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={soloActivos}
              onChange={e => setSoloActivos(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Solo activos
          </label>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : !clientes?.length ? (
          <CardContent className="p-0">
            <EmptyState
              icon={Users}
              title="Sin clientes"
              description={search 
                ? 'No se encontraron clientes con ese criterio' 
                : 'Aún no hay clientes registrados. Crea el primer cliente para comenzar.'
              }
              action={!search && (
                <Button onClick={() => navigate('/clientes/nuevo')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Cliente
                </Button>
              )}
            />
          </CardContent>
        ) : (
          <DataTable
            data={clientes}
            columns={columns}
            onRowClick={(row) => navigate(`/clientes/${row.id}`)}
            pageSize={20}
          />
        )}
      </Card>
    </div>
  )
}

function ClienteNuevo() {
  const navigate = useNavigate()
  const createMutation = useCreateCliente()
  const toast = useToast()

  const handleSubmit = async (data) => {
    try {
      const result = await createMutation.mutateAsync(data)
      toast.success('Cliente creado correctamente')
      navigate(`/clientes/${result.id}`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div>
      <Breadcrumb 
        items={[
          { label: 'Clientes', href: '/clientes' },
          { label: 'Nuevo Cliente' }
        ]} 
        className="mb-4"
      />

      <div className="page-header">
        <h1 className="page-title">Nuevo Cliente</h1>
        <p className="page-description">
          Completa los datos para crear un nuevo cliente
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <ClienteForm 
            onSubmit={handleSubmit}
            loading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function ClienteDetail() {
  const { id } = useParams()
  const { data: cliente, isLoading, error } = useCliente(id)
  const toggleBloqueo = useToggleBloqueoCliente()
  const toast = useToast()

  const handleToggleBloqueo = async () => {
    const nuevoEstado = !cliente.bloqueado
    const motivo = nuevoEstado 
      ? prompt('Motivo del bloqueo:') 
      : null

    if (nuevoEstado && !motivo) return

    try {
      await toggleBloqueo.mutateAsync({ 
        id, 
        bloqueado: nuevoEstado, 
        motivo_bloqueo: motivo 
      })
      toast.success(nuevoEstado ? 'Cliente bloqueado' : 'Cliente desbloqueado')
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-red-600">Error: {error.message}</div>
  if (!cliente) return <div>Cliente no encontrado</div>

  return (
    <div>
      <Breadcrumb 
        items={[
          { label: 'Clientes', href: '/clientes' },
          { label: `${cliente.nombre} ${cliente.apellidos}` }
        ]} 
        className="mb-4"
      />

      <div className="page-header flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">{cliente.nombre} {cliente.apellidos}</h1>
            <Badge variant={cliente.tipo === 'propietario' ? 'primary' : 'info'}>
              {cliente.tipo}
            </Badge>
            {cliente.bloqueado && <Badge variant="danger">Bloqueado</Badge>}
          </div>
          <p className="page-description">{cliente.nif}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={cliente.bloqueado ? 'secondary' : 'danger'}
            onClick={handleToggleBloqueo}
            loading={toggleBloqueo.isPending}
          >
            {cliente.bloqueado ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Desbloquear
              </>
            ) : (
              <>
                <Ban className="h-4 w-4 mr-2" />
                Bloquear
              </>
            )}
          </Button>
          <Link to={`/clientes/${id}/editar`}>
            <Button variant="secondary">
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <Tabs defaultValue="datos">
          <TabsList className="px-6">
            <TabsTrigger value="datos">Datos Personales</TabsTrigger>
            <TabsTrigger value="ubicaciones">Ubicaciones</TabsTrigger>
            <TabsTrigger value="bancarios">Datos Bancarios</TabsTrigger>
          </TabsList>

          <TabsContent value="datos" className="p-6">
            <DatosPersonalesTab cliente={cliente} />
          </TabsContent>

          <TabsContent value="ubicaciones" className="p-6">
            <UbicacionesTab cliente={cliente} />
          </TabsContent>

          <TabsContent value="bancarios" className="p-6">
            <DatosBancariosTab cliente={cliente} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

function DatosPersonalesTab({ cliente }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Contacto</h3>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Email</dt>
            <dd className="text-sm font-medium text-gray-900">
              {cliente.email ? (
                <a href={`mailto:${cliente.email}`} className="text-primary-600 hover:underline">
                  {cliente.email}
                </a>
              ) : '-'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Teléfono</dt>
            <dd className="text-sm font-medium text-gray-900">{cliente.telefono || '-'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Teléfono secundario</dt>
            <dd className="text-sm font-medium text-gray-900">{cliente.telefono_secundario || '-'}</dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Dirección de Correspondencia</h3>
        {cliente.direccion_correspondencia ? (
          <address className="text-sm text-gray-900 not-italic">
            {cliente.direccion_correspondencia}<br />
            {cliente.cp_correspondencia} {cliente.ciudad_correspondencia}<br />
            {cliente.provincia_correspondencia}
          </address>
        ) : (
          <p className="text-sm text-gray-500 italic">
            Usa la dirección de la ubicación asignada
          </p>
        )}
      </div>

      {cliente.observaciones && (
        <div className="md:col-span-2">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Observaciones</h3>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{cliente.observaciones}</p>
        </div>
      )}

      {cliente.bloqueado && cliente.motivo_bloqueo && (
        <div className="md:col-span-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-sm font-medium text-red-800 mb-2">Motivo del bloqueo</h3>
          <p className="text-sm text-red-700">{cliente.motivo_bloqueo}</p>
        </div>
      )}
    </div>
  )
}

function UbicacionesTab({ cliente }) {
  const ubicaciones = cliente.ubicaciones_clientes || []

  if (!ubicaciones.length) {
    return (
      <EmptyState
        title="Sin ubicaciones asignadas"
        description="Este cliente no tiene ubicaciones asignadas"
      />
    )
  }

  return (
    <div className="space-y-4">
      {ubicaciones.map(uc => (
        <div 
          key={uc.id}
          className={`p-4 rounded-lg border ${
            uc.es_actual ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">
                {uc.ubicacion?.agrupacion?.comunidad?.nombre}
              </p>
              <p className="text-sm text-gray-600">
                {uc.ubicacion?.agrupacion?.nombre} - {uc.ubicacion?.nombre}
              </p>
            </div>
            <div className="text-right">
              {uc.es_actual ? (
                <Badge variant="success">Actual</Badge>
              ) : (
                <Badge variant="default">Histórico</Badge>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(uc.fecha_inicio)}
                {uc.fecha_fin && ` - ${formatDate(uc.fecha_fin)}`}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function DatosBancariosTab({ cliente }) {
  return (
    <div className="max-w-md">
      <h3 className="text-sm font-medium text-gray-500 mb-3">Datos para Domiciliación SEPA</h3>
      <dl className="space-y-4">
        <div>
          <dt className="text-sm text-gray-600 mb-1">IBAN</dt>
          <dd className="text-lg font-mono font-medium text-gray-900">
            {cliente.iban ? formatIBAN(cliente.iban) : '-'}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-gray-600 mb-1">Titular de la cuenta</dt>
          <dd className="text-sm font-medium text-gray-900">
            {cliente.titular_cuenta || '-'}
          </dd>
        </div>
      </dl>

      {!cliente.iban && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Este cliente no tiene datos bancarios configurados. 
            No podrá incluirse en remesas SEPA.
          </p>
        </div>
      )}
    </div>
  )
}

function ClienteEditar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: cliente, isLoading } = useCliente(id)
  const updateMutation = useUpdateCliente()
  const toast = useToast()

  const handleSubmit = async (data) => {
    try {
      await updateMutation.mutateAsync({ id, ...data })
      toast.success('Cliente actualizado')
      navigate(`/clientes/${id}`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (!cliente) return <div>Cliente no encontrado</div>

  return (
    <div>
      <Breadcrumb 
        items={[
          { label: 'Clientes', href: '/clientes' },
          { label: `${cliente.nombre} ${cliente.apellidos}`, href: `/clientes/${id}` },
          { label: 'Editar' }
        ]} 
        className="mb-4"
      />

      <div className="page-header">
        <h1 className="page-title">Editar Cliente</h1>
        <p className="page-description">{cliente.nif}</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <ClienteForm 
            cliente={cliente}
            onSubmit={handleSubmit}
            loading={updateMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}
