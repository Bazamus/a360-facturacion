import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { useCitas, useUsuarios, useActualizarCita } from '@/hooks'
import { Button, Select, LoadingSpinner } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { Calendar as CalendarIcon, Plus, AlertTriangle } from 'lucide-react'
import { CitaFormModal } from '@/features/sat/CitaFormModal'
import { CitaEditModal } from '@/features/sat/CitaEditModal'
import { supabase } from '@/lib/supabase'

const DnDCalendar = withDragAndDrop(BigCalendar)

const locales = { es }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: es }),
  getDay,
  locales,
})

const messages = {
  allDay: 'Todo el día',
  previous: 'Anterior',
  next: 'Siguiente',
  today: 'Hoy',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'No hay citas en este rango',
  showMore: (total) => `+${total} más`,
}

const TIPO_COLORS = {
  correctiva: '#3b82f6',
  preventiva: '#10b981',
  instalacion: '#8b5cf6',
  inspeccion: '#f59e0b',
  urgencia: '#ef4444',
}

async function checkConflicto(tecnicoId, fechaHora, duracion, excluirCitaId = null) {
  if (!tecnicoId) return null
  const { data } = await supabase.rpc('verificar_conflicto_cita', {
    p_tecnico_id: tecnicoId,
    p_fecha_hora: fechaHora.toISOString(),
    p_duracion_minutos: duracion || 60,
    p_excluir_cita_id: excluirCitaId,
  })
  if (data && data[0]?.tiene_conflicto) return data[0]
  return null
}

export function CalendarioPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('month')
  const [filtroTecnico, setFiltroTecnico] = useState('')
  const [showCitaModal, setShowCitaModal] = useState(false)
  const [slotSelection, setSlotSelection] = useState({ start: null, end: null })
  const [conflictoWarning, setConflictoWarning] = useState(null)
  const [citaEditar, setCitaEditar] = useState(null)

  const actualizarCita = useActualizarCita()

  const fechaInicio = useMemo(() => {
    const start = startOfMonth(subMonths(currentDate, 1))
    return start.toISOString()
  }, [currentDate])

  const fechaFin = useMemo(() => {
    const end = endOfMonth(addMonths(currentDate, 1))
    return end.toISOString()
  }, [currentDate])

  const { data: citas, isLoading } = useCitas({
    tecnicoId: filtroTecnico || undefined,
    fechaInicio,
    fechaFin,
  })

  const { data: usuarios } = useUsuarios()
  const tecnicos = usuarios?.filter((u) => u.rol === 'tecnico' || u.rol === 'encargado') ?? []

  const events = useMemo(() => {
    if (!citas) return []
    return citas.map((cita) => ({
      id: cita.cita_id,
      title: cita.intervencion_titulo || cita.motivo || 'Cita',
      start: new Date(cita.fecha_hora),
      end: cita.fecha_hora_fin
        ? new Date(cita.fecha_hora_fin)
        : new Date(new Date(cita.fecha_hora).getTime() + (cita.duracion_minutos || 60) * 60000),
      resource: cita,
    }))
  }, [citas])

  const handleSelectEvent = useCallback((event) => {
    setCitaEditar(event.resource)
  }, [])

  const handleSelectSlot = useCallback(({ start, end }) => {
    setSlotSelection({ start, end })
    setShowCitaModal(true)
  }, [])

  // Drag-and-drop: mover evento a nueva fecha/hora
  const handleEventDrop = useCallback(async ({ event, start, end }) => {
    const cita = event.resource
    const duracion = cita.duracion_minutos || Math.round((end - start) / 60000)

    // Verificar conflictos antes de guardar
    const conflicto = await checkConflicto(cita.tecnico_id, start, duracion, event.id)
    if (conflicto) {
      setConflictoWarning({
        mensaje: `Conflicto: el técnico ya tiene una cita programada a esa hora.`,
        cita: conflicto,
      })
      setTimeout(() => setConflictoWarning(null), 5000)
      return
    }

    try {
      await actualizarCita.mutateAsync({
        id: event.id,
        fecha_hora: start.toISOString(),
        duracion_minutos: duracion,
      })
      toast.success('Cita reprogramada')
    } catch (err) {
      toast.error(`Error al reprogramar: ${err.message}`)
    }
  }, [actualizarCita, toast])

  // Redimensionar evento (cambiar duración)
  const handleEventResize = useCallback(async ({ event, start, end }) => {
    try {
      const duracion = Math.round((end - start) / 60000)
      await actualizarCita.mutateAsync({
        id: event.id,
        fecha_hora: start.toISOString(),
        duracion_minutos: duracion,
      })
      toast.success('Duración actualizada')
    } catch (err) {
      toast.error(`Error: ${err.message}`)
    }
  }, [actualizarCita, toast])

  const eventStyleGetter = useCallback((event) => {
    const cita = event.resource
    const tipo = cita.intervencion_tipo || 'correctiva'
    const color = TIPO_COLORS[tipo] || '#6b7280'
    const isCancelled = cita.cita_estado === 'cancelada'

    return {
      style: {
        backgroundColor: isCancelled ? '#d1d5db' : color,
        borderRadius: '4px',
        opacity: isCancelled ? 0.5 : 1,
        color: '#fff',
        border: 'none',
        fontSize: '12px',
        padding: '2px 6px',
      },
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary-600" />
            Calendario
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Agenda de citas — arrastra para reprogramar, estira para cambiar duración
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={filtroTecnico}
            onChange={(e) => setFiltroTecnico(e.target.value)}
            className="w-48"
          >
            <option value="">Todos los técnicos</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre_completo}</option>
            ))}
          </Select>
          <Button onClick={() => { setSlotSelection({ start: new Date(), end: null }); setShowCitaModal(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cita
          </Button>
        </div>
      </div>

      {/* Aviso de conflicto */}
      {conflictoWarning && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span>{conflictoWarning.mensaje}</span>
          <button onClick={() => setConflictoWarning(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Leyenda */}
      <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
        {Object.entries(TIPO_COLORS).map(([tipo, color]) => (
          <div key={tipo} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            <span className="capitalize">{tipo}</span>
          </div>
        ))}
      </div>

      {/* Calendario */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div style={{ height: 650 }}>
            <DnDCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              date={currentDate}
              onNavigate={setCurrentDate}
              view={view}
              onView={setView}
              views={['month', 'week', 'day', 'agenda']}
              messages={messages}
              culture="es"
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              eventPropGetter={eventStyleGetter}
              popup
              selectable
              resizable
              style={{ height: '100%' }}
              draggableAccessor={() => true}
            />
          </div>
        )}
      </div>

      {/* Modal nueva cita */}
      <CitaFormModal
        open={showCitaModal}
        onClose={() => setShowCitaModal(false)}
        defaultDate={slotSelection.start}
        defaultEndDate={slotSelection.end}
      />

      {/* Modal editar cita */}
      <CitaEditModal
        open={!!citaEditar}
        onClose={() => setCitaEditar(null)}
        cita={citaEditar}
      />
    </div>
  )
}
