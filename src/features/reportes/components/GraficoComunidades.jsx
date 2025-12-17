export function GraficoComunidades({ datos = [] }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const maxValor = Math.max(...datos.map(d => d.total || 0), 1)

  if (datos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay datos disponibles
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {datos.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 truncate max-w-[200px]">
              {item.comunidad}
            </span>
            <span className="text-gray-600">{formatCurrency(item.total)}</span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${(item.total / maxValor) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

