import { useState, useEffect, useMemo } from 'react'
import { Zap, AlertTriangle, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { FactorCalculator } from './FactorCalculator'
import { ComunidadSelectorModal } from './ComunidadSelectorModal'
import { PreviewPreciosModal } from './PreviewPreciosModal'
import { AsignarReferenciaMasiva } from './AsignarReferenciaMasiva'
import {
  useAplicarFactorPrecios,
  usePreviewActualizacion,
  useRecalcularFacturas,
  useRegistrarReferencia,
  useUltimosValoresReferencia
} from '@/hooks/useGestionPrecios'

/**
 * Tab Factor Energético — CAL, CLI
 * Dos tarjetas: P6 NATURGY y MIBGAS
 * Factor = precio_actual / precio_anterior
 */
export function FactorEnergeticoTab({ comunidades = [], conceptos = [] }) {
  const toast = useToast()

  // Estado P6
  const [p6Anterior, setP6Anterior] = useState('')
  const [p6Actual, setP6Actual] = useState('')

  // Estado MIBGAS
  const [mibgasAnterior, setMibgasAnterior] = useState('')
  const [mibgasActual, setMibgasActual] = useState('')

  // Referencia activa (cuál calculadora usar)
  const [referenciaActiva, setReferenciaActiva] = useState('P6_NATURGY')
  const [showAsignarRef, setShowAsignarRef] = useState(false)

  // Selección
  const [comunidadesSeleccionadas, setComunidadesSeleccionadas] = useState([])
  const [conceptosSeleccionados, setConceptosSeleccionados] = useState([])

  // Preview
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [recalcular, setRecalcular] = useState(false)

  // Cargar últimos valores persistidos
  const { data: ultimosP6 } = useUltimosValoresReferencia('P6_NATURGY')
  const { data: ultimosMibgas } = useUltimosValoresReferencia('MIBGAS')

  // Pre-popular campos con valores guardados (solo una vez al cargar)
  const [initialized, setInitialized] = useState(false)
  useEffect(() => {
    if (initialized) return
    if (ultimosP6?.length >= 2) {
      setP6Anterior(String(ultimosP6[1].valor))
      setP6Actual(String(ultimosP6[0].valor))
      setInitialized(true)
    } else if (ultimosP6?.length === 1) {
      setP6Anterior(String(ultimosP6[0].valor))
      setInitialized(true)
    }
  }, [ultimosP6, initialized])

  useEffect(() => {
    if (ultimosMibgas?.length >= 2) {
      setMibgasAnterior(String(ultimosMibgas[1].valor))
      setMibgasActual(String(ultimosMibgas[0].valor))
    } else if (ultimosMibgas?.length === 1) {
      setMibgasAnterior(String(ultimosMibgas[0].valor))
    }
  }, [ultimosMibgas])

  // Mutations
  const aplicar = useAplicarFactorPrecios()
  const preview = usePreviewActualizacion()
  const recalcularMut = useRecalcularFacturas()
  const registrar = useRegistrarReferencia()

  // Conceptos energéticos (no fijos)
  const conceptosEnergeticos = conceptos.filter(c => !c.es_termino_fijo && c.activo)

  // Comunidades sin referencia configurada
  const sinReferencia = useMemo(() =>
    comunidades.filter(c => !c.referencia_energia).length
  , [comunidades])

  const getFactor = () => {
    const ant = referenciaActiva === 'P6_NATURGY' ? parseFloat(p6Anterior) : parseFloat(mibgasAnterior)
    const act = referenciaActiva === 'P6_NATURGY' ? parseFloat(p6Actual) : parseFloat(mibgasActual)
    if (!ant || ant <= 0 || !act || act <= 0) return null
    return act / ant
  }

  const factor = getFactor()

  const canPreview = factor && comunidadesSeleccionadas.length > 0 && conceptosSeleccionados.length > 0

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
    if (!factor || factor <= 0) { toast.error('Factor inválido'); return }
    try {
      const valorAnterior = referenciaActiva === 'P6_NATURGY' ? parseFloat(p6Anterior) : parseFloat(mibgasAnterior)
      const valorActual = referenciaActiva === 'P6_NATURGY' ? parseFloat(p6Actual) : parseFloat(mibgasActual)

      await aplicar.mutateAsync({
        comunidadIds: comunidadesSeleccionadas,
        conceptoCodigos: conceptosSeleccionados,
        factor,
        tipoAjuste: 'factor_conversion',
        referencia: referenciaActiva,
        valorAnterior,
        valorActual
      })

      // Registrar valores de referencia
      const now = new Date()
      const mes = now.getMonth() + 1
      const anio = now.getFullYear()
      await registrar.mutateAsync({
        tipo: referenciaActiva,
        anio,
        mes,
        valor: valorActual
      })

      if (recalcular) {
        await recalcularMut.mutateAsync({
          comunidadIds: comunidadesSeleccionadas,
          conceptoCodigos: conceptosSeleccionados
        })
        toast.success('Precios actualizados y facturas recalculadas')
      } else {
        toast.success('Precios actualizados correctamente')
      }

      setShowPreview(false)
      setPreviewData(null)
    } catch (err) {
      toast.error('Error al aplicar: ' + err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Aviso comunidades sin referencia */}
      {sinReferencia > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <span className="text-sm text-amber-800">
              <strong>{sinReferencia}</strong> comunidad{sinReferencia > 1 ? 'es' : ''} sin referencia energética configurada
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowAsignarRef(true)}>
            <Settings className="h-3.5 w-3.5 mr-1" />
            Asignar masivamente
          </Button>
        </div>
      )}

      {/* Modal asignación masiva de referencia */}
      <AsignarReferenciaMasiva
        open={showAsignarRef}
        onClose={() => setShowAsignarRef(false)}
        comunidades={comunidades}
      />

      {/* Calculadoras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          className="cursor-pointer"
          onClick={() => setReferenciaActiva('P6_NATURGY')}
        >
          <FactorCalculator
            titulo="P6 NATURGY"
            subtitulo="Precio del mes en curso (€/kWh)"
            unidad="€/kWh"
            valorAnterior={p6Anterior}
            valorActual={p6Actual}
            onValorAnteriorChange={setP6Anterior}
            onValorActualChange={setP6Actual}
            className={referenciaActiva === 'P6_NATURGY' ? 'ring-2 ring-primary-500' : ''}
          />
        </div>

        <div
          className="cursor-pointer"
          onClick={() => setReferenciaActiva('MIBGAS')}
        >
          <FactorCalculator
            titulo="MIBGAS"
            subtitulo="Promedio del mes anterior (€/MWh)"
            unidad="€/MWh"
            valorAnterior={mibgasAnterior}
            valorActual={mibgasActual}
            onValorAnteriorChange={setMibgasAnterior}
            onValorActualChange={setMibgasActual}
            className={referenciaActiva === 'MIBGAS' ? 'ring-2 ring-primary-500' : ''}
          />
        </div>
      </div>

      {/* Referencia activa */}
      <div className="flex items-center gap-2 text-sm">
        <Zap className="h-4 w-4 text-primary-600" />
        <span className="text-gray-600">Referencia activa:</span>
        <Badge variant="primary">{referenciaActiva === 'P6_NATURGY' ? 'P6 NATURGY' : 'MIBGAS'}</Badge>
        {factor && (
          <span className="text-gray-500">
            Factor: <span className="font-mono font-medium text-gray-900">{factor.toFixed(5)}</span>
          </span>
        )}
      </div>

      {/* Selector comunidades */}
      <ComunidadSelectorModal
        label="Comunidades"
        comunidades={comunidades}
        selected={comunidadesSeleccionadas}
        onChange={setComunidadesSeleccionadas}
        filtroReferencia={referenciaActiva}
        mode="multi"
      />

      {/* Checkboxes conceptos */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Conceptos a actualizar
        </label>
        <div className="flex flex-wrap gap-4">
          {conceptosEnergeticos.map(c => (
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
            Introduce precios anterior y actual para calcular el factor
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
