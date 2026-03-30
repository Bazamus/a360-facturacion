import { useNavigate } from 'react-router-dom'
import { usePortalDatos } from '@/hooks/usePortal'
import { useAuth } from '@/features/auth/AuthContext'
import { Card, CardContent, Badge, LoadingSpinner } from '@/components/ui'
import {
  FileText, TicketCheck, Wrench, Calendar, Cpu,
  AlertCircle, Clock, ChevronRight, Euro, ShieldAlert,
} from 'lucide-react'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function PortalDashboard() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { data: portal, isLoading, error } = usePortalDatos()

  if (isLoading) {
    return <div className="py-20 flex justify-center"><LoadingSpinner size="lg" /></div>
  }

  // Si es admin y no tiene cliente vinculado, mostrar modo preview
  if (error && isAdmin) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">Modo Administrador</h3>
            <p className="text-sm text-amber-700 mt-1">
              Estás viendo el portal como administrador. Tu email no está vinculado a ningún cliente,
              por lo que no se muestran datos. Para probar el portal completo, crea un usuario con
              rol "cliente" cuyo email coincida con un registro en la tabla de clientes.
            </p>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portal de Cliente</h1>
          <p className="text-sm text-gray-500 mt-1">Vista previa del portal — sin datos de cliente vinculados</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={Euro} iconBg="bg-amber-100" iconColor="text-amber-600" label="Facturas pendientes" value={0} />
          <KpiCard icon={FileText} iconBg="bg-blue-100" iconColor="text-blue-600" label="Total facturas" value={0} />
          <KpiCard icon={TicketCheck} iconBg="bg-indigo-100" iconColor="text-indigo-600" label="Tickets abiertos" value={0} />
          <KpiCard icon={Calendar} iconBg="bg-green-100" iconColor="text-green-600" label="Contratos activos" value={0} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">Error al cargar el portal</h2>
        <p className="text-sm text-gray-500">{error.message}</p>
      </div>
    )
  }

  const cliente = portal?.cliente
  const facturas = portal?.facturas_resumen
  const ticketsAbiertos = portal?.tickets_abiertos ?? 0
  const citas = portal?.proximas_citas ?? []
  const contratosActivos = portal?.contratos_activos ?? 0
  const numEquipos = portal?.equipos ?? 0

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hola, {cliente?.nombre}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Bienvenido a tu portal de cliente. Aquí puedes consultar tus facturas, seguir tus incidencias y más.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={FileText}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          label="Facturas"
          value={facturas?.total ?? 0}
          onClick={() => navigate('/portal/facturas')}
        />
        <KpiCard
          icon={TicketCheck}
          iconBg="bg-indigo-100"
          iconColor="text-indigo-600"
          label="Tickets abiertos"
          value={ticketsAbiertos}
          highlight={ticketsAbiertos > 0}
          onClick={() => navigate('/portal/tickets')}
        />
        <KpiCard
          icon={Calendar}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          label="Contratos activos"
          value={contratosActivos}
          onClick={() => navigate('/portal/contratos')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximas citas */}
        <Card>
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Próximas citas</h3>
            <Clock className="h-4 w-4 text-gray-400" />
          </div>
          <CardContent className="p-0">
            {citas.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No hay citas programadas</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {citas.map((cita) => (
                  <div key={cita.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cita.intervencion_titulo || 'Cita programada'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDateTime(cita.fecha_hora)}
                        {cita.direccion && ` — ${cita.direccion}`}
                      </p>
                    </div>
                    <Badge variant="info" className="text-xs capitalize">{cita.estado}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones rápidas */}
        <Card>
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">Acciones rápidas</h3>
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              <QuickAction
                icon={TicketCheck}
                label="Comunicar una incidencia"
                description="Abre un ticket de soporte"
                onClick={() => navigate('/portal/tickets?nuevo=1')}
              />
              <QuickAction
                icon={FileText}
                label="Ver mis facturas"
                description={`${facturas?.total ?? 0} facturas disponibles`}
                onClick={() => navigate('/portal/facturas')}
              />
              <QuickAction
                icon={Wrench}
                label="Historial de intervenciones"
                description="Consulta servicios realizados"
                onClick={() => navigate('/portal/intervenciones')}
              />
              <QuickAction
                icon={Cpu}
                label="Mis equipos"
                description={`${numEquipos} equipo(s) registrado(s)`}
                onClick={() => navigate('/portal/equipos')}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, iconBg, iconColor, label, value, sublabel, highlight, onClick }) {
  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${highlight ? 'ring-2 ring-amber-300' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
            {sublabel && <p className="text-xs font-medium text-amber-600 mt-0.5">{sublabel}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickAction({ icon: Icon, label, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
    >
      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
        <Icon className="h-4.5 w-4.5 text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
    </button>
  )
}
