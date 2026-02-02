import { BarChart } from './charts'

// Función para truncar nombres largos
const truncarNombre = (nombre, maxLength = 25) => {
  if (!nombre) return ''
  if (nombre.length <= maxLength) return nombre
  return nombre.substring(0, maxLength - 3) + '...'
}

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
      name: truncarNombre(item.comunidad, 25),
      nombreCompleto: item.comunidad, // Guardar nombre completo para tooltip
      total: item.total || 0
    }))

  const bars = [
    { dataKey: 'total', name: 'Facturación', color: '#3b82f6' }
  ]

  return (
    <div className="w-full">
      <BarChart 
        data={chartData} 
        bars={bars} 
        height={280}
        xDataKey="name"
        layout="vertical"
      />
    </div>
  )
}



