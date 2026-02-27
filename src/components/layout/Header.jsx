import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { Logo } from '@/components/brand/Logo'
import { usePendientesCount } from '@/hooks/useComunicaciones'
import { Menu, Bell, LogOut, User } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export function Header({ onMenuClick }) {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { data: pendientesCount = 0 } = usePendientesCount()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    // signOut ahora maneja errores internamente, siempre limpia el estado
    await signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-primary-100 bg-white/95 backdrop-blur-sm px-4 shadow-soft sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Botón menú móvil + Logo */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-700 hover:text-primary-600 transition-colors"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </button>
        <Logo variant="icon" size="sm" className="w-8 h-8" />
      </div>

      {/* Separador */}
      <div className="h-6 w-px bg-primary-100 lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Espacio flexible */}
        <div className="flex-1" />

        {/* Acciones de la derecha */}
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Notificaciones — badge con pendientes */}
          <button
            type="button"
            className="relative -m-2.5 p-2.5 text-gray-400 hover:text-gray-500 transition-colors"
            onClick={() => navigate('/comunicaciones')}
            title={pendientesCount > 0 ? `${pendientesCount} mensajes pendientes` : 'Comunicaciones'}
          >
            <Bell className="h-6 w-6" />
            {pendientesCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {pendientesCount > 99 ? '99+' : pendientesCount}
              </span>
            )}
          </button>

          {/* Separador */}
          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />

          {/* Menú de usuario */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              className="-m-1.5 flex items-center p-1.5 hover:opacity-80 transition-opacity"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 ring-2 ring-primary-500/20">
                <User className="h-5 w-5 text-primary-600" />
              </div>
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-3 text-sm font-medium text-gray-700">
                  {profile?.nombre_completo || user?.email}
                </span>
              </span>
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 z-10 mt-2.5 w-56 origin-top-right rounded-xl bg-white py-2 shadow-primary ring-1 ring-primary-100/50 animate-in">
                <div className="px-4 py-3 border-b border-primary-50">
                  <p className="text-sm font-semibold text-gray-900">
                    {profile?.nombre_completo || 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}






