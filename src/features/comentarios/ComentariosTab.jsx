import { useState, useMemo } from 'react'
import { Plus, Pin, PinOff, Pencil, Trash2, MessageSquare, ChevronDown } from 'lucide-react'
import { Button, Badge, Select, EmptyState } from '@/components/ui'
import { ConfirmModal } from '@/components/ui/Modal'
import { useAuth } from '@/features/auth/AuthContext'
import { useComentarios, useUpdateComentario, useDeleteComentario } from '@/hooks/useComentarios'
import { useToast } from '@/components/ui/Toast'
import { NuevoComentarioModal } from './NuevoComentarioModal'

// Configuración de etiquetas
const ETIQUETA_CONFIG = {
  moroso: { label: 'Moroso', className: 'bg-red-100 text-red-700 border-red-200' },
  error_lectura: { label: 'Error Lectura', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  revision: { label: 'Revision', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  incidencia: { label: 'Incidencia', className: 'bg-red-100 text-red-700 border-red-200' },
  informativo: { label: 'Informativo', className: 'bg-blue-100 text-blue-700 border-blue-200' }
}

// Configuración de prioridades
const PRIORIDAD_CONFIG = {
  baja: { label: 'Baja', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  normal: { label: 'Normal', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  urgente: { label: 'Urgente', className: 'bg-red-100 text-red-700 border-red-200' }
}

// Configuración de estados
const ESTADO_CONFIG = {
  abierto: { label: 'Abierto', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  en_progreso: { label: 'En Progreso', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  resuelto: { label: 'Resuelto', className: 'bg-green-100 text-green-700 border-green-200' }
}

// Fecha relativa humanizada
function fechaRelativa(fecha) {
  const ahora = new Date()
  const date = new Date(fecha)
  const diffMs = ahora - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffHoras = Math.floor(diffMs / 3600000)
  const diffDias = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Ahora mismo'
  if (diffMin < 60) return `Hace ${diffMin} min`
  if (diffHoras < 24) return `Hace ${diffHoras}h`
  if (diffDias === 1) return 'Ayer'
  if (diffDias < 7) return `Hace ${diffDias} dias`

  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Iniciales del usuario
function getIniciales(nombre) {
  if (!nombre) return '?'
  return nombre
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// Color de avatar basado en nombre
function getAvatarColor(nombre) {
  if (!nombre) return 'bg-gray-200 text-gray-600'
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
    'bg-teal-100 text-teal-700',
    'bg-indigo-100 text-indigo-700',
    'bg-rose-100 text-rose-700'
  ]
  const hash = nombre.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

export function ComentariosTab({ entidadTipo, entidadId }) {
  const { user, isAdmin } = useAuth()
  const toast = useToast()
  const { data: comentarios, isLoading } = useComentarios(entidadTipo, entidadId)
  const updateMutation = useUpdateComentario()
  const deleteMutation = useDeleteComentario()

  // Estado UI
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [comentarioEditar, setComentarioEditar] = useState(null)
  const [comentarioEliminar, setComentarioEliminar] = useState(null)
  const [menuAbierto, setMenuAbierto] = useState(null)

  // Filtrar comentarios
  const comentariosFiltrados = useMemo(() => {
    if (!comentarios) return []
    if (!filtroEstado) return comentarios
    return comentarios.filter(c => c.estado === filtroEstado)
  }, [comentarios, filtroEstado])

  // Contar por estado
  const conteos = useMemo(() => {
    if (!comentarios) return { abierto: 0, en_progreso: 0, resuelto: 0, total: 0 }
    return {
      abierto: comentarios.filter(c => c.estado === 'abierto').length,
      en_progreso: comentarios.filter(c => c.estado === 'en_progreso').length,
      resuelto: comentarios.filter(c => c.estado === 'resuelto').length,
      total: comentarios.length
    }
  }, [comentarios])

  // Puede editar/eliminar
  const puedeModificar = (comentario) => {
    return comentario.usuario_id === user?.id || isAdmin
  }

  // Cambiar estado rapido
  const handleCambiarEstado = async (comentario, nuevoEstado) => {
    try {
      await updateMutation.mutateAsync({ id: comentario.id, estado: nuevoEstado })
      setMenuAbierto(null)
    } catch (error) {
      toast.error('Error al cambiar estado')
    }
  }

  // Toggle fijar
  const handleToggleFijado = async (comentario) => {
    try {
      await updateMutation.mutateAsync({ id: comentario.id, fijado: !comentario.fijado })
    } catch (error) {
      toast.error('Error al fijar/desfijar nota')
    }
  }

  // Eliminar
  const handleEliminar = async () => {
    if (!comentarioEliminar) return
    try {
      await deleteMutation.mutateAsync({
        id: comentarioEliminar.id,
        entidadTipo,
        entidadId
      })
      toast.success('Nota eliminada')
      setComentarioEliminar(null)
    } catch (error) {
      toast.error('Error al eliminar nota')
    }
  }

  // Abrir edición
  const handleEditar = (comentario) => {
    setComentarioEditar(comentario)
    setModalOpen(true)
  }

  // Nueva nota
  const handleNueva = () => {
    setComentarioEditar(null)
    setModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-500">Cargando notas...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-gray-700">
            {conteos.total} nota{conteos.total !== 1 ? 's' : ''}
          </h3>

          {/* Contadores por estado */}
          {conteos.total > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                {conteos.abierto} abierto{conteos.abierto !== 1 ? 's' : ''}
              </span>
              {conteos.en_progreso > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {conteos.en_progreso} en progreso
                </span>
              )}
              {conteos.resuelto > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  {conteos.resuelto} resuelto{conteos.resuelto !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Filtro por estado */}
          {conteos.total > 0 && (
            <div className="w-36">
              <Select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="abierto">Abiertos</option>
                <option value="en_progreso">En Progreso</option>
                <option value="resuelto">Resueltos</option>
              </Select>
            </div>
          )}

          <Button onClick={handleNueva} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Nueva Nota
          </Button>
        </div>
      </div>

      {/* Lista tipo timeline */}
      {comentariosFiltrados.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={filtroEstado ? 'Sin notas con este estado' : 'Sin notas'}
          description={filtroEstado
            ? 'No hay notas que coincidan con el filtro seleccionado'
            : 'Agrega una nota para llevar seguimiento de esta entidad'}
          action={!filtroEstado && (
            <Button onClick={handleNueva}>
              <Plus className="w-4 h-4 mr-1" />
              Crear primera nota
            </Button>
          )}
        />
      ) : (
        <div className="relative">
          {/* Linea del timeline */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />

          <div className="space-y-4">
            {comentariosFiltrados.map((comentario) => {
              const estadoConf = ESTADO_CONFIG[comentario.estado] || ESTADO_CONFIG.abierto
              const prioridadConf = PRIORIDAD_CONFIG[comentario.prioridad] || PRIORIDAD_CONFIG.normal
              const etiquetaConf = comentario.etiqueta ? ETIQUETA_CONFIG[comentario.etiqueta] : null
              const esFijado = comentario.fijado

              return (
                <div
                  key={comentario.id}
                  className={`relative pl-12 ${esFijado ? '' : ''}`}
                >
                  {/* Avatar en la linea */}
                  <div className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold z-10 ${getAvatarColor(comentario.usuario_nombre)}`}>
                    {getIniciales(comentario.usuario_nombre)}
                  </div>

                  {/* Tarjeta del comentario */}
                  <div className={`rounded-lg border p-4 ${
                    esFijado
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-white border-gray-200'
                  }`}>
                    {/* Header de la tarjeta */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">
                          {comentario.usuario_nombre || comentario.usuario_email}
                        </span>
                        <span className="text-xs text-gray-400">
                          {fechaRelativa(comentario.created_at)}
                        </span>

                        {esFijado && (
                          <Pin className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {etiquetaConf && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${etiquetaConf.className}`}>
                            {etiquetaConf.label}
                          </span>
                        )}
                        {comentario.prioridad !== 'normal' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${prioridadConf.className}`}>
                            {prioridadConf.label}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${estadoConf.className}`}>
                          {estadoConf.label}
                        </span>
                      </div>
                    </div>

                    {/* Contenido */}
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {comentario.contenido}
                    </p>

                    {/* Acciones */}
                    {puedeModificar(comentario) && (
                      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
                        {/* Cambio rapido de estado */}
                        <div className="relative">
                          <button
                            onClick={() => setMenuAbierto(menuAbierto === comentario.id ? null : comentario.id)}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                          >
                            Cambiar estado
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          {menuAbierto === comentario.id && (
                            <div className="absolute left-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-20 min-w-[140px]">
                              {Object.entries(ESTADO_CONFIG).map(([key, conf]) => (
                                <button
                                  key={key}
                                  onClick={() => handleCambiarEstado(comentario, key)}
                                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                                    comentario.estado === key ? 'font-medium' : ''
                                  }`}
                                >
                                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                    key === 'abierto' ? 'bg-yellow-400'
                                      : key === 'en_progreso' ? 'bg-blue-400'
                                        : 'bg-green-400'
                                  }`} />
                                  {conf.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Fijar/Desfijar */}
                        <button
                          onClick={() => handleToggleFijado(comentario)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                          title={esFijado ? 'Desfijar' : 'Fijar arriba'}
                        >
                          {esFijado ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                          {esFijado ? 'Desfijar' : 'Fijar'}
                        </button>

                        {/* Editar */}
                        <button
                          onClick={() => handleEditar(comentario)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </button>

                        {/* Eliminar */}
                        <button
                          onClick={() => setComentarioEliminar(comentario)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal crear/editar */}
      <NuevoComentarioModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setComentarioEditar(null)
        }}
        entidadTipo={entidadTipo}
        entidadId={entidadId}
        comentario={comentarioEditar}
      />

      {/* Modal confirmar eliminación */}
      <ConfirmModal
        open={!!comentarioEliminar}
        onClose={() => setComentarioEliminar(null)}
        onConfirm={handleEliminar}
        title="Eliminar Nota"
        description="Esta accion no se puede deshacer. Se eliminara permanentemente esta nota."
        confirmText="Eliminar"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
