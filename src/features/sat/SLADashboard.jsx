import { useState } from 'react'
import { useSLADashboard, useSLAConfiguraciones, useActualizarSLAConfig, useCrearSLAConfig, useEliminarSLAConfig } from '@/hooks/useSLA'
import { Button, LoadingSpinner } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import {
  Shield, AlertTriangle, CheckCircle, Clock, Plus, Edit2, Trash2, X,
} from 'lucide-react'
import {
  RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'

const RANGO_OPTIONS = [
  { value: 7, label: 'Últimos 7 días' },
  { value: 30, label: 'Últimos 30 días' },
  { value: 90, label: 'Últimos 90 días' },
]

const PRIORIDAD_COLORS = {
  urgente: '#ef4444',
  alta: '#f59e0b',
  normal: '#3b82f6',
  baja: '#6b7280',
}

const TIPO_LABELS = {
  correctiva: 'Correctiva', preventiva: 'Preventiva',
  instalacion: 'Instalación', inspeccion: 'Inspección', urgencia: 'Urgencia',
}
const PRIORIDAD_LABELS = {
  urgente: 'Urgente', alta: 'Alta', normal: 'Normal', baja: 'Baja',
}

function MetricCard({ title, value, subtitle, icon: Icon, color = 'text-gray-900', bg = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${bg}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value ?? '—'}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {Icon && <Icon className={`h-5 w-5 ${color} opacity-60`} />}
      </div>
    </div>
  )
}

