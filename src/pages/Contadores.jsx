import { useState, useRef, useEffect } from 'react'
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom'
import { Gauge, Plus, Eye, Edit2, MoreVertical, Upload, Download, FileSpreadsheet, Trash2, AlertTriangle } from 'lucide-react'
import { 
  useContadores, 
  useContador, 
  useCreateContador, 
  useUpdateContador,
  useVerificarContadorEliminable,
  useEliminarContadorPermanente,
  useComunidades
} from '@/hooks'
import { 
  Button, 
  Card, 
  CardContent, 
  EmptyState, 
  LoadingSpinner,
  DataTable,
  Pagination,
  SearchInput,
  Badge,
  Breadcrumb,
  Select,
  CommunityPicker,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Modal
} from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { ContadorForm } from '@/features/contadores/ContadorForm'
import { ConceptosContadorTab } from '@/features/contadores/ConceptosContadorTab'
import { formatDate } from '@/lib/utils'
import { ImportModal } from '@/features/importacion/components'
import { useImportExport } from '@/features/importacion/hooks'

export function ContadoresPage() {
  return (
    <Routes>
      <Route index element={<ContadoresList />} />
      <Route path="nuevo" element={<ContadorNuevo />} />
      <Route path=":id" element={<ContadorDetail />} />
      <Route path=":id/editar" element={<ContadorEditar />} />
    </Routes>
  )
}

