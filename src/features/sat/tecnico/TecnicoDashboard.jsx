import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useCitas, useIntervenciones } from '@/hooks'
import { LoadingSpinner } from '@/components/ui'
import { IntervencionQuickCard } from './IntervencionQuickCard'
import { TecnicoBottomNav } from './TecnicoBottomNav'
import {
  CalendarDays, ClipboardList, Wrench, RefreshCw,
  CheckCircle, AlertTriangle,
} from 'lucide-react'

function formatFechaHoy() {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function isSameDay(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const hoy = new Date()
  return d.getDate() === hoy.getDate() &&
    d.getMonth() === hoy.getMonth() &&
    d.getFullYear() === hoy.getFullYear()
}

function formatHora(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Dashboard mobile-first para técnicos de campo.
 * Muestra la agenda del día ordenada por hora con acciones rápidas.
 */
export function TecnicoDashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('hoy') // 'hoy' | 'activas' | 'proximas'

  const hoyInicio = new Date()
  hoyInicio.setHours(0, 0, 0, 0)
  const hoyFin = new Date()
  hoyFin.setHours(23, 59, 59, 999)

  const mananaInicio = new Date(hoyInicio)
  mananaInicio.setDate(mananaInicio.getDate() + 1)
  const mananaFin = new Date(mananaInicio)
  mananaFin.setHours(23, 59, 59, 999)
  const semanaFin = new Date(hoyInicio)
  semanaFin.setDate(semanaFin.getDate() + 7)

  // Citas de hoy del técnico
  const { data: citasHoy = [], isLoading: loadingCitas, refetch } = useCitas({
    tecnicoId: user?.id,
    fechaInicio: hoyInicio.toISOString(),
    fechaFin: hoyFin.toISOString(),
  })

  // Intervenciones activas (en_camino / en_curso) del técnico
  const { data: enCursoData } = useIntervenciones({
    tecnicoId: user?.id,
    estado: 'en_curso',
    pageSize: 10,
  })
  const { data: enCaminoData } = useIntervenciones({
    tecnicoId: user?.id,
    estado: 'en_camino',
    pageSize: 10,
  })
  // Intervenciones pendientes/asignadas del técnico
  const { data: asignadasData } = useIntervenciones({
    tecnicoId: user?.id,
    estado: 'asignada',
    pageSize: 20,
  })

  const enCurso = enCursoData?.data ?? []
  const enCamino = enCaminoData?.data ?? []
  const asignadas = asignadasData?.data ?? []
  const activas = [...enCurso, ...enCamino]

  // Construir lista de intervenciones de hoy a partir de citas
  const intervencionesHoy = citasHoy
    .filter((c) => c.intervencion_id)
    .map((cita) => ({
      id: cita.intervencion_id,
      numero_parte: cita.numero_parte,
      titulo: cita.intervencion_titulo || cita.titulo || 'Sin título',
      tipo: cita.intervencion_tipo || cita.tipo,
      prioridad: cita.prioridad,
      estado: cita.intervencion_estado || cita.estado,
      cliente_nombre_completo: cita.cliente_nombre,
      cliente_telefono: cita.cliente_telefono,
      direccion: cita.direccion,
      comunidad_nombre: cita.comunidad_nombre,
      parte_trabajo_url: cita.parte_trabajo_url,
      _citaHora: formatHora(cita.fecha_hora),
    }))
    .sort((a, b) => {
      const ta = a._citaHora || '00:00'
      const tb = b._citaHora || '00:00'
      return ta.localeCompare(tb)
    })

  // KPIs rápidos
  const kpis = [
    { label: 'Hoy', value: intervencionesHoy.length, icon: CalendarDays, color: 'text-blue-600 bg-blue-50' },
    { label: 'Activas', value: activas.length, icon: Wrench, color: 'text-purple-600 bg-purple-50' },
    { label: 'Pendientes', value: asignadas.length, icon: ClipboardList, color: 'text-orange-600 bg-orange-50' },
  ]

  const saludo = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 20) return 'Buenas tardes'
    return 'Buenas noches'
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-safe-top pt-4 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 capitalize">{formatFechaHoy()}</p>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              {saludo()}, {profile?.nombre_completo?.split(' ')[0] || 'Técnico'}
            </h1>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-gray-100 text-gray-600 active:bg-gray-200"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {kpis.map((k) => (
            <div key={k.label} className={`rounded-xl p-2.5 flex flex-col items-center ${k.color.split(' ')[1]}`}>
              <k.icon className={`h-4 w-4 mb-1 ${k.color.split(' ')[0]}`} />
              <span className={`text-xl font-bold ${k.color.split(' ')[0]}`}>{k.value}</span>
              <span className="text-xs text-gray-500">{k.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-4 flex gap-2">
        {[
          { key: 'hoy', label: 'Hoy', count: intervencionesHoy.length },
          { key: 'activas', label: 'Activas', count: activas.length },
          { key: 'pendientes', label: 'Pendientes', count: asignadas.length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1 text-xs ${tab === t.key ? 'opacity-80' : 'text-gray-400'}`}>
                ({t.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="px-4 mt-4 space-y-3">
        {loadingCitas && tab === 'hoy' && (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {/* Intervenciones en curso (alerta siempre visible) */}
        {activas.length > 0 && tab !== 'activas' && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                {activas.length} intervención{activas.length > 1 ? 'es' : ''} activa{activas.length > 1 ? 's' : ''}
              </span>
            </div>
            <button onClick={() => setTab('activas')} className="text-xs text-purple-600 font-medium">
              Ver
            </button>
          </div>
        )}

        {tab === 'hoy' && !loadingCitas && (
          intervencionesHoy.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Sin citas hoy"
              description="No tienes intervenciones programadas para hoy."
            />
          ) : (
            intervencionesHoy.map((inv) => (
              <IntervencionQuickCard
                key={inv.id}
                intervencion={inv}
                citaHora={inv._citaHora}
              />
            ))
          )
        )}

        {tab === 'activas' && (
          activas.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="Todo al día"
              description="No hay intervenciones en curso ni en camino."
            />
          ) : (
            activas.map((inv) => (
              <IntervencionQuickCard key={inv.id} intervencion={inv} />
            ))
          )
        )}

        {tab === 'pendientes' && (
          asignadas.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="Sin pendientes"
              description="No tienes intervenciones asignadas pendientes."
            />
          ) : (
            asignadas.map((inv) => (
              <IntervencionQuickCard key={inv.id} intervencion={inv} />
            ))
          )
        )}
      </div>

      {/* Navegación inferior fija */}
      <TecnicoBottomNav />
    </div>
  )
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-gray-700 font-medium mb-1">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  )
}
