import { useState, useMemo } from 'react'
import { useActualizarIntervencion } from '@/hooks'
import { Button, Modal, Input } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { FileText, DollarSign, Calculator } from 'lucide-react'

// Tarifa horaria y coste de desplazamiento por defecto (€)
const TARIFA_HORA_DEFAULT = 45
const COSTE_DESPLAZAMIENTO_DEFAULT = 15

export function FacturarIntervencionModal({ open, onClose, intervencion }) {
  const actualizar = useActualizarIntervencion()
  const toast = useToast()

  // Auto-calcular mano de obra desde duración si está disponible
  const manoObraAutoCalculada = useMemo(() => {
    if (!intervencion?.duracion_minutos) return ''
    return ((intervencion.duracion_minutos / 60) * TARIFA_HORA_DEFAULT).toFixed(2)
  }, [intervencion?.duracion_minutos])

  const [costeManoObra, setCosteManoObra] = useState(
    intervencion?.coste_mano_obra || manoObraAutoCalculada || ''
  )
  const [costeDesplazamiento, setCosteDesplazamiento] = useState(
    intervencion?.coste_desplazamiento ?? COSTE_DESPLAZAMIENTO_DEFAULT
  )

  if (!intervencion) return null

  const costeMateriales = Number(intervencion.coste_materiales || 0)
  const manoObra = Number(costeManoObra || 0)
  const desplazamiento = Number(costeDesplazamiento || 0)
  const totalSinIVA = costeMateriales + manoObra + desplazamiento
  const iva = totalSinIVA * 0.21
  const totalConIVA = totalSinIVA + iva

  const handleFacturar = async () => {
    try {
      await actualizar.mutateAsync({
        id: intervencion.id,
        estado: 'facturada',
        coste_mano_obra: manoObra,
        coste_desplazamiento: desplazamiento,
        coste_total: totalSinIVA,
      })
      toast.success('Intervención marcada como facturada')
      onClose()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Facturar Intervención" size="md">
      <div className="space-y-5">
        {/* Resumen de la intervención */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="font-mono text-sm font-medium">{intervencion.numero_parte}</span>
          </div>
          <p className="text-sm text-gray-700">{intervencion.titulo}</p>
          {intervencion.cliente && (
            <p className="text-xs text-gray-500 mt-1">
              Cliente: {intervencion.cliente.nombre} {intervencion.cliente.apellidos}
            </p>
          )}
        </div>

        {/* Desglose de costes */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Desglose de Costes
          </h3>
          {intervencion?.duracion_minutos && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg mb-3">
              <Calculator className="h-3.5 w-3.5 flex-shrink-0" />
              Mano de obra calculada automáticamente: {intervencion.duracion_minutos} min × {TARIFA_HORA_DEFAULT} €/h = {manoObraAutoCalculada} €
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Materiales (calculado)</span>
              <span className="text-sm font-medium text-gray-900">{costeMateriales.toFixed(2)} €</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-gray-600 whitespace-nowrap">Mano de obra</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={costeManoObra}
                onChange={(e) => setCosteManoObra(e.target.value)}
                placeholder="0.00"
                className="w-32 text-right"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="text-sm text-gray-600 whitespace-nowrap">Desplazamiento</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={costeDesplazamiento}
                onChange={(e) => setCosteDesplazamiento(e.target.value)}
                placeholder="0.00"
                className="w-32 text-right"
              />
            </div>

            <div className="border-t border-gray-200 pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Base imponible</span>
                <span className="font-medium">{totalSinIVA.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">IVA (21%)</span>
                <span className="font-medium">{iva.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-base font-bold text-primary-700">
                <span>Total</span>
                <span>{totalConIVA.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Al marcar como facturada, se actualizarán los costes y el estado de la intervención.
          Puedes generar la factura correspondiente desde el módulo de facturación.
        </p>

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleFacturar} loading={actualizar.isPending}>
            Marcar como Facturada
          </Button>
        </div>
      </div>
    </Modal>
  )
}