function ContadoresList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filtroComunidad, setFiltroComunidad] = useState('')
  const [soloActivos, setSoloActivos] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [contadorAEliminar, setContadorAEliminar] = useState(null)
  const [showEliminarModal, setShowEliminarModal] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const actionsMenuRef = useRef(null)
  const toast = useToast()

  const eliminarContador = useEliminarContadorPermanente()

  const { data: comunidades } = useComunidades({ activa: true })
  const { data: contadoresData, isLoading, error, refetch } = useContadores({
    search,
    comunidadId: filtroComunidad || undefined,
    activo: soloActivos ? true : undefined,
    page,
    pageSize
  })
  const contadores = contadoresData?.data || []
  const totalCount = contadoresData?.count || 0
  const totalPages = Math.ceil(totalCount / pageSize)

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

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, filtroComunidad, soloActivos])

  const handleExportar = async () => {
    setShowActionsMenu(false)
    const result = await exportarEntidad('contadores')
    if (result.success) {
      toast.success(`Exportados ${result.count} registros: ${result.fileName}`)
    } else {
      toast.error(result.error)
    }
  }

  const handleDescargarPlantilla = () => {
    setShowActionsMenu(false)
    const result = descargarPlantilla('contadores', true)
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
  
  const handleClickEliminar = (contador) => {
    setContadorAEliminar(contador)
    setShowEliminarModal(true)
  }
  
  const handleConfirmarEliminar = async () => {
    if (!contadorAEliminar) return
    
    try {
      const result = await eliminarContador.mutateAsync(contadorAEliminar.id)
      toast.success(`Contador ${contadorAEliminar.numero_serie} eliminado correctamente`)
      setShowEliminarModal(false)
      setContadorAEliminar(null)
      refetch()
    } catch (error) {
      toast.error(`Error: ${error.message}`)
    }
  }

  const columns = [
    {
      key: 'numero_serie',
      header: 'Nº Serie',
      render: (value) => (
        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
          {value}
        </span>
      )
    },
    {
      key: 'ubicacion',
      header: 'Ubicación',
      render: (_, row) => (
        <div>
          <p className="font-medium text-gray-900">{row.comunidad_nombre}</p>
          <p className="text-sm text-gray-500">
            {row.agrupacion_nombre} - {row.ubicacion_nombre}
          </p>
        </div>
      )
    },
    {
      key: 'conceptos',
      header: 'Conceptos',
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {row.conceptos?.length > 0 ? (
            row.conceptos.map(c => (
              <Badge key={c.id} variant="primary">
                {c.codigo}
              </Badge>
            ))
          ) : (
            <span className="text-gray-400 text-sm">Sin conceptos</span>
          )}
        </div>
      ),
      sortable: false
    },
    {
      key: 'cliente',
      header: 'Cliente',
      render: (_, row) => (
        row.cliente_nombre ? (
          <div className="text-sm">
            <p className="text-gray-900">{row.cliente_nombre}</p>
            {row.cliente_codigo && (
              <p className="text-xs text-gray-500 font-mono">{row.cliente_codigo}</p>
            )}
          </div>
        ) : (
          <span className="text-gray-400 text-xs">Sin cliente</span>
        )
      )
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (value) => (
        <Badge variant={value ? 'success' : 'default'}>
          {value ? 'Activo' : 'Inactivo'}
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
            to={`/contadores/${row.id}`}
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
            title="Ver detalles"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <Link
            to={`/contadores/${row.id}/editar`}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Editar"
          >
            <Edit2 className="h-4 w-4" />
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleClickEliminar(row)
            }}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Eliminar permanentemente (solo contadores sin lecturas ni facturas)"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ]

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-red-600">
          Error al cargar contadores: {error.message}
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Contadores</h1>
          <p className="page-description">
            Gestiona los contadores de consumo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/contadores/nuevo')}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Contador
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
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 items-stretch">
          <div className="flex-1 min-w-[280px] max-w-2xl">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nº serie, ubicación, cliente, conceptos..."
              className="rounded-xl border-2 border-gray-200 bg-gray-50/90 shadow-sm [&>input]:py-2.5 [&>input]:text-[15px] [&>input]:placeholder:text-gray-500 focus-within:border-primary-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-500/20"
            />
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <CommunityPicker
              value={filtroComunidad}
              onChange={setFiltroComunidad}
              comunidades={comunidades ?? []}
              placeholder="Todas las comunidades"
              allowEmpty
              className="w-52"
            />

            <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
            <input
              type="checkbox"
              checked={soloActivos}
              onChange={e => setSoloActivos(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Solo activos
          </label>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : !contadores.length ? (
          <CardContent className="p-0">
            <EmptyState
              icon={Gauge}
              title={search ? 'Sin resultados' : 'Sin contadores'}
              description={search
                ? 'No hay contadores que coincidan con la búsqueda. Prueba con otro criterio.'
                : 'Aún no hay contadores registrados. Añade el primer contador para comenzar.'
              }
              action={!search && (
                <Button onClick={() => navigate('/contadores/nuevo')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Contador
                </Button>
              )}
            />
          </CardContent>
        ) : (
          <>
            <DataTable
              data={contadores}
              columns={columns}
              onRowClick={(row) => navigate(`/contadores/${row.id}`)}
              pageSize={pageSize}
            />
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalCount}
              itemsPerPage={pageSize}
              onPageChange={setPage}
              onItemsPerPageChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          </>
        )}
      </Card>

      {/* Modal de importación */}
      <ImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        entidad="contadores"
        onSuccess={handleImportSuccess}
      />
      
      {/* Modal de confirmación de eliminación */}
      <Modal
        open={showEliminarModal}
        onClose={() => {
          setShowEliminarModal(false)
          setContadorAEliminar(null)
        }}
        title="⚠️ Eliminar Contador Permanentemente"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-900 mb-2">ADVERTENCIA: Esta acción es IRREVERSIBLE</h3>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• El contador se eliminará completamente de la base de datos</li>
                  <li>• Se borrarán las relaciones con conceptos</li>
                  <li>• Esta operación NO se puede deshacer</li>
                  <li>• Solo se pueden eliminar contadores sin lecturas ni facturas</li>
                </ul>
              </div>
            </div>
          </div>
          
          {contadorAEliminar && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p><strong>Número de Serie:</strong> <span className="font-mono">{contadorAEliminar.numero_serie}</span></p>
              <p><strong>Ubicación:</strong> {contadorAEliminar.ubicacion_nombre}</p>
              <p><strong>Comunidad:</strong> {contadorAEliminar.comunidad_nombre}</p>
              {contadorAEliminar.marca && (
                <p><strong>Marca/Modelo:</strong> {contadorAEliminar.marca} {contadorAEliminar.modelo}</p>
              )}
              {contadorAEliminar.conceptos?.length > 0 && (
                <div>
                  <strong>Conceptos asociados:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {contadorAEliminar.conceptos.map(c => (
                      <Badge key={c.id} variant="default">{c.codigo}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠️ Las relaciones con estos conceptos serán eliminadas
                  </p>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEliminarModal(false)
                setContadorAEliminar(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmarEliminar}
              disabled={eliminarContador.isPending}
            >
              {eliminarContador.isPending ? 'Eliminando...' : 'Confirmar Eliminación'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ContadorNuevo() {
  const navigate = useNavigate()
  const createMutation = useCreateContador()
  const toast = useToast()

  const handleSubmit = async (data) => {
    try {
      const result = await createMutation.mutateAsync(data)
      toast.success('Contador creado correctamente')
      navigate(`/contadores/${result.id}`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div>
      <Breadcrumb 
        items={[
          { label: 'Contadores', href: '/contadores' },
          { label: 'Nuevo Contador' }
        ]} 
        className="mb-4"
      />

      <div className="page-header">
        <h1 className="page-title">Nuevo Contador</h1>
        <p className="page-description">
          Completa los datos para registrar un nuevo contador
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <ContadorForm 
            onSubmit={handleSubmit}
            loading={createMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function ContadorDetail() {
  const { id } = useParams()
  const { data: contador, isLoading, error } = useContador(id)

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-red-600">Error: {error.message}</div>
  if (!contador) return <div>Contador no encontrado</div>

  const ubicacion = contador.ubicacion
  const comunidad = ubicacion?.agrupacion?.comunidad

  return (
    <div>
      <Breadcrumb 
        items={[
          { label: 'Contadores', href: '/contadores' },
          { label: contador.numero_serie }
        ]} 
        className="mb-4"
      />

      <div className="page-header flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title font-mono">{contador.numero_serie}</h1>
            <Badge variant={contador.activo ? 'success' : 'default'}>
              {contador.activo ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          <p className="page-description">
            {comunidad?.nombre} · {ubicacion?.agrupacion?.nombre} - {ubicacion?.nombre}
          </p>
        </div>
        <Link to={`/contadores/${id}/editar`}>
          <Button variant="secondary">
            <Edit2 className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </Link>
      </div>

      <Card>
        <Tabs defaultValue="datos">
          <TabsList className="px-6">
            <TabsTrigger value="datos">Datos del Contador</TabsTrigger>
            <TabsTrigger value="conceptos">Conceptos</TabsTrigger>
          </TabsList>

          <TabsContent value="datos" className="p-6">
            <DatosContadorTab contador={contador} />
          </TabsContent>

          <TabsContent value="conceptos" className="p-6">
            <ConceptosContadorTab contador={contador} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

function DatosContadorTab({ contador }) {
  const ubicacion = contador.ubicacion
  const comunidad = ubicacion?.agrupacion?.comunidad

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Identificación</h3>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Número de serie</dt>
            <dd className="text-sm font-mono font-medium text-gray-900">{contador.numero_serie}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Marca</dt>
            <dd className="text-sm font-medium text-gray-900">{contador.marca || '-'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Modelo</dt>
            <dd className="text-sm font-medium text-gray-900">{contador.modelo || '-'}</dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Ubicación</h3>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Comunidad</dt>
            <dd className="text-sm font-medium text-gray-900">
              <Link to={`/comunidades/${comunidad?.id}`} className="text-primary-600 hover:underline">
                {comunidad?.nombre}
              </Link>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">{comunidad?.nombre_agrupacion}</dt>
            <dd className="text-sm font-medium text-gray-900">{ubicacion?.agrupacion?.nombre}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">{comunidad?.nombre_ubicacion}</dt>
            <dd className="text-sm font-medium text-gray-900">{ubicacion?.nombre}</dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Fechas</h3>
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Instalación</dt>
            <dd className="text-sm font-medium text-gray-900">
              {formatDate(contador.fecha_instalacion)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Última verificación</dt>
            <dd className="text-sm font-medium text-gray-900">
              {formatDate(contador.fecha_ultima_verificacion)}
            </dd>
          </div>
        </dl>
      </div>

      {contador.observaciones && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">Observaciones</h3>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{contador.observaciones}</p>
        </div>
      )}
    </div>
  )
}

function ContadorEditar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: contador, isLoading } = useContador(id)
  const updateMutation = useUpdateContador()
  const toast = useToast()

  // Debug: Ver qué datos recibe el componente
  useEffect(() => {
    if (contador) {
      console.log('=== CONTADOR EDITAR - DATOS RECIBIDOS ===')
      console.log('Contador completo:', contador)
      console.log('ubicacion_id:', contador.ubicacion_id)
      console.log('ubicacion objeto:', contador.ubicacion)
      console.log('ubicacion.agrupacion:', contador.ubicacion?.agrupacion)
      console.log('ubicacion.agrupacion.comunidad:', contador.ubicacion?.agrupacion?.comunidad)
    }
  }, [contador])

  const handleSubmit = async (data) => {
    try {
      console.log('=== ACTUALIZANDO CONTADOR ===')
      console.log('ID contador:', id)
      console.log('Datos a enviar:', data)
      
      const result = await updateMutation.mutateAsync({ id, ...data })
      
      console.log('=== RESULTADO ACTUALIZACIÓN ===')
      console.log('Resultado:', result)
      
      toast.success('Contador actualizado')
      navigate(`/contadores/${id}`)
    } catch (error) {
      console.error('=== ERROR ACTUALIZACIÓN ===')
      console.error('Error:', error)
      toast.error(error.message)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (!contador) return <div>Contador no encontrado</div>

  return (
    <div>
      <Breadcrumb 
        items={[
          { label: 'Contadores', href: '/contadores' },
          { label: contador.numero_serie, href: `/contadores/${id}` },
          { label: 'Editar' }
        ]} 
        className="mb-4"
      />

      <div className="page-header">
        <h1 className="page-title">Editar Contador</h1>
        <p className="page-description font-mono">{contador.numero_serie}</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <ContadorForm 
            contador={contador}
            onSubmit={handleSubmit}
            loading={updateMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  )
}