// ---------- Modal Config SLA ----------
function ConfigModal({ config, onClose }) {
  const toast = useToast()
  const crear = useCrearSLAConfig()
  const actualizar = useActualizarSLAConfig()
  const isEdit = !!config?.id

  const [form, setForm] = useState({
    nombre: config?.nombre ?? '',
    tipo_intervencion: config?.tipo_intervencion ?? '',
    prioridad: config?.prioridad ?? '',
    tiempo_respuesta_horas: config?.tiempo_respuesta_horas ?? 8,
    tiempo_resolucion_horas: config?.tiempo_resolucion_horas ?? 72,
    activo: config?.activo ?? true,
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      tipo_intervencion: form.tipo_intervencion || null,
      prioridad: form.prioridad || null,
      tiempo_respuesta_horas: Number(form.tiempo_respuesta_horas),
      tiempo_resolucion_horas: Number(form.tiempo_resolucion_horas),
    }
    try {
      if (isEdit) {
        await actualizar.mutateAsync({ id: config.id, ...payload })
        toast.success('SLA actualizado')
      } else {
        await crear.mutateAsync(payload)
        toast.success('SLA creado')
      }
      onClose()
    } catch (err) {
      toast.error(`Error: ${err.message}`)
    }
  }

  const isPending = crear.isPending || actualizar.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{isEdit ? 'Editar SLA' : 'Nuevo SLA'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              name="nombre" value={form.nombre} onChange={handleChange} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Ej. SLA Contratos Premium"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo intervención</label>
              <select
                name="tipo_intervencion" value={form.tipo_intervencion} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Todos los tipos</option>
                {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
              <select
                name="prioridad" value={form.prioridad} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Todas</option>
                {Object.entries(PRIORIDAD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Respuesta (horas)</label>
              <input
                type="number" name="tiempo_respuesta_horas" value={form.tiempo_respuesta_horas}
                onChange={handleChange} min={1} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resolución (horas)</label>
              <input
                type="number" name="tiempo_resolucion_horas" value={form.tiempo_resolucion_horas}
                onChange={handleChange} min={1} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" name="activo" checked={form.activo} onChange={handleChange} className="rounded" />
            Activo
          </label>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear SLA'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function SLADashboard() {
  const [rango, setRango] = useState(30)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [editConfig, setEditConfig] = useState(null)
  const toast = useToast()
  const eliminar = useEliminarSLAConfig()

  const { data: dashboard, isLoading } = useSLADashboard(rango)
  const { data: configs = [] } = useSLAConfiguraciones()

  const cumplimientoResp = dashboard?.cumplimiento_respuesta ?? null
  const cumplimientoResol = dashboard?.cumplimiento_resolucion ?? null

  const radialData = [
    { name: 'Respuesta', value: cumplimientoResp ?? 0, fill: '#3b82f6' },
    { name: 'Resolución', value: cumplimientoResol ?? 0, fill: '#10b981' },
  ]

  const porPrioridadData = (dashboard?.por_prioridad ?? []).map((p) => ({
    ...p,
    label: PRIORIDAD_LABELS[p.prioridad] || p.prioridad,
    color: PRIORIDAD_COLORS[p.prioridad] || '#6b7280',
  }))

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar esta configuración SLA?')) return
    try {
      await eliminar.mutateAsync(id)
      toast.success('SLA eliminado')
    } catch (err) {
      toast.error(`Error: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-600" />
            Dashboard SLA
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Seguimiento de acuerdos de nivel de servicio</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={rango}
            onChange={(e) => setRango(Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            {RANGO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total intervenciones"
              value={dashboard?.total_intervenciones ?? 0}
              subtitle={`${dashboard?.con_sla ?? 0} con SLA`}
              icon={Clock}
            />
            <MetricCard
              title="Cumplimiento respuesta"
              value={cumplimientoResp != null ? `${cumplimientoResp}%` : 'N/A'}
              icon={CheckCircle}
              color={cumplimientoResp >= 80 ? 'text-green-600' : 'text-red-600'}
            />
            <MetricCard
              title="Cumplimiento resolución"
              value={cumplimientoResol != null ? `${cumplimientoResol}%` : 'N/A'}
              icon={CheckCircle}
              color={cumplimientoResol >= 80 ? 'text-green-600' : 'text-red-600'}
            />
            <div className="grid grid-rows-2 gap-4">
              <MetricCard
                title="En riesgo"
                value={dashboard?.en_riesgo ?? 0}
                icon={AlertTriangle}
                color="text-amber-600"
              />
              <MetricCard
                title="Incumplidas"
                value={dashboard?.incumplidas ?? 0}
                icon={AlertTriangle}
                color="text-red-600"
              />
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cumplimiento por prioridad */}
            {porPrioridadData.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Cumplimiento por prioridad</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={porPrioridadData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={70} />
                    <Tooltip
                      formatter={(val) => [`${val}%`, 'Cumplimiento']}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      {porPrioridadData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Gauge cumplimiento general */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Resumen cumplimiento</h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadialBarChart
                  cx="50%" cy="60%"
                  innerRadius="30%"
                  outerRadius="90%"
                  data={radialData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={4}
                    background={{ fill: '#f3f4f6' }}
                    label={{ position: 'insideStart', fill: '#fff', fontSize: 12, fontWeight: 600 }}
                  />
                  <Tooltip
                    formatter={(val) => [`${val}%`]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Legend
                    iconSize={10}
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Configuraciones SLA */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Configuraciones SLA</h3>
          <Button size="sm" onClick={() => { setEditConfig(null); setShowConfigModal(true) }}>
            <Plus className="h-4 w-4 mr-1" />
            Nuevo SLA
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-left">
              <th className="px-5 py-3 font-medium text-gray-600">Nombre</th>
              <th className="px-5 py-3 font-medium text-gray-600">Tipo</th>
              <th className="px-5 py-3 font-medium text-gray-600">Prioridad</th>
              <th className="px-5 py-3 font-medium text-gray-600 text-right">Respuesta</th>
              <th className="px-5 py-3 font-medium text-gray-600 text-right">Resolución</th>
              <th className="px-5 py-3 font-medium text-gray-600">Estado</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {configs.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{c.nombre}</td>
                <td className="px-5 py-3 text-gray-600">{TIPO_LABELS[c.tipo_intervencion] || 'Todos'}</td>
                <td className="px-5 py-3 text-gray-600">{PRIORIDAD_LABELS[c.prioridad] || 'Todas'}</td>
                <td className="px-5 py-3 text-right text-gray-700">{c.tiempo_respuesta_horas}h</td>
                <td className="px-5 py-3 text-right text-gray-700">{c.tiempo_resolucion_horas}h</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditConfig(c); setShowConfigModal(true) }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleEliminar(c.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showConfigModal && (
        <ConfigModal
          config={editConfig}
          onClose={() => { setShowConfigModal(false); setEditConfig(null) }}
        />
      )}
    </div>
  )
}
