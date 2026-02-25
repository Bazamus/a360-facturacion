import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { ComunidadSelectorModal } from './ComunidadSelectorModal'
import { useAsignarReferenciaMasiva } from '@/hooks/useGestionPrecios'

/**
 * Modal para asignar referencia energética masivamente
 * a comunidades que no la tienen configurada
 */
export function AsignarReferenciaMasiva({ open, onClose, comunidades = [] }) {
  const toast = useToast()
  const [referencia, setReferencia] = useState('P6_NATURGY')
  const [selectedIds, setSelectedIds] = useState([])
  const asignar = useAsignarReferenciaMasiva()

  const sinReferencia = useMemo(() =>
    comunidades.filter(c => !c.referencia_energia)
  , [comunidades])

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      toast.error('Selecciona al menos una comunidad')
      return
    }
    try {
      await asignar.mutateAsync({ comunidadIds: selectedIds, referencia })
      toast.success(`Referencia ${referencia.replace('_', ' ')} asignada a ${selectedIds.length} comunidad${selectedIds.length > 1 ? 'es' : ''}`)
      setSelectedIds([])
      onClose()
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
  }

  const handleClose = () => {
    setSelectedIds([])
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Asignar referencia energética"
      description={`${sinReferencia.length} comunidades sin referencia configurada`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={asignar.isPending}
            disabled={selectedIds.length === 0}
          >
            Asignar a {selectedIds.length || '...'} comunidad{selectedIds.length !== 1 ? 'es' : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Selector de referencia */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Referencia a asignar
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setReferencia('P6_NATURGY')}
              className={`flex-1 rounded-lg border-2 px-4 py-3 text-center text-sm font-medium transition-all ${
                referencia === 'P6_NATURGY'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              P6 NATURGY
              <span className="block text-xs font-normal mt-0.5 opacity-70">Calefacción / ACS</span>
            </button>
            <button
              type="button"
              onClick={() => setReferencia('MIBGAS')}
              className={`flex-1 rounded-lg border-2 px-4 py-3 text-center text-sm font-medium transition-all ${
                referencia === 'MIBGAS'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              MIBGAS
              <span className="block text-xs font-normal mt-0.5 opacity-70">Gas natural</span>
            </button>
          </div>
        </div>

        {/* Selector comunidades sin referencia */}
        <ComunidadSelectorModal
          label="Comunidades sin referencia"
          comunidades={sinReferencia}
          selected={selectedIds}
          onChange={setSelectedIds}
          mode="multi"
          placeholder="Seleccionar comunidades..."
        />

        {selectedIds.length > 0 && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            Se asignará <Badge variant="primary">{referencia.replace('_', ' ')}</Badge> a <strong>{selectedIds.length}</strong> comunidad{selectedIds.length > 1 ? 'es' : ''}
          </div>
        )}
      </div>
    </Modal>
  )
}
