import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/DataTable'
import { ConfirmModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'
import { DescuentoForm } from './DescuentoForm'
import {
  useDescuentosVigentes,
  useCrearDescuento,
  useEliminarDescuento
} from '@/hooks/useGestionPrecios'

/**
 * Tab Descuentos — gestión de descuentos puntuales
 */
export function DescuentosTab({ comunidades = [], conceptos = [] }) {
  const toast = useToast()
  const [showForm, setShowForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const { data: descuentos, isLoading } = useDescuentosVigentes()
  const crear = useCrearDescuento()
  const eliminar = useEliminarDescuento()

  const handleCrear = async (data) => {
    try {
      await crear.mutateAsync(data)
      toast.success('Descuento creado correctamente')
      setShowForm(false)
    } catch (err) {
      toast.error('Error al crear descuento: ' + err.message)
    }
  }

  const handleEliminar = async () => {
    if (!confirmDelete) return
    try {
      await eliminar.mutateAsync(confirmDelete)
      toast.success('Descuento eliminado')
      setConfirmDelete(null)
    } catch (err) {
      toast.error('Error al eliminar: ' + err.message)
    }
  }

  const columns = [
    {
      key: 'comunidad',
      header: 'Comunidad',
      render: (_, row) => (
        <div>
          <span className="font-medium">{row.comunidad?.codigo}</span>
          <span className="ml-1.5 text-gray-500 text-xs">{row.comunidad?.nombre}</span>
        </div>
      )
    },
    {
      key: 'concepto',
      header: 'Concepto',
      render: (_, row) => (
        <Badge variant="primary">{row.concepto?.codigo}</Badge>
      )
    },
    {
      key: 'porcentaje',
      header: 'Descuento',
      render: (val) => (
        <span className="font-mono font-medium text-red-600">{val}%</span>
      )
    },
    {
      key: 'fecha_inicio',
      header: 'Inicio',
      render: (val) => formatDate(val)
    },
    {
      key: 'fecha_fin',
      header: 'Expiración',
      render: (val) => {
        const hoy = new Date().toISOString().split('T')[0]
        const expirado = val < hoy
        return (
          <span className={expirado ? 'text-red-500' : ''}>
            {formatDate(val)}
          </span>
        )
      }
    },
    {
      key: 'aplicado',
      header: 'Estado',
      render: (val) => (
        <Badge variant={val ? 'success' : 'warning'}>
          {val ? 'Aplicado' : 'Pendiente'}
        </Badge>
      )
    },
    {
      key: 'motivo',
      header: 'Motivo',
      cellClassName: 'whitespace-normal max-w-[200px]',
      render: (val) => (
        <span className="text-gray-500 text-xs">{val || '—'}</span>
      )
    },
    {
      key: 'acciones',
      header: 'Acciones',
      sortable: false,
      render: (_, row) => (
        !row.aplicado && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setConfirmDelete(row.id)
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        )
      )
    }
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Descuentos puntuales por concepto y comunidad con fecha de expiración
        </p>
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo descuento
        </Button>
      </div>

      {/* Tabla */}
      <DataTable
        data={descuentos || []}
        columns={columns}
        loading={isLoading}
        emptyMessage="Sin descuentos"
        emptyDescription="Crea un descuento puntual para aplicar en las próximas facturas"
        pageSize={15}
      />

      {/* Form modal */}
      <DescuentoForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleCrear}
        comunidades={comunidades}
        conceptos={conceptos}
        loading={crear.isPending}
      />

      {/* Confirm delete */}
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleEliminar}
        title="Eliminar descuento"
        description="Se eliminará este descuento pendiente. Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
        loading={eliminar.isPending}
      />
    </div>
  )
}
