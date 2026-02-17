import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function RoleProtectedRoute({ children, roles = [], fallback = '/dashboard' }) {
  const { profile, loading } = useAuth()

  if (loading) return null

  if (!profile || !roles.includes(profile.rol)) {
    return <Navigate to={fallback} replace />
  }

  return children
}
