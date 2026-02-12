import { useState, useRef, useEffect } from 'react'
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom'
import { Building2, Plus, Eye, Edit2, MoreVertical, Upload, Download, FileSpreadsheet, ChevronDown } from 'lucide-react'
import { 
  useComunidades, 
  useComunidad, 
  useCreateComunidad, 
  useUpdateComunidad,
  useDeleteComunidad 
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { ComunidadForm } from '@/features/comunidades/ComunidadForm'
import { AgrupacionesTab } from '@/features/comunidades/AgrupacionesTab'
import { UbicacionesTab } from '@/features/comunidades/UbicacionesTab'
import { PreciosTab } from '@/features/comunidades/PreciosTab'
import { ComunidadClientesTab } from '@/features/comunidades/ComunidadClientesTab'
import { ComunidadContadoresTab } from '@/features/comunidades/ComunidadContadoresTab'
import { ComunidadFacturasTab } from '@/features/comunidades/ComunidadFacturasTab'
import { useClientes } from '@/hooks/useClientes'
import { useContadores } from '@/hooks/useContadores'
import { useFacturas } from '@/hooks/useFacturas'
import { ImportModal } from '@/features/importacion/components'
import { useImportExport } from '@/features/importacion/hooks'

export function ComunidadesPage() {
  return (
    <Routes>
      <Route index element={<ComunidadesList />} />
      <Route path="nueva" element={<ComunidadNueva />} />
      <Route path=":id" element={<ComunidadDetail />} />
      <Route path=":id/editar" element={<ComunidadEditar />} />
    </Routes>
  )
}

function ComunidadesList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [soloActivas, setSoloActivas] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const actionsMenuRef = useRef(null)
  const toast = useToast()

  const { data: comunidades, isLoading, error, refetch } = useComunidades({ 
    activa: soloActivas ? true : undefined,
    search 
  })

  const { descargarPlantilla, exportarEntidad } = useImportExport()

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setShowActionsMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExportar = async () => {
    setShowActionsMenu(false)
    const result = await exportarEntidad('comunidades')
    if (result.success) {
      toast.success(`Exportados ${result.count} registros: ${result.fileName}`)
    } else {
      toast.error(result.error)
    }
  }

  const handleDescargarPlantilla = () => {
    setShowActionsMenu(false)
    const result = descargarPlantilla('comunidades', true)
    if (result.success) {
      toast.success(`Plantilla descargada: ${result.fileName}`)
    } else {
      toast.error(result.error)
    }
  }

  const handleImportSuccess = () => {
    refetch()
    setShowImportModal(false)
  }

  const columns = [
    {
      key: 'codigo',
      header: 'Código',
      render: (value) => (
        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
          {value}
        </span>
      )
    },
    {
      key: 'nombre',
      header: 'Nombre',
      render: (value, row) => (
        <div>
          <p className="font-medium text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{row.ciudad}</p>
        </div>
      )
    },
    {
      key: 'estructura',
      header: 'Estructura',
      render: (_, row) => (
        <div className="text-sm">
          <span className="text-gray-600">{row.num_agrupaciones}</span>
          <span className="text-gray-400"> {row.nombre_agrupacion?.toLowerCase()}es · </span>
          <span className="text-gray-600">{row.num_ubicaciones}</span>
          <span className="text-gray-400"> {row.nombre_ubicacion?.toLowerCase()}s</span>
        </div>
      ),
      sortable: false
    },
    {
      key: 'num_contadores',
      header: 'Contadores',
      render: (value) => value || 0
    },
    {
      key: 'activa',
      header: 'Estado',
      render: (value) => (
        <Badge variant={value ? 'success' : 'default'}>
          {value ? 'Activa' : 'Inactiva'}
        </Badge>
      )
    },
    {
      key: 'acciones',
      header: '',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <Link
            to={`/comunidades/${row.id}`}
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <Link
            to={`/comunidades/${row.id}/editar`}
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
          Error al cargar comunidades: {error.message}
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Comunidades</h1>
          <p className="page-description">
            Gestiona las comunidades de vecinos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/comunidades/nueva')}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Comunidad
          </Button>
          
          {/* Dropdown de acciones */}
          <div className="relative" ref={actionsMenuRef}>
            <Button 
              variant="outline" 
              onClick={() => setShowActionsMenu(!showActionsMenu)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            
            {showActionsMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={() => { setShowActionsMenu(false); setShowImportModal(true) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Upload className="w-4 h-4 text-blue-500" />
                  Importar desde Excel
                </button>
                <button
                  onClick={handleExportar}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Download className="w-4 h-4 text-green-500" />
                  Exportar a Excel
                </button>
                <hr className="my-1" />
                <button
                  onClick={handleDescargarPlantilla}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FileSpreadsheet className="w-4 h-4 text-gray-500" />
                  Descargar plantilla
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Card>
        {/* Filtros */}
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre o código..."
            className="w-64"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={soloActivas}
              onChange={e => setSoloActivas(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Solo activas
          </label>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : !comunidades?.length ? (
          <CardContent className="p-0">
            <EmptyState
              icon={Building2}
              title="Sin comunidades"
              description={search 
                ? 'No se encontraron comunidades con ese criterio' 
                : 'Aún no hay comunidades registradas. Crea la primera comunidad para comenzar.'
              }
              action={!search && (
                <Button onClick={() => navigate('/comunidades/nueva')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Comunidad
                </Button>
              )}
            />
          </CardContent>
        ) : (
          <DataTable
            data={comunidades}
            columns={columns}
            onRowClick={(row) => navigate(`/comunidades/${row.id}`)}
            pageSize={20}
          />
        )}
      </Card>

      {/* Modal de importación */}
      <ImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        entidad="comunidades"
        onSuccess={handleImportSuccess}
      />
    </div>
  )
}

function ComunidadNueva() {
  const navigate = useNavigate()
  const createMutation = useCreateComunidad()
  const toast = useToast()

  const handleSubmit = async (data) => {
    try {
      const result = await createMutation.mutateAsync(data)
      toast.success('Comunidad creada correctamente')
      navigate(`/comunidades/${result.id}`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div>
      <Breadcrumb 
        items={[
          { label: 'Comunidades', href: '/comunidades' },
          { label: 'Nueva Comunidad' }
        ]} 
        className="mb-4"
      />

      <div className="page-header">
        <h1 className="page-title">Nueva Comunidad</h1>
        <p className="page-description">
          Completa los datos para crear una nueva comunidad
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <ComunidadForm 
            onSubmit={handleSubmit}
            loading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function ComunidadDetail() {
  const { id } = useParams()
  const { data: comunidad, isLoading, error } = useComunidad(id)
  const { data: clientesComunidad } = useClientes({ comunidadId: id })
  const { data: contadoresComunidad } = useContadores({ comunidadId: id })
  const { data: facturasComunidad } = useFacturas({ comunidadId: id, limit: 500 })

  const numClientes = clientesComunidad?.length || 0
  const numContadores = contadoresComunidad?.length || 0
  const numFacturas = Array.isArray(facturasComunidad) ? facturasComunidad.length : 0

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-red-600">Error: {error.message}</div>
  if (!comunidad) return <div>Comunidad no encontrada</div>

  return (
    <div>
      <Breadcrumb 
        items={[
          { label: 'Comunidades', href: '/comunidades' },
          { label: comunidad.nombre }
        ]} 
        className="mb-4"
      />

      <div className="page-header flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">{comunidad.nombre}</h1>
            <Badge variant={comunidad.activa ? 'success' : 'default'}>
              {comunidad.activa ? 'Activa' : 'Inactiva'}
            </Badge>
          </div>
          <p className="page-description">
            {comunidad.codigo} · {comunidad.direccion}, {comunidad.ciudad}
          </p>
        </div>
        <Link to={`/comunidades/${id}/editar`}>
          <Button variant="secondary">
            <Edit2 className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </Link>
      </div>

      <Card>
        <Tabs defaultValue="datos">
          <TabsList className="px-6">
            <TabsTrigger value="datos">Datos Generales</TabsTrigger>
            <TabsTrigger value="agrupaciones">
              {comunidad.nombre_agrupacion}es
            </TabsTrigger>
            <TabsTrigger value="ubicaciones">
              {comunidad.nombre_ubicacion}s
            </TabsTrigger>
            <TabsTrigger value="clientes">
              Clientes{numClientes > 0 ? ` (${numClientes})` : ''}
            </TabsTrigger>
            <TabsTrigger value="contadores">
              Contadores{numContadores > 0 ? ` (${numContadores})` : ''}
            </TabsTrigger>
            <TabsTrigger value="facturas">
              Facturas{numFacturas > 0 ? ` (${numFacturas})` : ''}
            </TabsTrigger>
            <TabsTrigger value="precios">Precios</TabsTrigger>
          </TabsList>

          <TabsContent value="datos" className="p-6">
            <DatosGeneralesTab comunidad={comunidad} />
          </TabsContent>

          <TabsContent value="agrupaciones" className="p-6">
            <AgrupacionesTab comunidad={comunidad} />
          </TabsContent>

          <TabsContent value="ubicaciones" className="p-6">
            <UbicacionesTab comunidad={comunidad} />
          </TabsContent>

          <TabsContent value="clientes" className="p-6">
            <ComunidadClientesTab comunidad={comunidad} />
          </TabsContent>

          <TabsContent value="contadores" className="p-6">
            <ComunidadContadoresTab comunidad={comunidad} />
          </TabsContent>

          <TabsContent value="facturas" className="p-6">
            <ComunidadFacturasTab comunidad={comunidad} />
          </TabsContent>

          <TabsContent value="precios" className="p-6">
            <PreciosTab comunidad={comunidad} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

function DatosGeneralesTab({ comunidad }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Información</h3>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Código</dt>
            <dd className="text-sm font-medium text-gray-900">{comunidad.codigo}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">CIF</dt>
            <dd className="text-sm font-medium text-gray-900">{comunidad.cif || '-'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Nomenclatura</dt>
            <dd className="text-sm font-medium text-gray-900">
              {comunidad.nombre_agrupacion} / {comunidad.nombre_ubicacion}
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Dirección</h3>
        <address className="text-sm text-gray-900 not-italic">
          {comunidad.direccion}<br />
          {comunidad.codigo_postal} {comunidad.ciudad}<br />
          {comunidad.provincia}
        </address>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Contacto</h3>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Email</dt>
            <dd className="text-sm font-medium text-gray-900">
              {comunidad.email ? (
                <a href={`mailto:${comunidad.email}`} className="text-primary-600 hover:underline">
                  {comunidad.email}
                </a>
              ) : '-'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Teléfono</dt>
            <dd className="text-sm font-medium text-gray-900">{comunidad.telefono || '-'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Persona contacto</dt>
            <dd className="text-sm font-medium text-gray-900">{comunidad.persona_contacto || '-'}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

function ComunidadEditar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: comunidad, isLoading } = useComunidad(id)
  const updateMutation = useUpdateComunidad()
  const toast = useToast()

  const handleSubmit = async (data) => {
    try {
      await updateMutation.mutateAsync({ id, ...data })
      toast.success('Comunidad actualizada')
      navigate(`/comunidades/${id}`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (!comunidad) return <div>Comunidad no encontrada</div>

  return (
    <div>
      <Breadcrumb 
        items={[
          { label: 'Comunidades', href: '/comunidades' },
          { label: comunidad.nombre, href: `/comunidades/${id}` },
          { label: 'Editar' }
        ]} 
        className="mb-4"
      />

      <div className="page-header">
        <h1 className="page-title">Editar Comunidad</h1>
        <p className="page-description">{comunidad.codigo}</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <ComunidadForm 
            comunidad={comunidad}
            onSubmit={handleSubmit}
            loading={updateMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}
