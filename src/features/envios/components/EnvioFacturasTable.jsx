import { useState } from 'react'
import { DataTable, Checkbox } from '../../../components/ui'
import { EstadoEnvioBadge } from './EstadoEnvioBadge'
import { Mail, AlertTriangle, Eye } from 'lucide-react'

export function EnvioFacturasTable({
  facturas = [],
  selectedIds = [],
  onSelectionChange,
  onViewFactura,
  isLoading,
  totalCount,
  page,
  onPageChange
}) {
  const facturasConEmail = facturas.filter(f => f.cliente_email && f.estado_envio !== 'enviado')
  
  const handleSelectAll = (checked) => {
    if (checked) {
      onSelectionChange(facturasConEmail.map(f => f.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectOne = (facturaId, checked) => {
    if (checked) {
      onSelectionChange([...selectedIds, facturaId])
    } else {
      onSelectionChange(selectedIds.filter(id => id !== facturaId))
    }
  }

  const allSelected = facturasConEmail.length > 0 && 
    facturasConEmail.every(f => selectedIds.includes(f.id))

  const someSelected = selectedIds.length > 0 && !allSelected

  const columns = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected}
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
      ),
      render: (_, row) => {
        const canSelect = row?.cliente_email && row?.estado_envio !== 'enviado'
        return (
          <Checkbox
            checked={selectedIds.includes(row?.id)}
            onChange={(e) => handleSelectOne(row?.id, e.target.checked)}
            disabled={!canSelect}
          />
        )
      },
      width: '40px',
      sortable: false
    },
    {
      key: 'numero_completo',
      header: 'Nº Factura',
      render: (value) => (
        <span className="font-medium text-gray-900">
          {value || '-'}
        </span>
      )
    },
    {
      key: 'cliente_nombre',
      header: 'Cliente',
      render: (value) => (
        <div>
          <p className="font-medium text-gray-900">{value || '-'}</p>
        </div>
      )
    },
    {
      key: 'cliente_email',
      header: 'Email',
      render: (value) => {
        if (!value) {
          return (
            <span className="inline-flex items-center gap-1 text-amber-600">
              <AlertTriangle size={14} />
              Sin email
            </span>
          )
        }
        return (
          <span className="text-gray-600 text-sm">
            {value}
          </span>
        )
      }
    },
    {
      key: 'total',
      header: 'Total',
      render: (value) => (
        <span className="font-medium">
          {new Intl.NumberFormat('es-ES', { 
            style: 'currency', 
            currency: 'EUR' 
          }).format(value || 0)}
        </span>
      ),
      align: 'right'
    },
    {
      key: 'estado_envio',
      header: 'Estado',
      render: (value) => {
        if (value === 'sin_email') {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle size={12} />
              Sin Email
            </span>
          )
        }
        if (value === 'enviado') {
          return <EstadoEnvioBadge estado="enviado" />
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
            <Mail size={12} />
            Pendiente
          </span>
        )
      }
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <button
          onClick={() => onViewFactura?.(row?.id)}
          className="p-1 text-gray-400 hover:text-gray-600"
          title="Ver factura"
        >
          <Eye size={16} />
        </button>
      ),
      width: '40px',
      sortable: false
    }
  ]

  return (
    <div>
      {/* Resumen de selección */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              const pageIds = facturasConEmail.map(f => f.id)
              const merged = [...new Set([...selectedIds, ...pageIds])]
              onSelectionChange(merged)
            }}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Seleccionar página actual ({facturasConEmail.length})
          </button>
          {selectedIds.length > 0 && (
            <span className="text-sm text-gray-600">
              {selectedIds.length} seleccionadas en total
            </span>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={facturas}
        isLoading={isLoading}
        emptyMessage="No hay facturas pendientes de envío"
        pageSize={50}
        totalCount={totalCount}
        page={page}
        onPageChange={onPageChange}
      />
    </div>
  )
}

