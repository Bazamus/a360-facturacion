import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Play, Download, Calendar, Folder } from 'lucide-react'
import { Button, Card, EmptyState, LoadingSpinner, Badge } from '@/components/ui'
import { useImportaciones } from '@/hooks/useLecturas'
import { useComunidades } from '@/hooks/useComunidades'
import { formatDateTime } from '@/lib/utils'

const estadoBadges = {
  pendiente: { variant: 'default', label: 'Pendiente' },
  procesando: { variant: 'info', label: 'Procesando' },
  validado: { variant: 'warning', label: 'Por validar' },
  confirmado: { variant: 'success', label: 'Confirmado' },
  cancelado: { variant: 'danger', label: 'Cancelado' }
}

export default function HistorialImportaciones() {
  const navigate = useNavigate()
  const [comunidadId, setComunidadId] = useState('')

  const { data: comunidades } = useComunidades({ activa: true })
  const { data: importaciones, isLoading } = useImportaciones({ 
    comunidadId: comunidadId || undefined,
    limit: 50 
  })

  const handleNuevaImportacion = () => {
    navigate('/lecturas/importar')
  }

  const handleVerDetalle = (importacion) => {
    if (importacion.estado === 'validado') {
      navigate(`/lecturas/validar/${importacion.id}`)
    }
    // Para otros estados, podríamos mostrar un modal de resumen
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comunidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Archivo
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filas
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {importaciones.map((imp) => {
                  const estadoConfig = estadoBadges[imp.estado] || estadoBadges.pendiente
                  
                  return (
                    <tr key={imp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {formatDateTime(imp.fecha_subida)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {imp.comunidad_nombre}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            {imp.comunidad_codigo}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900 truncate max-w-xs block">
                          {imp.nombre_archivo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">{imp.total_filas}</span>
                          {imp.estado !== 'pendiente' && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              <span className="text-green-600">{imp.filas_validas} ✓</span>
                              {imp.filas_con_alertas > 0 && (
                                <span className="text-amber-600 ml-1">{imp.filas_con_alertas} ⚠</span>
                              )}
                              {imp.filas_error > 0 && (
                                <span className="text-red-600 ml-1">{imp.filas_error} ✗</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={estadoConfig.variant}>
                          {estadoConfig.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {imp.estado === 'validado' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerDetalle(imp)}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Continuar
                            </Button>
                          )}
                          {imp.estado === 'confirmado' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleVerDetalle(imp)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
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

