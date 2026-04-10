import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, isCliente, isTecnico } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Si es cliente y NO está ya en /portal, redirigir al portal
  if (isCliente && !location.pathname.startsWith('/portal')) {
    return <Navigate to="/portal/inicio" replace />
  }

  // Si es técnico y aterriza en dashboard o raíz, redirigir a su agenda
  if (isTecnico && (location.pathname === '/dashboard' || location.pathname === '/')) {
    return <Navigate to="/sat/mi-agenda" replace />
  }

  return children
}
