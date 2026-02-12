import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pin, Pencil, Trash2, ChevronDown, Users, Building2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Card } from '@/components/ui'
import { ETIQUETA_CONFIG, PRIORIDAD_CONFIG, ESTADO_CONFIG, fechaRelativa, getIniciales, getAvatarColor } from './NotaCard'
import { useUpdateComentario } from '@/hooks/useComentarios'
import { useToast } from '@/components/ui/Toast'

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

function SortHeader({ field, currentSort, currentDirection, onSort, children, align = 'left' }) {
  const isActive = currentSort === field
  const Icon = isActive
    ? (currentDirection === 'asc' ? ArrowUp : ArrowDown)
    : ArrowUpDown

  return (
    <th
      className={`px-3 py-3 text-${align} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        <span>{children}</span>
        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
      </div>
    </th>
  )
}

export function NotasListView({ notas = [], onEdit, onDelete, onTogglePin, canModify, canEditDelete }) {
  const toast = useToast()
  const updateMutation = useUpdateComentario()
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [menuAbierto, setMenuAbierto] = useState(null)

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  // Ordenar notas
  const notasOrdenadas = [...notas].sort((a, b) => {
    // Fijadas siempre arriba
    if (a.fijado && !b.fijado) return -1
    if (!a.fijado && b.fijado) return 1

    let valA = a[sortBy]
    let valB = b[sortBy]

    if (sortBy === 'created_at') {
      valA = new Date(valA).getTime()
      valB = new Date(valB).getTime()
    } else if (typeof valA === 'string') {
      valA = valA?.toLowerCase() || ''
      valB = valB?.toLowerCase() || ''
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1
    if (valA > valB) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const handleCambiarEstado = async (nota, nuevoEstado) => {
    try {
      await updateMutation.mutateAsync({ id: nota.id, estado: nuevoEstado })
      setMenuAbierto(null)
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <SortHeader field="estado" currentSort={sortBy} currentDirection={sortDir} onSort={handleSort}>
                Estado
              </SortHeader>
              <SortHeader field="contenido" currentSort={sortBy} currentDirection={sortDir} onSort={handleSort}>
                Contenido
              </SortHeader>
              <SortHeader field="entidad_nombre" currentSort={sortBy} currentDirection={sortDir} onSort={handleSort}>
                Entidad
              </SortHeader>
              <SortHeader field="etiqueta" currentSort={sortBy} currentDirection={sortDir} onSort={handleSort}>
                Etiqueta
              </SortHeader>
              <SortHeader field="prioridad" currentSort={sortBy} currentDirection={sortDir} onSort={handleSort}>
                Prioridad
              </SortHeader>
              <SortHeader field="usuario_nombre" currentSort={sortBy} currentDirection={sortDir} onSort={handleSort}>
                Autor
              </SortHeader>
              <SortHeader field="created_at" currentSort={sortBy} currentDirection={sortDir} onSort={handleSort}>
                Fecha
              </SortHeader>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {notasOrdenadas.map(nota => {
              const estadoConf = ESTADO_CONFIG[nota.estado] || ESTADO_CONFIG.abierto
              const prioridadConf = PRIORIDAD_CONFIG[nota.prioridad] || PRIORIDAD_CONFIG.normal
              const etiquetaConf = nota.etiqueta ? ETIQUETA_CONFIG[nota.etiqueta] : null
              const entidadHref = getEntidadHref(nota.entidad_tipo, nota.entidad_id)
              const EntidadIcon = nota.entidad_tipo === 'comunidad' ? Building2 : Users

              return (
                <tr key={nota.id} className={`hover:bg-gray-50 ${nota.fijado ? 'bg-amber-50/50' : ''}`}>
                  {/* Estado */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${estadoConf.className}`}>
                      {estadoConf.label}
                    </span>
                  </td>

                  {/* Contenido */}
                  <td className="px-3 py-3 max-w-[300px]">
                    <div className="flex items-start gap-1.5">
                      {nota.fijado && <Pin className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />}
                      <p className="text-sm text-gray-700 truncate">{nota.contenido}</p>
                    </div>
                  </td>

                  {/* Entidad */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    {nota.entidad_nombre ? (
                      <div className="flex items-center gap-1.5">
                        <EntidadIcon className="w-3.5 h-3.5 text-gray-400" />
                        {entidadHref ? (
                          <Link to={entidadHref} className="text-sm text-primary-600 hover:text-primary-800 truncate max-w-[150px]">
                            {nota.entidad_nombre}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-600 truncate max-w-[150px]">{nota.entidad_nombre}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>

                  {/* Etiqueta */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    {etiquetaConf ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${etiquetaConf.className}`}>
                        {etiquetaConf.label}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>

                  {/* Prioridad */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${prioridadConf.className}`}>
                      {prioridadConf.label}
                    </span>
                  </td>

                  {/* Autor */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${getAvatarColor(nota.usuario_nombre)}`}>
                        {getIniciales(nota.usuario_nombre)}
                      </div>
                      <span className="text-sm text-gray-600 truncate max-w-[100px]">
                        {nota.usuario_nombre?.split(' ')[0]}
                      </span>
                    </div>
                  </td>

                  {/* Fecha */}
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                    {fechaRelativa(nota.created_at)}
                  </td>

                  {/* Acciones */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      {/* Cambio rapido de estado - disponible para todos */}
                      <div className="relative">
                        <button
                          onClick={() => setMenuAbierto(menuAbierto === nota.id ? null : nota.id)}
                          className="text-xs text-gray-500 hover:text-gray-700 px-1.5 py-1 rounded hover:bg-gray-100"
                          title="Cambiar estado"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        {menuAbierto === nota.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-20 min-w-[130px]">
                            {Object.entries(ESTADO_CONFIG).map(([key, conf]) => (
                              <button
                                key={key}
                                onClick={() => handleCambiarEstado(nota, key)}
                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${nota.estado === key ? 'font-medium' : ''}`}
                              >
                                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${conf.dotColor}`} />
                                {conf.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Editar y Eliminar - solo autor o admin */}
                      {(canEditDelete ? canEditDelete(nota) : canModify(nota)) && (
                        <>
                          <button
                            onClick={() => onEdit?.(nota)}
                            className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete?.(nota)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
