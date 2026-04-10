import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, Check, AlertTriangle, RefreshCw, Edit3 } from 'lucide-react'
import { Modal, Button, Input, FormField, Badge } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { useCambioContador } from '@/hooks'
import { formatNumber, formatDate } from '@/lib/utils'

// ─── Constantes ──────────────────────────────────────────────────────────────

const TIPO_CORRECCION = 'correccion_serie'
const TIPO_CAMBIO     = 'cambio_equipo'

const PASOS_CORRECCION = ['tipo', 'datos', 'resumen']
const PASOS_CAMBIO     = ['tipo', 'datos', 'lecturas', 'resumen']

function getPasos(tipoCambio) {
  return tipoCambio === TIPO_CAMBIO ? PASOS_CAMBIO : PASOS_CORRECCION
}

// ─── Barra de progreso ────────────────────────────────────────────────────────

function BarraProgreso({ pasos, pasoActual }) {
  const labels = {
    tipo:     'Tipo',
    datos:    'Nuevos datos',
    lecturas: 'Lecturas',
    resumen:  'Confirmar'
  }

  return (
    <div className="flex items-center gap-0 mb-6">
      {pasos.map((paso, idx) => {
        const esCurrent  = paso === pasoActual
        const esComplet  = pasos.indexOf(pasoActual) > idx

        return (
          <div key={paso} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={[
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                esComplet  ? 'bg-green-500 text-white' :
                esCurrent  ? 'bg-primary-600 text-white ring-2 ring-primary-200' :
                             'bg-gray-200 text-gray-500'
              ].join(' ')}>
                {esComplet ? <Check className="w-4 h-4" /> : idx + 1}
              </div>
              <span className={[
                'text-xs mt-1 whitespace-nowrap',
                esCurrent  ? 'text-primary-600 font-medium' :
                esComplet  ? 'text-green-600' :
                             'text-gray-400'
              ].join(' ')}>
                {labels[paso]}
              </span>
            </div>
            {idx < pasos.length - 1 && (
              <div className={[
                'flex-1 h-0.5 mx-2 mb-4 transition-colors',
                esComplet ? 'bg-green-400' : 'bg-gray-200'
              ].join(' ')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Paso 1: Tipo de cambio ───────────────────────────────────────────────────

function PasoTipo({ tipoCambio, setTipoCambio, motivo, setMotivo }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        Selecciona el motivo del cambio de número de serie para que el sistema
        gestione correctamente las lecturas asociadas.
      </p>

      <div className="grid grid-cols-1 gap-3">
        <button
          type="button"
          onClick={() => setTipoCambio(TIPO_CORRECCION)}
          className={[
            'flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all',
            tipoCambio === TIPO_CORRECCION
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          ].join(' ')}
        >
          <div className={[
            'mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center',
            tipoCambio === TIPO_CORRECCION ? 'border-primary-500' : 'border-gray-300'
          ].join(' ')}>
            {tipoCambio === TIPO_CORRECCION && (
              <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-primary-600" />
              <p className="font-medium text-gray-900">Corrección de número de serie</p>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              El equipo físico es el mismo pero el número de serie fue registrado
              incorrectamente. Las lecturas existentes son correctas y se conservan.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setTipoCambio(TIPO_CAMBIO)}
          className={[
            'flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all',
            tipoCambio === TIPO_CAMBIO
              ? 'border-orange-500 bg-orange-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          ].join(' ')}
        >
          <div className={[
            'mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center',
            tipoCambio === TIPO_CAMBIO ? 'border-orange-500' : 'border-gray-300'
          ].join(' ')}>
            {tipoCambio === TIPO_CAMBIO && (
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-orange-600" />
              <p className="font-medium text-gray-900">Sustitución de equipo</p>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Se ha instalado un nuevo contador físico (por rotura, desgaste u otro
              motivo). El nuevo equipo tiene un número de serie diferente y puede
              requerir resetear las lecturas de los conceptos asignados.
            </p>
          </div>
        </button>
      </div>

      <FormField label="Motivo / observaciones (opcional)">
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={2}
          placeholder="Describe brevemente el motivo del cambio..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </FormField>
    </div>
  )
}

// ─── Paso 2: Nuevos datos ─────────────────────────────────────────────────────

function PasoDatos({ contador, tipoCambio, nuevosDatos, setNuevosDatos, errors }) {
  const handleChange = (field, value) => {
    setNuevosDatos((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-5">
      {tipoCambio === TIPO_CORRECCION && (
        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            Solo se actualizará el número de serie. Las lecturas y datos del equipo
            se conservarán.
          </p>
        </div>
      )}

      {tipoCambio === TIPO_CAMBIO && (
        <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
          <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-orange-700">
            Se actualizarán todos los datos del nuevo equipo. En el siguiente paso
            podrás indicar si deseas resetear las lecturas.
          </p>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Serie actual</p>
        <p className="font-mono text-base font-semibold text-gray-800 bg-gray-100 px-3 py-2 rounded-lg">
          {contador.numero_serie}
        </p>
      </div>

      <FormField label="Nuevo número de serie" required error={errors?.numero_serie}>
        <Input
          value={nuevosDatos.numero_serie}
          onChange={(e) => handleChange('numero_serie', e.target.value)}
          placeholder="Introduce el nuevo número de serie"
          autoFocus
        />
      </FormField>

      {tipoCambio === TIPO_CAMBIO && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
          <FormField label="Marca">
            <Input
              value={nuevosDatos.marca}
              onChange={(e) => handleChange('marca', e.target.value)}
              placeholder={contador.marca || 'Marca del equipo'}
            />
          </FormField>

          <FormField label="Modelo">
            <Input
              value={nuevosDatos.modelo}
              onChange={(e) => handleChange('modelo', e.target.value)}
              placeholder={contador.modelo || 'Modelo del equipo'}
            />
          </FormField>

          <FormField label="Fecha de instalación">
            <Input
              type="date"
              value={nuevosDatos.fecha_instalacion}
              onChange={(e) => handleChange('fecha_instalacion', e.target.value)}
            />
          </FormField>
        </div>
      )}
    </div>
  )
}

// ─── Paso 3: Lecturas (solo cambio_equipo) ────────────────────────────────────

function PasoLecturas({ contador, conservaLecturas, setConservaLecturas, lecturasReset, setLecturasReset, errors }) {
  const conceptos = contador.conceptos || []

  const handleToggleConcepto = (conceptoId) => {
    setLecturasReset((prev) => {
      const existe = prev.find((l) => l.concepto_id === conceptoId)
      if (existe) {
        return prev.filter((l) => l.concepto_id !== conceptoId)
      }
      const cc = conceptos.find((c) => c.concepto?.id === conceptoId)
      return [
        ...prev,
        {
          concepto_id:          conceptoId,
          concepto_codigo:      cc?.concepto?.codigo || '',
          concepto_nombre:      cc?.concepto?.nombre || '',
          lectura_inicial:      '',
          fecha_lectura_inicial: ''
        }
      ]
    })
  }

  const handleLecturaChange = (conceptoId, field, value) => {
    setLecturasReset((prev) =>
      prev.map((l) =>
        l.concepto_id === conceptoId ? { ...l, [field]: value } : l
      )
    )
  }

  const getSelectedLectura = (conceptoId) =>
    lecturasReset.find((l) => l.concepto_id === conceptoId)

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        Con la sustitución del equipo, ¿deseas conservar las lecturas actuales o
        resetearlas para el nuevo contador?
      </p>

      <div className="grid grid-cols-1 gap-3">
        <button
          type="button"
          onClick={() => { setConservaLecturas(true); setLecturasReset([]) }}
          className={[
            'flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all',
            conservaLecturas
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-gray-300'
          ].join(' ')}
        >
          <div className={[
            'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
            conservaLecturas ? 'border-green-500' : 'border-gray-300'
          ].join(' ')}>
            {conservaLecturas && <div className="w-2.5 h-2.5 rounded-full bg-green-500" />}
          </div>
          <div>
            <p className="font-medium text-gray-900">Conservar lecturas actuales</p>
            <p className="mt-0.5 text-sm text-gray-500">
              Las lecturas iniciales de los conceptos no se modifican. El cálculo
              del siguiente periodo usará las lecturas ya registradas.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setConservaLecturas(false)}
          className={[
            'flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all',
            !conservaLecturas
              ? 'border-orange-500 bg-orange-50'
              : 'border-gray-200 hover:border-gray-300'
          ].join(' ')}
        >
          <div className={[
            'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
            !conservaLecturas ? 'border-orange-500' : 'border-gray-300'
          ].join(' ')}>
            {!conservaLecturas && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
          </div>
          <div>
            <p className="font-medium text-gray-900">Resetear lecturas del nuevo equipo</p>
            <p className="mt-0.5 text-sm text-gray-500">
              Indica una nueva lectura inicial para cada concepto. Esta será la
              base para el cálculo del siguiente periodo de facturación.
            </p>
          </div>
        </button>
      </div>

      {!conservaLecturas && conceptos.length > 0 && (
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-gray-700">
            Selecciona los conceptos a resetear e introduce la nueva lectura inicial:
          </p>

          {conceptos.map((cc) => {
            const conceptoId = cc.concepto?.id
            const selected   = getSelectedLectura(conceptoId)
            const errKey     = `lectura_${conceptoId}`

            return (
              <div
                key={conceptoId}
                className={[
                  'rounded-lg border p-3 transition-colors',
                  selected ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
                ].join(' ')}
              >
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!selected}
                    onChange={() => handleToggleConcepto(conceptoId)}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <Badge variant="default" className="font-mono text-xs">
                      {cc.concepto?.codigo}
                    </Badge>
                    <span className="text-sm font-medium text-gray-900">
                      {cc.concepto?.nombre}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Lectura actual: {formatNumber(cc.lectura_actual)} {cc.concepto?.unidad}
                  </span>
                </label>

                {selected && (
                  <div className="grid grid-cols-2 gap-3 mt-3 pl-7">
                    <FormField label="Nueva lectura inicial" error={errors?.[errKey]}>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={selected.lectura_inicial}
                        onChange={(e) =>
                          handleLecturaChange(conceptoId, 'lectura_inicial', e.target.value)
                        }
                        placeholder="0.000"
                      />
                    </FormField>
                    <FormField
                      label="Fecha de la lectura"
                      error={errors?.[`fecha_${conceptoId}`]}
                    >
                      <Input
                        type="date"
                        value={selected.fecha_lectura_inicial}
                        onChange={(e) =>
                          handleLecturaChange(conceptoId, 'fecha_lectura_inicial', e.target.value)
                        }
                      />
                    </FormField>
                  </div>
                )}
              </div>
            )
          })}

          {conceptos.length === 0 && (
            <p className="text-sm text-gray-500 italic">
              Este contador no tiene conceptos asignados.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Paso 4: Resumen y confirmación ──────────────────────────────────────────

function PasoResumen({ contador, tipoCambio, nuevosDatos, conservaLecturas, lecturasReset, motivo }) {
  const conceptos = contador.conceptos || []

  const esCorreccion = tipoCambio === TIPO_CORRECCION

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-yellow-700">
          Revisa los cambios antes de confirmar. Esta acción quedará registrada en
          el historial del contador.
        </p>
      </div>

      {/* Tipo de cambio */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo de cambio</p>
        </div>
        <div className="px-4 py-3 flex items-center gap-2">
          {esCorreccion
            ? <Badge variant="info">Corrección de serie</Badge>
            : <Badge variant="warning">Sustitución de equipo</Badge>
          }
          {motivo && (
            <span className="text-sm text-gray-600 ml-2">— {motivo}</span>
          )}
        </div>
      </div>

      {/* Número de serie */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Número de serie</p>
        </div>
        <div className="px-4 py-3 flex items-center gap-3">
          <span className="font-mono text-sm text-gray-500 line-through">
            {contador.numero_serie}
          </span>
          <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="font-mono text-sm font-semibold text-gray-900">
            {nuevosDatos.numero_serie}
          </span>
        </div>
      </div>

      {/* Datos del equipo (solo cambio_equipo) */}
      {!esCorreccion && (nuevosDatos.marca || nuevosDatos.modelo || nuevosDatos.fecha_instalacion) && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos del equipo</p>
          </div>
          <div className="px-4 py-3 space-y-2 text-sm">
            {nuevosDatos.marca && (
              <div className="flex justify-between">
                <span className="text-gray-600">Marca</span>
                <span className="font-medium">
                  {contador.marca && contador.marca !== nuevosDatos.marca
                    ? <><span className="line-through text-gray-400">{contador.marca}</span> → {nuevosDatos.marca}</>
                    : nuevosDatos.marca
                  }
                </span>
              </div>
            )}
            {nuevosDatos.modelo && (
              <div className="flex justify-between">
                <span className="text-gray-600">Modelo</span>
                <span className="font-medium">
                  {contador.modelo && contador.modelo !== nuevosDatos.modelo
                    ? <><span className="line-through text-gray-400">{contador.modelo}</span> → {nuevosDatos.modelo}</>
                    : nuevosDatos.modelo
                  }
                </span>
              </div>
            )}
            {nuevosDatos.fecha_instalacion && (
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha instalación</span>
                <span className="font-medium">{formatDate(nuevosDatos.fecha_instalacion)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lecturas (solo cambio_equipo) */}
      {!esCorreccion && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lecturas</p>
          </div>
          <div className="px-4 py-3">
            {conservaLecturas ? (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Check className="w-4 h-4" />
                <span>Las lecturas existentes se conservan sin cambios</span>
              </div>
            ) : lecturasReset.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No se resetea ningún concepto</p>
            ) : (
              <div className="space-y-2">
                {lecturasReset.map((lr) => {
                  const cc = conceptos.find((c) => c.concepto?.id === lr.concepto_id)
                  return (
                    <div key={lr.concepto_id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="font-mono text-xs">
                          {lr.concepto_codigo}
                        </Badge>
                        <span className="text-gray-700">{lr.concepto_nombre}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="line-through text-gray-400">
                          {formatNumber(cc?.lectura_actual)}
                        </span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="font-medium text-gray-900">
                          {formatNumber(parseFloat(lr.lectura_inicial) || 0)}
                        </span>
                        <span className="text-gray-400 text-xs">
                          ({formatDate(lr.fecha_lectura_inicial)})
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export function CambioContadorModal({ open, onClose, contador, onSuccess }) {
  const toast       = useToast()
  const mutation    = useCambioContador()

  const [tipoCambio,       setTipoCambio]       = useState(TIPO_CORRECCION)
  const [motivo,           setMotivo]           = useState('')
  const [nuevosDatos,      setNuevosDatos]      = useState({ numero_serie: '', marca: '', modelo: '', fecha_instalacion: '' })
  const [conservaLecturas, setConservaLecturas] = useState(true)
  const [lecturasReset,    setLecturasReset]    = useState([])
  const [stepErrors,       setStepErrors]       = useState({})

  const pasos     = getPasos(tipoCambio)
  const [pasoIdx, setPasoIdx] = useState(0)
  const pasoActual = pasos[pasoIdx]

  // Resetear estado al abrir/cerrar
  useEffect(() => {
    if (open) {
      setTipoCambio(TIPO_CORRECCION)
      setMotivo('')
      setNuevosDatos({
        numero_serie:     '',
        marca:            contador?.marca            || '',
        modelo:           contador?.modelo           || '',
        fecha_instalacion: contador?.fecha_instalacion || ''
      })
      setConservaLecturas(true)
      setLecturasReset([])
      setStepErrors({})
      setPasoIdx(0)
    }
  }, [open, contador])

  // Recalcular pasos cuando cambia el tipo
  const handleSetTipo = (tipo) => {
    setTipoCambio(tipo)
    setLecturasReset([])
    setConservaLecturas(true)
  }

  const validarPasoActual = () => {
    const errs = {}

    if (pasoActual === 'datos') {
      if (!nuevosDatos.numero_serie.trim()) {
        errs.numero_serie = 'El número de serie es obligatorio'
      } else if (nuevosDatos.numero_serie.trim().length < 5) {
        errs.numero_serie = 'Mínimo 5 caracteres'
      } else if (nuevosDatos.numero_serie.trim() === contador?.numero_serie) {
        errs.numero_serie = 'El nuevo número de serie debe ser diferente al actual'
      }
    }

    if (pasoActual === 'lecturas' && !conservaLecturas) {
      lecturasReset.forEach((lr) => {
        if (lr.lectura_inicial === '' || lr.lectura_inicial === null) {
          errs[`lectura_${lr.concepto_id}`] = 'Introduce la lectura inicial'
        }
        if (!lr.fecha_lectura_inicial) {
          errs[`fecha_${lr.concepto_id}`] = 'Introduce la fecha'
        }
      })
    }

    setStepErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSiguiente = () => {
    if (!validarPasoActual()) return
    if (pasoIdx < pasos.length - 1) {
      setPasoIdx((i) => i + 1)
    }
  }

  const handleAnterior = () => {
    if (pasoIdx > 0) setPasoIdx((i) => i - 1)
  }

  const handleConfirmar = async () => {
    try {
      const conceptosReset = !conservaLecturas && lecturasReset.length > 0
        ? lecturasReset.map((lr) => ({
            concepto_id:          lr.concepto_id,
            concepto_codigo:      lr.concepto_codigo,
            concepto_nombre:      lr.concepto_nombre,
            lectura_inicial:      parseFloat(lr.lectura_inicial),
            fecha_lectura_inicial: lr.fecha_lectura_inicial
          }))
        : null

      await mutation.mutateAsync({
        contadorId:       contador.id,
        numeroSerieNuevo: nuevosDatos.numero_serie.trim(),
        marca:            tipoCambio === TIPO_CAMBIO ? nuevosDatos.marca  : undefined,
        modelo:           tipoCambio === TIPO_CAMBIO ? nuevosDatos.modelo : undefined,
        fechaInstalacion: tipoCambio === TIPO_CAMBIO ? nuevosDatos.fecha_instalacion : undefined,
        tipoCambio,
        conservaLecturas: tipoCambio === TIPO_CORRECCION ? true : conservaLecturas,
        motivo,
        conceptosReset
      })

      toast.success('Número de serie actualizado correctamente')
      onClose()
      onSuccess?.()
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (!contador) return null

  const esUltimoPaso = pasoIdx === pasos.length - 1

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cambio de Contador"
      description={`Contador: ${contador.numero_serie}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={pasoIdx === 0 ? onClose : handleAnterior} disabled={mutation.isPending}>
            {pasoIdx === 0 ? 'Cancelar' : (
              <><ArrowLeft className="w-4 h-4 mr-1" /> Anterior</>
            )}
          </Button>
          {!esUltimoPaso ? (
            <Button onClick={handleSiguiente}>
              Siguiente <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleConfirmar}
              loading={mutation.isPending}
              variant={tipoCambio === TIPO_CAMBIO ? 'danger' : 'primary'}
            >
              <Check className="w-4 h-4 mr-1" />
              Confirmar cambio
            </Button>
          )}
        </>
      }
    >
      <BarraProgreso pasos={pasos} pasoActual={pasoActual} />

      {pasoActual === 'tipo' && (
        <PasoTipo
          tipoCambio={tipoCambio}
          setTipoCambio={handleSetTipo}
          motivo={motivo}
          setMotivo={setMotivo}
        />
      )}

      {pasoActual === 'datos' && (
        <PasoDatos
          contador={contador}
          tipoCambio={tipoCambio}
          nuevosDatos={nuevosDatos}
          setNuevosDatos={setNuevosDatos}
          errors={stepErrors}
        />
      )}

      {pasoActual === 'lecturas' && (
        <PasoLecturas
          contador={contador}
          conservaLecturas={conservaLecturas}
          setConservaLecturas={setConservaLecturas}
          lecturasReset={lecturasReset}
          setLecturasReset={setLecturasReset}
          errors={stepErrors}
        />
      )}

      {pasoActual === 'resumen' && (
        <PasoResumen
          contador={contador}
          tipoCambio={tipoCambio}
          nuevosDatos={nuevosDatos}
          conservaLecturas={tipoCambio === TIPO_CORRECCION ? true : conservaLecturas}
          lecturasReset={lecturasReset}
          motivo={motivo}
        />
      )}
    </Modal>
  )
}
