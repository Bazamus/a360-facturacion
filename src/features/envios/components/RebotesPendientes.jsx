import { AlertTriangle, RefreshCw, Mail, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const tipoReboteLabels = {
  hard: 'Rebote permanente',
  soft: 'Rebote temporal',
  spam: 'Marcado como spam'
}

export function RebotesPendientes({ rebotes = [], isLoading, onReintentar }) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (rebotes.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-amber-200">
      <div className="flex items-center justify-between p-4 border-b border-amber-100 bg-amber-50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-amber-500" size={20} />
          <h3 className="font-semibold text-amber-800">
            Rebotes Pendientes de Revisar ({rebotes.length})
          </h3>
        </div>
        <button
          onClick={() => navigate('/clientes')}
          className="text-sm text-amber-700 hover:text-amber-800 flex items-center gap-1"
        >
          Actualizar emails
          <ExternalLink size={14} />
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {rebotes.map((rebote) => (
          <div
            key={rebote.id}
            className="p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">
                    {rebote.factura?.numero_completo || 'N/A'}
                  </span>
                  <span className="px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700">
                    {tipoReboteLabels[rebote.tipo_rebote] || 'Rebote'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {rebote.cliente?.nombre} {rebote.cliente?.apellidos}
                </p>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Mail size={12} />
                  {rebote.email_destino}
                </p>
                {rebote.mensaje_rebote && (
                  <p className="text-xs text-red-600 mt-1">
                    {rebote.mensaje_rebote}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {rebote.tipo_rebote !== 'hard' && (
                  <button
                    onClick={() => onReintentar?.(rebote.id)}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg flex items-center gap-1"
                    title="Reintentar envío"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

