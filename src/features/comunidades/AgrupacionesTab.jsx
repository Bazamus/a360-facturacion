import { useState } from 'react'
import { Plus, Edit2, Trash2, ChevronRight, ChevronDown, Home } from 'lucide-react'
import { useAgrupaciones, useCreateAgrupacion, useUpdateAgrupacion, useDeleteAgrupacion, useUbicaciones } from '@/hooks'
import { Button, Card, CardContent, Modal, Input, FormField, LoadingSpinner, EmptyState, Badge } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'

export function AgrupacionesTab({ comunidad }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAgrupacion, setEditingAgrupacion] = useState(null)
  const [expandedAgrupacion, setExpandedAgrupacion] = useState(null)

  const { data: agrupaciones, isLoading } = useAgrupaciones(comunidad.id)
  const createMutation = useCreateAgrupacion()
  const updateMutation = useUpdateAgrupacion()
  const deleteMutation = useDeleteAgrupacion()
  const toast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = {
      nombre: formData.get('nombre'),
      descripcion: formData.get('descripcion') || null,
      orden: parseInt(formData.get('orden')) || 0,
      comunidad_id: comunidad.id
    }

    try {
      if (editingAgrupacion) {
        await updateMutation.mutateAsync({ id: editingAgrupacion.id, ...data })
        toast.success(`${comunidad.nombre_agrupacion} actualizado`)
      } else {
        await createMutation.mutateAsync(data)
        toast.success(`${comunidad.nombre_agrupacion} creado`)
      }
      setModalOpen(false)
      setEditingAgrupacion(null)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDelete = async (agrupacion) => {
    if (!confirm(`¿Eliminar ${comunidad.nombre_agrupacion} "${agrupacion.nombre}"?`)) return
    
    try {
      await deleteMutation.mutateAsync({ id: agrupacion.id, comunidadId: comunidad.id })
      toast.success(`${comunidad.nombre_agrupacion} eliminado`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const openCreate = () => {
    setEditingAgrupacion(null)
    setModalOpen(true)
  }

  const openEdit = (agrupacion) => {
    setEditingAgrupacion(agrupacion)
    setModalOpen(true)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {comunidad.nombre_agrupacion}es
        </h3>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nuevo {comunidad.nombre_agrupacion}
        </Button>
      </div>

      {!agrupaciones?.length ? (
        <EmptyState
          title={`Sin ${comunidad.nombre_agrupacion.toLowerCase()}es`}
          description={`Añade el primer ${comunidad.nombre_agrupacion.toLowerCase()} a esta comunidad`}
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo {comunidad.nombre_agrupacion}
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {agrupaciones.filter(a => a.activa).map(agrupacion => (
            <AgrupacionRow
              key={agrupacion.id}
              agrupacion={agrupacion}
              comunidad={comunidad}
              expanded={expandedAgrupacion === agrupacion.id}
              onToggle={() => setExpandedAgrupacion(
                expandedAgrupacion === agrupacion.id ? null : agrupacion.id
              )}
              onEdit={() => openEdit(agrupacion)}
              onDelete={() => handleDelete(agrupacion)}
            />
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingAgrupacion(null) }}
        title={editingAgrupacion 
          ? `Editar ${comunidad.nombre_agrupacion}` 
          : `Nuevo ${comunidad.nombre_agrupacion}`
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Nombre" required>
            <Input
              name="nombre"
              defaultValue={editingAgrupacion?.nombre || ''}
              placeholder="1, 2, A, B..."
              required
            />
          </FormField>

          <FormField label="Descripción">
            <Input
              name="descripcion"
              defaultValue={editingAgrupacion?.descripcion || ''}
              placeholder="Descripción opcional"
            />
          </FormField>

          <FormField label="Orden">
            <Input
              name="orden"
              type="number"
              defaultValue={editingAgrupacion?.orden || 0}
              min={0}
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => { setModalOpen(false); setEditingAgrupacion(null) }}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingAgrupacion ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function AgrupacionRow({ agrupacion, comunidad, expanded, onToggle, onEdit, onDelete }) {
  return (
    <Card>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
          <div>
            <p className="font-medium text-gray-900">
              {comunidad.nombre_agrupacion} {agrupacion.nombre}
            </p>
            {agrupacion.descripcion && (
              <p className="text-sm text-gray-500">{agrupacion.descripcion}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <UbicacionesList 
          agrupacionId={agrupacion.id} 
          comunidad={comunidad}
        />
      )}
    </Card>
  )
}

function UbicacionesList({ agrupacionId, comunidad }) {
  const { data: ubicaciones, isLoading } = useUbicaciones(agrupacionId)

  if (isLoading) return <div className="px-4 py-3 border-t"><LoadingSpinner size="sm" /></div>

  return (
    <div className="border-t bg-gray-50">
      {!ubicaciones?.length ? (
        <p className="px-4 py-3 text-sm text-gray-500">
          Sin {comunidad.nombre_ubicacion.toLowerCase()}s
        </p>
      ) : (
        <div className="divide-y divide-gray-200">
          {ubicaciones.map(ubicacion => (
            <div key={ubicacion.ubicacion_id} className="px-4 py-2 flex items-center gap-3">
              <Home className="h-4 w-4 text-gray-400 ml-6" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {comunidad.nombre_ubicacion} {ubicacion.ubicacion_nombre}
                </p>
                {ubicacion.cliente_nombre && (
                  <p className="text-xs text-gray-500">
                    {ubicacion.cliente_nombre}
                    <Badge variant={ubicacion.cliente_tipo === 'propietario' ? 'primary' : 'info'} className="ml-2">
                      {ubicacion.cliente_tipo}
                    </Badge>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}






