import { useState } from 'react'
import { Save, Star, Copy, Trash2, FolderOpen } from 'lucide-react'
import { Button, Modal, Input } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import {
  useConfiguracionesPorTipo,
  useGuardarConfiguracion,
  useEliminarConfiguracion,
  useToggleFavorito,
  useDuplicarConfiguracion
} from '@/hooks'

export function ConfiguracionReporte({ 
  tipoReporte, 
  filtrosActuales,
  onCargar
}) {
  const { showToast } = useToast()
  const [modalGuardar, setModalGuardar] = useState(false)
  const [modalCargar, setModalCargar] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const { data: configuraciones = [] } = useConfiguracionesPorTipo(tipoReporte)
  const guardar = useGuardarConfiguracion()
  const eliminar = useEliminarConfiguracion()
  const toggleFavorito = useToggleFavorito()
  const duplicar = useDuplicarConfiguracion()

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      showToast('Ingresa un nombre para la configuración', 'error')
      return
    }

    try {
      await guardar.mutateAsync({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        tipo_reporte: tipoReporte,
        filtros: filtrosActuales
      })
      
      showToast('Configuración guardada correctamente', 'success')
      setModalGuardar(false)
      setNombre('')
      setDescripcion('')
    } catch (error) {
      showToast('Error al guardar: ' + error.message, 'error')
    }
  }

  const handleCargar = (config) => {
    if (onCargar) {
      onCargar(config.filtros)
      setModalCargar(false)
      showToast(`Configuración "${config.nombre}" cargada`, 'success')
    }
  }

  const handleEliminar = async (id, nombreConfig) => {
    if (!confirm(`¿Eliminar la configuración "${nombreConfig}"?`)) return

    try {
      await eliminar.mutateAsync(id)
      showToast('Configuración eliminada', 'success')
    } catch (error) {
      showToast('Error al eliminar: ' + error.message, 'error')
    }
  }

  const handleToggleFavorito = async (id, esFavorito) => {
    try {
      await toggleFavorito.mutateAsync({ id, esFavorito: !esFavorito })
      showToast(
        !esFavorito ? 'Marcado como favorito' : 'Desmarcado como favorito',
        'success'
      )
    } catch (error) {
      showToast('Error al actualizar: ' + error.message, 'error')
    }
  }

  const handleDuplicar = async (id, nombreOriginal) => {
    const nuevoNombre = prompt('Nombre de la nueva configuración:', `${nombreOriginal} (copia)`)
    if (!nuevoNombre) return

    try {
      await duplicar.mutateAsync({ id, nuevoNombre })
      showToast('Configuración duplicada', 'success')
    } catch (error) {
      showToast('Error al duplicar: ' + error.message, 'error')
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Botón guardar */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setModalGuardar(true)}
        className="gap-1"
      >
        <Save className="w-4 h-4" />
        Guardar
      </Button>

      {/* Botón cargar */}
      {configuraciones.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setModalCargar(true)}
          className="gap-1"
        >
          <FolderOpen className="w-4 h-4" />
          Cargar ({configuraciones.length})
        </Button>
      )}

      {/* Modal para guardar */}
      <Modal
        open={modalGuardar}
        onClose={() => setModalGuardar(false)}
        title="Guardar Configuración"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Reporte mensual comunidad Troya"
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción (opcional)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe esta configuración..."
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setModalGuardar(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleGuardar}
              disabled={guardar.isPending}
            >
              {guardar.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal para cargar */}
      <Modal
        open={modalCargar}
        onClose={() => setModalCargar(false)}
        title="Cargar Configuración"
        size="lg"
      >
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {configuraciones.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No hay configuraciones guardadas para este tipo de reporte
            </p>
          ) : (
            configuraciones.map((config) => (
              <div
                key={config.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{config.nombre}</h4>
                      {config.es_favorito && (
                        <Star className="w-4 h-4 text-amber-500 fill-current" />
                      )}
                    </div>
                    {config.descripcion && (
                      <p className="text-sm text-gray-500 mt-1">{config.descripcion}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>
                        Creado: {new Date(config.created_at).toLocaleDateString('es-ES')}
                      </span>
                      {config.formato_exportacion && (
                        <span>Formato: {config.formato_exportacion.toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={() => handleToggleFavorito(config.id, config.es_favorito)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title={config.es_favorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
                    >
                      <Star className={`w-4 h-4 ${
                        config.es_favorito ? 'text-amber-500 fill-current' : 'text-gray-400'
                      }`} />
                    </button>
                    <button
                      onClick={() => handleDuplicar(config.id, config.nombre)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title="Duplicar"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleEliminar(config.id, config.nombre)}
                      className="p-1.5 hover:bg-red-100 rounded transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                    <Button
                      size="sm"
                      onClick={() => handleCargar(config)}
                      className="ml-2"
                    >
                      Cargar
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}
