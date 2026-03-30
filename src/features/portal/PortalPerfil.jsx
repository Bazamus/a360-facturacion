import { usePortalDatos } from '@/hooks/usePortal'
import { Card, CardContent, LoadingSpinner } from '@/components/ui'
import { User, Mail, Phone, MapPin } from 'lucide-react'

export function PortalPerfil() {
  const { data: portal, isLoading } = usePortalDatos()

  if (isLoading) return <div className="py-12 flex justify-center"><LoadingSpinner size="lg" /></div>

  const c = portal?.cliente
  if (!c) return <p className="text-gray-500">No se encontraron datos del perfil</p>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-sm text-gray-500">Información de tu cuenta</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{c.nombre} {c.apellidos}</h2>
              <p className="text-sm text-gray-500">Cliente</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-500">Contacto</h3>
              {c.email && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Mail className="h-4 w-4 text-gray-400" /> {c.email}
                </div>
              )}
              {c.telefono && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone className="h-4 w-4 text-gray-400" /> {c.telefono}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-500">Dirección</h3>
              {(c.direccion || c.cp || c.ciudad) ? (
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    {c.direccion && <p>{c.direccion}</p>}
                    {(c.cp || c.ciudad) && <p>{[c.cp, c.ciudad].filter(Boolean).join(' ')}</p>}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Sin dirección registrada</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400 text-center">
        Para actualizar tus datos de contacto, ponte en contacto con A360 Servicios Energéticos.
      </p>
    </div>
  )
}
