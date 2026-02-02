import { BarChart } from './charts'

export function GraficoComunidades({ datos = [] }) {
  if (datos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay datos disponibles
      </div>
    )
  }

  // Transformar datos para Recharts - tomar top 5
  const chartData = datos
    .slice(0, 5)
    .map(item => ({
      name: item.comunidad,
      total: item.total || 0
    }))

  const bars = [
    { dataKey: 'total', name: 'Facturación', color: '#3b82f6' }
  ]

  return (
    <BarChart 
      data={chartData} 
      bars={bars} 
      height={280}
      xDataKey="name"
      layout="vertical"
    />
  )
}



