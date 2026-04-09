import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActualizarIntervencion, useGenerarParteTrabajo, useMaterialesIntervencion } from '@/hooks'
import { useToast } from '@/components/ui/Toast'
import { Badge } from '@/components/ui'
import { canTransition } from '@/constants/stateMachine'
import {
  Truck, Play, CheckCircle, Phone, MapPin, ChevronRight,
  Camera, FileText, ExternalLink, Clock,
} from 'lucide-react'

const PRIORIDAD_VARIANTS = { urgente: 'danger', alta: 'warning', normal: 'default', baja: 'info' }
const TIPO_LABELS = { correctiva: 'Correctiva', preventiva: 'Preventiva', instalacion: 'Instalación', inspeccion: 'Inspección', urgencia: 'Urgencia' }

function formatHora(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Card de acción rápida para técnicos en campo.
 * Muestra la información esencial y botones de cambio de estado con un toque.
 */
export function IntervencionQuickCard({ intervencion, citaHora }) {
  const navigate = useNavigate()
  const toast = useToast()
  const actualizar = useActualizarIntervencion()
  const generarParte = useGenerarParteTrabajo()
  const { data: materiales = [] } = useMaterialesIntervencion(intervencion.id)
  const fileInputRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)

  const estado = intervencion.estado

  const cambiarEstado = async (nuevoEstado) => {
    if (!canTransition(estado, nuevoEstado)) return
    setIsLoading(true)
    try {
      const updates = { estado: nuevoEstado }
      if (nuevoEstado === 'en_curso' && !intervencion.fecha_inicio) {
        updates.fecha_inicio = new Date().toISOString()
      }
      if (nuevoEstado === 'en_camino' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            await actualizar.mutateAsync({
              id: intervencion.id,
              estado: nuevoEstado,
              ubicacion_tecnico_lat: pos.coords.latitude,
              ubicacion_tecnico_lng: pos.coords.longitude,
              ubicacion_tecnico_timestamp: new Date().toISOString(),
            })
            toast.success('En camino — ubicación registrada')
            setIsLoading(false)
          },
          async () => {
            await actualizar.mutateAsync({ id: intervencion.id, ...updates })
            setIsLoading(false)
          },
        )
        return
      }
      await actualizar.mutateAsync({ id: intervencion.id, ...updates })
      toast.success(`Estado actualizado`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFotoCaptura = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Navegar al detalle en tab fotos para subir
    navigate(`/sat/intervenciones/${intervencion.id}?tab=fotos`)
  }

  const handleGenerarParte = async () => {
    setIsLoading(true)
    try {
      await generarParte.mutateAsync({ intervencion, materiales })
      toast.success('Parte de trabajo generado')
    } catch (err) {
      toast.error(`Error: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Botón de acción principal según estado
  const renderBotonPrincipal = () => {
    if (estado === 'asignada' || estado === 'programada') {
      return (
        <button
          onClick={() => cambiarEstado('en_camino')}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl font-semibold text-sm active:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Truck className="h-4 w-4" />
          En Camino
        </button>
      )
    }
    if (estado === 'en_camino') {
      return (
        <button
          onClick={() => cambiarEstado('en_curso')}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-xl font-semibold text-sm active:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Play className="h-4 w-4" />
          Iniciar Trabajo
        </button>
      )
    }
    if (estado === 'en_curso') {
      return (
        <button
          onClick={() => navigate(`/sat/intervenciones/${intervencion.id}`)}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white rounded-xl font-semibold text-sm active:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <CheckCircle className="h-4 w-4" />
          Completar
        </button>
      )
    }
    if (estado === 'completada' && !intervencion.parte_trabajo_url) {
      return (
        <button
          onClick={handleGenerarParte}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gray-700 text-white rounded-xl font-semibold text-sm active:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          <FileText className="h-4 w-4" />
          Generar Parte
        </button>
      )
    }
    return null
  }

  const clienteNombre = intervencion.cliente_nombre_completo ||
    (intervencion.cliente ? `${intervencion.cliente.nombre} ${intervencion.cliente.apellidos || ''}`.trim() : '-')

  const estadoColor = {
    pendiente: 'bg-yellow-100 text-yellow-800',
    asignada: 'bg-blue-100 text-blue-800',
    programada: 'bg-blue-100 text-blue-800',
    en_camino: 'bg-indigo-100 text-indigo-800',
    en_curso: 'bg-purple-100 text-purple-800',
    completada: 'bg-green-100 text-green-800',
    facturada: 'bg-gray-100 text-gray-700',
    cancelada: 'bg-gray-100 text-gray-500',
  }[estado] || 'bg-gray-100 text-gray-700'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Cabecera coloreada por prioridad */}
      <div className={`px-4 py-2 flex items-center justify-between ${
        intervencion.prioridad === 'urgente' ? 'bg-red-500 text-white' :
        intervencion.prioridad === 'alta' ? 'bg-orange-400 text-white' :
        'bg-gray-100 text-gray-700'
      }`}>
        <div className="flex items-center gap-2 text-sm font-medium">
          {citaHora && (
            <>
              <Clock className="h-3.5 w-3.5" />
              <span>{citaHora}</span>
              <span className="opacity-50">·</span>
            </>
          )}
          <span>{TIPO_LABELS[intervencion.tipo] || intervencion.tipo}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoColor}`}>
          {estado?.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Cuerpo */}
      <div className="px-4 pt-3 pb-2">
        <p className="font-semibold text-gray-900 text-sm leading-snug mb-1">
          {intervencion.titulo}
        </p>
        <p className="text-xs text-gray-400 font-mono mb-3">{intervencion.numero_parte}</p>

        {/* Cliente */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="font-medium">{clienteNombre}</span>
          </div>
          {intervencion.cliente_telefono && (
            <a
              href={`tel:${intervencion.cliente_telefono}`}
              className="flex items-center gap-2 text-sm text-blue-600"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-3.5 w-3.5" />
              {intervencion.cliente_telefono}
            </a>
          )}
          {(intervencion.direccion || intervencion.comunidad_nombre) && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(
                [intervencion.direccion, intervencion.codigo_postal, intervencion.ciudad].filter(Boolean).join(', ')
                || intervencion.comunidad_nombre || ''
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-600"
              onClick={(e) => e.stopPropagation()}
            >
              <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">
                {[intervencion.direccion, intervencion.ciudad].filter(Boolean).join(', ') || intervencion.comunidad_nombre}
              </span>
            </a>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="px-4 pb-4 flex items-center gap-2">
        {renderBotonPrincipal()}

        {/* Cámara rápida */}
        {['en_camino', 'en_curso'].includes(estado) && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFotoCaptura}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-gray-100 text-gray-700 rounded-xl active:bg-gray-200 transition-colors"
              title="Hacer foto"
            >
              <Camera className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Parte PDF si existe */}
        {intervencion.parte_trabajo_url && (
          <a
            href={intervencion.parte_trabajo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-green-50 text-green-700 rounded-xl active:bg-green-100 transition-colors"
            title="Ver parte"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}

        {/* Ir al detalle */}
        <button
          onClick={() => navigate(`/sat/intervenciones/${intervencion.id}`)}
          className="p-3 bg-gray-100 text-gray-600 rounded-xl active:bg-gray-200 transition-colors"
          title="Ver detalle"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
