import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pin, PinOff, Pencil, Trash2, MoreVertical, Users, Building2, Gauge, FileText } from 'lucide-react'

// Configuraciones compartidas
export const ETIQUETA_CONFIG = {
  moroso: { label: 'Moroso', className: 'bg-red-100 text-red-700 border-red-200' },
  error_lectura: { label: 'Error Lectura', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  revision: { label: 'Revision', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  incidencia: { label: 'Incidencia', className: 'bg-red-100 text-red-700 border-red-200' },
  informativo: { label: 'Informativo', className: 'bg-blue-100 text-blue-700 border-blue-200' }
}

export const PRIORIDAD_CONFIG = {
  baja: { label: 'Baja', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  normal: { label: 'Normal', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  urgente: { label: 'Urgente', className: 'bg-red-100 text-red-700 border-red-200' }
}

export const ESTADO_CONFIG = {
  abierto: { label: 'Abierto', className: 'bg-yellow-100 text-yellow-700 border-yellow-200', dotColor: 'bg-yellow-400' },
  en_progreso: { label: 'En Progreso', className: 'bg-blue-100 text-blue-700 border-blue-200', dotColor: 'bg-blue-400' },
  resuelto: { label: 'Resuelto', className: 'bg-green-100 text-green-700 border-green-200', dotColor: 'bg-green-400' }
}

// Icono segun tipo de entidad
const ENTIDAD_ICONS = {
  cliente: Users,
  comunidad: Building2,
  contador: Gauge,
  factura: FileText
}

const ENTIDAD_LABELS = {
  cliente: 'Cliente',
  comunidad: 'Comunidad',
  contador: 'Contador',
  factura: 'Factura'
}

// Enlace a la entidad
function getEntidadHref(tipo, id) {
  switch (tipo) {
    case 'cliente': return `/clientes/${id}`
    case 'comunidad': return `/comunidades/${id}`
    case 'contador': return `/contadores/${id}`
    case 'factura': return `/facturacion/facturas/${id}`
    default: return null
  }
}

// Fecha relativa
export function fechaRelativa(fecha) {
  const ahora = new Date()
  const date = new Date(fecha)
  const diffMs = ahora - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffHoras = Math.floor(diffMs / 3600000)
  const diffDias = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Ahora'
  if (diffMin < 60) return `${diffMin}m`
  if (diffHoras < 24) return `${diffHoras}h`
  if (diffDias === 1) return 'Ayer'
  if (diffDias < 7) return `${diffDias}d`

  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
}

// Iniciales
export function getIniciales(nombre) {
  if (!nombre) return '?'
  return nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

// Color avatar
export function getAvatarColor(nombre) {
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

export function NotaCard({
  nota,
  onEdit,
  onDelete,
  onTogglePin,
  canModify = false,
  draggable = false
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const etiquetaConf = nota.etiqueta ? ETIQUETA_CONFIG[nota.etiqueta] : null
  const prioridadConf = PRIORIDAD_CONFIG[nota.prioridad] || PRIORIDAD_CONFIG.normal
  const EntidadIcon = ENTIDAD_ICONS[nota.entidad_tipo] || FileText
  const entidadHref = getEntidadHref(nota.entidad_tipo, nota.entidad_id)

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', nota.id)
        e.dataTransfer.effectAllowed = 'move'
        e.currentTarget.style.opacity = '0.5'
      }}
      onDragEnd={(e) => {
        e.currentTarget.style.opacity = '1'
      }}
      className={`rounded-lg border p-3 transition-shadow hover:shadow-md cursor-default ${
        nota.fijado
          ? 'bg-amber-50 border-amber-200'
          : nota.prioridad === 'urgente'
            ? 'bg-white border-red-200 border-l-4 border-l-red-400'
            : 'bg-white border-gray-200'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {/* Top: etiqueta + prioridad + menu */}
      <div className="flex items-start justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {nota.fijado && (
            <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />
          )}
          {etiquetaConf && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${etiquetaConf.className}`}>
              {etiquetaConf.label}
            </span>
          )}
          {nota.prioridad === 'urgente' && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${prioridadConf.className}`}>
              Urgente
            </span>
          )}
        </div>

        {canModify && (
          <div className="relative flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-30 min-w-[130px]">
                <button
                  onClick={() => { onEdit?.(nota); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
                >
                  <Pencil className="w-3 h-3" /> Editar
                </button>
                <button
                  onClick={() => { onTogglePin?.(nota); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
                >
                  {nota.fijado ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                  {nota.fijado ? 'Desfijar' : 'Fijar'}
                </button>
                <button
                  onClick={() => { onDelete?.(nota); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-red-600 flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" /> Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contenido */}
      <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed mb-2">
        {nota.contenido}
      </p>

      {/* Entidad asociada */}
      {nota.entidad_nombre && (
        <div className="flex items-center gap-1.5 mb-2">
          <EntidadIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          {entidadHref ? (
            <Link
              to={entidadHref}
              className="text-xs text-primary-600 hover:text-primary-800 truncate font-medium"
              title={nota.entidad_nombre}
            >
              {nota.entidad_nombre}
            </Link>
          ) : (
            <span className="text-xs text-gray-500 truncate">{nota.entidad_nombre}</span>
          )}
          {nota.entidad_codigo && (
            <span className="text-[10px] text-gray-400">({nota.entidad_codigo})</span>
          )}
        </div>
      )}

      {/* Footer: avatar + autor + fecha */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold ${getAvatarColor(nota.usuario_nombre)}`}>
            {getIniciales(nota.usuario_nombre)}
          </div>
          <span className="text-[11px] text-gray-500 truncate max-w-[100px]">
            {nota.usuario_nombre?.split(' ')[0] || nota.usuario_email}
          </span>
        </div>
        <span className="text-[10px] text-gray-400">
          {fechaRelativa(nota.created_at)}
        </span>
      </div>
    </div>
  )
}
