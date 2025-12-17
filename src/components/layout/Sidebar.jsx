import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Gauge, 
  FileInput, 
  Receipt, 
  BarChart3, 
  Settings,
  X,
  Zap
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Comunidades', href: '/comunidades', icon: Building2 },
  { name: 'Clientes', href: '/clientes', icon: Users },
  { name: 'Contadores', href: '/contadores', icon: Gauge },
  { name: 'Lecturas', href: '/lecturas', icon: FileInput },
  { name: 'Facturación', href: '/facturacion', icon: Receipt },
  { name: 'Reportes', href: '/reportes', icon: BarChart3 },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
]

export function Sidebar({ open, onClose, mobile }) {
  const location = useLocation()

  const content = (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-primary-700 px-6 pb-4">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div className="text-white">
            <span className="text-xl font-bold">A360</span>
            <span className="text-sm block text-primary-200 -mt-1">Facturación</span>
          </div>
        </div>
        {mobile && (
          <button
            type="button"
            className="ml-auto -mr-2 text-primary-200 hover:text-white"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href)
            return (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  onClick={mobile ? onClose : undefined}
                  className={cn(
                    'group flex gap-x-3 rounded-lg p-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-primary-100 hover:bg-primary-600 hover:text-white'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.name}
                </NavLink>
              </li>
            )
          })}
        </ul>

        {/* Footer del sidebar */}
        <div className="mt-auto pt-4 border-t border-primary-600">
          <p className="text-xs text-primary-300 text-center">
            v1.0.0 · A360 Servicios Energéticos
          </p>
        </div>
      </nav>
    </div>
  )

  // Versión móvil con overlay
  if (mobile) {
    return (
      <>
        {/* Overlay */}
        <div
          className={cn(
            'fixed inset-0 z-50 bg-gray-900/80 transition-opacity lg:hidden',
            open ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={onClose}
        />
        
        {/* Sidebar móvil */}
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 lg:hidden',
            open ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {content}
        </div>
      </>
    )
  }

  // Versión desktop
  return content
}


