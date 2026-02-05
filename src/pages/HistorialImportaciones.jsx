import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Play, Download, Calendar, Folder, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, LoadingSpinner, Badge } from '@/components/ui'
import { useImportaciones, useEliminarImportacionCompleta } from '@/hooks/useLecturas'
import { useComunidades } from '@/hooks/useComunidades'
import { formatDateTime } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

const estadoBadges = {
  pendiente: { variant: 'default', label: 'Pendiente' },
  procesando: { variant: 'info', label: 'Procesando' },
  validado: { variant: 'warning', label: 'Por validar' },
  confirmado: { variant: 'success', label: 'Confirmado' },
  cancelado: { variant: 'danger', label: 'Cancelado' }
}

export default function HistorialImportaciones() {
  const navigate = useNavigate()
  const toast = useToast()
  const [comunidadId, setComunidadId] = useState('')

  const { data: comunidades } = useComunidades({ activa: true })
  const { data: importaciones, isLoading } = useImportaciones({
    comunidadId: comunidadId || undefined,
    limit: 50
  })
  const eliminarImportacion = useEliminarImportacionCompleta()

  const handleNuevaImportacion = () => {
    navigate('/lecturas/importar')
  }

  const handleVerDetalle = (importacion) => {
    if (importacion.estado === 'validado') {
      navigate(`/lecturas/validar/${importacion.id}`)
    }
    // Para otros estados, podríamos mostrar un modal de resumen
  }

  const handleEliminarImportacion = async (importacion) => {
    const confirmar = window.confirm(
      `¿Eliminar TODAS las lecturas de esta importación?\n\n` +
      `Importación: ${importacion.nombre_archivo}\n` +
      `Solo se eliminarán lecturas NO facturadas.`
    )

    if (!confirmar) return

    try {
      const result = await eliminarImportacion.mutateAsync(importacion.id)

      if (result.lecturas_no_eliminables > 0) {
        toast.success(
          `${result.lecturas_eliminadas} lecturas eliminadas. ` +
          `${result.lecturas_no_eliminables} no se pudieron eliminar (facturadas)`
        )
      } else {
        toast.success(`${result.lecturas_eliminadas} lecturas eliminadas correctamente`)
      }
    } catch (error) {
      toast.error(`Error al eliminar importación: ${error.message}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial de Importaciones</h1>
          <p className="text-gray-500 mt-1">
            Revisa las importaciones de lecturas realizadas
          </p>
        </div>
        <Button onClick={handleNuevaImportacion}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Importación
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-gray-400" />
            <select
              value={comunidadId}
              onChange={(e) => setComunidadId(e.target.value)}
              className="rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Todas las comunidades</option>
              {comunidades?.map(c => (
                <option key={c.id} value={c.id}>
                  {c.codigo} - {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : !importaciones || importaciones.length === 0 ? (
        <EmptyState
          title="No hay importaciones"
          description="Comienza importando un archivo Excel con lecturas de contadores"
          action={
            <Button onClick={handleNuevaImportacion}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Importación
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha / Comunidad
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Archivo
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Filas
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Estado
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24 sticky right-0 bg-gray-50">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {importaciones.map((imp) => {
                  const estadoConfig = estadoBadges[imp.estado] || estadoBadges.pendiente

                  return (
                    <tr key={imp.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-xs text-gray-900">
                              {formatDateTime(imp.fecha_subida)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 ml-5">
                            <span className="text-xs font-medium text-gray-700">
                              {imp.comunidad_codigo}
                            </span>
                            <span className="text-xs text-gray-500 truncate max-w-[150px]">
                              {imp.comunidad_nombre}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className="text-xs text-gray-900 truncate block max-w-[200px]"
                          title={imp.nombre_archivo}
                        >
                          {imp.nombre_archivo}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="text-xs">
                          <span className="font-medium text-gray-900 block">{imp.total_filas}</span>
                          {imp.estado !== 'pendiente' && (
                            <div className="text-[10px] text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                              <span className="text-green-600">{imp.filas_validas}✓</span>
                              {imp.filas_con_alertas > 0 && (
                                <span className="text-amber-600">{imp.filas_con_alertas}⚠</span>
                              )}
                              {imp.filas_error > 0 && (
                                <span className="text-red-600">{imp.filas_error}✗</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant={estadoConfig.variant} className="text-[10px] px-2 py-0.5">
                          {estadoConfig.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right sticky right-0 bg-white">
                        <div className="flex items-center justify-end gap-1">
                          {imp.estado === 'validado' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerDetalle(imp)}
                              className="text-xs px-2 py-1"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Continuar
                            </Button>
                          )}
                          {imp.estado === 'confirmado' && (
                            <>
                              <button
                                onClick={() => handleVerDetalle(imp)}
                                title="Ver detalles"
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEliminarImportacion(imp)}
                                disabled={eliminarImportacion.isPending}
                                title="Eliminar lecturas (solo no facturadas)"
                                className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
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
      )}

      {/* Leyenda */}
      <Card className="p-4 bg-gray-50">
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <Badge variant="default" className="text-xs">Pendiente</Badge>
            Archivo subido
          </span>
          <span className="flex items-center gap-1">
            <Badge variant="warning" className="text-xs">Por validar</Badge>
            Listo para revisar
          </span>
          <span className="flex items-center gap-1">
            <Badge variant="success" className="text-xs">Confirmado</Badge>
            Lecturas guardadas
          </span>
          <span className="flex items-center gap-1">
            <Badge variant="danger" className="text-xs">Cancelado</Badge>
            Importación cancelada
          </span>
        </div>
      </Card>
    </div>
  )
}




