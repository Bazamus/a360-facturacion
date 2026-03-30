import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/brand/Logo'
import { useNotasCount } from '@/hooks/useComentarios'
import { usePendientesCount } from '@/hooks/useComunicaciones'
import { useAuth } from '@/features/auth/AuthContext'
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
  ChevronDown,
  Upload,
  History,
  FilePlus,
  FileText,
  Mail,
  Send,
  Landmark,
  Plus,
  PieChart,
  ArrowUpDown,
  StickyNote,
  ChevronsLeft,
  ChevronsRight,
  MessageSquare,
  Wrench,
  Calendar,
  ClipboardList,
  BookTemplate,
  Sliders,
  Package,
  TrendingUp,
  TicketCheck,
  Cpu,
  Globe,
} from 'lucide-react'

// =====================================================
// Navegación organizada en secciones lógicas
// =====================================================
const sections = [
  {
    label: 'PRINCIPAL',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Notas', href: '/notas', icon: StickyNote, hasBadge: true },
    ]
  },
  {
    label: 'COMUNICACIONES',
    requiredRoles: ['admin', 'encargado'],
    items: [
      {
        name: 'Comunicaciones',
        href: '/comunicaciones',
        icon: MessageSquare,
        hasBadge: 'comunicaciones',
        children: [
          { name: 'Dashboard', href: '/comunicaciones', icon: MessageSquare },
          { name: 'Historial', href: '/comunicaciones/historial', icon: History },
          { name: 'Plantillas', href: '/comunicaciones/plantillas', icon: BookTemplate },
          { name: 'Canales', href: '/comunicaciones/configuracion', icon: Sliders },
        ]
      },
    ]
  },
  {
    label: 'GESTIÓN',
    items: [
      { name: 'Comunidades', href: '/comunidades', icon: Building2 },
      { name: 'Clientes', href: '/clientes', icon: Users },
      { name: 'Contadores', href: '/contadores', icon: Gauge },
    ]
  },
  {
    label: 'OPERACIONES',
    items: [
      {
        name: 'Lecturas',
        href: '/lecturas',
        icon: FileInput,
        children: [
          { name: 'Importar', href: '/lecturas/importar', icon: Upload },
          { name: 'Historial', href: '/lecturas/historial', icon: History },
        ]
      },
      {
        name: 'Facturación',
        href: '/facturacion',
        icon: Receipt,
        children: [
          { name: 'Generar', href: '/facturacion/generar', icon: FilePlus },
          { name: 'Facturas', href: '/facturacion/facturas', icon: FileText },
          { name: 'Enviar', href: '/facturacion/enviar', icon: Send },
          { name: 'Dashboard Envíos', href: '/facturacion/envios', icon: Mail },
        ]
      },
      { name: 'Gestión Precios', href: '/gestion-precios', icon: TrendingUp },
      {
        name: 'Remesas',
        href: '/remesas',
        icon: Landmark,
        children: [
          { name: 'Lista', href: '/remesas', icon: FileText },
          { name: 'Crear', href: '/remesas/crear', icon: Plus },
        ]
      },
    ]
  },
  {
    label: 'SAT',
    requiredRoles: ['admin', 'tecnico', 'encargado'],
    items: [
      {
        name: 'SAT',
        href: '/sat',
        icon: Wrench,
        children: [
          { name: 'Tickets', href: '/sat/tickets', icon: TicketCheck },
          { name: 'Intervenciones', href: '/sat/intervenciones', icon: ClipboardList },
          { name: 'Contratos', href: '/sat/contratos', icon: FileText },
          { name: 'Equipos', href: '/sat/equipos', icon: Cpu },
          { name: 'Materiales', href: '/sat/materiales', icon: Package },
        ]
      },
      { name: 'Calendario', href: '/calendario', icon: Calendar },
      { name: 'Portal Cliente', href: '/portal/inicio', icon: Globe, external: true },
    ]
  },
  {
    label: 'ANÁLISIS Y SISTEMA',
    items: [
      {
        name: 'Reportes',
        href: '/reportes',
        icon: BarChart3,
        children: [
          { name: 'Dashboard', href: '/reportes', icon: PieChart },
          { name: 'Generar', href: '/reportes/generar', icon: FileText },
        ]
      },
      { name: 'Importar/Exportar', href: '/importar-exportar', icon: ArrowUpDown },
      { name: 'Configuración', href: '/configuracion', icon: Settings },
    ]
  }
]

// Helper: encontrar qué grupo expandible está activo según la ruta
function getActiveGroup(pathname) {
  for (const section of sections) {
    for (const item of section.items) {
      if (item.children && pathname.startsWith(item.href)) {
        return item.name
      }
    }
  }
  return null
}

