import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  useCrearIntervencion, useIntervencion, useActualizarIntervencion,
  useClientesSimple, useUsuarios, useComunidades, useContratos, useCliente, useEquipos
} from '@/hooks'
import {
  Button, Card, CardContent, Select, Textarea, Breadcrumb, LoadingSpinner,
  CommunityPicker, SearchablePicker, Input, Badge, Modal
} from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { UserPlus, Users, AlertTriangle } from 'lucide-react'

const TIPO_OPTIONS = [
  { value: 'correctiva', label: 'Correctiva' },
  { value: 'preventiva', label: 'Preventiva' },
  { value: 'instalacion', label: 'Instalación' },
  { value: 'inspeccion', label: 'Inspección' },
  { value: 'urgencia', label: 'Urgencia' },
]

const PRIORIDAD_OPTIONS = [
  { value: 'baja', label: 'Baja' },
  { value: 'normal', label: 'Normal' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

export function IntervencionNueva() {
  const navigate = useNavigate()
  const crear = useCrearIntervencion()
  const toast = useToast()

  const handleSubmit = async (formData) => {
    try {
      const id = await crear.mutateAsync(formData)
      toast.success('Intervención creada correctamente')
      navigate(`/sat/intervenciones/${id}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'SAT', href: '/sat' },
          { label: 'Intervenciones', href: '/sat/intervenciones' },
          { label: 'Nueva Intervención' },
        ]}
        className="mb-4"
      />
      <div className="page-header">
        <h1 className="page-title">Nueva Intervención</h1>
        <p className="page-description">Crear un nuevo parte de trabajo</p>
      </div>
      <Card>
        <CardContent className="p-6">
          <IntervencionFormFields onSubmit={handleSubmit} loading={crear.isPending} />
        </CardContent>
      </Card>
    </div>
  )
}

export function IntervencionEditar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: intervencion, isLoading } = useIntervencion(id)
  const actualizar = useActualizarIntervencion()
  const toast = useToast()

  const handleSubmit = async (formData) => {
    try {
      await actualizar.mutateAsync({ id, ...formData })
      toast.success('Intervención actualizada')
      navigate(`/sat/intervenciones/${id}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (!intervencion) return <div>Intervención no encontrada</div>

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'SAT', href: '/sat' },
          { label: 'Intervenciones', href: '/sat/intervenciones' },
          { label: intervencion.numero_parte, href: `/sat/intervenciones/${id}` },
          { label: 'Editar' },
        ]}
        className="mb-4"
      />
      <div className="page-header">
        <h1 className="page-title">Editar Intervención</h1>
        <p className="page-description">{intervencion.numero_parte}</p>
      </div>
      <Card>
        <CardContent className="p-6">
          <IntervencionFormFields
            intervencion={intervencion}
            onSubmit={handleSubmit}
            loading={actualizar.isPending}
            isEdit
          />
        </CardContent>
      </Card>
    </div>
  )
}

function IntervencionFormFields({ intervencion, onSubmit, loading, isEdit = false }) {
  const navigate = useNavigate()
  const { data: clientes } = useClientesSimple()
  const { data: usuarios } = useUsuarios()
  const { data: comunidades } = useComunidades({ activa: true })
  const toast = useToast()

  const tecnicos = usuarios?.filter((u) => u.rol === 'tecnico' || u.rol === 'encargado') ?? []

  const [form, setForm] = useState({
    titulo: '',
    tipo: 'correctiva',
    prioridad: 'normal',
    descripcion: '',
    cliente_id: '',
    comunidad_id: '',
    contrato_id: '',
    equipo_id: '',
    tecnico_id: '',
    direccion: '',
    codigo_postal: '',
    ciudad: '',
    diagnostico: '',
    solucion: '',
    observaciones_internas: '',
    // Cliente temporal (sin registro en BD)
    es_cliente_temporal: false,
    cliente_temporal_nombre: '',
    cliente_temporal_telefono: '',
  })

  const [errors, setErrors] = useState({})

  // Obtener datos completos del cliente seleccionado (dirección, comunidades)
  const { data: clienteCompleto } = useCliente(form.cliente_id || null)

  // Contratos filtrados por cliente seleccionado
  const { data: contratosCliente } = useContratos({
    clienteId: form.cliente_id || undefined,
  })

  // Equipos filtrados por cliente seleccionado
  const { data: equiposCliente } = useEquipos({
    clienteId: form.cliente_id || undefined,
    soloActivos: true,
  })

  // Comunidades del cliente seleccionado (extraer de sus ubicaciones)
  const comunidadesCliente = useMemo(() => {
    if (!clienteCompleto?.ubicaciones_clientes) return []
    const comIds = new Set()
    const result = []
    for (const uc of clienteCompleto.ubicaciones_clientes) {
      const com = uc.ubicacion?.agrupacion?.comunidad
      if (com && !comIds.has(com.id)) {
        comIds.add(com.id)
        result.push(com)
      }
    }
    return result
  }, [clienteCompleto])

  // Clientes filtrados por comunidad seleccionada
  const clientesFiltrados = useMemo(() => {
    if (!clientes) return []
    // Si no hay comunidad seleccionada, mostrar todos
    if (!form.comunidad_id) return clientes
    // Si hay comunidad, necesitaríamos filtrar por ubicaciones
    // Pero useClientesSimple no trae ubicaciones, así que mostramos todos
    // y dejamos que el usuario filtre visualmente
    return clientes
  }, [clientes, form.comunidad_id])

  useEffect(() => {
    if (intervencion) {
      setForm({
        titulo: intervencion.titulo || '',
        tipo: intervencion.tipo || 'correctiva',
        prioridad: intervencion.prioridad || 'normal',
        descripcion: intervencion.descripcion || '',
        cliente_id: intervencion.cliente_id || '',
        comunidad_id: intervencion.comunidad_id || '',
        contrato_id: intervencion.contrato_id || '',
        equipo_id: intervencion.equipo_id || '',
        tecnico_id: intervencion.tecnico_id || '',
        direccion: intervencion.direccion || '',
        codigo_postal: intervencion.codigo_postal || '',
        ciudad: intervencion.ciudad || '',
        diagnostico: intervencion.diagnostico || '',
        solucion: intervencion.solucion || '',
        observaciones_internas: intervencion.observaciones_internas || '',
        es_cliente_temporal: false,
        cliente_temporal_nombre: '',
        cliente_temporal_telefono: '',
      })
    }
  }, [intervencion])

  // Controlar si se debe auto-rellenar (al cambiar de cliente, no al cargar edición)
  const [autoFillEnabled, setAutoFillEnabled] = useState(false)

  // Auto-rellenar datos del cliente cuando se selecciona
  const handleClienteChange = (clienteId) => {
    setAutoFillEnabled(true)
    setForm((prev) => ({
      ...prev,
      cliente_id: clienteId,
      contrato_id: '', // Reset contrato y equipo al cambiar cliente
      equipo_id: '',
      // Reset dirección para que se re-rellene con el nuevo cliente
      direccion: '',
      codigo_postal: '',
      ciudad: '',
      comunidad_id: '',
    }))
  }

  // Cuando llegan los datos completos del cliente, auto-rellenar dirección
  useEffect(() => {
    if (!clienteCompleto || !autoFillEnabled) return

    setForm((prev) => ({
      ...prev,
      direccion: clienteCompleto.direccion_correspondencia || '',
      codigo_postal: clienteCompleto.cp_correspondencia || '',
      ciudad: clienteCompleto.ciudad_correspondencia || '',
    }))

    // Si el cliente solo pertenece a una comunidad, auto-seleccionarla
    if (comunidadesCliente.length === 1) {
      setForm((prev) => ({
        ...prev,
        comunidad_id: comunidadesCliente[0].id,
      }))
    }

    setAutoFillEnabled(false)
  }, [clienteCompleto, comunidadesCliente, autoFillEnabled])

  const validate = () => {
    const errs = {}
    if (!form.titulo.trim()) errs.titulo = 'Título requerido'
    if (form.es_cliente_temporal && !form.cliente_temporal_nombre.trim()) {
      errs.cliente_temporal_nombre = 'Nombre del cliente requerido'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    const basePayload = {
      titulo: form.titulo,
      tipo: form.tipo,
      prioridad: form.prioridad,
      descripcion: form.descripcion || null,
      cliente_id: form.es_cliente_temporal ? null : (form.cliente_id || null),
      comunidad_id: form.comunidad_id || null,
      contrato_id: form.contrato_id || null,
      equipo_id: form.equipo_id || null,
      tecnico_id: form.tecnico_id || null,
      direccion: form.direccion || null,
      codigo_postal: form.codigo_postal || null,
      ciudad: form.ciudad || null,
    }

    if (isEdit) {
      basePayload.diagnostico = form.diagnostico || null
      basePayload.solucion = form.solucion || null
      basePayload.observaciones_internas = form.observaciones_internas || null
    }

    // Si es cliente temporal, guardar datos en metadata o en observaciones
    if (form.es_cliente_temporal) {
      basePayload.observaciones_internas = [
        form.observaciones_internas,
        `[CLIENTE TEMPORAL] ${form.cliente_temporal_nombre}${form.cliente_temporal_telefono ? ` — Tel: ${form.cliente_temporal_telefono}` : ''}`,
      ].filter(Boolean).join('\n')
    }

    onSubmit(basePayload)
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Título */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
        <Input
          value={form.titulo}
          onChange={set('titulo')}
          placeholder="Descripción breve de la intervención"
          error={errors.titulo}
        />
      </div>

      {/* Tipo y Prioridad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <Select value={form.tipo} onChange={set('tipo')}>
            {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
          <Select value={form.prioridad} onChange={set('prioridad')}>
            {PRIORIDAD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <Textarea
          value={form.descripcion}
          onChange={set('descripcion')}
          placeholder="Detalle del problema o trabajo a realizar..."
          rows={3}
        />
      </div>

      {/* Selector de modo cliente */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Cliente</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, es_cliente_temporal: false, cliente_temporal_nombre: '', cliente_temporal_telefono: '' })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                !form.es_cliente_temporal
                  ? 'bg-primary-100 text-primary-700 border border-primary-300'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Cliente existente
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, es_cliente_temporal: true, cliente_id: '' })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                form.es_cliente_temporal
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Cliente temporal
            </button>
          </div>
        </div>

        {form.es_cliente_temporal ? (
          /* Campos de cliente temporal */
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-2 bg-amber-50 rounded-md">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                Este cliente no se registrará en la base de datos. Sus datos se guardarán en las observaciones de la intervención.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del cliente *</label>
                <Input
                  value={form.cliente_temporal_nombre}
                  onChange={set('cliente_temporal_nombre')}
                  placeholder="Nombre y apellidos"
                  error={errors.cliente_temporal_nombre}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <Input
                  value={form.cliente_temporal_telefono}
                  onChange={set('cliente_temporal_telefono')}
                  placeholder="600 000 000"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Selector de cliente existente */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <SearchablePicker
                value={form.cliente_id || ''}
                onChange={handleClienteChange}
                options={(clientesFiltrados || []).map((c) => ({
                  value: c.id,
                  label: `${c.nombre} ${c.apellidos}`.trim(),
                  subtitle: c.nif,
                }))}
                placeholder="Sin asignar"
                allowEmpty
                emptyOptionLabel="Sin asignar"
                label="Cliente"
                modalTitle="Seleccionar cliente"
                searchPlaceholder="Buscar por nombre o apellidos..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comunidad</label>
              <CommunityPicker
                value={form.comunidad_id}
                onChange={(v) => setForm({ ...form, comunidad_id: v })}
                comunidades={
                  // Si el cliente tiene comunidades, mostrar esas primero
                  comunidadesCliente.length > 0 ? comunidadesCliente : (comunidades ?? [])
                }
                placeholder="Sin asignar"
                allowEmpty
              />
              {comunidadesCliente.length > 0 && form.cliente_id && (
                <p className="text-xs text-gray-500 mt-1">
                  Mostrando comunidades del cliente seleccionado
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Técnico y Contrato */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Técnico asignado</label>
          {tecnicos.length === 0 ? (
            <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-xs text-gray-500">
                No hay técnicos registrados. Crea usuarios con rol "Técnico" desde el panel de administración.
              </p>
            </div>
          ) : (
            <Select value={form.tecnico_id} onChange={set('tecnico_id')}>
              <option value="">Sin asignar</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre_completo}</option>
              ))}
            </Select>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contrato vinculado</label>
          <Select value={form.contrato_id} onChange={set('contrato_id')}>
            <option value="">Ninguno</option>
            {contratosCliente?.map((c) => (
              <option key={c.id} value={c.id}>{c.numero_contrato} - {c.titulo}</option>
            ))}
          </Select>
          {form.cliente_id && contratosCliente?.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">Este cliente no tiene contratos activos</p>
          )}
        </div>
      </div>

      {/* Equipo */}
      {form.cliente_id && equiposCliente?.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Equipo asociado</label>
          <Select value={form.equipo_id} onChange={set('equipo_id')}>
            <option value="">Ninguno</option>
            {equiposCliente.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.nombre}{eq.marca ? ` — ${eq.marca}` : ''}{eq.modelo ? ` ${eq.modelo}` : ''}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* Dirección */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">Dirección</label>
          {clienteCompleto?.direccion_correspondencia && !form.direccion && (
            <button
              type="button"
              className="text-xs text-primary-600 hover:text-primary-700"
              onClick={() => setForm({
                ...form,
                direccion: clienteCompleto.direccion_correspondencia || '',
                codigo_postal: clienteCompleto.cp_correspondencia || '',
                ciudad: clienteCompleto.ciudad_correspondencia || '',
              })}
            >
              Usar dirección del cliente
            </button>
          )}
        </div>
        <Input
          value={form.direccion}
          onChange={set('direccion')}
          placeholder="Dirección de la intervención"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Código postal</label>
          <Input value={form.codigo_postal} onChange={set('codigo_postal')} placeholder="28001" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
          <Input value={form.ciudad} onChange={set('ciudad')} placeholder="Madrid" />
        </div>
      </div>

      {/* Campos adicionales en edición */}
      {isEdit && (
        <>
          <hr className="border-gray-200" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico</label>
            <Textarea value={form.diagnostico} onChange={set('diagnostico')} rows={3} placeholder="Diagnóstico del problema encontrado..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Solución</label>
            <Textarea value={form.solucion} onChange={set('solucion')} rows={3} placeholder="Solución aplicada..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones internas</label>
            <Textarea value={form.observaciones_internas} onChange={set('observaciones_internas')} rows={2} placeholder="Notas internas (no visibles para el cliente)..." />
          </div>
        </>
      )}

      {/* Acciones */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" loading={loading}>
          {isEdit ? 'Guardar cambios' : 'Crear intervención'}
        </Button>
      </div>
    </form>
  )
}
