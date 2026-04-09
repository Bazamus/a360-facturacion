import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActualizarCita, useCancelarCita } from '@/hooks'
import { Button, Modal, Input, Select, Textarea } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { ExternalLink, User, Calendar, Clock, MapPin } from 'lucide-react'

const ESTADO_OPTIONS = [
  { value: 'programada', label: 'Programada' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'no_show', label: 'No presentado' },
]

function formatDateTimeLocal(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function CitaEditModal({ open, onClose, cita }) {
  const navigate = useNavigate()
  const actualizar = useActualizarCita()
  const cancelar = useCancelarCita()
  const toast = useToast()

  const [form, setForm] = useState({
    fecha_hora: '',
    duracion_minutos: 60,
    direccion: '',
    notas: '',
    estado: 'programada',
  })

  useEffect(() => {
    if (!open || !cita) return
    setForm({
      fecha_hora: formatDateTimeLocal(cita.fecha_hora),
      duracion_minutos: cita.duracion_minutos || 60,
      direccion: cita.direccion || '',
      notas: cita.notas || '',
      estado: cita.cita_estado || 'programada',
    })
  }, [open, cita])

  if (!cita) return null

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleGuardar = async () => {
    if (!form.fecha_hora) {
      toast.error('La fecha y hora son obligatorias')
      return
    }
    try {
      await actualizar.mutateAsync({
        id: cita.cita_id,
        fecha_hora: new Date(form.fecha_hora).toISOString(),
        duracion_minutos: Number(form.duracion_minutos) || 60,
        direccion: form.direccion || null,
        notas: form.notas || null,
        estado: form.estado,
      })
      toast.success('Cita actualizada')
      onClose()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleCancelarCita = async () => {
    try {
      await cancelar.mutateAsync(cita.cita_id)
      toast.success('Cita cancelada')
      onClose()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleVerIntervencion = () => {
    onClose()
    navigate(`/sat/intervenciones/${cita.intervencion_id}`)
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar Cita" size="md">
      <div className="space-y-4">
        {/* Info de contexto (solo lectura) */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
          {cita.intervencion_titulo && (
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="font-medium truncate">{cita.intervencion_titulo}</span>
              {cita.numero_parte && (
                <span className="text-gray-400 font-mono text-xs shrink-0">({cita.numero_parte})</span>
              )}
            </div>
          )}
          {cita.tecnico_nombre && (
            <div className="flex items-center gap-2 text-gray-600">
              <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span>{cita.tecnico_nombre}</span>
            </div>
          )}
          {cita.cliente_nombre && (
            <div className="flex items-center gap-2 text-gray-600">
              <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span>{cita.cliente_nombre}</span>
            </div>
          )}
        </div>

        {/* Fecha/hora y duración */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Fecha y hora *
            </label>
            <Input type="datetime-local" value={form.fecha_hora} onChange={set('fecha_hora')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duración</label>
            <Select value={form.duracion_minutos} onChange={set('duracion_minutos')}>
              <option value={30}>30 min</option>
              <option value={60}>1 hora</option>
              <option value={90}>1h 30min</option>
              <option value={120}>2 horas</option>
              <option value={180}>3 horas</option>
              <option value={240}>4 horas</option>
            </Select>
          </div>
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <Select value={form.estado} onChange={set('estado')}>
            {ESTADO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Dirección
          </label>
          <Input value={form.direccion} onChange={set('direccion')} placeholder="Dirección de la cita..." />
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <Textarea value={form.notas} onChange={set('notas')} rows={2} placeholder="Notas adicionales..." />
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 gap-2 flex-wrap">
          <div className="flex gap-2">
            {cita.intervencion_id && (
              <Button variant="outline" size="sm" type="button" onClick={handleVerIntervencion}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Ver intervención
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={handleCancelarCita}
              loading={cancelar.isPending}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Cancelar cita
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>Cerrar</Button>
            <Button variant="primary" onClick={handleGuardar} loading={actualizar.isPending}>
              Guardar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
