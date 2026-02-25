import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/DataTable'
import { Pagination } from '@/components/ui/Pagination'
import { formatDateTime, formatNumber } from '@/lib/utils'
import { useHistorialAjustes } from '@/hooks/useGestionPrecios'

const TIPO_LABELS = {
  factor_conversion: { label: 'Factor conversión', variant: 'primary' },
  ipc: { label: 'IPC', variant: 'info' },
  manual: { label: 'Manual', variant: 'default' },
  descuento: { label: 'Descuento', variant: 'warning' }
}

/**
 * Tab Historial — log de ajustes de precios
 */
export function HistorialAjustesTab() {
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data: resultado, isLoading } = useHistorialAjustes({ page, pageSize })
  const historial = resultado?.data || []
  const totalItems = resultado?.count || 0
  const totalPages = Math.ceil(totalItems / pageSize)

  const columns = [
    {
      key: 'created_at',
      header: 'Fecha',
      render: (val) => formatDateTime(val)
    },
    {
      key: 'tipo_ajuste',
      header: 'Tipo',
      render: (val) => {
        const info = TIPO_LABELS[val] || TIPO_LABELS.manual
        return <Badge variant={info.variant}>{info.label}</Badge>
      }
    },
    {
      key: 'referencia',
      header: 'Referencia',
      render: (val) => val ? (
        <span className="text-xs font-medium">{val.replace('_', ' ')}</span>
      ) : '—'
    },
    {
      key: 'factor',
      header: 'Factor',
      render: (val, row) => {
        if (row.porcentaje_ipc != null) {
          return <span className="font-mono">{formatNumber(row.porcentaje_ipc, 2)}% IPC</span>
        }
        return val ? <span className="font-mono">{formatNumber(val, 5)}</span> : '—'
      }
    },
    {
      key: 'conceptos_aplicados',
      header: 'Conceptos',
      render: (val) => val?.length ? (
        <div className="flex gap-1">
          {val.map(c => (
            <Badge key={c} variant="primary">{c}</Badge>
          ))}
        </div>
      ) : '—'
    },
    {
      key: 'comunidades_aplicadas',
      header: 'Comunidades',
      render: (val) => val?.length ? (
        <span className="text-sm">{val.length}</span>
      ) : '—'
    },
    {
      key: 'total_precios_actualizados',
      header: 'Precios actualizados',
      render: (val) => val != null ? (
        <span className="font-medium">{val}</span>
      ) : '—'
    }
  ]

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Registro de todas las operaciones de ajuste de precios realizadas
      </p>

      <DataTable
        data={historial}
        columns={columns}
        loading={isLoading}
        emptyMessage="Sin historial"
        emptyDescription="Aún no se han realizado operaciones de ajuste de precios"
        pageSize={pageSize}
        sortable={false}
      />

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={pageSize}
          onPageChange={setPage}
          showPageSizeSelector={false}
        />
      )}
    </div>
  )
}
