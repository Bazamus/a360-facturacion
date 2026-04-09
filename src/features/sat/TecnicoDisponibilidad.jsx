import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO, isWithinInterval, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useUsuarios } from '@/hooks'
import { Button, Select, LoadingSpinner } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { Plus, X, CalendarOff, Trash2 } from 'lucide-react'

const TIPO_CONFIG = {
  vacaciones: { label: 'Vacaciones', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  baja: { label: 'Baja médica', color: 'bg-red-100 text-red-700 border-red-200' },
  guardia: { label: 'Guardia', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  formacion: { label: 'Formación', color: 'bg-green-100 text-green-700 border-green-200' },
  otro: { label: 'Otro', color: 'bg-gray-100 text-gray-700 border-gray-200' },
}

function useDisponibilidades(tecnicoId) {
  return useQuery({
    queryKey: ['disponibilidad-tecnicos', tecnicoId],
    queryFn: async () => {
      let query = supabase
        .from('disponibilidad_tecnicos')
        .select('*, tecnico:tecnico_id(nombre_completo)')
        .order('fecha_inicio', { ascending: true })

      if (tecnicoId) {
        query = query.eq('tecnico_id', tecnicoId)
      }

      // Solo mostrar las futuras y actuales (no más de 60 días atrás)
      const desde = format(addDays(new Date(), -60), 'yyyy-MM-dd')
      query = query.gte('fecha_fin', desde)

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
    staleTime: 2 * 60 * 1000,
  })
}

function useCrearDisponibilidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from('disponibilidad_tecnicos')
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disponibilidad-tecnicos'] })
    },
  })
}

function useEliminarDisponibilidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('disponibilidad_tecnicos')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disponibilidad-tecnicos'] })
    },
  })
}

function FormDisponibilidad({ tecnicos, onClose }) {
  const toast = useToast()
  const crear = useCrearDisponibilidad()
  const [form, setForm] = useState({
    tecnico_id: '',
    tipo: 'vacaciones',
    fecha_inicio: format(new Date(), 'yyyy-MM-dd'),
    fecha_fin: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    notas: '',
  })

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.tecnico_id) {
      toast.error('Selecciona un técnico')
      return
    }
    if (form.fecha_fin < form.fecha_inicio) {
      toast.error('La fecha de fin debe ser posterior a la de inicio')
      return
    }
    try {
      await crear.mutateAsync(form)
      toast.success('Disponibilidad registrada')
      onClose()
    } catch (err) {
      toast.error(`Error: ${err.message}`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Nueva ausencia / disponibilidad</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Técnico</label>
            <Select name="tecnico_id" value={form.tecnico_id} onChange={handleChange} required className="w-full">
              <option value="">Seleccionar técnico...</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre_completo}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <Select name="tipo" value={form.tipo} onChange={handleChange} className="w-full">
              {Object.entries(TIPO_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
              <input
                type="date"
                name="fecha_inicio"
                value={form.fecha_inicio}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
              <input
                type="date"
                name="fecha_fin"
                value={form.fecha_fin}
                onChange={handleChange}
                min={form.fecha_inicio}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
            <textarea
              name="notas"
              value={form.notas}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="Observaciones..."
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={crear.isPending}>
              {crear.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function TecnicoDisponibilidad() {
  const toast = useToast()
  const [filtroTecnico, setFiltroTecnico] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data: usuarios } = useUsuarios()
  const tecnicos = usuarios?.filter((u) => u.rol === 'tecnico' || u.rol === 'encargado') ?? []

  const { data: disponibilidades = [], isLoading } = useDisponibilidades(filtroTecnico || null)
  const eliminar = useEliminarDisponibilidad()

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este registro de disponibilidad?')) return
    try {
      await eliminar.mutateAsync(id)
      toast.success('Registro eliminado')
    } catch (err) {
      toast.error(`Error: ${err.message}`)
    }
  }

  // Técnicos con ausencia activa hoy
  const hoy = format(new Date(), 'yyyy-MM-dd')
  const ausentesHoy = disponibilidades.filter(
    (d) => d.fecha_inicio <= hoy && d.fecha_fin >= hoy
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarOff className="h-5 w-5 text-primary-600" />
            Disponibilidad de Técnicos
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Vacaciones, bajas y otras ausencias registradas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={filtroTecnico}
            onChange={(e) => setFiltroTecnico(e.target.value)}
            className="w-44"
          >
            <option value="">Todos los técnicos</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre_completo}</option>
            ))}
          </Select>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva ausencia
          </Button>
        </div>
      </div>

      {/* Ausentes hoy */}
      {ausentesHoy.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">
            Técnicos ausentes hoy ({ausentesHoy.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {ausentesHoy.map((d) => (
              <span
                key={d.id}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium ${TIPO_CONFIG[d.tipo]?.color || 'bg-gray-100 text-gray-700'}`}
              >
                {d.tecnico?.nombre_completo} · {TIPO_CONFIG[d.tipo]?.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : disponibilidades.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <CalendarOff className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay ausencias registradas</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <th className="px-5 py-3 font-medium text-gray-600">Técnico</th>
                <th className="px-5 py-3 font-medium text-gray-600">Tipo</th>
                <th className="px-5 py-3 font-medium text-gray-600">Desde</th>
                <th className="px-5 py-3 font-medium text-gray-600">Hasta</th>
                <th className="px-5 py-3 font-medium text-gray-600">Notas</th>
                <th className="px-5 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {disponibilidades.map((d) => {
                const config = TIPO_CONFIG[d.tipo] || TIPO_CONFIG.otro
                const esActual = d.fecha_inicio <= hoy && d.fecha_fin >= hoy
                return (
                  <tr key={d.id} className={esActual ? 'bg-amber-50/40' : 'hover:bg-gray-50'}>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {d.tecnico?.nombre_completo || '—'}
                      {esActual && (
                        <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                          Hoy
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${config.color}`}>
                        {config.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {format(parseISO(d.fecha_inicio), "dd MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-5 py-3 text-gray-700">
                      {format(parseISO(d.fecha_fin), "dd MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-5 py-3 text-gray-500 max-w-[200px] truncate">
                      {d.notas || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleEliminar(d.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <FormDisponibilidad tecnicos={tecnicos} onClose={() => setShowForm(false)} />
      )}
    </div>
  )
}
