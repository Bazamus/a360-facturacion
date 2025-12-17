import { useState } from 'react'
import { Plus, Edit2, Trash2, Home, UserPlus, X } from 'lucide-react'
import { 
  useUbicacionesByComunidad, 
  useCreateUbicacion, 
  useUpdateUbicacion, 
  useDeleteUbicacion,
  useAgrupaciones,
  useClientesSimple,
  useAsignarClienteUbicacion,
  useFinalizarOcupacion
} from '@/hooks'
import { 
  Button, 
  Card, 
  Modal, 
  Input, 
  Select,
  FormField, 
  LoadingSpinner, 
  EmptyState, 
  Badge,
  DataTable,
  SearchInput
} from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'

export function UbicacionesTab({ comunidad }) {
  const [modalUbicacion, setModalUbicacion] = useState(false)
  const [modalAsignar, setModalAsignar] = useState(false)
  const [editingUbicacion, setEditingUbicacion] = useState(null)
  const [ubicacionParaAsignar, setUbicacionParaAsignar] = useState(null)
  const [search, setSearch] = useState('')
  const [searchCliente, setSearchCliente] = useState('')

  const { data: ubicaciones, isLoading } = useUbicacionesByComunidad(comunidad.id)
  const { data: agrupaciones } = useAgrupaciones(comunidad.id)
  const { data: clientes } = useClientesSimple({ search: searchCliente })
  
  const createMutation = useCreateUbicacion()
  const updateMutation = useUpdateUbicacion()
  const deleteMutation = useDeleteUbicacion()
  const asignarMutation = useAsignarClienteUbicacion()
  const finalizarMutation = useFinalizarOcupacion()
  const toast = useToast()

  // Filtrar ubicaciones por búsqueda
  const ubicacionesFiltradas = ubicaciones?.filter(u => 
    u.ubicacion_nombre?.toLowerCase().includes(search.toLowerCase()) ||
    u.agrupacion_nombre?.toLowerCase().includes(search.toLowerCase()) ||
    u.cliente_nombre?.toLowerCase().includes(search.toLowerCase())
  ) || []

  const handleSubmitUbicacion = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = {
      agrupacion_id: formData.get('agrupacion_id'),
      nombre: formData.get('nombre'),
      descripcion: formData.get('descripcion') || null,
      referencia_catastral: formData.get('referencia_catastral') || null,
      orden: parseInt(formData.get('orden')) || 0
    }

    try {
      if (editingUbicacion) {
        await updateMutation.mutateAsync({ id: editingUbicacion.ubicacion_id, ...data })
        toast.success(`${comunidad.nombre_ubicacion} actualizada`)
      } else {
        await createMutation.mutateAsync(data)
        toast.success(`${comunidad.nombre_ubicacion} creada`)
      }
      setModalUbicacion(false)
      setEditingUbicacion(null)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDelete = async (ubicacion) => {
    if (!confirm(`¿Eliminar ${comunidad.nombre_ubicacion} "${ubicacion.ubicacion_nombre}"?`)) return
    
    try {
      await deleteMutation.mutateAsync(ubicacion.ubicacion_id)
      toast.success(`${comunidad.nombre_ubicacion} eliminada`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleAsignarCliente = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = {
      ubicacion_id: ubicacionParaAsignar.ubicacion_id,
      cliente_id: formData.get('cliente_id'),
      fecha_inicio: formData.get('fecha_inicio')
    }

    try {
      await asignarMutation.mutateAsync(data)
      toast.success('Cliente asignado correctamente')
      setModalAsignar(false)
      setUbicacionParaAsignar(null)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleFinalizarOcupacion = async (ubicacion) => {
    if (!ubicacion.cliente_id) return
    if (!confirm(`¿Finalizar ocupación de ${ubicacion.cliente_nombre}?`)) return

    try {
      // Buscar el registro de ubicacion_cliente
      await finalizarMutation.mutateAsync({
        id: ubicacion.ubicacion_id, // Esto necesitaría el ID correcto
        fecha_fin: new Date().toISOString().split('T')[0]
      })
      toast.success('Ocupación finalizada')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const openCreateUbicacion = () => {
    setEditingUbicacion(null)
    setModalUbicacion(true)
  }

  const openEditUbicacion = (ubicacion) => {
    setEditingUbicacion(ubicacion)
    setModalUbicacion(true)
  }

  const openAsignarCliente = (ubicacion) => {
    setUbicacionParaAsignar(ubicacion)
    setSearchCliente('')
    setModalAsignar(true)
  }

  const columns = [
    {
      key: 'agrupacion_nombre',
      header: comunidad.nombre_agrupacion,
      render: (value) => (
        <span className="text-sm font-medium text-gray-600">{value}</span>
      )
    },
    {
      key: 'ubicacion_nombre',
      header: comunidad.nombre_ubicacion,
      render: (value) => (
        <span className="font-medium text-gray-900">{value}</span>
      )
    },
    {
      key: 'cliente_nombre',
      header: 'Ocupante Actual',
      render: (value, row) => value ? (
        <div className="flex items-center gap-2">
          <span className="text-sm">{value}</span>
          <Badge variant={row.cliente_tipo === 'propietario' ? 'primary' : 'info'} className="text-xs">
            {row.cliente_tipo}
          </Badge>
        </div>
      ) : (
        <span className="text-gray-400 text-sm italic">Sin ocupante</span>
      )
    },
    {
      key: 'fecha_ocupacion',
      header: 'Desde',
      render: (value) => value ? formatDate(value) : '-'
    },
    {
      key: 'acciones',
      header: '',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => openAsignarCliente(row)}
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
            title="Asignar ocupante"
          >
            <UserPlus className="h-4 w-4" />
          </button>
          <button
            onClick={() => openEditUbicacion(row)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Editar"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ]

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {comunidad.nombre_ubicacion}s
        </h3>
        <Button onClick={openCreateUbicacion} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nueva {comunidad.nombre_ubicacion}
        </Button>
      </div>

      {/* Buscador */}
      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Buscar ${comunidad.nombre_ubicacion.toLowerCase()}...`}
          className="max-w-sm"
        />
      </div>

      {!ubicacionesFiltradas?.length ? (
        <EmptyState
          icon={Home}
          title={`Sin ${comunidad.nombre_ubicacion.toLowerCase()}s`}
          description={search 
            ? 'No se encontraron resultados' 
            : `Añade la primera ${comunidad.nombre_ubicacion.toLowerCase()} a esta comunidad`
          }
          action={!search && (
            <Button onClick={openCreateUbicacion}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva {comunidad.nombre_ubicacion}
            </Button>
          )}
        />
      ) : (
        <DataTable
          data={ubicacionesFiltradas}
          columns={columns}
          pageSize={15}
        />
      )}

      {/* Modal crear/editar ubicación */}
      <Modal
        open={modalUbicacion}
        onClose={() => { setModalUbicacion(false); setEditingUbicacion(null) }}
        title={editingUbicacion 
          ? `Editar ${comunidad.nombre_ubicacion}` 
          : `Nueva ${comunidad.nombre_ubicacion}`
        }
      >
        <form onSubmit={handleSubmitUbicacion} className="space-y-4">
          <FormField label={comunidad.nombre_agrupacion} required>
            <Select 
              name="agrupacion_id" 
              defaultValue={editingUbicacion?.agrupacion_id || ''}
              required
            >
              <option value="">Seleccionar...</option>
              {agrupaciones?.filter(a => a.activa).map(a => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Nombre" required>
            <Input
              name="nombre"
              defaultValue={editingUbicacion?.ubicacion_nombre || ''}
              placeholder="1ºA, 2ºB, Bajo C..."
              required
            />
          </FormField>

          <FormField label="Descripción">
            <Input
              name="descripcion"
              defaultValue={editingUbicacion?.descripcion || ''}
              placeholder="Descripción opcional"
            />
          </FormField>

          <FormField label="Referencia Catastral">
            <Input
              name="referencia_catastral"
              defaultValue={editingUbicacion?.referencia_catastral || ''}
              placeholder="Referencia catastral"
            />
          </FormField>

          <FormField label="Orden">
            <Input
              name="orden"
              type="number"
              defaultValue={editingUbicacion?.orden || 0}
              min={0}
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => { setModalUbicacion(false); setEditingUbicacion(null) }}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingUbicacion ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal asignar cliente */}
      <Modal
        open={modalAsignar}
        onClose={() => { setModalAsignar(false); setUbicacionParaAsignar(null) }}
        title="Asignar Ocupante"
        size="md"
      >
        {ubicacionParaAsignar && (
          <form onSubmit={handleAsignarCliente} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                {comunidad.nombre_agrupacion} {ubicacionParaAsignar.agrupacion_nombre} - {comunidad.nombre_ubicacion} {ubicacionParaAsignar.ubicacion_nombre}
              </p>
              {ubicacionParaAsignar.cliente_nombre && (
                <p className="text-sm text-yellow-700 mt-2">
                  ⚠️ Ocupante actual: <strong>{ubicacionParaAsignar.cliente_nombre}</strong>
                  <br />
                  <span className="text-xs">Al asignar un nuevo ocupante, el actual se marcará como histórico.</span>
                </p>
              )}
            </div>

            <FormField label="Buscar Cliente">
              <SearchInput
                value={searchCliente}
                onChange={setSearchCliente}
                placeholder="Buscar por nombre o NIF..."
                debounce={300}
              />
            </FormField>

            <FormField label="Seleccionar Cliente" required>
              <Select name="cliente_id" required>
                <option value="">Seleccionar cliente...</option>
                {clientes?.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.apellidos}, {c.nombre} - {c.nif} ({c.tipo})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Fecha de Inicio" required>
              <Input
                name="fecha_inicio"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                required
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="secondary"
                onClick={() => { setModalAsignar(false); setUbicacionParaAsignar(null) }}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={asignarMutation.isPending}>
                Asignar
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

