import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useConceptos, useAsignarConcepto, useDesasignarConcepto } from '@/hooks'
import { Button, Modal, Input, Select, FormField, Badge, EmptyState } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { formatNumber, formatDate } from '@/lib/utils'

export function ConceptosContadorTab({ contador }) {
  const [modalOpen, setModalOpen] = useState(false)
  const { data: conceptosDisponibles } = useConceptos()
  const asignarMutation = useAsignarConcepto()
  const desasignarMutation = useDesasignarConcepto()
  const toast = useToast()

  const conceptosAsignados = contador.conceptos || []
  const conceptosNoAsignados = conceptosDisponibles?.filter(
    c => !conceptosAsignados.find(ca => ca.concepto?.id === c.id)
  ) || []

  const handleAsignar = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    const data = {
      contador_id: contador.id,
      concepto_id: formData.get('concepto_id'),
      lectura_inicial: parseFloat(formData.get('lectura_inicial')) || 0,
      fecha_lectura_inicial: formData.get('fecha_lectura_inicial')
    }

    try {
      await asignarMutation.mutateAsync(data)
      toast.success('Concepto asignado correctamente')
      setModalOpen(false)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDesasignar = async (conceptoId) => {
    if (!confirm('¿Quitar este concepto del contador?')) return

    try {
      await desasignarMutation.mutateAsync({
        contadorId: contador.id,
        conceptoId
      })
      toast.success('Concepto desasignado')
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Conceptos Asignados
        </h3>
        {conceptosNoAsignados.length > 0 && (
          <Button onClick={() => setModalOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Añadir Concepto
          </Button>
        )}
      </div>

      {!conceptosAsignados.length ? (
        <EmptyState
          title="Sin conceptos asignados"
          description="Este contador no tiene conceptos de medición asignados"
          action={conceptosNoAsignados.length > 0 && (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Asignar Concepto
            </Button>
          )}
        />
      ) : (
        <div className="space-y-3">
          {conceptosAsignados.map(cc => (
            <div
              key={cc.concepto?.id}
              className="p-4 border border-gray-200 rounded-lg flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <Badge variant={cc.concepto?.es_termino_fijo ? 'warning' : 'primary'}>
                    {cc.concepto?.codigo}
                  </Badge>
                  <span className="font-medium text-gray-900">
                    {cc.concepto?.nombre}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({cc.concepto?.unidad_medida})
                  </span>
                </div>
                
                <div className="mt-2 flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Lectura inicial:</span>{' '}
                    <span className="font-medium">
                      {formatNumber(cc.lectura_inicial)} {cc.concepto?.unidad_medida}
                    </span>
                    <span className="text-gray-400 ml-1">
                      ({formatDate(cc.fecha_lectura_inicial)})
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Lectura actual:</span>{' '}
                    <span className="font-medium">
                      {formatNumber(cc.lectura_actual)} {cc.concepto?.unidad_medida}
                    </span>
                    <span className="text-gray-400 ml-1">
                      ({formatDate(cc.fecha_lectura_actual)})
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDesasignar(cc.concepto?.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                disabled={desasignarMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal para asignar concepto */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Asignar Concepto"
      >
        <form onSubmit={handleAsignar} className="space-y-4">
          <FormField label="Concepto" required>
            <Select name="concepto_id" required>
              <option value="">Seleccionar concepto...</option>
              {conceptosNoAsignados.map(c => (
                <option key={c.id} value={c.id}>
                  {c.codigo} - {c.nombre} ({c.unidad_medida})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField 
            label="Lectura Inicial" 
            required
            description="Lectura del contador en el momento de dar de alta el concepto"
          >
            <Input
              name="lectura_inicial"
              type="number"
              step="0.0001"
              min="0"
              defaultValue="0"
              required
            />
          </FormField>

          <FormField label="Fecha de Lectura Inicial" required>
            <Input
              name="fecha_lectura_inicial"
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              required
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={asignarMutation.isPending}>
              Asignar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}




