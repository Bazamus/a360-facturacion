import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, CheckSquare, X, Download, FileSpreadsheet, FilePlus, Mail, Trash2, AlertTriangle, RotateCcw, XCircle, ArrowRightLeft } from 'lucide-react'
import { Button, Card, Modal, Pagination } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { FacturasTable, FacturaFilters, EstadoBadge, ModalExportarFacturas, ProgressoExportacion } from '@/features/facturacion/components'
import { formatCurrency, formatDate } from '@/features/facturacion/utils/calculos'
import { descargarFacturaPDF } from '@/features/facturacion/pdf'
import { supabase } from '@/lib/supabase'
import { useComunidades } from '@/hooks/useComunidades'
import {
  useFacturas,
  useDeleteFactura,
  useMarcarPagada,
  useEstadisticasFacturacion,
  useEmitirFacturasMasivo,
  useEliminarFacturas,
  useAnularFactura,
  useCrearFacturaAbono,
  fetchAllFacturas
} from '@/hooks/useFacturas'
import { useEnviarFactura } from '@/hooks/useEnvios'
import { useExportarFacturas } from '@/features/facturacion/hooks/useExportarFacturas'

export default function Facturas() {
  const navigate = useNavigate()
  const toast = useToast()

  const [filters, setFilters] = useState({
    comunidadId: '',
    estado: '',
    search: '',
    rangoFecha: '',
    fechaDesde: null,
    fechaHasta: null
  })
  const [deleteModal, setDeleteModal] = useState({ open: false, factura: null })
  const [pagarModal, setPagarModal] = useState({ open: false, factura: null })
  const [eliminarModal, setEliminarModal] = useState({ open: false, facturas: [] })
  const [selectedIds, setSelectedIds] = useState([])
  const [emitiendo, setEmitiendo] = useState(false)
  const [descargandoPDF, setDescargandoPDF] = useState(null) // ID de la factura siendo descargada
  const [modo, setModo] = useState('emision') // 'emision' | 'descarga' | 'eliminar' | 'abono' | 'anular'
  const [abonoMasivoModal, setAbonoMasivoModal] = useState(false)
  const [anularMasivoModal, setAnularMasivoModal] = useState({ open: false })
  const [motivoAnulacionMasivo, setMotivoAnulacionMasivo] = useState('')
  const [emailMasivoModal, setEmailMasivoModal] = useState(false)
  const [modoTestEmailMasivo, setModoTestEmailMasivo] = useState(false)
  const [progresoMasivo, setProgresoMasivo] = useState({ actual: 0, total: 0 })
  const [ejecutandoMasivo, setEjecutandoMasivo] = useState(false)
  const [descargandoPDFs, setDescargandoPDFs] = useState(false)
  const [progresoDescarga, setProgresoDescarga] = useState({ actual: 0, total: 0 })
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  
  // Estados de ordenación
  const [sortBy, setSortBy] = useState('fecha_factura')
  const [sortDirection, setSortDirection] = useState('desc')

  const { data: comunidades } = useComunidades()
  const { data: facturasResult, isLoading, refetch } = useFacturas({
    ...filters,
    limit: itemsPerPage,
    offset: (currentPage - 1) * itemsPerPage,
    withCount: true,
    sortBy,
    sortDirection
  })
  // Estadísticas sin filtro de estado (para mostrar siempre todos los conteos)
  const { data: stats } = useEstadisticasFacturacion({
    comunidadId: filters.comunidadId,
    fechaDesde: filters.fechaDesde,
    fechaHasta: filters.fechaHasta
  })
  
  // Extraer datos y total de la respuesta
  const facturas = facturasResult?.data || facturasResult || []
  const totalFacturas = facturasResult?.total || 0
  const totalPages = Math.ceil(totalFacturas / itemsPerPage)
  const deleteFactura = useDeleteFactura()
  const marcarPagada = useMarcarPagada()
  const emitirMasivo = useEmitirFacturasMasivo()
  const enviarFactura = useEnviarFactura()
  const eliminarFacturas = useEliminarFacturas()
  const anularFactura = useAnularFactura()
  const crearAbono = useCrearFacturaAbono()
  const { exportar } = useExportarFacturas()

  // Estados para exportación
  const [modalExport, setModalExport] = useState(false)
  const [progresoExportacion, setProgresoExportacion] = useState(null)

  // Estados para envío de email
  const [emailModal, setEmailModal] = useState({ open: false, factura: null, esReenvio: false })
  const [modoTestEmail, setModoTestEmail] = useState(false)

  // Contar borradores para mostrar botón de emisión rápida
  const borradoresCount = facturas?.filter(f => f.estado === 'borrador').length || 0

  // Handlers
  const handleView = (factura) => {
    navigate(`/facturacion/facturas/${factura.id}`)
  }

  const handleEdit = (factura) => {
    navigate(`/facturacion/facturas/${factura.id}/editar`)
  }

  const handleDelete = async () => {
    try {
      await deleteFactura.mutateAsync(deleteModal.factura.id)
      toast.success('Factura eliminada')
      setDeleteModal({ open: false, factura: null })
    } catch (error) {
      toast.error(`Error: ${error.message}`)
    }
  }

  const handleMarcarPagada = async () => {
    try {
      await marcarPagada.mutateAsync({ facturaId: pagarModal.factura.id })
      toast.success('Factura marcada como pagada')
      setPagarModal({ open: false, factura: null })
    } catch (error) {
      toast.error(`Error: ${error.message}`)
    }
  }

  const handlePDF = async (factura) => {
    try {
      setDescargandoPDF(factura.id)

      // Obtener factura completa con todos los campos (incluyendo dirección)
      const { data: facturaCompleta, error: facturaError } = await supabase
        .from('facturas')
        .select('*')
        .eq('id', factura.id)
        .single()

      if (facturaError) {
        console.error('Error al obtener factura completa:', facturaError)
        throw facturaError
      }

      // Obtener líneas de la factura
      const { data: lineas, error: lineasError } = await supabase
        .from('facturas_lineas')
        .select('*')
        .eq('factura_id', factura.id)
        .order('orden')

      if (lineasError) {
        console.error('Error al obtener líneas:', lineasError)
      }

      // Obtener histórico de consumo
      const { data: historico, error: historicoError } = await supabase
        .from('v_historico_consumo_factura')
        .select('*')
        .eq('factura_id', factura.id)
        .order('fecha_lectura')

      if (historicoError) {
        console.error('Error al obtener histórico:', historicoError)
      }

      // Descargar PDF con la factura completa que incluye todos los campos
      descargarFacturaPDF(facturaCompleta, lineas || [], historico || [])

      toast.success('PDF descargado correctamente')
    } catch (error) {
      console.error('Error descargando PDF:', error)
      toast.error('Error al descargar el PDF')
    } finally {
      setDescargandoPDF(null)
    }
  }

  const handleEmail = (factura) => {
    if (!factura.cliente_email) {
      toast.warning('Este cliente no tiene email configurado')
      return
    }

    if (factura.email_enviado) {
      // Mostrar modal de información/reenvío
      setEmailModal({ open: true, factura, esReenvio: true })
    } else {
      // Mostrar modal de confirmación de envío
      setEmailModal({ open: true, factura, esReenvio: false })
    }
  }

  const handleConfirmarEnvioEmail = async () => {
    const { factura } = emailModal
    try {
      await enviarFactura.mutateAsync({
        facturaId: factura.id,
        modoTest: modoTestEmail
      })
      toast.success(`Factura ${factura.numero_completo} enviada correctamente`)
      setEmailModal({ open: false, factura: null, esReenvio: false })
      setModoTestEmail(false)
      refetch()
    } catch (error) {
      toast.error(`Error al enviar: ${error.message}`)
    }
  }

  const clearFilters = () => {
    setFilters({ 
      comunidadId: '', 
      estado: '', 
      search: '',
      rangoFecha: '',
      fechaDesde: null,
      fechaHasta: null
    })
    setCurrentPage(1) // Resetear a primera página al limpiar filtros
  }

  // Handlers de paginación
  const handlePageChange = (page) => {
    setCurrentPage(page)
    setSelectedIds([]) // Limpiar selección al cambiar de página
    window.scrollTo({ top: 0, behavior: 'smooth' }) // Scroll al inicio
  }

  const handleItemsPerPageChange = (newSize) => {
    setItemsPerPage(newSize)
    setCurrentPage(1) // Volver a primera página al cambiar tamaño
    setSelectedIds([]) // Limpiar selección
  }

  // Resetear a página 1 cuando cambian los filtros
  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  // Handler de ordenación
  const handleSort = (field) => {
    if (sortBy === field) {
      // Cambiar dirección si ya estamos ordenando por este campo
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Nuevo campo, empezar con orden descendente (excepto para texto)
      setSortBy(field)
      const textFields = ['cliente_nombre', 'numero_completo', 'comunidad_nombre']
      setSortDirection(textFields.includes(field) ? 'asc' : 'desc')
    }
    setCurrentPage(1) // Volver a primera página al ordenar
  }

  // Handler emisión masiva
  const handleEmitirMasivo = async () => {
    if (selectedIds.length === 0) return

    const confirmar = window.confirm(
      `¿Emitir ${selectedIds.length} factura${selectedIds.length > 1 ? 's' : ''}? Esta acción no se puede deshacer.`
    )

    if (!confirmar) return

    setEmitiendo(true)
    try {
      const resultado = await emitirMasivo.mutateAsync(selectedIds)

      const exitosas = resultado.filter(r => r.success).length
      const fallidas = resultado.filter(r => !r.success).length

      if (fallidas === 0) {
        toast.success(`${exitosas} factura${exitosas > 1 ? 's' : ''} emitida${exitosas > 1 ? 's' : ''} correctamente`)
      } else {
        toast.warning(`${exitosas} emitidas correctamente, ${fallidas} con errores`)
      }

      setSelectedIds([])
    } catch (error) {
      toast.error('Error al emitir facturas: ' + error.message)
    } finally {
      setEmitiendo(false)
    }
  }

  // Handler seleccionar todos los borradores
  const handleSeleccionarTodosBorradores = () => {
    const borradoresIds = facturas
      ?.filter(f => f.estado === 'borrador')
      .map(f => f.id) || []

    setSelectedIds(borradoresIds)
  }

  // Handler abrir modal de exportación
  const handleAbrirModalExportar = () => {
    if (totalFacturas === 0 && (!facturas || facturas.length === 0)) {
      toast.error('No hay facturas para exportar')
      return
    }
    setModalExport(true)
  }

  // Handler exportar a Excel con configuración
  const handleExportarExcel = async (config) => {
    try {
      setModalExport(false)
      setProgresoExportacion({ current: 0, total: 100, message: 'Obteniendo todas las facturas...' })

      // Fetchear TODAS las facturas con filtros actuales (no solo la página visible)
      const todasFacturas = await fetchAllFacturas({
        comunidadId: filters.comunidadId || undefined,
        estado: filters.estado || undefined,
        search: filters.search || undefined,
        fechaDesde: filters.fechaDesde || undefined,
        fechaHasta: filters.fechaHasta || undefined,
        sortBy,
        sortDirection
      })

      await exportar.mutateAsync({
        facturas: todasFacturas,
        config,
        onProgress: (progreso) => {
          setProgresoExportacion(progreso)
        }
      })

      toast.success(`${todasFacturas.length} factura${todasFacturas.length > 1 ? 's' : ''} exportada${todasFacturas.length > 1 ? 's' : ''} a Excel`)

      // Limpiar progreso después de un delay
      setTimeout(() => {
        setProgresoExportacion(null)
      }, 1000)
    } catch (error) {
      console.error('Error exportando facturas:', error)
      toast.error('Error al exportar facturas: ' + error.message)
      setProgresoExportacion(null)
    }
  }

  // Handler descarga masiva de PDFs
  const handleDescargarPDFsMasivo = async () => {
    if (selectedIds.length === 0) return

    // Validar límite máximo
    if (selectedIds.length > 100) {
      toast.error('Máximo 100 facturas por descarga')
      return
    }

    // Advertencia si >20 facturas
    if (selectedIds.length > 20) {
      const confirmar = window.confirm(
        `Vas a descargar ${selectedIds.length} PDFs. Esto puede tardar varios minutos. ¿Continuar?`
      )
      if (!confirmar) return
    }

    setDescargandoPDFs(true)
    setProgresoDescarga({ actual: 0, total: selectedIds.length })

    try {
      // Importar JSZip dinámicamente
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const folder = zip.folder("facturas")

      const facturasSeleccionadas = facturas.filter(f => selectedIds.includes(f.id))

      // Generar cada PDF
      for (let i = 0; i < facturasSeleccionadas.length; i++) {
        const factura = facturasSeleccionadas[i]
        setProgresoDescarga({ actual: i + 1, total: selectedIds.length })

        // Obtener factura completa con todos los campos (incluyendo dirección)
        const { data: facturaCompleta } = await supabase
          .from('facturas')
          .select('*')
          .eq('id', factura.id)
          .single()

        // Fetch líneas de la factura
        const { data: lineas } = await supabase
          .from('facturas_lineas')
          .select('*')
          .eq('factura_id', factura.id)
          .order('orden')

        // Fetch histórico de consumo
        const { data: historico } = await supabase
          .from('v_historico_consumo_factura')
          .select('*')
          .eq('factura_id', factura.id)
          .order('fecha_lectura')

        // Generar PDF como blob usando la factura completa
        const { getFacturaPDFBlob } = await import('@/features/facturacion/pdf')
        const pdfBlob = await getFacturaPDFBlob(facturaCompleta || factura, lineas || [], historico || [])

        // Nombre de archivo sanitizado
        const nombreArchivo = `${factura.numero_completo}_${factura.cliente_nombre}.pdf`
          .replace(/[/\\?%*:|"<>]/g, '-')
          .replace(/\s+/g, '_')

        folder.file(nombreArchivo, pdfBlob)
      }

      // Generar y descargar ZIP
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      })

      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Facturas_${new Date().toISOString().split('T')[0]}.zip`
      link.click()
      URL.revokeObjectURL(url)

      toast.success(`${facturasSeleccionadas.length} PDFs descargados en ZIP correctamente`)
      setSelectedIds([])
    } catch (error) {
      console.error('Error descargando PDFs:', error)
      toast.error('Error al generar los PDFs: ' + error.message)
    } finally {
      setDescargandoPDFs(false)
      setProgresoDescarga({ actual: 0, total: 0 })
    }
  }

  // Handler eliminar masivo
  const handleEliminarMasivo = async () => {
    if (selectedIds.length === 0) return

    try {
      const result = await eliminarFacturas.mutateAsync(selectedIds)
      toast.success(`${result.eliminadas} factura(s) eliminada(s). Nueva secuencia: ${result.nuevo_numero_secuencia}`)
      setSelectedIds([])
      setEliminarModal({ open: false, facturas: [] })
    } catch (error) {
      toast.error(`Error: ${error.message}`)
    }
  }

  // Handler abono masivo (abono total de cada factura seleccionada)
  const handleAbonoMasivo = async () => {
    if (selectedIds.length === 0) return
    setEjecutandoMasivo(true)
    setProgresoMasivo({ actual: 0, total: selectedIds.length })
    let exitosas = 0
    let fallidas = 0
    for (let i = 0; i < selectedIds.length; i++) {
      setProgresoMasivo({ actual: i + 1, total: selectedIds.length })
      try {
        await crearAbono.mutateAsync({ facturaId: selectedIds[i], lineasIds: null })
        exitosas++
      } catch {
        fallidas++
      }
    }
    setEjecutandoMasivo(false)
    setAbonoMasivoModal(false)
    setSelectedIds([])
    if (fallidas === 0) {
      toast.success(`${exitosas} factura(s) abonada(s) correctamente`)
    } else {
      toast.warning(`${exitosas} abonadas, ${fallidas} con errores`)
    }
  }

  // Handler anular masivo
  const handleAnularMasivo = async () => {
    if (selectedIds.length === 0) return
    if (!motivoAnulacionMasivo.trim()) {
      toast.error('Indica el motivo de anulación')
      return
    }
    setEjecutandoMasivo(true)
    setProgresoMasivo({ actual: 0, total: selectedIds.length })
    let exitosas = 0
    let fallidas = 0
    for (let i = 0; i < selectedIds.length; i++) {
      setProgresoMasivo({ actual: i + 1, total: selectedIds.length })
      try {
        await anularFactura.mutateAsync({ facturaId: selectedIds[i], motivo: motivoAnulacionMasivo })
        exitosas++
      } catch {
        fallidas++
      }
    }
    setEjecutandoMasivo(false)
    setAnularMasivoModal({ open: false })
    setMotivoAnulacionMasivo('')
    setSelectedIds([])
    if (fallidas === 0) {
      toast.success(`${exitosas} factura(s) anulada(s) correctamente`)
    } else {
      toast.warning(`${exitosas} anuladas, ${fallidas} con errores`)
    }
  }

  // Handler envío email masivo
  const handleEmailMasivo = async () => {
    if (selectedIds.length === 0) return
    const facturasSeleccionadas = facturas.filter(f => selectedIds.includes(f.id) && f.cliente_email)
    if (facturasSeleccionadas.length === 0) {
      toast.error('Ninguna factura seleccionada tiene email configurado')
      return
    }
    setEjecutandoMasivo(true)
    setProgresoMasivo({ actual: 0, total: facturasSeleccionadas.length })
    let exitosas = 0
    let fallidas = 0
    for (let i = 0; i < facturasSeleccionadas.length; i++) {
      setProgresoMasivo({ actual: i + 1, total: facturasSeleccionadas.length })
      try {
        await enviarFactura.mutateAsync({ facturaId: facturasSeleccionadas[i].id, modoTest: modoTestEmailMasivo })
        exitosas++
      } catch {
        fallidas++
      }
    }
    setEjecutandoMasivo(false)
    setEmailMasivoModal(false)
    setModoTestEmailMasivo(false)
    setSelectedIds([])
    if (fallidas === 0) {
      toast.success(`${exitosas} email(s) enviado(s) correctamente`)
    } else {
      toast.warning(`${exitosas} enviados, ${fallidas} con errores`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
          <p className="text-gray-500 mt-1">
            Gestión de facturas emitidas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleAbrirModalExportar}
            disabled={(totalFacturas === 0 && (!facturas || facturas.length === 0)) || exportar.isPending}
            title="Exportar facturas a Excel"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button onClick={() => navigate('/facturacion/generar')}>
            <Plus className="w-4 h-4 mr-2" />
            Generar Facturas
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/facturacion/facturas/nueva')}
            title="Crear factura manual sin lecturas"
          >
            <FilePlus className="w-4 h-4 mr-2" />
            Factura Manual
          </Button>
          {borradoresCount > 0 && (
            <Button
              variant="outline"
              onClick={handleSeleccionarTodosBorradores}
              title="Seleccionar todos los borradores para emitir"
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              Emitir {borradoresCount} borrador{borradoresCount > 1 ? 'es' : ''}
            </Button>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Borradores</div>
            <div className="text-2xl font-bold text-gray-600">{stats.borradores}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Emitidas</div>
            <div className="text-2xl font-bold text-blue-600">{stats.emitidas}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Pagadas</div>
            <div className="text-2xl font-bold text-green-600">{stats.pagadas}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Importe Total</div>
            <div className="text-xl font-bold">{formatCurrency(stats.importeTotal)}</div>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <FacturaFilters
        comunidades={comunidades || []}
        filters={filters}
        onChange={handleFiltersChange}
        onClear={clearFilters}
      />

      {/* Toggle de Modo */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border flex-wrap">
        <span className="text-sm font-medium text-gray-700">Modo:</span>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={modo === 'emision' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => { setModo('emision'); setSelectedIds([]) }}
          >
            Emisión masiva
          </Button>
          <Button
            variant={modo === 'descarga' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => { setModo('descarga'); setSelectedIds([]) }}
          >
            Descarga PDF
          </Button>
          <Button
            variant={modo === 'email' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => { setModo('email'); setSelectedIds([]) }}
          >
            <Mail className="w-3.5 h-3.5 mr-1.5" />
            Envío email
          </Button>
          <Button
            variant={modo === 'abono' ? 'primary' : 'outline'}
            size="sm"
            className={modo === 'abono' ? 'bg-violet-600 hover:bg-violet-700' : 'border-violet-300 text-violet-700 hover:bg-violet-50'}
            onClick={() => { setModo('abono'); setSelectedIds([]) }}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Abonar
          </Button>
          <Button
            variant={modo === 'anular' ? 'outline' : 'outline'}
            size="sm"
            className={modo === 'anular' ? 'bg-amber-100 border-amber-500 text-amber-800' : 'border-amber-300 text-amber-700 hover:bg-amber-50'}
            onClick={() => { setModo('anular'); setSelectedIds([]) }}
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" />
            Anular
          </Button>
          <Button
            variant={modo === 'eliminar' ? 'danger' : 'outline'}
            size="sm"
            onClick={() => { setModo('eliminar'); setSelectedIds([]) }}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Eliminar
          </Button>
        </div>
        <span className="text-xs text-gray-500 ml-auto">
          {modo === 'emision' ? 'Selecciona borradores para emitir'
            : modo === 'descarga' ? 'Selecciona facturas para descargar PDFs (ZIP)'
            : modo === 'email' ? 'Selecciona facturas emitidas/pagadas para enviar por email'
            : modo === 'abono' ? 'Selecciona facturas de cargo (emitidas/pagadas) para abonar en total'
            : modo === 'anular' ? 'Selecciona facturas para anular y liberar lecturas'
            : 'Selecciona facturas para eliminar permanentemente'}
        </span>
      </div>

      {/* Tabla de facturas */}
      <FacturasTable
        facturas={facturas || []}
        isLoading={isLoading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={(f) => setDeleteModal({ open: true, factura: f })}
        onPDF={handlePDF}
        onEmail={handleEmail}
        onMarcarPagada={(f) => setPagarModal({ open: true, factura: f })}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        modo={modo}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={handleSort}
      />

      {/* Paginación */}
      {!isLoading && totalFacturas > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalFacturas}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          pageSizeOptions={[25, 50, 100, 200, 500]}
          showPageSizeSelector={true}
          showInfo={true}
        />
      )}

      {/* Modal eliminar */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, factura: null })}
        title="Eliminar factura"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            ¿Estás seguro de que deseas eliminar esta factura en borrador?
          </p>
          {deleteModal.factura && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p><strong>Cliente:</strong> {deleteModal.factura.cliente_nombre}</p>
              <p><strong>Total:</strong> {formatCurrency(deleteModal.factura.total)}</p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ open: false, factura: null })}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleteFactura.isPending}
            >
              {deleteFactura.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal marcar pagada */}
      <Modal
        open={pagarModal.open}
        onClose={() => setPagarModal({ open: false, factura: null })}
        title="Marcar como pagada"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            ¿Confirmas que esta factura ha sido cobrada?
          </p>
          {pagarModal.factura && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p><strong>Nº Factura:</strong> {pagarModal.factura.numero_completo}</p>
              <p><strong>Cliente:</strong> {pagarModal.factura.cliente_nombre}</p>
              <p><strong>Total:</strong> {formatCurrency(pagarModal.factura.total)}</p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setPagarModal({ open: false, factura: null })}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMarcarPagada}
              disabled={marcarPagada.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {marcarPagada.isPending ? 'Procesando...' : 'Confirmar pago'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal eliminar permanentemente (múltiple) */}
      <Modal
        open={eliminarModal.open}
        onClose={() => setEliminarModal({ open: false, facturas: [] })}
        title="⚠️ Eliminar Facturas Permanentemente"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertTriangle className="w-6 h-6 text-red-600 mb-2" />
            <h3 className="font-bold text-red-900 mb-2">ADVERTENCIA: Esta acción es IRREVERSIBLE</h3>
            <ul className="text-sm text-red-800 space-y-1">
              <li>• Las facturas se eliminarán completamente de la base de datos</li>
              <li>• Las lecturas asociadas quedarán disponibles para refacturar</li>
              <li>• Los números de factura se eliminarán de la serie</li>
              <li>• Solo se pueden eliminar si son las últimas facturas emitidas (consecutivas)</li>
              <li>• No se podrá recuperar esta información</li>
            </ul>
          </div>
          
          {eliminarModal.facturas.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
              <p className="font-medium mb-2">Facturas a eliminar ({eliminarModal.facturas.length}):</p>
              <ul className="space-y-1 text-sm">
                {eliminarModal.facturas.map(f => (
                  <li key={f.id}>
                    <strong>{f.numero_completo}</strong> - {f.cliente_nombre} - {formatCurrency(f.total)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEliminarModal({ open: false, facturas: [] })}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleEliminarMasivo}
              disabled={eliminarFacturas.isPending}
            >
              {eliminarFacturas.isPending ? 'Eliminando...' : `Confirmar Eliminación de ${eliminarModal.facturas.length} factura(s)`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal enviar email */}
      <Modal
        open={emailModal.open}
        onClose={() => { setEmailModal({ open: false, factura: null, esReenvio: false }); setModoTestEmail(false) }}
        title={emailModal.esReenvio ? "Reenviar Factura" : "Enviar Factura por Email"}
      >
        <div className="space-y-4">
          {emailModal.factura && (
            <>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p><strong>Factura:</strong> {emailModal.factura.numero_completo}</p>
                <p><strong>Cliente:</strong> {emailModal.factura.cliente_nombre}</p>
                <p><strong>Email:</strong> {emailModal.factura.cliente_email}</p>
                <p><strong>Total:</strong> {formatCurrency(emailModal.factura.total)}</p>
              </div>

              {emailModal.esReenvio && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800 text-sm">
                    Esta factura ya fue enviada el {formatDate(emailModal.factura.fecha_email_enviado)}.
                    ¿Deseas enviarla nuevamente?
                  </p>
                </div>
              )}

              {/* Toggle modo test */}
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <input
                  type="checkbox"
                  id="modo-test-single"
                  checked={modoTestEmail}
                  onChange={(e) => setModoTestEmail(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="modo-test-single" className="text-sm text-yellow-800">
                  Modo test (envía a dirección de prueba, no al cliente real)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => { setEmailModal({ open: false, factura: null, esReenvio: false }); setModoTestEmail(false) }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmarEnvioEmail}
                  isLoading={enviarFactura.isPending}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {emailModal.esReenvio ? 'Reenviar' : 'Enviar'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Barra de acciones masivas flotante */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <Card className="shadow-2xl border-2">
            <div className="flex items-center gap-4 px-6 py-4">
              <span className="text-sm font-medium text-gray-700">
                {selectedIds.length} factura{selectedIds.length > 1 ? 's' : ''} seleccionada{selectedIds.length > 1 ? 's' : ''}
              </span>
              <div className="h-6 w-px bg-gray-300"></div>

              {modo === 'emision' ? (
                <Button
                  onClick={handleEmitirMasivo}
                  disabled={emitiendo}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {emitiendo ? 'Emitiendo...' : 'Emitir facturas'}
                </Button>
              ) : modo === 'descarga' ? (
                <Button
                  onClick={handleDescargarPDFsMasivo}
                  disabled={descargandoPDFs}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {descargandoPDFs
                    ? `Descargando ${progresoDescarga.actual}/${progresoDescarga.total}...`
                    : 'Descargar PDFs (ZIP)'}
                </Button>
              ) : modo === 'email' ? (
                <Button
                  onClick={() => setEmailMasivoModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar {selectedIds.length} factura(s) por email
                </Button>
              ) : modo === 'abono' ? (
                <Button
                  onClick={() => setAbonoMasivoModal(true)}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Abonar {selectedIds.length} factura(s)
                </Button>
              ) : modo === 'anular' ? (
                <Button
                  onClick={() => setAnularMasivoModal({ open: true })}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Anular {selectedIds.length} factura(s)
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    const facturasAEliminar = facturas.filter(f => selectedIds.includes(f.id))
                    setEliminarModal({ open: true, facturas: facturasAEliminar })
                  }}
                  disabled={selectedIds.length === 0}
                  variant="danger"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar {selectedIds.length} factura(s)
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                title="Cancelar selección"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal abono masivo */}
      <Modal
        open={abonoMasivoModal}
        onClose={() => !ejecutandoMasivo && setAbonoMasivoModal(false)}
        title="Abono Masivo de Facturas"
      >
        <div className="space-y-4">
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
            <p className="text-sm text-violet-800">
              Se generará una <strong>factura de abono total</strong> para cada una de las{' '}
              <strong>{selectedIds.length} factura(s)</strong> seleccionadas.
              Las lecturas de cada factura serán liberadas para poder refacturarlas.
            </p>
          </div>
          {ejecutandoMasivo && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Procesando...</span>
                <span>{progresoMasivo.actual} / {progresoMasivo.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-violet-600 h-2 rounded-full transition-all"
                  style={{ width: `${progresoMasivo.total ? (progresoMasivo.actual / progresoMasivo.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAbonoMasivoModal(false)} disabled={ejecutandoMasivo}>
              Cancelar
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700"
              onClick={handleAbonoMasivo}
              disabled={ejecutandoMasivo}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {ejecutandoMasivo ? `Procesando ${progresoMasivo.actual}/${progresoMasivo.total}...` : `Confirmar Abono Masivo`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal anular masivo */}
      <Modal
        open={anularMasivoModal.open}
        onClose={() => !ejecutandoMasivo && setAnularMasivoModal({ open: false })}
        title="Anulación Masiva de Facturas"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Se anularán <strong>{selectedIds.length} factura(s)</strong>. Las lecturas de cada factura
            serán liberadas para poder refacturarlas. Esta acción no se puede deshacer.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo de anulación *
            </label>
            <textarea
              value={motivoAnulacionMasivo}
              onChange={(e) => setMotivoAnulacionMasivo(e.target.value)}
              className="w-full rounded-lg border-gray-300 focus:border-amber-500 focus:ring-amber-500"
              rows={3}
              placeholder="Indica el motivo de la anulación masiva..."
              disabled={ejecutandoMasivo}
            />
          </div>
          {ejecutandoMasivo && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Procesando...</span>
                <span>{progresoMasivo.actual} / {progresoMasivo.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${progresoMasivo.total ? (progresoMasivo.actual / progresoMasivo.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAnularMasivoModal({ open: false })} disabled={ejecutandoMasivo}>
              Cancelar
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleAnularMasivo}
              disabled={ejecutandoMasivo || !motivoAnulacionMasivo.trim()}
            >
              <XCircle className="w-4 h-4 mr-2" />
              {ejecutandoMasivo ? `Anulando ${progresoMasivo.actual}/${progresoMasivo.total}...` : `Anular ${selectedIds.length} factura(s)`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal email masivo */}
      <Modal
        open={emailMasivoModal}
        onClose={() => !ejecutandoMasivo && setEmailMasivoModal(false)}
        title="Envío Masivo de Facturas por Email"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Se enviará por email <strong>{selectedIds.length} factura(s)</strong> seleccionadas.
              Solo se enviarán las facturas cuyos clientes tengan email configurado.
            </p>
          </div>
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <input
              type="checkbox"
              id="modo-test-masivo"
              checked={modoTestEmailMasivo}
              onChange={(e) => setModoTestEmailMasivo(e.target.checked)}
              className="w-4 h-4"
              disabled={ejecutandoMasivo}
            />
            <label htmlFor="modo-test-masivo" className="text-sm text-yellow-800">
              Modo test (envía a dirección de prueba, no a los clientes reales)
            </label>
          </div>
          {ejecutandoMasivo && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Enviando emails...</span>
                <span>{progresoMasivo.actual} / {progresoMasivo.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${progresoMasivo.total ? (progresoMasivo.actual / progresoMasivo.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEmailMasivoModal(false)} disabled={ejecutandoMasivo}>
              Cancelar
            </Button>
            <Button
              onClick={handleEmailMasivo}
              disabled={ejecutandoMasivo}
            >
              <Mail className="w-4 h-4 mr-2" />
              {ejecutandoMasivo ? `Enviando ${progresoMasivo.actual}/${progresoMasivo.total}...` : `Enviar ${selectedIds.length} email(s)`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de exportación */}
      <ModalExportarFacturas
        isOpen={modalExport}
        onClose={() => setModalExport(false)}
        onExport={handleExportarExcel}
        totalFacturas={totalFacturas || facturas?.length || 0}
        isExporting={exportar.isPending}
      />

      {/* Indicador de progreso */}
      <ProgressoExportacion progreso={progresoExportacion} />
    </div>
  )
}



