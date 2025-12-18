import { 
  Building2, 
  Users, 
  Gauge, 
  Receipt, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'

// Datos de ejemplo para el dashboard
const stats = [
  { 
    name: 'Comunidades', 
    value: '35', 
    icon: Building2,
    change: '+2',
    changeType: 'positive',
    description: 'activas'
  },
  { 
    name: 'Clientes', 
    value: '4.000', 
    icon: Users,
    change: '+120',
    changeType: 'positive',
    description: 'registrados'
  },
  { 
    name: 'Contadores', 
    value: '4.250', 
    icon: Gauge,
    change: '+85',
    changeType: 'positive',
    description: 'instalados'
  },
  { 
    name: 'Facturado (mes)', 
    value: formatCurrency(45230),
    icon: Receipt,
    change: '+12%',
    changeType: 'positive',
    description: 'vs. mes anterior'
  },
]

const recentActivity = [
  { 
    id: 1, 
    action: 'Importación de lecturas', 
    detail: 'Comunidad Troya 40 - 45 lecturas',
    time: 'Hace 2 horas',
    status: 'success'
  },
  { 
    id: 2, 
    action: 'Facturas enviadas', 
    detail: '38 facturas por email',
    time: 'Hace 5 horas',
    status: 'success'
  },
  { 
    id: 3, 
    action: 'Nueva comunidad', 
    detail: 'Hermes 12 añadida al sistema',
    time: 'Ayer',
    status: 'info'
  },
  { 
    id: 4, 
    action: 'Alerta de consumo', 
    detail: 'Cliente #1024 - Consumo anómalo detectado',
    time: 'Hace 2 días',
    status: 'warning'
  },
]

const statusColors = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  info: 'bg-blue-100 text-blue-800',
  error: 'bg-red-100 text-red-800',
}

export function DashboardPage() {
  return (
    <div>
      {/* Cabecera */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">
          Bienvenido al sistema de facturación de gestión energética
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50">
                  <stat.icon className="h-6 w-6 text-primary-600" />
                </div>
                <div className={`flex items-center text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                  {stat.changeType === 'positive' 
                    ? <ArrowUpRight className="h-4 w-4 ml-1" />
                    : <ArrowDownRight className="h-4 w-4 ml-1" />
                  }
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.name}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Actividad reciente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-gray-100">
              {recentActivity.map((activity) => (
                <li key={activity.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.action}
                      </p>
                      <p className="text-sm text-gray-500">{activity.detail}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[activity.status]}`}>
                        {activity.status === 'success' && '✓'}
                        {activity.status === 'warning' && '!'}
                        {activity.status === 'info' && 'i'}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Accesos rápidos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <QuickActionButton
                icon={Gauge}
                label="Importar Lecturas"
                href="/lecturas/importar"
              />
              <QuickActionButton
                icon={Receipt}
                label="Generar Facturas"
                href="/facturacion/generar"
              />
              <QuickActionButton
                icon={Users}
                label="Nuevo Cliente"
                href="/clientes/nuevo"
              />
              <QuickActionButton
                icon={Building2}
                label="Nueva Comunidad"
                href="/comunidades/nueva"
              />
            </div>

            {/* Mensaje de bienvenida */}
            <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-100">
              <h4 className="text-sm font-medium text-primary-900">
                Sistema en desarrollo
              </h4>
              <p className="mt-1 text-sm text-primary-700">
                Estamos construyendo las funcionalidades del sistema. 
                Consulta la documentación en <code className="bg-primary-100 px-1 rounded">/docs</code> para más información.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function QuickActionButton({ icon: Icon, label, href }) {
  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors group"
    >
      <Icon className="h-8 w-8 text-gray-400 group-hover:text-primary-600 transition-colors" />
      <span className="mt-2 text-sm font-medium text-gray-600 group-hover:text-primary-700 text-center">
        {label}
      </span>
    </a>
  )
}






