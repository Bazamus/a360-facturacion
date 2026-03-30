import { useState, useEffect } from 'react'
import { useCrearCita, useUsuarios, useIntervenciones, useClientesSimple } from '@/hooks'
import { Button, Modal, Input, Select, Textarea, SearchablePicker } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'

export function CitaFormModal({ open, onClose, defaultDate, defaultEndDate }) {
  const crearCita = useCrearCita()
  const toast = useToast()
  const { data: usuarios } = useUsuarios()
  const { data: clientesData } = useClientesSimple()
  const { data: intervencionesData } = useIntervenciones({ estado: undefined, pageSize: 100 })

  const tecnicos = usuarios?.filter((u) => u.rol === 'tecnico' || u.rol === 'encargado') ?? []
  const intervencionesPendientes = intervencionesData?.data?.filter(
    (i) => !['completada', 'facturada', 'cancelada'].includes(i.estado)
  ) ?? []

  const [form, setForm] = useState({
    tecnico_id: '',
    cliente_id: '',
    intervencion_id: '',
    fecha_hora: '',
    duracion_minutos: 60,
    direccion: '',
    notas: '',
  })

  useEffect(() => {
    if (!open) return

    const fechaStr = defaultDate
      ? formatDateTimeLocal(defaultDate)
      : ''

    let duracion = 60
    if (defaultDate && defaultEndDate) {
      duracion = Math.round((defaultEndDate.getTime() - defaultDate.getTime()) / 60000)
      if (duracion < 15) duracion = 60
      if (duracion > 480) duracion = 60
    }

    setForm({
      tecnico_id: '',
      cliente_id: '',
      intervencion_id: '',
      fecha_hora: fechaStr,
      duracion_minutos: duracion,
      direccion: '',
      notas: '',
    })
  }, [open, defaultDate, defaultEndDate])

  // Cuando se selecciona intervención, autorellenar cliente y dirección
  const handleIntervencionChange = (intervencionId) => {
    setForm((prev) => ({ ...prev, intervencion_id: intervencionId }))
    if (intervencionId) {
      const int = intervencionesPendientes.find((i) => i.id === intervencionId)
      if (int) {
        setForm((prev) => ({
          ...prev,
          intervencion_id: intervencionId,
          cliente_id: int.cliente_id || prev.cliente_id,
          direccion: [int.direccion, int.codigo_postal, int.ciudad].filter(Boolean).join(', ') || prev.direccion,
        }))
      }
    }
  }

  const handleSubmit = async () => {
    if (!form.tecnico_id) {
      toast.error('Selecciona un técnico')
      return
    }
    if (!form.fecha_hora) {
      toast.error('La fecha y hora son obligatorias')
      return
    }

    try {
      await crearCita.mutateAsync({
        tecnico_id: form.tecnico_id,
        cliente_id: form.cliente_id || null,
        intervencion_id: form.intervencion_id || null,
        fecha_hora: new Date(form.fecha_hora).toISOString(),
        duracion_minutos: Number(form.duracion_minutos) || 60,
        direccion: form.direccion || null,
        notas: form.notas || null,
        estado: 'programada',
      })
      toast.success('Cita creada correctamente')
      onClose()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  return (
    <Modal open={open} onClose={onClose} title="Nueva Cita" size="lg">
      <div className="space-y-4">
        {/* Técnico */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Técnico *</label>
          <Select value={form.tecnico_id} onChange={set('tecnico_id')}>
            <option value="">Seleccionar técnico...</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre_completo}</option>
            ))}
          </Select>
        </div>

        {/* Fecha y duración */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora *</label>
            <Input type="datetime-local" value={form.fecha_hora} onChange={set('fecha_hora')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
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

        {/* Intervención vinculada */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Intervención (opcional)</label>
          <Select value={form.intervencion_id} onChange={(e) => handleIntervencionChange(e.target.value)}>
            <option value="">Sin vincular a intervención</option>
            {intervencionesPendientes.map((i) => (
              <option key={i.id} value={i.id}>
                {i.numero_parte} — {i.titulo}
              </option>
            ))}
          </Select>
        </div>

        {/* Cliente */}
        <div>
          <SearchablePicker
            value={form.cliente_id || ''}
            onChange={(id) => setForm({ ...form, cliente_id: id })}
            options={(clientesData || []).map((c) => ({
              value: c.id,
              label: `${c.nombre} ${c.apellidos}`.trim()
            }))}
            placeholder="Sin asignar"
            allowEmpty
            emptyOptionLabel="Sin asignar"
            label="Cliente"
            modalTitle="Seleccionar cliente"
            searchPlaceholder="Buscar por nombre..."
          />
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
          <Input value={form.direccion} onChange={set('direccion')} placeholder="Dirección de la cita..." />
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <Textarea value={form.notas} onChange={set('notas')} rows={2} placeholder="Notas adicionales..." />
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} loading={crearCita.isPending}>
            Crear Cita
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function formatDateTimeLocal(date) {
  const d = new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
