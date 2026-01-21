import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, FileText, Trash2, Plus } from 'lucide-react'
import { Button, Card, Modal, Input, Select, FormField } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import {
  useFactura,
  useLineasFactura,
  useUpdateLineaFactura,
  useDeleteLineaFactura,
  useCreateLineaFactura,
  useEmitirFactura
} from '@/hooks/useFacturas'
import { useConceptos, usePreciosVigentes } from '@/hooks'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/features/facturacion/utils/calculos'

export default function FacturaEditar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  // Hooks de datos
  const { data: factura, isLoading: loadingFactura } = useFactura(id)
  const { data: lineas, isLoading: loadingLineas } = useLineasFactura(id)
  const { data: conceptos } = useConceptos()
  const { data: precios } = usePreciosVigentes(factura?.comunidad_id)

  // Hooks de mutación
  const actualizarLinea = useUpdateLineaFactura()
  const eliminarLinea = useDeleteLineaFactura()
  const crearLinea = useCreateLineaFactura()
  const emitirFactura = useEmitirFactura()

  // Estados locales
  const [lineasEditadas, setLineasEditadas] = useState([])
  const [totales, setTotales] = useState({ subtotal: 0, iva: 0, total: 0 })
  const [deleteModal, setDeleteModal] = useState({ open: false, linea: null })
  const [addLineaModal, setAddLineaModal] = useState({ open: false })
  const [conceptoSeleccionado, setConceptoSeleccionado] = useState(null)
  const [guardando, setGuardando] = useState(false)

  // Validar que la factura sea borrador
  useEffect(() => {
    if (factura && factura.estado !== 'borrador') {
      toast.error('Solo se pueden editar facturas en borrador')
      navigate(`/facturacion/facturas/${id}`)
    }
  }, [factura, id, navigate, toast])

  // Cargar líneas en estado local
  useEffect(() => {
    if (lineas) {
      setLineasEditadas(lineas.map(l => ({ ...l })))
    }
  }, [lineas])

  // Recalcular totales cuando cambien las líneas
  useEffect(() => {
    const subtotal = lineasEditadas.reduce((sum, l) => {
      const cantidad = parseFloat(l.cantidad) || 0
      const precio = parseFloat(l.precio_unitario) || 0
      return sum + (cantidad * precio)
    }, 0)

    const porcentajeIva = factura?.porcentaje_iva || 21
    const iva = subtotal * (porcentajeIva / 100)
    const total = subtotal + iva

    setTotales({ subtotal, iva, total })
  }, [lineasEditadas, factura])

  // Handlers para edición de líneas
  const handleChangeLinea = (lineaId, campo, valor) => {
    setLineasEditadas(prev =>
      prev.map(l =>
        l.id === lineaId
          ? { ...l, [campo]: valor }
          : l
      )
    )
  }

  const handleEliminarLinea = async () => {
    const linea = deleteModal.linea
    if (!linea) return

    try {
      await eliminarLinea.mutateAsync({ lineaId: linea.id, facturaId: id })
      toast.success('Línea eliminada')
      setDeleteModal({ open: false, linea: null })
    } catch (error) {
      toast.error(`Error al eliminar: ${error.message}`)
    }
  }

  const handleAgregarLinea = async () => {
    if (!conceptoSeleccionado) {
      toast.error('Selecciona un concepto')
      return
    }

    // Buscar precio vigente del concepto
    const precioConcepto = precios?.find(p => p.concepto_id === conceptoSeleccionado.id)
    const precioUnitario = precioConcepto?.precio_unitario || 0

    const nuevaLinea = {
      factura_id: id,
      concepto_id: conceptoSeleccionado.id,
      concepto_codigo: conceptoSeleccionado.codigo,
      concepto_nombre: conceptoSeleccionado.nombre,
      unidad_medida: conceptoSeleccionado.unidad_medida,
      es_termino_fijo: conceptoSeleccionado.es_termino_fijo || false,
      cantidad: 1,
      precio_unitario: precioUnitario,
      subtotal: precioUnitario,
      orden: lineasEditadas.length + 1
    }

    try {
      await crearLinea.mutateAsync(nuevaLinea)
      toast.success('Línea agregada')
      setAddLineaModal({ open: false })
      setConceptoSeleccionado(null)
    } catch (error) {
      toast.error(`Error al agregar línea: ${error.message}`)
    }
  }

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      // 1. Actualizar cada línea modificada
      for (const linea of lineasEditadas) {
        const lineaOriginal = lineas.find(l => l.id === linea.id)

        // Solo actualizar si cambió
        if (JSON.stringify(lineaOriginal) !== JSON.stringify(linea)) {
          const cantidad = parseFloat(linea.cantidad) || 0
          const precio = parseFloat(linea.precio_unitario) || 0

          await actualizarLinea.mutateAsync({
            lineaId: linea.id,
            facturaId: id,
            updates: {
              cantidad,
              precio_unitario: precio,
              subtotal: Math.round(cantidad * precio * 100) / 100
            }
          })
        }
      }

      // 2. Recalcular y actualizar totales de la factura
      const nuevoSubtotal = lineasEditadas.reduce((sum, l) => {
        return sum + (parseFloat(l.cantidad) || 0) * (parseFloat(l.precio_unitario) || 0)
      }, 0)

      const porcentajeIva = factura?.porcentaje_iva || 21
      const nuevoIva = Math.round(nuevoSubtotal * (porcentajeIva / 100) * 100) / 100
      const nuevoTotal = Math.round((nuevoSubtotal + nuevoIva) * 100) / 100

      await supabase
        .from('facturas')
        .update({
          base_imponible: Math.round(nuevoSubtotal * 100) / 100,
          importe_iva: nuevoIva,
          total: nuevoTotal
        })
        .eq('id', id)

      toast.success('Cambios guardados')
    } catch (error) {
      toast.error(`Error al guardar: ${error.message}`)
    } finally {
      setGuardando(false)
    }
  }

  const handleEmitir = async () => {
    const confirmar = window.confirm(
      '¿Guardar cambios y emitir esta factura? Esta acción no se puede deshacer.'
    )

    if (!confirmar) return

    setGuardando(true)
    try {
      // Primero guardar cambios
      for (const linea of lineasEditadas) {
        const lineaOriginal = lineas.find(l => l.id === linea.id)

        if (JSON.stringify(lineaOriginal) !== JSON.stringify(linea)) {
          const cantidad = parseFloat(linea.cantidad) || 0
          const precio = parseFloat(linea.precio_unitario) || 0

          await actualizarLinea.mutateAsync({
            lineaId: linea.id,
            facturaId: id,
            updates: {
              cantidad,
              precio_unitario: precio,
              subtotal: Math.round(cantidad * precio * 100) / 100
            }
          })
        }
      }

      // Actualizar totales antes de emitir
      const nuevoSubtotal = lineasEditadas.reduce((sum, l) => {
        return sum + (parseFloat(l.cantidad) || 0) * (parseFloat(l.precio_unitario) || 0)
      }, 0)

      const porcentajeIva = factura?.porcentaje_iva || 21
      const nuevoIva = Math.round(nuevoSubtotal * (porcentajeIva / 100) * 100) / 100
      const nuevoTotal = Math.round((nuevoSubtotal + nuevoIva) * 100) / 100

      await supabase
        .from('facturas')
        .update({
          base_imponible: Math.round(nuevoSubtotal * 100) / 100,
          importe_iva: nuevoIva,
          total: nuevoTotal
        })
        .eq('id', id)

      // Luego emitir
      const result = await emitirFactura.mutateAsync(id)
      toast.success(`Factura emitida con número ${result.numero_completo}`)
      navigate(`/facturacion/facturas/${id}`)
    } catch (error) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setGuardando(false)
    }
  }

  if (loadingFactura || loadingLineas) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-500">Cargando factura...</span>
      </div>
    )
  }

  if (!factura) {
    return (
      <div className="text-center p-12">
        <p className="text-gray-500">Factura no encontrada</p>
        <Button onClick={() => navigate('/facturacion/facturas')} className="mt-4">
          Volver a facturas
        </Button>
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
            <h1 className="text-2xl font-bold text-gray-900">Editar Factura</h1>
            <p className="text-gray-500 mt-1">Borrador en edición</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGuardar}
            disabled={guardando}
          >
            <Save className="w-4 h-4 mr-2" />
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </Button>
          <Button
            onClick={handleEmitir}
            disabled={guardando}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <FileText className="w-4 h-4 mr-2" />
            Emitir factura
          </Button>
        </div>
      </div>

      {/* Información de la factura (no editable) */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Datos del Cliente</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Nombre:</span>
              <span className="ml-2 font-medium">{factura.cliente_nombre}</span>
            </div>
            <div>
              <span className="text-gray-500">NIF:</span>
              <span className="ml-2 font-medium">{factura.cliente_nif}</span>
            </div>
            {factura.cliente_email && (
              <div>
                <span className="text-gray-500">Email:</span>
                <span className="ml-2 font-medium">{factura.cliente_email}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Dirección:</span>
              <span className="ml-2 font-medium">{factura.cliente_direccion || '-'}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Datos de la Factura</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Comunidad:</span>
              <span className="ml-2 font-medium">{factura.comunidad?.nombre || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">Ubicación:</span>
              <span className="ml-2 font-medium">{factura.ubicacion?.nombre || factura.ubicacion_direccion || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">Periodo:</span>
              <span className="ml-2 font-medium">
                {formatDate(factura.periodo_inicio)} - {formatDate(factura.periodo_fin)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Líneas de factura - Editables */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Líneas de Factura</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddLineaModal({ open: true })}
            disabled={crearLinea.isPending}
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
              {lineasEditadas.map((linea) => {
                const cantidad = parseFloat(linea.cantidad) || 0
                const precio = parseFloat(linea.precio_unitario) || 0
                const total = cantidad * precio

                return (
                  <tr key={linea.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <span className="font-medium">{linea.concepto_nombre}</span>
                        <span className="text-gray-500 text-xs block">{linea.concepto_codigo} - {linea.unidad_medida}</span>
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
                      {formatCurrency(total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteModal({ open: true, linea })}
                        className="text-red-600 hover:text-red-700"
                        title="Eliminar línea"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
              {lineasEditadas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No hay líneas en esta factura. Agrega una línea para comenzar.
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
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(totales.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">IVA ({factura.porcentaje_iva || 21}%):</span>
              <span className="font-medium">{formatCurrency(totales.iva)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="font-semibold text-gray-900">Total:</span>
              <span className="font-bold text-lg text-gray-900">{formatCurrency(totales.total)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Modal eliminar línea */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, linea: null })}
        title="Eliminar línea"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            ¿Estás seguro de que deseas eliminar esta línea de la factura?
          </p>
          {deleteModal.linea && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p><strong>Concepto:</strong> {deleteModal.linea.concepto_nombre}</p>
              <p><strong>Cantidad:</strong> {deleteModal.linea.cantidad} {deleteModal.linea.unidad_medida}</p>
              <p><strong>Precio:</strong> {formatCurrency(deleteModal.linea.precio_unitario)}</p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ open: false, linea: null })}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleEliminarLinea}
              disabled={eliminarLinea.isPending}
            >
              {eliminarLinea.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal agregar línea */}
      <Modal
        open={addLineaModal.open}
        onClose={() => { setAddLineaModal({ open: false }); setConceptoSeleccionado(null) }}
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

          {conceptoSeleccionado && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p><strong>Código:</strong> {conceptoSeleccionado.codigo}</p>
              <p><strong>Unidad:</strong> {conceptoSeleccionado.unidad_medida}</p>
              <p><strong>Tipo:</strong> {conceptoSeleccionado.es_termino_fijo ? 'Término Fijo' : 'Variable'}</p>
              {precios?.find(p => p.concepto_id === conceptoSeleccionado.id) && (
                <p><strong>Precio vigente:</strong> {formatCurrency(precios.find(p => p.concepto_id === conceptoSeleccionado.id).precio_unitario)}</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => { setAddLineaModal({ open: false }); setConceptoSeleccionado(null) }}>
              Cancelar
            </Button>
            <Button onClick={handleAgregarLinea} disabled={!conceptoSeleccionado || crearLinea.isPending}>
              {crearLinea.isPending ? 'Agregando...' : 'Agregar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
