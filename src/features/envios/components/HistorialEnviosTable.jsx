import { DataTable } from '../../../components/ui'
import { EstadoEnvioBadge } from './EstadoEnvioBadge'
import { Eye, RefreshCw } from 'lucide-react'

export function HistorialEnviosTable({ 
  envios = [], 
  isLoading,
  onViewDetalle,
  onReintentar
}) {
  const formatFecha = (fecha) => {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const columns = [
    {
      key: 'created_at',
      header: 'Fecha',
      render: (value) => (
        <span className="text-sm text-gray-600">
          {formatFecha(value)}
        </span>
      )
    },
    {
      key: 'factura',
      header: 'Factura',
      render: (_, row) => (
        <span className="font-medium text-gray-900">
          {row?.factura?.numero_completo || '-'}
        </span>
      ),
      sortable: false
    },
    {
      key: 'email_destino',
      header: 'Destinatario',
      render: (value, row) => (
        <div>
          <p className="text-sm text-gray-900">{value || '-'}</p>
          {row?.cliente && (
            <p className="text-xs text-gray-500">
              {row.cliente.nombre} {row.cliente.apellidos}
            </p>
          )}
        </div>
      )
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (value, row) => (
        <div className="flex flex-col gap-1">
          <EstadoEnvioBadge estado={value} />
          {row?.intentos > 1 && (
            <span className="text-xs text-gray-400">
              {row.intentos} intentos
            </span>
          )}
        </div>
      )
    },
    {
      key: 'tracking',
      header: 'Tracking',
      render: (_, row) => {
        const eventos = []
        if (row?.fecha_enviado) {
          eventos.push(`Enviado: ${formatFecha(row.fecha_enviado)}`)
        }
        if (row?.fecha_entregado) {
          eventos.push(`Entregado: ${formatFecha(row.fecha_entregado)}`)
        }
        if (row?.fecha_abierto) {
          eventos.push(`Abierto: ${formatFecha(row.fecha_abierto)}`)
        }
        if (row?.fecha_rebote) {
          eventos.push(`Rebotado: ${formatFecha(row.fecha_rebote)}`)
        }

        return (
          <div className="text-xs text-gray-500 space-y-0.5">
            {eventos.length > 0 ? (
              eventos.map((evento, idx) => (
                <p key={idx}>{evento}</p>
              ))
            ) : (
              <p>-</p>
            )}
          </div>
        )
      },
      sortable: false
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              console.log('Ver detalle clicked, row.id:', row?.id)
              if (onViewDetalle && row?.id) {
                onViewDetalle(row.id)
              }
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded cursor-pointer"
            title="Ver detalle"
          >
            <Eye size={16} />
          </button>
          {(row?.estado === 'fallido' || row?.estado === 'rebotado') && 
           row?.tipo_rebote !== 'hard' && 
           row?.intentos < row?.max_intentos && (
            <button
              onClick={() => onReintentar?.(row?.id)}
              className="p-1.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded"
              title="Reintentar envío"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </div>
      ),
      width: '80px',
      sortable: false
    }
  ]

  return (
    <DataTable
      columns={columns}
      data={envios}
      isLoading={isLoading}
      emptyMessage="No hay envíos en el historial"
    />
  )
}

