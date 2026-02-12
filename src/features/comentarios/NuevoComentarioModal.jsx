import { useState, useEffect } from 'react'
import { Modal, Button, FormField, Select, Textarea } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { useCreateComentario, useUpdateComentario } from '@/hooks/useComentarios'
import { useToast } from '@/components/ui/Toast'

const ETIQUETAS = [
  { value: '', label: 'Sin etiqueta' },
  { value: 'moroso', label: 'Moroso' },
  { value: 'error_lectura', label: 'Error de Lectura' },
  { value: 'revision', label: 'Pendiente Revision' },
  { value: 'incidencia', label: 'Incidencia' },
  { value: 'informativo', label: 'Informativo' }
]

const PRIORIDADES = [
  { value: 'baja', label: 'Baja' },
  { value: 'normal', label: 'Normal' },
  { value: 'urgente', label: 'Urgente' }
]

const ESTADOS = [
  { value: 'abierto', label: 'Abierto' },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'resuelto', label: 'Resuelto' }
]

export function NuevoComentarioModal({
  open,
  onClose,
  entidadTipo,
  entidadId,
  comentario = null  // Si se pasa, es edición
}) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const createMutation = useCreateComentario()
  const updateMutation = useUpdateComentario()

  const esEdicion = !!comentario

  // Estado del formulario
  const [contenido, setContenido] = useState('')
  const [etiqueta, setEtiqueta] = useState('')
  const [prioridad, setPrioridad] = useState('normal')
  const [estado, setEstado] = useState('abierto')

  // Cargar datos si es edición
  useEffect(() => {
    if (comentario) {
      setContenido(comentario.contenido || '')
      setEtiqueta(comentario.etiqueta || '')
      setPrioridad(comentario.prioridad || 'normal')
      setEstado(comentario.estado || 'abierto')
    } else {
      setContenido('')
      setEtiqueta('')
      setPrioridad('normal')
      setEstado('abierto')
    }
  }, [comentario, open])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!contenido.trim()) {
      toast.error('El contenido es obligatorio')
      return
    }

    try {
      if (esEdicion) {
        await updateMutation.mutateAsync({
          id: comentario.id,
          contenido: contenido.trim(),
          etiqueta: etiqueta || null,
          prioridad,
          estado
        })
        toast.success('Nota actualizada')
      } else {
        await createMutation.mutateAsync({
          entidad_tipo: entidadTipo,
          entidad_id: entidadId,
          usuario_id: user.id,
          contenido: contenido.trim(),
          etiqueta: etiqueta || null,
          prioridad,
          estado
        })
        toast.success('Nota creada')
      }
      onClose()
    } catch (error) {
      toast.error(error.message || 'Error al guardar la nota')
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={esEdicion ? 'Editar Nota' : 'Nueva Nota'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info del autor */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
            {(profile?.nombre_completo || user?.email || '?')
              .split(' ')
              .map(p => p[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {profile?.nombre_completo || user?.email}
            </p>
            <p className="text-xs text-gray-500">
              {esEdicion ? 'Editando nota' : 'Creando nueva nota'}
            </p>
          </div>
        </div>

        {/* Contenido */}
        <FormField label="Contenido" required>
          <Textarea
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            placeholder="Escribe tu nota aqui..."
            rows={4}
          />
        </FormField>

        {/* Clasificación */}
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Etiqueta">
            <Select value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)}>
              {ETIQUETAS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Prioridad">
            <Select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
              {PRIORIDADES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Estado">
            <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
              {ESTADOS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </FormField>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isLoading}>
            {esEdicion ? 'Guardar Cambios' : 'Crear Nota'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
