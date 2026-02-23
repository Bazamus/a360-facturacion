import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCrearIntervencion, useIntervencion, useActualizarIntervencion, useClientesSimple, useUsuarios, useComunidades, useContratos } from '@/hooks'
import { Button, Card, CardContent, Select, Textarea, Breadcrumb, LoadingSpinner, CommunityPicker, Input } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'

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

  const tecnicos = usuarios?.filter((u) => u.rol === 'tecnico' || u.rol === 'encargado') ?? []

  const [form, setForm] = useState({
    titulo: '',
    tipo: 'correctiva',
    prioridad: 'normal',
    descripcion: '',
    cliente_id: '',
    comunidad_id: '',
    contrato_id: '',
    tecnico_id: '',
    direccion: '',
    codigo_postal: '',
    ciudad: '',
    diagnostico: '',
    solucion: '',
    observaciones_internas: '',
  })

  const [errors, setErrors] = useState({})

  // Cargar datos para contratos del cliente seleccionado
  const { data: contratosCliente } = useContratos({
    clienteId: form.cliente_id || undefined,
  })

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
        tecnico_id: intervencion.tecnico_id || '',
        direccion: intervencion.direccion || '',
        codigo_postal: intervencion.codigo_postal || '',
        ciudad: intervencion.ciudad || '',
        diagnostico: intervencion.diagnostico || '',
        solucion: intervencion.solucion || '',
        observaciones_internas: intervencion.observaciones_internas || '',
      })
    }
  }, [intervencion])

  const validate = () => {
    const errs = {}
    if (!form.titulo.trim()) errs.titulo = 'Título requerido'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    const payload = isEdit
      ? {
          titulo: form.titulo,
          tipo: form.tipo,
          prioridad: form.prioridad,
          descripcion: form.descripcion || null,
          cliente_id: form.cliente_id || null,
          comunidad_id: form.comunidad_id || null,
          contrato_id: form.contrato_id || null,
          tecnico_id: form.tecnico_id || null,
          direccion: form.direccion || null,
          codigo_postal: form.codigo_postal || null,
          ciudad: form.ciudad || null,
          diagnostico: form.diagnostico || null,
          solucion: form.solucion || null,
          observaciones_internas: form.observaciones_internas || null,
        }
      : {
          titulo: form.titulo,
          tipo: form.tipo,
          prioridad: form.prioridad,
          descripcion: form.descripcion || null,
          cliente_id: form.cliente_id || null,
          comunidad_id: form.comunidad_id || null,
          contrato_id: form.contrato_id || null,
          tecnico_id: form.tecnico_id || null,
          direccion: form.direccion || null,
          codigo_postal: form.codigo_postal || null,
          ciudad: form.ciudad || null,
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

      {/* Cliente y Comunidad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
          <Select value={form.cliente_id} onChange={set('cliente_id')}>
            <option value="">Sin asignar</option>
            {clientes?.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre} {c.apellidos}</option>
            ))}
          </Select>
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

      {/* Técnico y Contrato */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Técnico asignado</label>
          <Select value={form.tecnico_id} onChange={set('tecnico_id')}>
            <option value="">Sin asignar</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre_completo}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contrato vinculado</label>
          <Select value={form.contrato_id} onChange={set('contrato_id')}>
            <option value="">Ninguno</option>
            {contratosCliente?.map((c) => (
              <option key={c.id} value={c.id}>{c.numero_contrato} - {c.titulo}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Dirección */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
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
