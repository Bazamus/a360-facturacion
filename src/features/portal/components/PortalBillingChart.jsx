import { usePortalHistorial } from '@/hooks/usePortal'
import { Card, CardContent, LoadingSpinner } from '@/components/ui'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp } from 'lucide-react'

function formatCurrency(value) {
  return `${Number(value).toFixed(0)} €`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-gray-900 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {Number(p.value).toFixed(2)} €
        </p>
      ))}
    </div>
  )
}

export function PortalBillingChart() {
  const { data: historial, isLoading } = usePortalHistorial(12)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <LoadingSpinner size="sm" />
        </CardContent>
      </Card>
    )
  }

  if (!historial?.length) return null

  return (
    <Card>
      <div className="p-4 border-b border-gray-200 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-medium text-gray-900">Evolución de facturación</h3>
        <span className="text-xs text-gray-400 ml-auto">Últimos 12 meses</span>
      </div>
      <CardContent className="p-4">
        <div style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historial} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="mes_label"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Bar dataKey="pagado" name="Pagado" fill="#10b981" radius={[3, 3, 0, 0]} stackId="stack" />
              <Bar dataKey="pendiente" name="Pendiente" fill="#f59e0b" radius={[3, 3, 0, 0]} stackId="stack" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
