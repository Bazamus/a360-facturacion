import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/AuthContext'

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true'
  })
  const { isTecnico } = useAuth()

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar móvil — oculto para técnico (usan bottom nav) */}
      {!isTecnico && (
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          mobile
        />
      )}

      {/* Sidebar desktop — siempre visible en lg+ */}
      <div className={cn(
        'hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300',
        collapsed ? 'lg:w-[72px]' : 'lg:w-64'
      )}>
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
        />
      </div>

      {/* Contenido principal */}
      <div className={cn(
        'transition-all duration-300',
        collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
      )}>
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          hideMenu={isTecnico}
        />

        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
