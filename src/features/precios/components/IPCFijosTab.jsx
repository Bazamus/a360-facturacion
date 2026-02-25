import { useState, useMemo } from 'react'
import { Percent } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Checkbox } from '@/components/ui/Checkbox'
import { FormField } from '@/components/ui/FormField'
import { useToast } from '@/components/ui/Toast'
import { ComunidadMultiSelector } from './ComunidadMultiSelector'
import { PreviewPreciosModal } from './PreviewPreciosModal'
import {
  useAplicarFactorPrecios,
  usePreviewActualizacion,
  useRecalcularFacturas
} from '@/hooks/useGestionPrecios'

/**
 * Tab IPC Conceptos Fijos — TF, ACS
 * Porcentaje IPC → factor = 1 + IPC/100
 */
export function IPCFijosTab({ comunidades = [], conceptos = [] }) {
  const toast = useToast()

  const [porcentajeIPC, setPorcentajeIPC] = useState('')
  const [comunidadesSeleccionadas, setComunidadesSeleccionadas] = useState([])
  const [conceptosSeleccionados, setConceptosSeleccionados] = useState([])

  // Preview
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [recalcular, setRecalcular] = useState(false)

  // Mutations
  const aplicar = useAplicarFactorPrecios()
  const preview = usePreviewActualizacion()
  const recalcularMut = useRecalcularFacturas()

  // Conceptos de término fijo
  const conceptosFijos = conceptos.filter(c => c.es_termino_fijo && c.activo)
  // Incluir también ACS si es concepto variable pero afectado por IPC
  const conceptosIPC = [
    ...conceptosFijos,
    ...conceptos.filter(c => c.codigo === 'ACS' && c.activo && !c.es_termino_fijo)
  ]

  const factor = useMemo(() => {
    const ipc = parseFloat(porcentajeIPC)
    if (isNaN(ipc)) return null
    return 1 + ipc / 100
  }, [porcentajeIPC])

  const canPreview = factor && factor > 0 && comunidadesSeleccionadas.length > 0 && conceptosSeleccionados.length > 0

  const handlePreview = async () => {
    try {
      const data = await preview.mutateAsync({
        comunidadIds: comunidadesSeleccionadas,
        conceptoCodigos: conceptosSeleccionados,
        factor
      })
      setPreviewData(data)
      setShowPreview(true)
    } catch (err) {
      toast.error('Error al obtener vista previa: ' + err.message)
    }
  }

  const handleAplicar = async () => {
    try {
      await aplicar.mutateAsync({
        comunidadIds: comunidadesSeleccionadas,
        conceptoCodigos: conceptosSeleccionados,
        factor,
        tipoAjuste: 'ipc',
        porcentajeIpc: parseFloat(porcentajeIPC)
      })

      if (recalcular) {
        await recalcularMut.mutateAsync({
          comunidadIds: comunidadesSeleccionadas,
          conceptoCodigos: conceptosSeleccionados
        })
        toast.success('Precios actualizados por IPC y facturas recalculadas')
      } else {
        toast.success('Precios actualizados por IPC correctamente')
      }

      setShowPreview(false)
      setPreviewData(null)
    } catch (err) {
      toast.error('Error al aplicar IPC: ' + err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Calculadora IPC */}
      <div className="max-w-md rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Percent className="h-5 w-5 text-primary-600" />
          <h3 className="text-sm font-semibold text-gray-900">IPC Anual</h3>
        </div>

        <FormField label="Porcentaje IPC (%)">
          <Input
            type="number"
            step="0.01"
            placeholder="Ej: 3.00"
            value={porcentajeIPC}
            onChange={(e) => setPorcentajeIPC(e.target.value)}
          />
        </FormField>

        <div className="mt-4 rounded-md bg-gray-50 border border-gray-200 px-4 py-3 text-center">
          <span className="text-xs text-gray-500 block mb-1">Factor resultante</span>
          {factor ? (
            <span className="text-2xl font-bold text-gray-900">{factor.toFixed(5)}</span>
          ) : (
            <span className="text-lg text-gray-400">—</span>
          )}
        </div>
      </div>

      {/* Selector comunidades */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Comunidades
        </label>
        <ComunidadMultiSelector
          comunidades={comunidades}
          selected={comunidadesSeleccionadas}
          onChange={setComunidadesSeleccionadas}
        />
      </div>

      {/* Checkboxes conceptos */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Conceptos a actualizar
        </label>
        <div className="flex flex-wrap gap-4">
          {conceptosIPC.map(c => (
            <Checkbox
              key={c.id}
              label={`${c.codigo} — ${c.nombre}`}
              checked={conceptosSeleccionados.includes(c.codigo)}
              onChange={(e) => {
                if (e.target.checked) {
                  setConceptosSeleccionados(prev => [...prev, c.codigo])
                } else {
                  setConceptosSeleccionados(prev => prev.filter(x => x !== c.codigo))
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="gradient"
          onClick={handlePreview}
          disabled={!canPreview}
          loading={preview.isPending}
        >
          Vista previa
        </Button>
        {!factor && (
          <span className="text-xs text-gray-500">
            Introduce el porcentaje IPC para calcular el factor
          </span>
        )}
      </div>

      {/* Modal preview */}
      <PreviewPreciosModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={handleAplicar}
        previewData={previewData}
        factor={factor}
        loading={aplicar.isPending || recalcularMut.isPending}
        recalcularFacturas={recalcular}
        onToggleRecalcular={setRecalcular}
      />
    </div>
  )
}
