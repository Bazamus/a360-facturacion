import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
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
    // Guardar la ubicación actual para redireccionar después del login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}






