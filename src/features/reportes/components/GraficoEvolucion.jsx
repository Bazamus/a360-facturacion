const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function GraficoEvolucion({ datos = [] }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const maxValor = Math.max(...datos.map(d => d.facturado || 0), 1)

  if (datos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay datos disponibles
      </div>
    )
  }

  return (
    <div className="h-64">
      <div className="flex items-end justify-between h-48 gap-1 mb-2">
        {datos.map((item, index) => {
          const altura = (item.facturado / maxValor) * 100
          const alturaCobrado = (item.cobrado / maxValor) * 100
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center group relative">
              <div className="w-full flex flex-col justify-end h-48 gap-0.5">
                {/* Barra de facturado */}
                <div 
                  className="w-full bg-blue-200 rounded-t transition-all duration-300 group-hover:bg-blue-300"
                  style={{ height: `${Math.max(altura - alturaCobrado, 0)}%` }}
                  title={`Pendiente: ${formatCurrency(item.facturado - item.cobrado)}`}
                />
                {/* Barra de cobrado */}
                <div 
                  className="w-full bg-blue-500 rounded-b transition-all duration-300 group-hover:bg-blue-600"
                  style={{ height: `${alturaCobrado}%` }}
                  title={`Cobrado: ${formatCurrency(item.cobrado)}`}
                />
              </div>
              
              {/* Tooltip */}
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                <div>Facturado: {formatCurrency(item.facturado)}</div>
                <div>Cobrado: {formatCurrency(item.cobrado)}</div>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Etiquetas de meses */}
      <div className="flex justify-between text-xs text-gray-500">
        {datos.map((item, index) => (
          <div key={index} className="flex-1 text-center">
            {MESES[item.mes - 1]}
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span className="text-gray-600">Cobrado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-200 rounded" />
          <span className="text-gray-600">Pendiente</span>
        </div>
      </div>
    </div>
  )
}



