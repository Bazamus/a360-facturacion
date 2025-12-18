import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, FileText, AlertTriangle, Check } from 'lucide-react'
import { Button, Card, Modal } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { PeriodoSelector, LecturasPendientesTable } from '@/features/facturacion/components'
import { formatCurrency } from '@/features/facturacion/utils/calculos'
import { useComunidades } from '@/hooks/useComunidades'
import { 
  useLecturasPendientesFacturar,
  useCreateFactura,
  useCreateFacturaLineas,
  useCreateFacturaHistorico
} from '@/hooks/useFacturas'
import { usePreciosVigentes } from '@/hooks/useComunidades'
import { useConceptos } from '@/hooks/useConceptos'
import { supabase } from '@/lib/supabase'

export default function GenerarFacturas() {
  const navigate = useNavigate()
  const toast = useToast()

  // Estado
  const [step, setStep] = useState(1)
  const [comunidadId, setComunidadId] = useState('')
  const [periodo, setPeriodo] = useState({ inicio: '', fin: '', label: '' })
  const [selectedIds, setSelectedIds] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [resultados, setResultados] = useState(null)

  // Queries
  const { data: comunidades } = useComunidades({ activa: true })
  const { data: lecturas, isLoading: loadingLecturas, refetch: refetchLecturas } = useLecturasPendientesFacturar({
    comunidadId,
    periodoInicio: periodo.inicio,
    periodoFin: periodo.fin
  })
  const { data: precios } = usePreciosVigentes(comunidadId)
  const { data: conceptos } = useConceptos()

  // Mutations
  const createFactura = useCreateFactura()
  const createLineas = useCreateFacturaLineas()
  const createHistorico = useCreateFacturaHistorico()

  // Agrupar lecturas por contador para generar facturas
  const lecturasPorContador = useMemo(() => {
    if (!lecturas) return {}
    
    const grupos = {}
    lecturas.forEach(l => {
      if (!grupos[l.contador_id]) {
        grupos[l.contador_id] = {
          contador_id: l.contador_id,
          contador_numero_serie: l.contador_numero_serie,
          cliente_id: l.cliente_actual_id,
          cliente_nombre: l.cliente_nombre,
          cliente_nif: l.cliente_nif,
          ubicacion_id: l.ubicacion_id,
          ubicacion_nombre: l.ubicacion_nombre,
          agrupacion_nombre: l.agrupacion_nombre,
          comunidad_id: l.comunidad_id,
          lecturas: []
        }
      }
      grupos[l.contador_id].lecturas.push(l)
    })
    return grupos
  }, [lecturas])

  // Contadores con lecturas seleccionadas
  const contadoresSeleccionados = useMemo(() => {
    const contadores = new Set()
    lecturas?.forEach(l => {
      if (selectedIds.includes(l.id)) {
        contadores.add(l.contador_id)
      }
    })
    return contadores
  }, [lecturas, selectedIds])

  // Buscar lecturas
  const handleBuscar = () => {
    if (!comunidadId || !periodo.inicio || !periodo.fin) {
      toast.error('Selecciona una comunidad y un periodo')
      return
    }
    refetchLecturas()
    setStep(2)
  }

  // Generar facturas
  const handleGenerar = async () => {
    if (selectedIds.length === 0) {
      toast.error('Selecciona al menos una lectura')
      return
    }

    setIsGenerating(true)
    const results = {
      success: [],
      errors: []
    }

    try {
      // Obtener datos necesarios
      const comunidad = comunidades?.find(c => c.id === comunidadId)
      
      // Procesar cada contador con lecturas seleccionadas
      for (const contadorId of contadoresSeleccionados) {
        const grupo = lecturasPorContador[contadorId]
        const lecturasContador = grupo.lecturas.filter(l => selectedIds.includes(l.id))

        if (lecturasContador.length === 0) continue

        // Verificar que hay cliente
        if (!grupo.cliente_id) {
          results.errors.push({
            contador: grupo.contador_numero_serie,
            error: 'Sin cliente asignado'
          })
          continue
        }

        try {
          // Obtener datos completos del cliente
          const { data: cliente } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', grupo.cliente_id)
            .single()

          // Obtener ubicación
          const { data: ubicacion } = await supabase
            .from('ubicaciones')
            .select('*')
            .eq('id', grupo.ubicacion_id)
            .single()

          // Calcular días del periodo
          const diasPeriodo = Math.floor(
            (new Date(periodo.fin) - new Date(periodo.inicio)) / (1000 * 60 * 60 * 24)
          ) + 1
          const diasMes = new Date(
            new Date(periodo.inicio).getFullYear(),
            new Date(periodo.inicio).getMonth() + 1,
            0
          ).getDate()

          // Crear líneas de factura
          const lineas = []
          let baseImponible = 0
          let orden = 0

          for (const lectura of lecturasContador) {
            const precio = precios?.find(p => p.concepto_id === lectura.concepto_id)
            const precioUnitario = precio?.precio_unitario || lectura.precio_unitario || 0
            const subtotal = Math.round((lectura.consumo || 0) * precioUnitario * 100) / 100

            baseImponible += subtotal

            lineas.push({
              lectura_id: lectura.id,
              concepto_id: lectura.concepto_id,
              concepto_codigo: lectura.concepto_codigo,
              concepto_nombre: lectura.concepto_nombre,
              unidad_medida: lectura.unidad_medida,
              es_termino_fijo: false,
              contador_numero_serie: grupo.contador_numero_serie,
              lectura_anterior: lectura.lectura_anterior,
              fecha_lectura_anterior: lectura.fecha_lectura_anterior,
              lectura_actual: lectura.lectura_valor,
              fecha_lectura_actual: lectura.fecha_lectura,
              consumo: lectura.consumo,
              cantidad: lectura.consumo,
              precio_unitario: precioUnitario,
              subtotal,
              orden: orden++
            })
          }

          // Añadir término fijo si existe
          const conceptoTF = conceptos?.find(c => c.es_termino_fijo && c.activo)
          const precioTF = conceptoTF ? precios?.find(p => p.concepto_id === conceptoTF.id) : null

          if (conceptoTF && precioTF) {
            const esParcial = diasPeriodo < diasMes
            const cantidadTF = esParcial ? Math.round((diasPeriodo / diasMes) * 10000) / 10000 : 1
            const subtotalTF = esParcial 
              ? Math.round((precioTF.precio_unitario * diasPeriodo / diasMes) * 100) / 100
              : precioTF.precio_unitario

            baseImponible += subtotalTF

            lineas.push({
              lectura_id: null,
              concepto_id: conceptoTF.id,
              concepto_codigo: conceptoTF.codigo,
              concepto_nombre: 'Término fijo gestión energética',
              unidad_medida: 'unidad',
              es_termino_fijo: true,
              cantidad: cantidadTF,
              precio_unitario: precioTF.precio_unitario,
              subtotal: subtotalTF,
              orden: orden++
            })
          }

          // Calcular totales
          const importeIva = Math.round(baseImponible * 0.21 * 100) / 100
          const total = Math.round((baseImponible + importeIva) * 100) / 100

          // Fecha vencimiento: 15 días después del fin del periodo
          const fechaVencimiento = new Date(periodo.fin)
          fechaVencimiento.setDate(fechaVencimiento.getDate() + 15)

          // Crear factura
          const factura = await createFactura.mutateAsync({
            cliente_id: grupo.cliente_id,
            comunidad_id: comunidadId,
            ubicacion_id: grupo.ubicacion_id,
            contador_id: contadorId,
            periodo_inicio: periodo.inicio,
            periodo_fin: periodo.fin,
            es_periodo_parcial: diasPeriodo < diasMes,
            dias_periodo: diasPeriodo,
            fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
            base_imponible: Math.round(baseImponible * 100) / 100,
            importe_iva: importeIva,
            total,
            metodo_pago: cliente.iban ? 'domiciliacion' : 'transferencia',
            cliente_nombre: `${cliente.nombre} ${cliente.apellidos || ''}`.trim(),
            cliente_nif: cliente.nif,
            cliente_direccion: cliente.direccion_correspondencia || ubicacion?.nombre || '',
            cliente_cp: cliente.cp_correspondencia || '',
            cliente_ciudad: cliente.ciudad_correspondencia || '',
            cliente_provincia: cliente.provincia_correspondencia || '',
            cliente_email: cliente.email,
            cliente_iban: cliente.iban,
            ubicacion_direccion: `${grupo.agrupacion_nombre} ${grupo.ubicacion_nombre}`.trim()
          })

          // Crear líneas
          const lineasConFactura = lineas.map(l => ({ ...l, factura_id: factura.id }))
          await createLineas.mutateAsync(lineasConFactura)

          results.success.push({
            contador: grupo.contador_numero_serie,
            cliente: grupo.cliente_nombre,
            total,
            facturaId: factura.id
          })

        } catch (err) {
          console.error('Error generando factura:', err)
          results.errors.push({
            contador: grupo.contador_numero_serie,
            error: err.message
          })
        }
      }

      setResultados(results)
      setStep(3)

      if (results.success.length > 0) {
        toast.success(`${results.success.length} factura(s) generada(s) correctamente`)
      }
      if (results.errors.length > 0) {
        toast.warning(`${results.errors.length} factura(s) con errores`)
      }

    } catch (error) {
      console.error('Error en generación masiva:', error)
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/facturacion/facturas')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generar Facturas</h1>
          <p className="text-gray-500 mt-1">
            Genera facturas a partir de las lecturas pendientes
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-4 py-4">
        {[
          { num: 1, label: 'Seleccionar periodo' },
          { num: 2, label: 'Revisar lecturas' },
          { num: 3, label: 'Resultados' }
        ].map((s, index) => (
          <React.Fragment key={s.num}>
            <div className={`flex items-center gap-2 ${
              s.num === step ? 'text-blue-600' : 
              s.num < step ? 'text-green-600' : 'text-gray-400'
            }`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s.num === step ? 'bg-blue-100 text-blue-700' :
                s.num < step ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {s.num < step ? <Check className="w-4 h-4" /> : s.num}
              </span>
              <span className="hidden sm:inline text-sm font-medium">{s.label}</span>
            </div>
            {index < 2 && (
              <div className={`w-16 h-0.5 ${s.num < step ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Paso 1: Seleccionar comunidad y periodo */}
      {step === 1 && (
        <Card className="p-6 space-y-6">
          <h2 className="text-lg font-semibold">Paso 1: Seleccionar Comunidad y Periodo</h2>
          
          {/* Comunidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comunidad
            </label>
            <select
              value={comunidadId}
              onChange={(e) => setComunidadId(e.target.value)}
              className="w-full max-w-md rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Selecciona una comunidad</option>
              {comunidades?.map(c => (
                <option key={c.id} value={c.id}>
                  {c.codigo} - {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Periodo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Periodo de facturación
            </label>
            <PeriodoSelector value={periodo} onChange={setPeriodo} />
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleBuscar}
              disabled={!comunidadId || !periodo.inicio || !periodo.fin}
            >
              Buscar lecturas pendientes
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Paso 2: Revisar y seleccionar lecturas */}
      {step === 2 && (
        <div className="space-y-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {comunidades?.find(c => c.id === comunidadId)?.nombre}
                </p>
                <p className="text-sm text-gray-500">
                  Periodo: {periodo.label || `${periodo.inicio} - ${periodo.fin}`}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                Cambiar
              </Button>
            </div>
          </Card>

          {loadingLecturas ? (
            <Card className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-3 text-gray-500">Buscando lecturas pendientes...</p>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-gray-600">
                  Se encontraron <span className="font-semibold">{lecturas?.length || 0}</span> lecturas pendientes 
                  en <span className="font-semibold">{Object.keys(lecturasPorContador).length}</span> contadores
                </p>
              </div>

              <LecturasPendientesTable
                lecturas={lecturas || []}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Atrás
                </Button>
                <Button
                  onClick={handleGenerar}
                  disabled={selectedIds.length === 0 || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generando...
                    </>
                  ) : (
                    <>
                      Generar {contadoresSeleccionados.size} factura(s)
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Paso 3: Resultados */}
      {step === 3 && resultados && (
        <Card className="p-6 space-y-6">
          <h2 className="text-lg font-semibold">Resultados de la generación</h2>

          {/* Resumen */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <Check className="w-5 h-5" />
                <span className="font-medium">Facturas generadas</span>
              </div>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {resultados.success.length}
              </p>
            </div>
            {resultados.errors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Errores</span>
                </div>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {resultados.errors.length}
                </p>
              </div>
            )}
          </div>

          {/* Lista de éxitos */}
          {resultados.success.length > 0 && (
            <div>
              <h3 className="font-medium text-green-700 mb-2">Facturas creadas:</h3>
              <div className="bg-green-50 rounded-lg divide-y divide-green-200">
                {resultados.success.map((r, i) => (
                  <div key={i} className="px-4 py-2 flex items-center justify-between">
                    <div>
                      <span className="font-mono">{r.contador}</span>
                      <span className="text-gray-500 ml-2">- {r.cliente}</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(r.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de errores */}
          {resultados.errors.length > 0 && (
            <div>
              <h3 className="font-medium text-red-700 mb-2">Errores:</h3>
              <div className="bg-red-50 rounded-lg divide-y divide-red-200">
                {resultados.errors.map((r, i) => (
                  <div key={i} className="px-4 py-2">
                    <span className="font-mono">{r.contador}</span>
                    <span className="text-red-600 ml-2">- {r.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => {
              setStep(1)
              setSelectedIds([])
              setResultados(null)
            }}>
              Generar más facturas
            </Button>
            <Button onClick={() => navigate('/facturacion/facturas')}>
              Ver todas las facturas
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}



