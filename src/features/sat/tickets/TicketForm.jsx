import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrearTicket, useClientesSimple, useComunidades, useCliente, useContratos } from '@/hooks'
import { Button, Card, CardContent, Select, Textarea, Breadcrumb, LoadingSpinner, CommunityPicker, SearchablePicker, Input } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'

const TIPO_OPTIONS = [
  { value: 'incidencia', label: 'Incidencia' },
  { value: 'consulta', label: 'Consulta' },
  { value: 'solicitud', label: 'Solicitud' },
  { value: 'queja', label: 'Queja' },
]

const PRIORIDAD_OPTIONS = [
  { value: 'baja', label: 'Baja' },
  { value: 'normal', label: 'Normal' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'critica', label: 'Crítica' },
]

const ORIGEN_OPTIONS = [
  { value: 'interno', label: 'Interno' },
  { value: 'telefono', label: 'Teléfono' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'portal_cliente', label: 'Portal Cliente' },
]

export function TicketNuevo() {
  const navigate = useNavigate()
  const crear = useCrearTicket()
  const toast = useToast()

  const handleSubmit = async (formData) => {
    try {
      const id = await crear.mutateAsync(formData)
      toast.success('Ticket creado correctamente')
      navigate(`/sat/tickets/${id}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'SAT', href: '/sat' },
          { label: 'Tickets', href: '/sat/tickets' },
          { label: 'Nuevo Ticket' },
        ]}
        className="mb-4"
      />
      <div className="page-header">
        <h1 className="page-title">Nuevo Ticket</h1>
        <p className="page-description">Registrar una nueva incidencia o solicitud</p>
      </div>
      <Card>
        <CardContent className="p-6">
          <TicketFormFields onSubmit={handleSubmit} loading={crear.isPending} />
        </CardContent>
      </Card>
    </div>
  )
}

function TicketFormFields({ onSubmit, loading }) {
  const navigate = useNavigate()
  const { data: clientes } = useClientesSimple()
  const { data: comunidades } = useComunidades({ activa: true })

  const [form, setForm] = useState({
    asunto: '',
    tipo: 'incidencia',
    prioridad: 'normal',
    descripcion: '',
    cliente_id: '',
    comunidad_id: '',
    contrato_id: '',
    categoria: '',
    origen: 'interno',
    direccion: '',
    codigo_postal: '',
    ciudad: '',
  })

  const [errors, setErrors] = useState({})
  const [autoFillEnabled, setAutoFillEnabled] = useState(false)

  // Datos completos del cliente seleccionado
  const { data: clienteCompleto } = useCliente(form.cliente_id || null)

  // Contratos del cliente
  const { data: contratosCliente } = useContratos({
    clienteId: form.cliente_id || undefined,
  })

  // Comunidades del cliente
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

  // Auto-relleno al seleccionar cliente
  const handleClienteChange = (clienteId) => {
    setAutoFillEnabled(true)
    setForm((prev) => ({
      ...prev,
      cliente_id: clienteId,
      contrato_id: '',
      comunidad_id: '',
      direccion: '',
      codigo_postal: '',
      ciudad: '',
    }))
  }

  useEffect(() => {
    if (!clienteCompleto || !autoFillEnabled) return

    setForm((prev) => ({
      ...prev,
      direccion: clienteCompleto.direccion_correspondencia || '',
      codigo_postal: clienteCompleto.cp_correspondencia || '',
      ciudad: clienteCompleto.ciudad_correspondencia || '',
    }))

    if (comunidadesCliente.length === 1) {
      setForm((prev) => ({ ...prev, comunidad_id: comunidadesCliente[0].id }))
    }

    setAutoFillEnabled(false)
  }, [clienteCompleto, comunidadesCliente, autoFillEnabled])

  const validate = () => {
    const errs = {}
    if (!form.asunto.trim()) errs.asunto = 'El asunto es requerido'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    onSubmit({
      asunto: form.asunto,
      tipo: form.tipo,
      prioridad: form.prioridad,
      descripcion: form.descripcion || null,
      cliente_id: form.cliente_id || null,
      comunidad_id: form.comunidad_id || null,
      contrato_id: form.contrato_id || null,
      categoria: form.categoria || null,
      origen: form.origen,
      direccion: form.direccion || null,
      codigo_postal: form.codigo_postal || null,
      ciudad: form.ciudad || null,
    })
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Asunto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Asunto *</label>
        <Input
          value={form.asunto}
          onChange={set('asunto')}
          placeholder="Resumen breve del problema o solicitud"
          error={errors.asunto}
        />
      </div>

      {/* Tipo, Prioridad, Origen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Origen</label>
          <Select value={form.origen} onChange={set('origen')}>
            {ORIGEN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <Textarea
          value={form.descripcion}
          onChange={set('descripcion')}
          placeholder="Descripción detallada del problema, pasos para reproducir, etc."
          rows={4}
        />
      </div>

      {/* Cliente y Comunidad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <SearchablePicker
            value={form.cliente_id || ''}
            onChange={handleClienteChange}
            options={(clientes || []).map((c) => ({
              value: c.id,
              label: `${c.nombre} ${c.apellidos}`.trim(),
            }))}
            placeholder="Sin asignar"
            allowEmpty
            emptyOptionLabel="Sin asignar"
            label="Cliente"
            modalTitle="Seleccionar cliente"
            searchPlaceholder="Buscar por nombre..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Comunidad</label>
          <CommunityPicker
            value={form.comunidad_id}
            onChange={(v) => setForm({ ...form, comunidad_id: v })}
            comunidades={comunidadesCliente.length > 0 ? comunidadesCliente : (comunidades ?? [])}
            placeholder="Sin asignar"
            allowEmpty
          />
          {comunidadesCliente.length > 0 && form.cliente_id && (
            <p className="text-xs text-gray-500 mt-1">Comunidades del cliente seleccionado</p>
          )}
        </div>
      </div>

      {/* Contrato vinculado */}
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
        <Input value={form.direccion} onChange={set('direccion')} placeholder="Dirección del servicio" />
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

      {/* Categoría */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría (opcional)</label>
        <Input
          value={form.categoria}
          onChange={set('categoria')}
          placeholder="Ej: Calefacción, ACS, Electricidad..."
        />
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" loading={loading}>
          Crear Ticket
        </Button>
      </div>
    </form>
  )
}
