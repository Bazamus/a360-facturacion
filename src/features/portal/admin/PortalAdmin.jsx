import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, Badge, LoadingSpinner, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import { Users, UserPlus, BarChart3, Globe } from 'lucide-react'
import { CrearCredencialesMasivas } from './CrearCredencialesMasivas'

// Stats del portal
function usePortalAdminStats() {
  return useQuery({
    queryKey: ['portal-admin-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_portal_admin_stats')
      if (error) throw error
      return data
    },
    refetchInterval: 60000,
  })
}

// Clientes con cuenta activa
function useClientesConCuenta() {
  return useQuery({
    queryKey: ['clientes-con-cuenta'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_usuarios')
        .select('*')
        .eq('rol', 'cliente')
        .order('last_sign_in_at', { ascending: false, nullsFirst: false })
      if (error) throw error
      return data ?? []
    },
  })
}

function formatDate(d) {
  if (!d) return 'Nunca'
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function PortalAdmin() {
  const { data: stats, isLoading: loadingStats } = usePortalAdminStats()
  const { data: clientesConCuenta, isLoading: loadingClientes } = useClientesConCuenta()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary-600" />
          Gestión Portal Cliente
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Administración de accesos y credenciales del portal de clientes
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          label="Clientes con email"
          value={stats?.total_clientes ?? '-'}
          loading={loadingStats}
        />
        <StatCard
          label="Con acceso al portal"
          value={stats?.clientes_con_cuenta ?? '-'}
          highlight
          loading={loadingStats}
        />
        <StatCard
          label="Sin cuenta creada"
          value={stats?.clientes_sin_cuenta ?? '-'}
          loading={loadingStats}
        />
        <StatCard
          label="Tickets desde portal"
          value={stats?.tickets_portal ?? '-'}
          loading={loadingStats}
        />
      </div>

      {/* Tabs */}
      <Card>
        <Tabs defaultValue="credenciales">
          <TabsList className="px-6">
            <TabsTrigger value="credenciales">
              <UserPlus className="h-4 w-4 mr-1.5" /> Crear Credenciales
            </TabsTrigger>
            <TabsTrigger value="clientes">
              <Users className="h-4 w-4 mr-1.5" /> Clientes con Acceso ({clientesConCuenta?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="credenciales" className="p-6">
            <CrearCredencialesMasivas />
          </TabsContent>

          <TabsContent value="clientes" className="p-6">
            {loadingClientes ? (
              <div className="py-8 flex justify-center"><LoadingSpinner size="lg" /></div>
            ) : !clientesConCuenta?.length ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No hay clientes con acceso al portal</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="pb-2 font-medium">Nombre</th>
                      <th className="pb-2 font-medium">Email</th>
                      <th className="pb-2 font-medium">Estado</th>
                      <th className="pb-2 font-medium">Último acceso</th>
                      <th className="pb-2 font-medium">Creado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clientesConCuenta.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="py-2.5 font-medium text-gray-900">{u.nombre_completo}</td>
                        <td className="py-2.5 text-gray-600">{u.email}</td>
                        <td className="py-2.5">
                          <Badge variant={u.activo ? 'success' : 'default'} className="text-xs">
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-gray-500 text-xs">{formatDate(u.last_sign_in_at)}</td>
                        <td className="py-2.5 text-gray-500 text-xs">{formatDate(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

function StatCard({ label, value, highlight, loading }) {
  return (
    <Card className={highlight ? 'ring-2 ring-primary-200' : ''}>
      <CardContent className="p-4 text-center">
        {loading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <p className={`text-2xl font-bold ${highlight ? 'text-primary-700' : 'text-gray-900'}`}>{value}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </CardContent>
    </Card>
  )
}
