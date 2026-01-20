import { useState } from 'react'
import { Plus, Edit2 } from 'lucide-react'
import { usePrecios, usePreciosVigentes, useCreatePrecio, useConceptos } from '@/hooks'
import { Button, Modal, Input, Select, FormField, LoadingSpinner, EmptyState, Badge, DataTable } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { validarDecimalesPrecio, formatPrecio, getDecimalesPrecio } from '@/utils/precision'

export function PreciosTab({ comunidad }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [showHistorico, setShowHistorico] = useState(false)
  const [conceptoSeleccionado, setConceptoSeleccionado] = useState(null)

  const { data: preciosVigentes, isLoading: loadingVigentes } = usePreciosVigentes(comunidad.id)
  const { data: todosPrecios, isLoading: loadingTodos } = usePrecios(comunidad.id)
  const { data: conceptos } = useConceptos()
  const createMutation = useCreatePrecio()
  const toast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)

    const conceptoId = formData.get('concepto_id')
    const precio = parseFloat(formData.get('precio_unitario'))

    // Obtener código del concepto seleccionado
    const concepto = conceptos?.find(c => c.id === conceptoId)

    if (!concepto) {
      toast.error('Concepto no encontrado')
      return
    }

    // Validar decimales según concepto
    const validacion = validarDecimalesPrecio(precio, concepto.codigo)

    if (!validacion.valid) {
      toast.error(validacion.error)
      return
    }

    const data = {
      comunidad_id: comunidad.id,
      concepto_id: conceptoId,
      precio_unitario: precio,
      fecha_inicio: formData.get('fecha_inicio'),
      activo: true
    }

    try {
      await createMutation.mutateAsync(data)
      toast.success('Precio guardado correctamente')
      setModalOpen(false)
      setConceptoSeleccionado(null)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleConceptoChange = (e) => {
    const conceptoId = e.target.value
    const concepto = conceptos?.find(c => c.id === conceptoId)
    setConceptoSeleccionado(concepto || null)
  }

  const columns = [
    {
      key: 'concepto',
      header: 'Concepto',
      render: (_, row) => (
        <div>
          <p className="font-medium">{row.concepto?.nombre}</p>
          <p className="text-xs text-gray-500">{row.concepto?.codigo}</p>
        </div>
      )
    },
    {
      key: 'precio_unitario',
      header: 'Precio Unitario',
      render: (value, row) => (
        <span className="font-medium">
          {formatPrecio(value, row.concepto?.codigo)} / {row.concepto?.unidad_medida}
        </span>
      )
    },
    {
      key: 'fecha_inicio',
      header: 'Vigente desde',
      render: (value) => formatDate(value)
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (_, row) => (
        row.activo && !row.fecha_fin ? (
          <Badge variant="success">Vigente</Badge>
        ) : (
          <Badge variant="default">Histórico</Badge>
        )
      )
    }
  ]

  if (loadingVigentes) return <LoadingSpinner />

  const precios = showHistorico ? todosPrecios : preciosVigentes

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium text-gray-900">Precios</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showHistorico}
              onChange={e => setShowHistorico(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Mostrar histórico
          </label>
        </div>
        <Button onClick={() => setModalOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nuevo Precio
        </Button>
      </div>

      {!precios?.length ? (
        <EmptyState
          title="Sin precios configurados"
          description="Configura los precios de los conceptos para esta comunidad"
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Configurar Precios
            </Button>
          }
        />
      ) : (
        <DataTable
          data={precios}
          columns={columns}
          pageSize={10}
        />
      )}

      {/* Modal nuevo precio */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuevo Precio"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Concepto" required>
            <Select name="concepto_id" required onChange={handleConceptoChange}>
              <option value="">Seleccionar concepto...</option>
              {conceptos?.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.unidad_medida})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Precio Unitario (€)"
            required
            description={
              conceptoSeleccionado
                ? `Precio por ${conceptoSeleccionado.unidad_medida}. Máximo ${getDecimalesPrecio(conceptoSeleccionado.codigo)} decimales.`
                : "Precio por unidad de medida del concepto"
            }
          >
            <Input
              name="precio_unitario"
              type="number"
              step="0.00001"
              min="0"
              placeholder="0.00000"
              required
            />
          </FormField>

          <FormField label="Fecha de inicio" required>
            <Input
              name="fecha_inicio"
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              required
            />
          </FormField>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <strong>Nota:</strong> Al guardar un nuevo precio, el precio anterior 
            para este concepto se marcará como histórico automáticamente.
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Guardar Precio
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}






