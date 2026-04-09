import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSATStats, useIntervenciones, useTicketsStats } from '@/hooks'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import {
  Button, Card, Badge, LoadingSpinner,
} from '@/components/ui'
import {
  Wrench, ClipboardList, AlertTriangle, Clock, CheckCircle,
  Plus, Calendar, TrendingUp, Users, FileText, TicketCheck, Star,
  Shield, CalendarOff,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts'

const ESTADO_VARIANTS = {
  pendiente: 'warning', asignada: 'info', programada: 'info',
  en_camino: 'primary', en_curso: 'primary',
  completada: 'success', facturada: 'success', cancelada: 'default',
}

const PRIORIDAD_VARIANTS = {
  urgente: 'danger', alta: 'warning', normal: 'default', baja: 'info',
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

export function SATDashboard() {
  const navigate = useNavigate()
  const { isTecnico } = useAuth()

  // Los técnicos van a su dashboard móvil optimizado
  useEffect(() => {
    if (isTecnico) {
      navigate('/sat/mi-agenda', { replace: true })
    }
  }, [isTecnico, navigate])

  const { data: stats, isLoading: loadingStats } = useSATStats()
  const { data: ticketStats } = useTicketsStats()

  // Satisfacción media
  const { data: satisfaccion } = useQuery({
    queryKey: ['satisfaccion-media'],
    queryFn: async () => {
      const { data, error } = await supabase.from('v_satisfaccion_media').select('*').single()
      if (error) return null
      return data
    },
    staleTime: 10 * 60 * 1000,
  })

  // Intervenciones urgentes/pendientes para la lista
  const { data: urgentesData } = useIntervenciones({
    estado: 'pendiente',
    pageSize: 5,
  })
  const { data: enCursoData } = useIntervenciones({
    estado: 'en_curso',
    pageSize: 5,
  })

  const pendientes = urgentesData?.data ?? []
  const enCurso = enCursoData?.data ?? []

  // Parse stats
  const totalAbiertas = stats?.total_abiertas ?? 0
  const totalHoy = stats?.intervenciones_hoy ?? 0
  const urgenciasActivas = stats?.urgencias_activas ?? 0
  const completadasMes = stats?.completadas_mes ?? 0
  const tiempoMedio = stats?.tiempo_medio_resolucion_horas ?? 0
  const porEstado = stats?.por_estado ?? []
  const porTipo = stats?.por_tipo ?? []

  const TIPO_COLORS = {
    correctiva: '#3b82f6',
    preventiva: '#10b981',
    instalacion: '#8b5cf6',
    inspeccion: '#f59e0b',
    urgencia: '#ef4444',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary-600" />
            Servicio de Asistencia Técnica
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Panel de control de intervenciones, contratos y técnicos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/sat/tickets/nuevo')}>
            <TicketCheck className="h-4 w-4 mr-2" />
            Nuevo Ticket
          </Button>
          <Button variant="secondary" onClick={() => navigate('/calendario')}>
            <Calendar className="h-4 w-4 mr-2" />
            Calendario
          </Button>
          <Button onClick={() => navigate('/sat/intervenciones/nueva')}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Intervención
          </Button>
        </div>
      </div>

      {/* KPI Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center divide-x divide-gray-200 overflow-x-auto">
          <KpiChip
            icon={ClipboardList}
            iconColor="text-blue-600"
            value={totalAbiertas}
            label="Abiertas"
            loading={loadingStats}
          />
          <KpiChip
            icon={Clock}
            iconColor="text-amber-600"
            value={totalHoy}
            label="Hoy"
            loading={loadingStats}
          />
          <KpiChip
            icon={AlertTriangle}
            iconColor="text-red-600"
            value={urgenciasActivas}
            label="Urgencias"
            loading={loadingStats}
            highlight={urgenciasActivas > 0}
          />
          <KpiChip
            icon={CheckCircle}
            iconColor="text-emerald-600"
            value={completadasMes}
            label="Completadas (mes)"
            loading={loadingStats}
          />
          <KpiChip
            icon={TrendingUp}
            iconColor="text-violet-600"
            value={tiempoMedio ? `${Math.round(tiempoMedio)}h` : '-'}
            label="Tiempo medio"
            loading={loadingStats}
          />
          <KpiChip
            icon={TicketCheck}
            iconColor="text-indigo-600"
            value={ticketStats?.abiertos ?? 0}
            label="Tickets abiertos"
            loading={!ticketStats}
            onClick={() => navigate('/sat/tickets')}
          />
          {satisfaccion?.total_respondidas > 0 && (
            <KpiChip
              icon={Star}
              iconColor="text-yellow-500"
              value={satisfaccion.media_global ? `${satisfaccion.media_global}/5` : '-'}
              label="Satisfacción"
              loading={false}
              onClick={() => navigate('/sat/sla')}
            />
          )}
          <KpiChip
            icon={Shield}
            iconColor="text-primary-600"
            value="SLA"
            label="Ver dashboard"
            loading={false}
            onClick={() => navigate('/sat/sla')}
          />
        </div>
      </div>

      {/* Accesos rápidos nuevas vistas */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/sat/carga-trabajo')}>
          <Users className="h-4 w-4 mr-1.5" /> Carga de trabajo
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/sat/disponibilidad')}>
          <CalendarOff className="h-4 w-4 mr-1.5" /> Disponibilidad técnicos
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/sat/sla')}>
          <Shield className="h-4 w-4 mr-1.5" /> Dashboard SLA
        </Button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main: Lists */}
        <div className="lg:col-span-2 space-y-6">
          {/* Urgencias y Pendientes */}
          <Card>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Intervenciones pendientes
              </h3>
              <button
                onClick={() => navigate('/sat/intervenciones')}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Ver todas
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {pendientes.length === 0 && enCurso.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">
                  No hay intervenciones pendientes
                </div>
              ) : (
                [...enCurso, ...pendientes].slice(0, 8).map((int) => (
                  <div
                    key={int.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/sat/intervenciones/${int.id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {int.tipo === 'urgencia' && (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                      )}
                      <span className="font-mono text-xs text-gray-500">{int.numero_parte}</span>
                      <span className="text-sm text-gray-900 truncate">{int.titulo}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <Badge variant={PRIORIDAD_VARIANTS[int.prioridad] || 'default'} className="text-xs capitalize">
                        {int.prioridad}
                      </Badge>
                      <Badge variant={ESTADO_VARIANTS[int.estado] || 'default'} className="text-xs capitalize">
                        {int.estado?.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-gray-400">{int.tecnico_nombre || 'Sin asignar'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Chart: por estado */}
          {porEstado.length > 0 && (
            <Card>
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Intervenciones por estado</h3>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={porEstado} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="estado" tick={{ fontSize: 12 }} width={75} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Accesos rápidos */}
          <Card>
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Accesos rápidos</h3>
            </div>
            <div className="p-3 space-y-1">
              <QuickLink icon={Plus} label="Nueva intervención" onClick={() => navigate('/sat/intervenciones/nueva')} />
              <QuickLink icon={ClipboardList} label="Todas las intervenciones" onClick={() => navigate('/sat/intervenciones')} />
              <QuickLink icon={FileText} label="Contratos" onClick={() => navigate('/sat/contratos')} />
              <QuickLink icon={Wrench} label="Materiales" onClick={() => navigate('/sat/materiales')} />
              <QuickLink icon={Calendar} label="Calendario" onClick={() => navigate('/calendario')} />
            </div>
          </Card>

          {/* Por tipo (mini chart) */}
          {porTipo.length > 0 && (
            <Card>
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Por tipo</h3>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {porTipo.map((item) => (
                    <div key={item.tipo} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: TIPO_COLORS[item.tipo] || '#9ca3af' }}
                        />
                        <span className="text-sm text-gray-700 capitalize">{item.tipo}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiChip({ icon: Icon, iconColor, value, label, loading, highlight }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 min-w-[140px]">
      <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0`} />
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-gray-900">
            {loading ? '-' : value}
          </span>
          {highlight && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
    </div>
  )
}

function QuickLink({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 rounded-lg transition-colors text-left"
    >
      <Icon className="h-4 w-4 text-gray-400" />
      {label}
    </button>
  )
}
