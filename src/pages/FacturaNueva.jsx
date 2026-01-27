import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, FileText, Plus, Trash2, Calculator, AlertTriangle } from 'lucide-react'
import { Button, Card, Modal, Input, Select, FormField, Badge } from '@/components/ui'
import { getBadgeVariant } from '@/utils/estadosCliente'
import { useToast } from '@/components/ui/Toast'
import {
  useCreateFactura,
  useCreateFacturaLineas,
  useEmitirFactura
} from '@/hooks/useFacturas'
import { useComunidades, usePreciosVigentes } from '@/hooks/useComunidades'
import { useClientes } from '@/hooks/useClientes'
import { useConceptos } from '@/hooks/useConceptos'
import { formatCurrency } from '@/features/facturacion/utils/calculos'

export default function FacturaNueva() {
  const navigate = useNavigate()
  const toast = useToast()

  // Hooks de datos
  const { data: comunidades, isLoading: loadingComunidades } = useComunidades()
  const { data: conceptos } = useConceptos()

  // Estado del formulario
  const [comunidadId, setComunidadId] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [periodoInicio, setPeriodoInicio] = useState('')
  const [periodoFin, setPeriodoFin] = useState('')
  const [porcentajeIva, setPorcentajeIva] = useState(21)

  // Obtener clientes filtrados por comunidad
  const { data: clientes, isLoading: loadingClientes } = useClientes({
    comunidadId: comunidadId || undefined
  })

  // Obtener precios vigentes de la comunidad seleccionada
  const { data: precios } = usePreciosVigentes(comunidadId || undefined)

  // Estado de líneas de factura
  const [lineas, setLineas] = useState([])
  const [addLineaModal, setAddLineaModal] = useState({ open: false })
  const [conceptoSeleccionado, setConceptoSeleccionado] = useState(null)
  const [nuevaCantidad, setNuevaCantidad] = useState(1)

  // Hooks de mutación
  const crearFactura = useCreateFactura()
  const crearLineas = useCreateFacturaLineas()
  const emitirFactura = useEmitirFactura()

  const [guardando, setGuardando] = useState(false)
  const [advertenciaModal, setAdvertenciaModal] = useState({ open: false, accion: null })

  // Reset cliente cuando cambia comunidad
  useEffect(() => {
    setClienteId('')
  }, [comunidadId])

  // Calcular totales
  const totales = useMemo(() => {
    const subtotal = lineas.reduce((sum, l) => sum + (l.subtotal || 0), 0)
    const iva = subtotal * (porcentajeIva / 100)
    const total = subtotal + iva
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      iva: Math.round(iva * 100) / 100,
      total: Math.round(total * 100) / 100
    }
  }, [lineas, porcentajeIva])

  // Obtener cliente seleccionado
  const clienteSeleccionado = useMemo(() => {
    return clientes?.find(c => c.id === clienteId)
  }, [clientes, clienteId])

  // Obtener comunidad seleccionada
  const comunidadSeleccionada = useMemo(() => {
    return comunidades?.find(c => c.id === comunidadId)
  }, [comunidades, comunidadId])

  // Handler para agregar línea
  const handleAgregarLinea = () => {
    if (!conceptoSeleccionado) {
      toast.error('Selecciona un concepto')
      return
    }

    const cantidad = parseFloat(nuevaCantidad) || 0
    if (cantidad <= 0) {
      toast.error('La cantidad debe ser mayor a 0')
      return
    }

    // Buscar precio vigente del concepto
    const precioConcepto = precios?.find(p => p.concepto_id === conceptoSeleccionado.id)
    const precioUnitario = precioConcepto?.precio_unitario || 0

    const nuevaLinea = {
      id: Date.now(), // ID temporal para el estado local
      concepto_id: conceptoSeleccionado.id,
      concepto_codigo: conceptoSeleccionado.codigo,
      concepto_nombre: conceptoSeleccionado.nombre,
      unidad_medida: conceptoSeleccionado.unidad_medida,
      es_termino_fijo: conceptoSeleccionado.es_termino_fijo || false,
      cantidad: cantidad,
      precio_unitario: precioUnitario,
      subtotal: Math.round(cantidad * precioUnitario * 100) / 100,
      orden: lineas.length + 1
    }

    setLineas(prev => [...prev, nuevaLinea])
    setAddLineaModal({ open: false })
    setConceptoSeleccionado(null)
    setNuevaCantidad(1)
    toast.success('Línea agregada')
  }

  // Handler para actualizar línea
  const handleChangeLinea = (lineaId, campo, valor) => {
    setLineas(prev =>
      prev.map(l => {
        if (l.id !== lineaId) return l

        const updated = { ...l, [campo]: valor }

        // Recalcular subtotal si cambia cantidad o precio
        if (campo === 'cantidad' || campo === 'precio_unitario') {
          const cantidad = parseFloat(campo === 'cantidad' ? valor : l.cantidad) || 0
          const precio = parseFloat(campo === 'precio_unitario' ? valor : l.precio_unitario) || 0
          updated.subtotal = Math.round(cantidad * precio * 100) / 100
        }

        return updated
      })
    )
  }

  // Handler para eliminar línea
  const handleEliminarLinea = (lineaId) => {
    setLineas(prev => prev.filter(l => l.id !== lineaId))
    toast.success('Línea eliminada')
  }

  // Validar formulario
  const validarFormulario = () => {
    if (!comunidadId) {
      toast.error('Selecciona una comunidad')
      return false
    }
    if (!clienteId) {
      toast.error('Selecciona un cliente')
      return false
    }
    // Validar periodo solo si se proporcionaron ambas fechas
    if (periodoInicio && periodoFin) {
      if (new Date(periodoFin) < new Date(periodoInicio)) {
        toast.error('La fecha de fin debe ser posterior a la de inicio')
        return false
      }
    }
    // Validar que si hay una fecha, debe haber ambas
    if ((periodoInicio && !periodoFin) || (!periodoInicio && periodoFin)) {
      toast.error('Si defines un periodo, debes especificar ambas fechas')
      return false
    }
    if (lineas.length === 0) {
      toast.error('Agrega al menos una línea a la factura')
      return false
    }
    return true
  }

  // Handler para guardar como borrador
  const handleGuardarBorrador = async () => {
    if (!validarFormulario()) return

    // Verificar estado del cliente
    if (clienteSeleccionado?.estado && !clienteSeleccionado.estado.permite_facturacion) {
      setAdvertenciaModal({ open: true, accion: 'guardar' })
      return
    }

    await ejecutarGuardarBorrador()
  }

  const ejecutarGuardarBorrador = async () => {
    setAdvertenciaModal({ open: false, accion: null })
    setGuardando(true)
    try {
      // Calcular días del periodo solo si hay fechas
      let diasPeriodo = null
      if (periodoInicio && periodoFin) {
        const inicio = new Date(periodoInicio)
        const fin = new Date(periodoFin)
        diasPeriodo = Math.floor((fin - inicio) / (1000 * 60 * 60 * 24)) + 1
      }

      // Obtener ubicación del cliente (primera ubicación activa)
      const ubicacionCliente = clienteSeleccionado?.ubicaciones_clientes?.find(uc => uc.es_actual)
      const ubicacionId = ubicacionCliente?.ubicacion_id

      // Crear factura
      const facturaData = {
        comunidad_id: comunidadId,
        cliente_id: clienteId,
        ubicacion_id: ubicacionId || null,
        contador_id: null, // Factura manual sin contador
        periodo_inicio: periodoInicio || null,
        periodo_fin: periodoFin || null,
        dias_periodo: diasPeriodo,
        es_periodo_parcial: diasPeriodo ? diasPeriodo < 28 : false,
        fecha_factura: new Date().toISOString().split('T')[0],
        fecha_vencimiento: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        estado: 'borrador',
        porcentaje_iva: porcentajeIva,
        base_imponible: totales.subtotal,
        importe_iva: totales.iva,
        total: totales.total,
        metodo_pago: clienteSeleccionado?.iban ? 'domiciliacion' : 'transferencia',
        cliente_nombre: `${clienteSeleccionado?.nombre || ''} ${clienteSeleccionado?.apellidos || ''}`.trim(),
        cliente_nif: clienteSeleccionado?.nif || '',
        cliente_direccion: clienteSeleccionado?.direccion_correspondencia || clienteSeleccionado?.direccion || '',
        cliente_cp: clienteSeleccionado?.cp_correspondencia || clienteSeleccionado?.cp || '',
        cliente_ciudad: clienteSeleccionado?.ciudad_correspondencia || clienteSeleccionado?.ciudad || '',
        cliente_provincia: clienteSeleccionado?.provincia_correspondencia || clienteSeleccionado?.provincia || '',
        cliente_email: clienteSeleccionado?.email || '',
        cliente_iban: clienteSeleccionado?.iban || '',
        cliente_estado_codigo: clienteSeleccionado?.estado?.codigo || null,
        cliente_estado_nombre: clienteSeleccionado?.estado?.nombre || null,
        cliente_estado_color: clienteSeleccionado?.estado?.color || null,
        ubicacion_direccion: ubicacionCliente?.ubicacion?.nombre || ''
      }

      const factura = await crearFactura.mutateAsync(facturaData)

      // Crear líneas
      const lineasData = lineas.map((l, index) => ({
        factura_id: factura.id,
        concepto_id: l.concepto_id,
        concepto_codigo: l.concepto_codigo,
        concepto_nombre: l.concepto_nombre,
        unidad_medida: l.unidad_medida,
        es_termino_fijo: l.es_termino_fijo,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        subtotal: l.subtotal,
        orden: index + 1
      }))

      await crearLineas.mutateAsync(lineasData)

      toast.success('Factura guardada como borrador')
      navigate(`/facturacion/facturas/${factura.id}`)
    } catch (error) {
      toast.error(`Error al guardar: ${error.message}`)
    } finally {
      setGuardando(false)
    }
  }

  // Handler para guardar y emitir
  const handleGuardarYEmitir = async () => {
    if (!validarFormulario()) return

    const confirmar = window.confirm(
      '¿Guardar y emitir esta factura? Una vez emitida no se podrá modificar.'
    )
    if (!confirmar) return

    setGuardando(true)
    try {
      // Calcular días del periodo solo si hay fechas
      let diasPeriodo = null
      if (periodoInicio && periodoFin) {
        const inicio = new Date(periodoInicio)
        const fin = new Date(periodoFin)
        diasPeriodo = Math.floor((fin - inicio) / (1000 * 60 * 60 * 24)) + 1
      }

      // Obtener ubicación del cliente
      const ubicacionCliente = clienteSeleccionado?.ubicaciones_clientes?.find(uc => uc.es_actual)
      const ubicacionId = ubicacionCliente?.ubicacion_id

      // Crear factura
      const facturaData = {
        comunidad_id: comunidadId,
        cliente_id: clienteId,
        ubicacion_id: ubicacionId || null,
        contador_id: null,
        periodo_inicio: periodoInicio || null,
        periodo_fin: periodoFin || null,
        dias_periodo: diasPeriodo,
        es_periodo_parcial: diasPeriodo ? diasPeriodo < 28 : false,
        fecha_factura: new Date().toISOString().split('T')[0],
        fecha_vencimiento: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        estado: 'borrador',
        porcentaje_iva: porcentajeIva,
        base_imponible: totales.subtotal,
        importe_iva: totales.iva,
        total: totales.total,
        metodo_pago: clienteSeleccionado?.iban ? 'domiciliacion' : 'transferencia',
        cliente_nombre: `${clienteSeleccionado?.nombre || ''} ${clienteSeleccionado?.apellidos || ''}`.trim(),
        cliente_nif: clienteSeleccionado?.nif || '',
        cliente_direccion: clienteSeleccionado?.direccion_correspondencia || clienteSeleccionado?.direccion || '',
        cliente_cp: clienteSeleccionado?.cp_correspondencia || clienteSeleccionado?.cp || '',
        cliente_ciudad: clienteSeleccionado?.ciudad_correspondencia || clienteSeleccionado?.ciudad || '',
        cliente_provincia: clienteSeleccionado?.provincia_correspondencia || clienteSeleccionado?.provincia || '',
        cliente_email: clienteSeleccionado?.email || '',
        cliente_iban: clienteSeleccionado?.iban || '',
        cliente_estado_codigo: clienteSeleccionado?.estado?.codigo || null,
        cliente_estado_nombre: clienteSeleccionado?.estado?.nombre || null,
        cliente_estado_color: clienteSeleccionado?.estado?.color || null,
        ubicacion_direccion: ubicacionCliente?.ubicacion?.nombre || ''
      }

      const factura = await crearFactura.mutateAsync(facturaData)

      // Crear líneas
      const lineasData = lineas.map((l, index) => ({
        factura_id: factura.id,
        concepto_id: l.concepto_id,
        concepto_codigo: l.concepto_codigo,
        concepto_nombre: l.concepto_nombre,
        unidad_medida: l.unidad_medida,
        es_termino_fijo: l.es_termino_fijo,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario,
        subtotal: l.subtotal,
        orden: index + 1
      }))

      await crearLineas.mutateAsync(lineasData)

      // Emitir factura
      const result = await emitirFactura.mutateAsync(factura.id)
      toast.success(`Factura emitida con número ${result.numero_completo}`)
      navigate(`/facturacion/facturas/${factura.id}`)
    } catch (error) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setGuardando(false)
    }
  }

  if (loadingComunidades) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-500">Cargando...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/facturacion/facturas')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nueva Factura Manual</h1>
            <p className="text-gray-500 mt-1">Crear factura sin lecturas previas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGuardarBorrador}
            disabled={guardando}
          >
            <Save className="w-4 h-4 mr-2" />
            {guardando ? 'Guardando...' : 'Guardar borrador'}
          </Button>
          <Button
            onClick={handleGuardarYEmitir}
            disabled={guardando}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <FileText className="w-4 h-4 mr-2" />
            Guardar y emitir
          </Button>
        </div>
      </div>

      {/* Datos básicos */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Comunidad y Cliente</h3>
          <div className="space-y-4">
            <FormField label="Comunidad" required>
              <Select
                value={comunidadId}
                onChange={(e) => setComunidadId(e.target.value)}
              >
                <option value="">Seleccionar comunidad...</option>
                {comunidades?.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} - {c.nombre}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Cliente" required>
              <Select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                disabled={!comunidadId || loadingClientes}
              >
                <option value="">
                  {!comunidadId
                    ? 'Primero selecciona una comunidad'
                    : loadingClientes
                      ? 'Cargando clientes...'
                      : 'Seleccionar cliente...'}
                </option>
                {clientes?.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.apellidos} - {c.nif}
                  </option>
                ))}
              </Select>
            </FormField>

            {clienteSeleccionado && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <p><strong>NIF:</strong> {clienteSeleccionado.nif}</p>
                <p><strong>Email:</strong> {clienteSeleccionado.email || '-'}</p>
                <p><strong>Dirección:</strong> {clienteSeleccionado.direccion_correspondencia || clienteSeleccionado.direccion || '-'}</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Periodo y Configuración</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Fecha inicio">
                <Input
                  type="date"
                  value={periodoInicio}
                  onChange={(e) => setPeriodoInicio(e.target.value)}
                  placeholder="dd/mm/aaaa"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Opcional. Dejar vacío para servicios puntuales
                </p>
              </FormField>
              <FormField label="Fecha fin">
                <Input
                  type="date"
                  value={periodoFin}
                  onChange={(e) => setPeriodoFin(e.target.value)}
                  placeholder="dd/mm/aaaa"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Opcional. Dejar vacío para servicios puntuales
                </p>
              </FormField>
            </div>

            <FormField label="IVA (%)">
              <Select
                value={porcentajeIva}
                onChange={(e) => setPorcentajeIva(Number(e.target.value))}
              >
                <option value={21}>21% (General)</option>
                <option value={10}>10% (Reducido)</option>
                <option value={4}>4% (Superreducido)</option>
                <option value={0}>0% (Exento)</option>
              </Select>
            </FormField>

            {comunidadSeleccionada && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <p className="text-blue-800">
                  <strong>Comunidad:</strong> {comunidadSeleccionada.nombre}
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  Los precios se cargarán automáticamente según la configuración de esta comunidad
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Líneas de factura */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Líneas de Factura</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddLineaModal({ open: true })}
            disabled={!comunidadId}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar línea
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Concepto
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-28">
                  Cantidad
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                  Precio Unit.
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                  Total
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lineas.map((linea) => (
                <tr key={linea.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <span className="font-medium">{linea.concepto_nombre}</span>
                      <span className="text-gray-500 text-xs block">
                        {linea.concepto_codigo} - {linea.unidad_medida}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      step="0.001"
                      value={linea.cantidad}
                      onChange={(e) => handleChangeLinea(linea.id, 'cantidad', e.target.value)}
                      className="text-sm text-center"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      step="0.00001"
                      value={linea.precio_unitario}
                      onChange={(e) => handleChangeLinea(linea.id, 'precio_unitario', e.target.value)}
                      className="text-sm text-right"
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(linea.subtotal)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEliminarLinea(linea.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Eliminar línea"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {lineas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    {!comunidadId
                      ? 'Selecciona una comunidad para poder agregar líneas'
                      : 'No hay líneas. Haz clic en "Agregar línea" para comenzar.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Panel de totales */}
      <div className="flex justify-end">
        <Card className="w-96 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Resumen</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Base imponible:</span>
              <span className="font-medium">{formatCurrency(totales.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">IVA ({porcentajeIva}%):</span>
              <span className="font-medium">{formatCurrency(totales.iva)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="font-semibold text-gray-900">Total:</span>
              <span className="font-bold text-lg text-gray-900">{formatCurrency(totales.total)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Modal agregar línea */}
      <Modal
        open={addLineaModal.open}
        onClose={() => {
          setAddLineaModal({ open: false })
          setConceptoSeleccionado(null)
          setNuevaCantidad(1)
        }}
        title="Agregar Línea"
      >
        <div className="space-y-4">
          <FormField label="Concepto" required>
            <Select
              value={conceptoSeleccionado?.id || ''}
              onChange={(e) => {
                const concepto = conceptos?.find(c => c.id === e.target.value)
                setConceptoSeleccionado(concepto || null)
              }}
            >
              <option value="">Seleccionar concepto...</option>
              {conceptos?.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.unidad_medida})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Cantidad" required>
            <Input
              type="number"
              step="0.001"
              value={nuevaCantidad}
              onChange={(e) => setNuevaCantidad(e.target.value)}
              placeholder="1"
            />
          </FormField>

          {conceptoSeleccionado && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <p><strong>Código:</strong> {conceptoSeleccionado.codigo}</p>
              <p><strong>Unidad:</strong> {conceptoSeleccionado.unidad_medida}</p>
              <p><strong>Tipo:</strong> {conceptoSeleccionado.es_termino_fijo ? 'Término Fijo' : 'Variable'}</p>
              {precios?.find(p => p.concepto_id === conceptoSeleccionado.id) ? (
                <p className="text-green-700">
                  <strong>Precio vigente:</strong>{' '}
                  {formatCurrency(precios.find(p => p.concepto_id === conceptoSeleccionado.id).precio_unitario)}
                  /{conceptoSeleccionado.unidad_medida}
                </p>
              ) : (
                <p className="text-amber-600">
                  <strong>Sin precio configurado</strong> - Se usará 0,00 €
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setAddLineaModal({ open: false })
                setConceptoSeleccionado(null)
                setNuevaCantidad(1)
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAgregarLinea}
              disabled={!conceptoSeleccionado}
            >
              Agregar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal advertencia estado cliente */}
      <Modal
        open={advertenciaModal.open}
        onClose={() => setAdvertenciaModal({ open: false, accion: null })}
        title="Advertencia: Estado del Cliente"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
            <div>
              <p className="text-gray-900 font-medium mb-2">
                El cliente seleccionado está en estado:
              </p>
              {clienteSeleccionado?.estado && (
                <Badge variant={getBadgeVariant(clienteSeleccionado.estado.color)} className="mb-3">
                  {clienteSeleccionado.estado.nombre}
                </Badge>
              )}
              <p className="text-gray-600 text-sm">
                Este estado requiere confirmación para continuar con la facturación. 
                ¿Desea continuar de todas formas?
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <p className="font-medium mb-1">Recomendación:</p>
            <p>
              Verifica el estado del cliente antes de emitir la factura. 
              Considera actualizar el estado si la situación ha cambiado.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setAdvertenciaModal({ open: false, accion: null })}
            >
              Cancelar
            </Button>
            <Button
              variant="warning"
              onClick={() => {
                if (advertenciaModal.accion === 'guardar') {
                  ejecutarGuardarBorrador()
                }
              }}
            >
              Continuar de todas formas
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
