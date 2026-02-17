import { useState } from 'react'
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
} from 'lucide-react'
import { useComunicacionesStats, useComunicaciones } from '@/hooks/useComunicaciones'
import { UltimosMensajes } from './UltimosMensajes'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const CANAL_CONFIG = {
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50' },
  email: { label: 'Email', icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
  chat: { label: 'Chat', icon: MessageCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
  telefono: { label: 'Telefono', icon: Phone, color: 'text-orange-600', bg: 'bg-orange-50' },
}

const CHATWOOT_URL = 'https://chat.a360se.com'

export function ComunicacionesDashboard() {
  const { data: stats, isLoading: loadingStats } = useComunicacionesStats()
  const { data: pendientes } = useComunicaciones({ estado: 'recibido', limit: 10 })

  const kpis = [
    {
      name: 'Mensajes (30 dias)',
      value: stats?.total_mensajes ?? 0,
      icon: MessageSquare,
      color: 'from-primary-50 to-primary-100',
      iconColor: 'text-primary-600',
    },
    {
      name: 'Entrantes',
      value: stats?.entrantes ?? 0,
      icon: ArrowDownLeft,
      color: 'from-blue-50 to-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      name: 'Salientes',
      value: stats?.salientes ?? 0,
      icon: ArrowUpRight,
      color: 'from-green-50 to-green-100',
      iconColor: 'text-green-600',
    },
    {
      name: 'Pendientes respuesta',
      value: stats?.pendientes_respuesta ?? 0,
      icon: Clock,
      color: 'from-amber-50 to-amber-100',
      iconColor: 'text-amber-600',
      highlight: (stats?.pendientes_respuesta ?? 0) > 0,
    },
    {
      name: 'Clientes contactados',
      value: stats?.clientes_contactados ?? 0,
      icon: Users,
      color: 'from-purple-50 to-purple-100',
      iconColor: 'text-purple-600',
    },
  ]

  const canalData = stats?.por_canal
    ? Object.entries(stats.por_canal).map(([canal, total]) => ({
        canal: CANAL_CONFIG[canal]?.label || canal,
        mensajes: total || 0,
      }))
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary-600" />
            Comunicaciones
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestion centralizada de comunicaciones con clientes
          </p>
        </div>
        <a
          href={CHATWOOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir Chatwoot
        </a>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <Card
            key={kpi.name}
            hover
            className={`transition-all duration-300 hover:scale-105 hover:shadow-lg ${
              kpi.highlight ? 'ring-2 ring-amber-400' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${kpi.color}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
                </div>
                {kpi.highlight && (
                  <Badge variant="warning">Pendiente</Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {loadingStats ? '-' : kpi.value}
              </p>
              <p className="text-xs text-gray-500 mt-1">{kpi.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grafico + Canales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grafico de volumen por canal */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-400" />
              Volumen por canal
            </h3>
            {canalData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={canalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="canal" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                  />
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
                Sin datos de comunicaciones todavia
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estado de canales */}
        <Card>
          <CardContent className="p-6">
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
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.bg}`}>
                        <config.icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{config.label}</span>
                    </div>
                    <Badge variant={count > 0 ? 'primary' : 'default'}>
                      {count}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ultimos mensajes pendientes */}
      <UltimosMensajes mensajes={pendientes || []} loading={loadingStats} />
    </div>
  )
}
