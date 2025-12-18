import { Mail, Check, Eye, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

export function EnviosStats({ stats = {} }) {
  const cards = [
    {
      label: 'Enviados',
      value: stats.total || 0,
      icon: Mail,
      color: 'blue',
      description: 'Total de emails enviados'
    },
    {
      label: 'Entregados',
      value: stats.entregados || 0,
      icon: Check,
      color: 'green',
      percentage: stats.tasaEntrega,
      description: `${stats.tasaEntrega || 0}% del total`
    },
    {
      label: 'Abiertos',
      value: stats.abiertos || 0,
      icon: Eye,
      color: 'emerald',
      percentage: stats.tasaApertura,
      description: `${stats.tasaApertura || 0}% tasa apertura`
    },
    {
      label: 'Rebotados',
      value: stats.rebotados || 0,
      icon: AlertTriangle,
      color: 'amber',
      percentage: stats.tasaRebote,
      description: `${stats.tasaRebote || 0}% tasa rebote`,
      isNegative: true
    }
  ]

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'bg-blue-100 text-blue-600',
      text: 'text-blue-600'
    },
    green: {
      bg: 'bg-green-50',
      icon: 'bg-green-100 text-green-600',
      text: 'text-green-600'
    },
    emerald: {
      bg: 'bg-emerald-50',
      icon: 'bg-emerald-100 text-emerald-600',
      text: 'text-emerald-600'
    },
    amber: {
      bg: 'bg-amber-50',
      icon: 'bg-amber-100 text-amber-600',
      text: 'text-amber-600'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        const colors = colorClasses[card.color]

        return (
          <div
            key={card.label}
            className={`${colors.bg} rounded-xl p-5 border border-${card.color}-100`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{card.value}</p>
                <p className="mt-1 text-sm text-gray-500">{card.description}</p>
              </div>
              <div className={`p-3 rounded-lg ${colors.icon}`}>
                <Icon size={24} />
              </div>
            </div>
            
            {card.percentage !== undefined && (
              <div className="mt-3 flex items-center gap-1">
                {card.isNegative ? (
                  card.percentage > 5 ? (
                    <TrendingUp size={14} className="text-red-500" />
                  ) : (
                    <TrendingDown size={14} className="text-green-500" />
                  )
                ) : (
                  card.percentage > 80 ? (
                    <TrendingUp size={14} className="text-green-500" />
                  ) : (
                    <TrendingDown size={14} className="text-amber-500" />
                  )
                )}
                <span className={`text-sm font-medium ${colors.text}`}>
                  {card.percentage}%
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}



