import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCrearContrato, useContrato, useActualizarContrato, useClientesSimple, useComunidades } from '@/hooks'
import { Button, Card, CardContent, Select, Textarea, Breadcrumb, LoadingSpinner, CommunityPicker, SearchablePicker, Input } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'

const TIPO_OPTIONS = [
  { value: 'mantenimiento_preventivo', label: 'Mantenimiento Preventivo' },
  { value: 'mantenimiento_correctivo', label: 'Mantenimiento Correctivo' },
  { value: 'mantenimiento_integral', label: 'Mantenimiento Integral' },
  { value: 'garantia', label: 'Garantía' },
]

const ESTADO_OPTIONS = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'activo', label: 'Activo' },
  { value: 'suspendido', label: 'Suspendido' },
  { value: 'finalizado', label: 'Finalizado' },
]

const PERIODICIDAD_OPTIONS = [
  { value: '', label: 'Sin periodicidad' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
]

export function ContratoNuevo() {
  const navigate = useNavigate()
  const crear = useCrearContrato()
  const toast = useToast()

  const handleSubmit = async (formData) => {
    try {
      const data = await crear.mutateAsync(formData)
      toast.success('Contrato creado correctamente')
      navigate(`/sat/contratos/${data.id}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'SAT', href: '/sat' },
          { label: 'Contratos', href: '/sat/contratos' },
          { label: 'Nuevo Contrato' },
        ]}
        className="mb-4"
      />
      <div className="page-header">
        <h1 className="page-title">Nuevo Contrato</h1>
        <p className="page-description">Crear un nuevo contrato de mantenimiento</p>
      </div>
      <Card>
        <CardContent className="p-6">
          <ContratoFormFields onSubmit={handleSubmit} loading={crear.isPending} />
        </CardContent>
      </Card>
    </div>
  )
}

export function ContratoEditar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: contrato, isLoading } = useContrato(id)
  const actualizar = useActualizarContrato()
  const toast = useToast()

  const handleSubmit = async (formData) => {
    try {
      await actualizar.mutateAsync({ id, ...formData })
      toast.success('Contrato actualizado')
      navigate(`/sat/contratos/${id}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (!contrato) return <div>Contrato no encontrado</div>

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'SAT', href: '/sat' },
          { label: 'Contratos', href: '/sat/contratos' },
          { label: contrato.numero_contrato, href: `/sat/contratos/${id}` },
          { label: 'Editar' },
        ]}
        className="mb-4"
      />
      <div className="page-header">
        <h1 className="page-title">Editar Contrato</h1>
        <p className="page-description">{contrato.numero_contrato}</p>
      </div>
      <Card>
        <CardContent className="p-6">
          <ContratoFormFields
            contrato={contrato}
            onSubmit={handleSubmit}
            loading={actualizar.isPending}
            isEdit
          />
        </CardContent>
      </Card>
    </div>
  )
}

function ContratoFormFields({ contrato, onSubmit, loading, isEdit = false }) {
  const navigate = useNavigate()
  const { data: clientes } = useClientesSimple()
  const { data: comunidades } = useComunidades({ activa: true })

  const [form, setForm] = useState({
    titulo: '',
    tipo: 'mantenimiento_preventivo',
    estado: 'borrador',
    cliente_id: '',
    comunidad_id: '',
    fecha_inicio: '',
    fecha_fin: '',
    periodicidad: '',
    precio_mensual: '',
    precio_anual: '',
    condiciones: '',
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (contrato) {
      setForm({
        titulo: contrato.titulo || '',
        tipo: contrato.tipo || 'mantenimiento_preventivo',
        estado: contrato.estado || 'borrador',
        cliente_id: contrato.cliente_id || '',
        comunidad_id: contrato.comunidad_id || '',
        fecha_inicio: contrato.fecha_inicio?.slice(0, 10) || '',
        fecha_fin: contrato.fecha_fin?.slice(0, 10) || '',
        periodicidad: contrato.periodicidad || '',
        precio_mensual: contrato.precio_mensual ?? '',
        precio_anual: contrato.precio_anual ?? '',
        condiciones: contrato.condiciones || '',
      })
    }
  }, [contrato])

  const validate = () => {
    const errs = {}
    if (!form.titulo.trim()) errs.titulo = 'Título requerido'
    if (!form.fecha_inicio) errs.fecha_inicio = 'Fecha inicio requerida'
    if (!form.fecha_fin) errs.fecha_fin = 'Fecha fin requerida'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      titulo: form.titulo,
      tipo: form.tipo,
      estado: form.estado,
      cliente_id: form.cliente_id || null,
      comunidad_id: form.comunidad_id || null,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
      periodicidad: form.periodicidad || null,
      precio_mensual: form.precio_mensual ? Number(form.precio_mensual) : null,
      precio_anual: form.precio_anual ? Number(form.precio_anual) : null,
      condiciones: form.condiciones || null,
    }

    onSubmit(payload)
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
          placeholder="Mantenimiento anual caldera comunidad X"
          error={errors.titulo}
        />
      </div>

      {/* Tipo, Estado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <Select value={form.tipo} onChange={set('tipo')}>
            {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <Select value={form.estado} onChange={set('estado')}>
            {ESTADO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Periodicidad</label>
          <Select value={form.periodicidad} onChange={set('periodicidad')}>
            {PERIODICIDAD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
      </div>

      {/* Cliente y Comunidad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <SearchablePicker
            value={form.cliente_id || ''}
            onChange={(id) => setForm({ ...form, cliente_id: id })}
            options={(clientes || []).map((c) => ({
              value: c.id,
              label: `${c.nombre} ${c.apellidos}`.trim()
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
            comunidades={comunidades ?? []}
            placeholder="Sin asignar"
            allowEmpty
          />
        </div>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio *</label>
          <Input type="date" value={form.fecha_inicio} onChange={set('fecha_inicio')} error={errors.fecha_inicio} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin *</label>
          <Input type="date" value={form.fecha_fin} onChange={set('fecha_fin')} error={errors.fecha_fin} />
        </div>
      </div>

      {/* Precios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Precio mensual</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.precio_mensual}
            onChange={set('precio_mensual')}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Precio anual</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.precio_anual}
            onChange={set('precio_anual')}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Condiciones */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Condiciones</label>
        <Textarea
          value={form.condiciones}
          onChange={set('condiciones')}
          placeholder="Condiciones del contrato, servicios incluidos, exclusiones..."
          rows={4}
        />
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" loading={loading}>
          {isEdit ? 'Guardar cambios' : 'Crear contrato'}
        </Button>
      </div>
    </form>
  )
}
