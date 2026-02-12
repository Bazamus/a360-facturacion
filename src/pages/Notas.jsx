import { useState, useMemo, useEffect } from 'react'
import { StickyNote, Plus, LayoutGrid, List, Search, X, AlertTriangle } from 'lucide-react'
import { Button, Card, Select, EmptyState } from '@/components/ui'
import { ConfirmModal } from '@/components/ui/Modal'
import { useAuth } from '@/features/auth/AuthContext'
import { useAllComentarios, useUpdateComentario, useDeleteComentario } from '@/hooks/useComentarios'
import { useToast } from '@/components/ui/Toast'
import { NuevoComentarioModal } from '@/features/comentarios/NuevoComentarioModal'
import { NotasKanban } from '@/features/comentarios/NotasKanban'
import { NotasListView } from '@/features/comentarios/NotasListView'

// Guardar/leer preferencia de vista desde localStorage
function getVistaPreferida() {
  try { return localStorage.getItem('notas-vista') || 'kanban' } catch { return 'kanban' }
}
function setVistaPreferida(vista) {
  try { localStorage.setItem('notas-vista', vista) } catch {}
}

export function NotasPage() {
  const { user, isAdmin } = useAuth()
  const toast = useToast()
  const updateMutation = useUpdateComentario()
  const deleteMutation = useDeleteComentario()

  // Vista activa
  const [vista, setVista] = useState(getVistaPreferida)

  // Filtros
  const [filtroEntidad, setFiltroEntidad] = useState('')
  const [filtroPrioridad, setFiltroPrioridad] = useState('')
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('')
  const [search, setSearch] = useState('')

  // UI
  const [modalOpen, setModalOpen] = useState(false)
  const [comentarioEditar, setComentarioEditar] = useState(null)
  const [comentarioEliminar, setComentarioEliminar] = useState(null)

  // Guardar preferencia de vista
  useEffect(() => { setVistaPreferida(vista) }, [vista])

  // Fetch notas con filtros
  const filtrosQuery = useMemo(() => ({
    entidadTipo: filtroEntidad || undefined,
    prioridad: filtroPrioridad || undefined,
    etiqueta: filtroEtiqueta || undefined,
    search: search || undefined
  }), [filtroEntidad, filtroPrioridad, filtroEtiqueta, search])

  const { data: notas, isLoading } = useAllComentarios(filtrosQuery)
  const listaNotas = notas || []

  // Conteos
  const conteos = useMemo(() => ({
    total: listaNotas.length,
    activas: listaNotas.filter(n => n.estado !== 'resuelto').length,
    abiertas: listaNotas.filter(n => n.estado === 'abierto').length,
    enProgreso: listaNotas.filter(n => n.estado === 'en_progreso').length,
    urgentes: listaNotas.filter(n => n.prioridad === 'urgente' && n.estado !== 'resuelto').length
  }), [listaNotas])

  // Permisos: todos los usuarios autenticados pueden gestionar notas (herramienta colaborativa)
  const canModify = () => true
  const canEditDelete = () => true

  // Acciones
  const handleEdit = (nota) => {
    setComentarioEditar(nota)
    setModalOpen(true)
  }

  const handleNew = () => {
    setComentarioEditar(null)
    setModalOpen(true)
  }

  const handleTogglePin = async (nota) => {
    try {
      await updateMutation.mutateAsync({ id: nota.id, fijado: !nota.fijado })
    } catch {
      toast.error('Error al fijar/desfijar nota')
    }
  }

  const handleDelete = async () => {
    if (!comentarioEliminar) return
    try {
      await deleteMutation.mutateAsync({
        id: comentarioEliminar.id,
        entidadTipo: comentarioEliminar.entidad_tipo,
        entidadId: comentarioEliminar.entidad_id
      })
      toast.success('Nota eliminada')
      setComentarioEliminar(null)
    } catch {
      toast.error('Error al eliminar nota')
    }
  }

  // Hay filtros activos
  const hayFiltros = filtroEntidad || filtroPrioridad || filtroEtiqueta || search
  const limpiarFiltros = () => {
    setFiltroEntidad('')
    setFiltroPrioridad('')
    setFiltroEtiqueta('')
    setSearch('')
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <StickyNote className="w-6 h-6" />
            Centro de Notas
          </h1>
          <p className="page-description">
            Gestiona todas las notas internas de la aplicacion
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle de vista */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setVista('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                vista === 'kanban'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Kanban
            </button>
            <button
              onClick={() => setVista('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                vista === 'lista'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="w-4 h-4" />
              Lista
            </button>
          </div>

          <Button onClick={handleNew}>
            <Plus className="w-4 h-4 mr-1" />
            Nueva Nota
          </Button>
        </div>
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border rounded-lg p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Notas Activas</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{conteos.activas}</p>
        </div>
        <div className="bg-white border rounded-lg p-3 border-l-4 border-l-yellow-400">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Abiertas</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{conteos.abiertas}</p>
        </div>
        <div className="bg-white border rounded-lg p-3 border-l-4 border-l-blue-400">
          <p className="text-xs text-gray-500 uppercase tracking-wide">En Progreso</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{conteos.enProgreso}</p>
        </div>
        <div className="bg-white border rounded-lg p-3 border-l-4 border-l-red-400">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Urgentes</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{conteos.urgentes}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="w-40">
          <Select value={filtroEntidad} onChange={(e) => setFiltroEntidad(e.target.value)}>
            <option value="">Todas las entidades</option>
            <option value="cliente">Clientes</option>
            <option value="comunidad">Comunidades</option>
          </Select>
        </div>

        <div className="w-32">
          <Select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)}>
            <option value="">Prioridad</option>
            <option value="baja">Baja</option>
            <option value="normal">Normal</option>
            <option value="urgente">Urgente</option>
          </Select>
        </div>

        <div className="w-40">
          <Select value={filtroEtiqueta} onChange={(e) => setFiltroEtiqueta(e.target.value)}>
            <option value="">Etiqueta</option>
            <option value="moroso">Moroso</option>
            <option value="error_lectura">Error Lectura</option>
            <option value="revision">Revision</option>
            <option value="incidencia">Incidencia</option>
            <option value="informativo">Informativo</option>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px] max-w-xs relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en notas..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {hayFiltros && (
          <button
            onClick={limpiarFiltros}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Limpiar
          </button>
        )}
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-500">Cargando notas...</span>
        </div>
      ) : listaNotas.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title={hayFiltros ? 'Sin resultados' : 'Sin notas'}
          description={hayFiltros
            ? 'No hay notas que coincidan con los filtros aplicados'
            : 'Crea tu primera nota para empezar a llevar seguimiento'}
          action={!hayFiltros && (
            <Button onClick={handleNew}>
              <Plus className="w-4 h-4 mr-1" />
              Crear primera nota
            </Button>
          )}
        />
      ) : vista === 'kanban' ? (
        <NotasKanban
          notas={listaNotas}
          onEdit={handleEdit}
          onDelete={(nota) => setComentarioEliminar(nota)}
          onTogglePin={handleTogglePin}
          canModify={canModify}
          canEditDelete={canEditDelete}
        />
      ) : (
        <NotasListView
          notas={listaNotas}
          onEdit={handleEdit}
          onDelete={(nota) => setComentarioEliminar(nota)}
          onTogglePin={handleTogglePin}
          canModify={canModify}
          canEditDelete={canEditDelete}
        />
      )}

      {/* Modal crear/editar */}
      <NuevoComentarioModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setComentarioEditar(null)
        }}
        entidadTipo={comentarioEditar?.entidad_tipo}
        entidadId={comentarioEditar?.entidad_id}
        comentario={comentarioEditar}
      />

      {/* Modal confirmar eliminacion */}
      <ConfirmModal
        open={!!comentarioEliminar}
        onClose={() => setComentarioEliminar(null)}
        onConfirm={handleDelete}
        title="Eliminar Nota"
        description="Esta accion no se puede deshacer. Se eliminara permanentemente esta nota."
        confirmText="Eliminar"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
