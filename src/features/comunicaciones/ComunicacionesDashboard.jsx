import { useState } from 'react'
import { format, subDays } from 'date-fns'
import { Card, CardContent, Badge } from '@/components/ui'
import {
  MessageSquare,
  Phone,
  Mail,
  MessageCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Users,
  ExternalLink,
  TrendingUp,
  RefreshCw,
  BarChart3,
  ChevronDown,
} from 'lucide-react'
import {
  useComunicacionesStats,
  useComunicacionesTrend,
  useComunicacionesConfig,
} from '@/hooks/useComunicaciones'
import { ConversacionesList } from './ConversacionesList'
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

/* ── Constantes ────────────────────────────────────────────── */

const CANAL_CONFIG = {
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50' },
  email: { label: 'Email', icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
  chat: { label: 'Chat', icon: MessageCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
  telefono: { label: 'Teléfono', icon: Phone, color: 'text-orange-600', bg: 'bg-orange-50' },
}

const CANAL_TABS = [
  { key: null, label: 'Todos', icon: MessageSquare },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'chat', label: 'Chat', icon: MessageCircle },
  { key: 'telefono', label: 'Teléfono', icon: Phone },
]

const PRESETS = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '3 meses', days: 90 },
]

function formatAxisDate(dateStr) {
  if (!dateStr) return ''
  const [, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

/* ── Componente principal ──────────────────────────────────── */

export function ComunicacionesDashboard() {
  const [preset, setPreset] = useState(30)
  const [chartMode, setChartMode] = useState('trend')
  const [canalFilter, setCanalFilter] = useState(null)
  const [showStats, setShowStats] = useState(false)
  const { chatwootUrl, chatwootAccountId } = useComunicacionesConfig()

  const today = new Date()
  const fechaFin = format(today, 'yyyy-MM-dd')
  const fechaInicio = format(subDays(today, preset), 'yyyy-MM-dd')

  const { data: stats, isLoading: loadingStats, isFetching: fetchingStats } =
    useComunicacionesStats(fechaInicio, fechaFin)

  const { data: trend } = useComunicacionesTrend(fechaInicio, fechaFin)

  const presetLabel = PRESETS.find((p) => p.days === preset)?.label ?? `${preset} días`

  const canalData = stats?.por_canal
    ? Object.entries(stats.por_canal).map(([canal, total]) => ({
        canal: CANAL_CONFIG[canal]?.label || canal,
        mensajes: total || 0,
      }))
    : []

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary-600" />
            Comunicaciones
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Gestión centralizada de comunicaciones con clientes
          </p>
        </div>
        <div className="flex items-center gap-3">
          {fetchingStats && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Actualizando...
            </span>
          )}
          <a
            href={chatwootUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir Chatwoot
          </a>
        </div>
      </div>

      {/* ── Barra KPI compacta ──────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center divide-x divide-gray-100">
          <KpiChip
            icon={MessageSquare}
            iconColor="text-primary-600"
            value={stats?.total_mensajes ?? 0}
            label={`Mensajes (${presetLabel})`}
            loading={loadingStats}
          />
          <KpiChip
            icon={ArrowDownLeft}
            iconColor="text-blue-600"
            value={stats?.entrantes ?? 0}
            label="Entrantes"
            loading={loadingStats}
          />
          <KpiChip
            icon={ArrowUpRight}
            iconColor="text-emerald-600"
            value={stats?.salientes ?? 0}
            label="Salientes"
            loading={loadingStats}
          />
          <KpiChip
            icon={Clock}
            iconColor="text-amber-600"
            value={stats?.pendientes_respuesta ?? 0}
            label="Pendientes"
            loading={loadingStats}
            highlight={(stats?.pendientes_respuesta ?? 0) > 0}
          />
          <KpiChip
            icon={Users}
            iconColor="text-violet-600"
            value={stats?.clientes_contactados ?? 0}
            label="Clientes"
            loading={loadingStats}
          />
        </div>
      </div>

      {/* ── Filtros: Tabs canal + Período ───────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Tabs canal */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {CANAL_TABS.map((tab) => (
            <button
              key={tab.key ?? 'todos'}
              onClick={() => setCanalFilter(tab.key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                canalFilter === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Período */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Período:</span>
          {PRESETS.map((p) => (
            <button
              key={p.days}
              onClick={() => setPreset(p.days)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                preset === p.days
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Lista de conversaciones (bloque principal) ───── */}
      <ConversacionesList chatwootUrl={chatwootUrl} chatwootAccountId={chatwootAccountId} canal={canalFilter} />

      {/* ── Estadísticas colapsables ────────────────────────── */}
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
        <button
          onClick={() => setShowStats(!showStats)}
          className="flex items-center justify-between w-full px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-gray-400" />
            Estadísticas del período ({presetLabel})
          </span>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${
              showStats ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showStats && (
          <div className="px-5 pb-5 border-t border-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
              {/* Gráfico principal con toggle */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gray-400" />
                    {chartMode === 'trend' ? 'Tendencia diaria' : 'Volumen por canal'}
                  </h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setChartMode('trend')}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        chartMode === 'trend'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Por día
                    </button>
                    <button
                      onClick={() => setChartMode('canal')}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        chartMode === 'canal'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Por canal
                    </button>
                  </div>
                </div>

                {chartMode === 'trend' ? (
                  trend && trend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={trend}>
                        <defs>
                          <linearGradient id="gradEntrantes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradSalientes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="fecha"
                          tickFormatter={formatAxisDate}
                          tick={{ fontSize: 11 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                          labelFormatter={(label) => formatAxisDate(label)}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="entrantes"
                          name="Entrantes"
                          stroke="#6366f1"
                          strokeWidth={2}
                          fill="url(#gradEntrantes)"
                        />
                        <Area
                          type="monotone"
                          dataKey="salientes"
                          name="Salientes"
                          stroke="#22c55e"
                          strokeWidth={2}
                          fill="url(#gradSalientes)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[260px] text-sm text-gray-400">
                      Sin datos de tendencia para el período seleccionado
                    </div>
                  )
                ) : canalData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={canalData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="canal" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '13px' }} />
                      <Legend />
                      <Bar
                        dataKey="mensajes"
                        name="Mensajes"
                        fill="#6366f1"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[260px] text-sm text-gray-400">
                    Sin datos de comunicaciones todavía
                  </div>
                )}
              </div>

              {/* Canales activos */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Canales activos</h3>
                <div className="space-y-3">
                  {Object.entries(CANAL_CONFIG).map(([key, config]) => {
                    const count = stats?.por_canal?.[key] ?? 0
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.bg}`}
                          >
                            <config.icon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {config.label}
                          </span>
                        </div>
                        <Badge variant={count > 0 ? 'primary' : 'default'}>{count}</Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── KPI Chip para la barra compacta ───────────────────────── */

function KpiChip({ icon: Icon, iconColor, value, label, loading, highlight }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 flex-1 min-w-[140px]">
      <Icon className={`h-4 w-4 flex-shrink-0 ${iconColor}`} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-gray-900">
            {loading ? '-' : value}
          </span>
          {highlight && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white animate-pulse">
              !
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 truncate">{label}</p>
      </div>
    </div>
  )
}
