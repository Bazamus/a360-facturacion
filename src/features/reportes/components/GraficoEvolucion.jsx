import { LineChart } from './charts'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function GraficoEvolucion({ datos = [] }) {
  if (datos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay datos disponibles
      </div>
    )
  }

  // Transformar datos para Recharts
  const chartData = datos.map(item => ({
    mes: MESES[item.mes - 1] || item.mes,
    facturado: item.facturado || 0,
    cobrado: item.cobrado || 0,
    pendiente: (item.facturado || 0) - (item.cobrado || 0)
  }))

  const lines = [
    { dataKey: 'facturado', name: 'Facturado', color: '#3b82f6' },
    { dataKey: 'cobrado', name: 'Cobrado', color: '#10b981' },
    { dataKey: 'pendiente', name: 'Pendiente', color: '#f59e0b' }
  ]

  return (
    <LineChart 
      data={chartData} 
      lines={lines} 
      height={280}
      xDataKey="mes"
    />
  )
}