// =====================================================
// Componente Sidebar
// =====================================================
export function Sidebar({ open, onClose, mobile, collapsed, onToggleCollapse }) {
  const location = useLocation()
  const { data: notasCount } = useNotasCount()
  const { data: comPendientes = 0 } = usePendientesCount()
  const { profile } = useAuth()

  // Acordeón: solo un grupo expandido a la vez
  const [expandedGroup, setExpandedGroup] = useState(() => getActiveGroup(location.pathname))

  // Flyout para modo colapsado (fixed positioning para evitar clip por overflow)
  const [flyoutItem, setFlyoutItem] = useState(null)
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0, height: 0 })
  const flyoutTimeout = useRef(null)

  // Auto-expandir el grupo activo al cambiar de ruta
  useEffect(() => {
    const activeGroup = getActiveGroup(location.pathname)
    if (activeGroup) {
      setExpandedGroup(activeGroup)
    }
  }, [location.pathname])

  const toggleExpanded = (name) => {
    setExpandedGroup(prev => prev === name ? null : name)
  }

  // Handlers del flyout (hover en modo colapsado)
  const handleFlyoutEnter = (itemName, element) => {
    if (flyoutTimeout.current) clearTimeout(flyoutTimeout.current)
    if (element) {
      const rect = element.getBoundingClientRect()
      setFlyoutPos({ top: rect.top, left: rect.right, height: rect.height })
    }
    setFlyoutItem(itemName)
  }

  const handleFlyoutLeave = () => {
    flyoutTimeout.current = setTimeout(() => setFlyoutItem(null), 200)
  }

  const isCollapsed = collapsed && !mobile

  // =====================================================
  // Render de un item en modo COLAPSADO (solo iconos)
  // =====================================================
  const renderCollapsedItem = (item) => {
    const isActive = location.pathname === item.href ||
      (item.children && location.pathname.startsWith(item.href))
    const hasChildren = item.children && item.children.length > 0
    const showFlyout = flyoutItem === item.name

    return (
      <li
        key={item.name}
        className="relative"
        onMouseEnter={(e) => handleFlyoutEnter(item.name, e.currentTarget)}
        onMouseLeave={handleFlyoutLeave}
      >
        {hasChildren ? (
          <>
            <button
              type="button"
              className={cn(
                'relative w-full flex items-center justify-center rounded-lg p-3 transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-primary-100 hover:bg-primary-600 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {/* Badge colapsado en items padre con children */}
              {item.hasBadge === 'comunicaciones' && comPendientes > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-primary-700">
                  {comPendientes > 9 ? '9+' : comPendientes}
                </span>
              )}
            </button>
            {/* Flyout submenu — fixed para no ser recortado por overflow del contenedor */}
            {showFlyout && (
              <div
                className="fixed z-[100]"
                style={{ top: `${flyoutPos.top}px`, left: `${flyoutPos.left + 4}px` }}
                onMouseEnter={() => handleFlyoutEnter(item.name)}
                onMouseLeave={handleFlyoutLeave}
              >
                <div className="bg-white rounded-lg shadow-xl border border-gray-200 py-1.5 min-w-[200px]">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    {item.name}
                  </div>
                  {item.children.map(child => {
                    const isChildActive = location.pathname === child.href
                    return (
                      <NavLink
                        key={child.name}
                        to={child.href}
                        onClick={() => setFlyoutItem(null)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                          isChildActive
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        {child.icon && <child.icon className="h-4 w-4" />}
                        {child.name}
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <NavLink
              to={item.href}
              className={cn(
                'relative flex items-center justify-center rounded-lg p-3 transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-primary-100 hover:bg-primary-600 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {/* Badge colapsado (punto con número) */}
              {item.hasBadge === true && notasCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-primary-700">
                  {notasCount > 9 ? '9+' : notasCount}
                </span>
              )}
              {item.hasBadge === 'comunicaciones' && comPendientes > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-primary-700">
                  {comPendientes > 9 ? '9+' : comPendientes}
                </span>
              )}
            </NavLink>
            {/* Tooltip — fixed positioning */}
            {showFlyout && (
              <div
                className="fixed z-[100] pointer-events-none"
                style={{
                  top: `${flyoutPos.top + flyoutPos.height / 2}px`,
                  left: `${flyoutPos.left + 8}px`,
                  transform: 'translateY(-50%)'
                }}
              >
                <div className="bg-gray-900 text-white text-xs rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                  {item.name}
                </div>
              </div>
            )}
          </>
        )}
      </li>
    )
  }

  // =====================================================
  // Render de un item en modo EXPANDIDO (normal/mobile)
  // =====================================================
  const renderExpandedItem = (item) => {
    const isActive = location.pathname === item.href ||
      (item.children && location.pathname.startsWith(item.href))
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedGroup === item.name

    return (
      <li key={item.name}>
        {hasChildren ? (
          <>
            <button
              type="button"
              onClick={() => toggleExpanded(item.name)}
              className={cn(
                'w-full group flex items-center gap-x-3 rounded-lg p-3 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-primary-100 hover:bg-primary-600 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.name}
              {/* Badge en items padre con children */}
              {item.hasBadge === 'comunicaciones' && comPendientes > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                  {comPendientes > 99 ? '99+' : comPendientes}
                </span>
              )}
              <ChevronDown className={cn(
                'ml-auto h-4 w-4 transition-transform duration-200',
                isExpanded && 'rotate-180'
              )} />
            </button>
            {/* Submenu con animación */}
            <div className={cn(
              'overflow-hidden transition-all duration-200 ease-in-out',
              isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            )}>
              <ul className="mt-1 space-y-0.5 pl-10">
                {item.children.map((child) => {
                  const isChildActive = location.pathname === child.href
                  return (
                    <li key={child.name}>
                      <NavLink
                        to={child.href}
                        onClick={mobile ? onClose : undefined}
                        className={cn(
                          'group flex items-center gap-x-2 rounded-lg px-3 py-2 text-sm transition-colors',
                          isChildActive
                            ? 'bg-primary-500 text-white'
                            : 'text-primary-200 hover:bg-primary-600 hover:text-white'
                        )}
                      >
                        {child.icon && <child.icon className="h-4 w-4" />}
                        {child.name}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          </>
        ) : (
          <NavLink
            to={item.href}
            onClick={mobile ? onClose : undefined}
            className={cn(
              'group flex items-center gap-x-3 rounded-lg p-3 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-600 text-white'
                : 'text-primary-100 hover:bg-primary-600 hover:text-white'
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.name}
            {/* Badge expandido (número) */}
            {item.hasBadge === true && notasCount > 0 && (
              <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                {notasCount > 99 ? '99+' : notasCount}
              </span>
            )}
            {item.hasBadge === 'comunicaciones' && comPendientes > 0 && (
              <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                {comPendientes > 99 ? '99+' : comPendientes}
              </span>
            )}
          </NavLink>
        )}
      </li>
    )
  }

  // =====================================================
  // Contenido del sidebar
  // =====================================================
  const content = (
    <div className={cn(
      'flex h-full grow flex-col overflow-hidden bg-primary-700',
      isCollapsed ? 'px-2.5' : 'px-4'
    )}>
      {/* Logo + Toggle */}
      <div className={cn(
        'flex shrink-0 items-center border-b border-primary-600/50 mb-3',
        isCollapsed ? 'h-16 justify-center' : 'h-16 gap-3 px-2'
      )}>
        {isCollapsed ? (
          <Logo variant="icon" size="sm" className="w-9 h-9" />
        ) : (
          <>
            <Logo variant="sidebar" size="md" theme="dark" />
            {mobile && (
              <button
                type="button"
                className="ml-auto text-primary-200 hover:text-white"
                onClick={onClose}
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Navegación con secciones (scrollable) */}
      <nav className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]" style={{ scrollbarColor: '#6d9e37 transparent' }}>
        <div className="flex flex-col gap-y-3">
          {sections
            .filter(section => {
              if (!section.requiredRoles) return true
              return section.requiredRoles.includes(profile?.rol)
            })
            .map((section, sIdx) => (
            <div key={section.label}>
              {/* Etiqueta de sección */}
              {isCollapsed ? (
                sIdx > 0 && <div className="my-1.5 mx-1 border-t border-primary-600/40" />
              ) : (
                <h3 className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary-400">
                  {section.label}
                </h3>
              )}
              {/* Items de la sección */}
              <ul role="list" className="space-y-0.5">
                {section.items.map((item) =>
                  isCollapsed ? renderCollapsedItem(item) : renderExpandedItem(item)
                )}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Botón colapsar/expandir (solo desktop) — siempre visible al fondo */}
      {!mobile && (
        <div className={cn(
          'shrink-0 pt-3 mt-1 border-t border-primary-600/50',
          isCollapsed ? 'flex justify-center pb-3' : ''
        )}>
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'flex items-center gap-2 rounded-lg p-2.5 text-sm text-primary-300 hover:bg-primary-600 hover:text-white transition-colors',
              isCollapsed ? 'justify-center' : 'w-full px-3'
            )}
            title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {isCollapsed ? (
              <ChevronsRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronsLeft className="h-5 w-5 shrink-0" />
                <span>Colapsar menú</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Footer */}
      {!isCollapsed && (
        <div className="shrink-0 pt-3 border-t border-primary-600/50 pb-3">
          <p className="text-[10px] text-primary-400 text-center">
            v2.0.0 · A360 Servicios Energéticos
          </p>
        </div>
      )}
    </div>
  )

  // =====================================================
  // Versión móvil (drawer con overlay)
  // =====================================================
  if (mobile) {
    return (
      <>
        <div
          className={cn(
            'fixed inset-0 z-50 bg-gray-900/80 transition-opacity lg:hidden',
            open ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={onClose}
        />
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
