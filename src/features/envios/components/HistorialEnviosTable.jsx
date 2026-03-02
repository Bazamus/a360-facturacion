import { DataTable } from '../../../components/ui'
import { EstadoEnvioBadge } from './EstadoEnvioBadge'
import { Eye, RefreshCw, OctagonX } from 'lucide-react'

export function HistorialEnviosTable({
  envios = [],
  isLoading,
  onViewDetalle,
  onReintentar,
  onMarcarFallido,
  pagination
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
        <span className="text-xs text-gray-600">
          {formatFecha(value)}
        </span>
      )
    },
    {
      key: 'numero_completo',
      header: 'Factura',
      render: (value) => (
        <span className="font-medium text-gray-900 text-sm">
          {value || '-'}
        </span>
      ),
      sortable: false
    },
    {
      key: 'codigo_cliente',
      header: 'Cód.',
      render: (value) => (
        <span className="font-mono text-xs text-gray-600">
          {value || '-'}
        </span>
      ),
      sortable: false
    },
    {
      key: 'email_destino',
      header: 'Destinatario',
      render: (value, row) => (
        <div>
          {row?.cliente_nombre && (
            <p className="text-sm text-gray-900 truncate max-w-[150px]">
              {row.cliente_nombre}
            </p>
          )}
          <p className="text-xs text-gray-500 truncate max-w-[150px]">{value || '-'}</p>
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
          eventos.push(`Env: ${formatFecha(row.fecha_enviado)}`)
        }
        if (row?.fecha_entregado) {
          eventos.push(`Ent: ${formatFecha(row.fecha_entregado)}`)
        }
        if (row?.fecha_abierto) {
          eventos.push(`Abie: ${formatFecha(row.fecha_abierto)}`)
        }
        if (row?.fecha_rebotado) {
          eventos.push(`Reb: ${formatFecha(row.fecha_rebotado)}`)
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
              if (onViewDetalle && row?.id) {
                onViewDetalle(row.id)
              }
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded cursor-pointer"
            title="Ver detalle"
          >
            <Eye size={16} />
          </button>
          {row?.estado === 'enviando' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMarcarFallido?.(row?.id)
              }}
              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
              title="Marcar como fallido"
            >
              <OctagonX size={16} />
            </button>
          )}
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
      width: '70px',
      sortable: false
    }
  ]

  // Si hay paginación externa (del servidor), renderizar tabla personalizada
  if (pagination) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <DataTable
          columns={columns}
          data={envios}
          loading={isLoading}
          emptyMessage="No hay envíos en el historial"
          pageSize={999999} // Desactivar paginación interna
        />

        {/* Paginación externa (del servidor) */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Mostrando {((pagination.currentPage - 1) * pagination.pageSize) + 1} - {Math.min(pagination.currentPage * pagination.pageSize, pagination.total)} de {pagination.total} envíos
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-600">
                Página {pagination.currentPage} de {pagination.totalPages}
              </span>
              <button
                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Sin paginación externa, usar DataTable con su paginación interna
  return (
    <DataTable
      columns={columns}
      data={envios}
      loading={isLoading}
      emptyMessage="No hay envíos en el historial"
    />
  )
}

