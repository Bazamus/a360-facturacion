import { TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useComunidades } from '@/hooks'
import { useConceptos } from '@/hooks'
import { FactorEnergeticoTab } from '@/features/precios/components/FactorEnergeticoTab'
import { IPCFijosTab } from '@/features/precios/components/IPCFijosTab'
import { DescuentosTab } from '@/features/precios/components/DescuentosTab'
import { HistorialAjustesTab } from '@/features/precios/components/HistorialAjustesTab'

export default function GestionPreciosPage() {
  const { data: comunidades, isLoading: loadingCom } = useComunidades()
  const { data: conceptos, isLoading: loadingConc } = useConceptos()

  const comunidadesActivas = (comunidades || []).filter(c => c.activa !== false)
  const conceptosActivos = (conceptos || []).filter(c => c.activo)

  if (loadingCom || loadingConc) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary-100">
          <TrendingUp className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Precios</h1>
          <p className="text-sm text-gray-500">Actualización centralizada de precios y descuentos</p>
        </div>
      </div>

      {/* Tabs */}
      <Card>
        <Tabs defaultValue="factor">
          <TabsList className="px-6">
            <TabsTrigger value="factor">Factor Energético</TabsTrigger>
            <TabsTrigger value="ipc">IPC Conceptos Fijos</TabsTrigger>
            <TabsTrigger value="descuentos">Descuentos</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="factor" className="p-6">
            <FactorEnergeticoTab
              comunidades={comunidadesActivas}
              conceptos={conceptosActivos}
            />
          </TabsContent>

          <TabsContent value="ipc" className="p-6">
            <IPCFijosTab
              comunidades={comunidadesActivas}
              conceptos={conceptosActivos}
            />
          </TabsContent>

          <TabsContent value="descuentos" className="p-6">
            <DescuentosTab
              comunidades={comunidadesActivas}
              conceptos={conceptosActivos}
            />
          </TabsContent>

          <TabsContent value="historial" className="p-6">
            <HistorialAjustesTab />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
