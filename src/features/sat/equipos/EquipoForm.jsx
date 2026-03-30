import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCrearEquipo, useEquipo, useActualizarEquipo } from '@/hooks/useEquipos'
import { useClientesSimple, useComunidades, useCliente, useContratos } from '@/hooks'
import { Button, Card, CardContent, Select, Textarea, Breadcrumb, LoadingSpinner, CommunityPicker, SearchablePicker, Input } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'

const TIPO_OPTIONS = [
  { value: 'caldera', label: 'Caldera' },
  { value: 'grupo_presion', label: 'Grupo de Presión' },
  { value: 'aerotermia', label: 'Aerotermia' },
  { value: 'aire_acondicionado', label: 'Aire Acondicionado' },
  { value: 'bomba_calor', label: 'Bomba de Calor' },
  { value: 'calentador', label: 'Calentador' },
  { value: 'radiador', label: 'Radiador' },
  { value: 'termostato', label: 'Termostato' },
  { value: 'ascensor', label: 'Ascensor' },
  { value: 'sistema_solar', label: 'Sistema Solar' },
  { value: 'otro', label: 'Otro' },
]

const ESTADO_OPTIONS = [
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
  { value: 'en_reparacion', label: 'En reparación' },
  { value: 'retirado', label: 'Retirado' },
]

export function EquipoNuevo() {
  const navigate = useNavigate()
  const crear = useCrearEquipo()
  const toast = useToast()

  const handleSubmit = async (formData) => {
    try {
      const data = await crear.mutateAsync(formData)
      toast.success('Equipo registrado correctamente')
      navigate(`/sat/equipos/${data.id}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'SAT', href: '/sat' }, { label: 'Equipos', href: '/sat/equipos' }, { label: 'Nuevo Equipo' }]} className="mb-4" />
      <div className="page-header">
        <h1 className="page-title">Nuevo Equipo</h1>
        <p className="page-description">Registrar un equipo o instalación</p>
      </div>
      <Card><CardContent className="p-6">
        <EquipoFormFields onSubmit={handleSubmit} loading={crear.isPending} />
      </CardContent></Card>
    </div>
  )
}

export function EquipoEditar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: equipo, isLoading } = useEquipo(id)
  const actualizar = useActualizarEquipo()
  const toast = useToast()

  const handleSubmit = async (formData) => {
    try {
      await actualizar.mutateAsync({ id, ...formData })
      toast.success('Equipo actualizado')
      navigate(`/sat/equipos/${id}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (!equipo) return <div>Equipo no encontrado</div>

  return (
    <div>
      <Breadcrumb items={[{ label: 'SAT', href: '/sat' }, { label: 'Equipos', href: '/sat/equipos' }, { label: equipo.nombre, href: `/sat/equipos/${id}` }, { label: 'Editar' }]} className="mb-4" />
      <div className="page-header">
        <h1 className="page-title">Editar Equipo</h1>
        <p className="page-description">{equipo.nombre}</p>
      </div>
      <Card><CardContent className="p-6">
        <EquipoFormFields equipo={equipo} onSubmit={handleSubmit} loading={actualizar.isPending} isEdit />
      </CardContent></Card>
    </div>
  )
}

function EquipoFormFields({ equipo, onSubmit, loading, isEdit = false }) {
  const navigate = useNavigate()
  const { data: clientes } = useClientesSimple()
  const { data: comunidades } = useComunidades({ activa: true })

  const [form, setForm] = useState({
    nombre: '', tipo: 'caldera', marca: '', modelo: '', numero_serie: '',
    estado: 'activo', cliente_id: '', comunidad_id: '', contrato_id: '',
    fecha_instalacion: '', fecha_garantia_fin: '', ubicacion_descripcion: '',
    ultima_revision: '', proxima_revision: '', notas: '',
  })
  const [errors, setErrors] = useState({})

  const { data: clienteCompleto } = useCliente(form.cliente_id || null)
  const { data: contratosCliente } = useContratos({ clienteId: form.cliente_id || undefined })

  const comunidadesCliente = useMemo(() => {
    if (!clienteCompleto?.ubicaciones_clientes) return []
    const comIds = new Set()
    const result = []
    for (const uc of clienteCompleto.ubicaciones_clientes) {
      const com = uc.ubicacion?.agrupacion?.comunidad
      if (com && !comIds.has(com.id)) { comIds.add(com.id); result.push(com) }
    }
    return result
  }, [clienteCompleto])

  useEffect(() => {
    if (equipo) {
      setForm({
        nombre: equipo.nombre || '', tipo: equipo.tipo || 'caldera',
        marca: equipo.marca || '', modelo: equipo.modelo || '',
        numero_serie: equipo.numero_serie || '', estado: equipo.estado || 'activo',
        cliente_id: equipo.cliente_id || '', comunidad_id: equipo.comunidad_id || '',
        contrato_id: equipo.contrato_id || '',
        fecha_instalacion: equipo.fecha_instalacion?.slice(0, 10) || '',
        fecha_garantia_fin: equipo.fecha_garantia_fin?.slice(0, 10) || '',
        ubicacion_descripcion: equipo.ubicacion_descripcion || '',
        ultima_revision: equipo.ultima_revision?.slice(0, 10) || '',
        proxima_revision: equipo.proxima_revision?.slice(0, 10) || '',
        notas: equipo.notas || '',
      })
    }
  }, [equipo])

  const validate = () => {
    const errs = {}
    if (!form.nombre.trim()) errs.nombre = 'Nombre requerido'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      nombre: form.nombre, tipo: form.tipo,
      marca: form.marca || null, modelo: form.modelo || null,
      numero_serie: form.numero_serie || null, estado: form.estado,
      cliente_id: form.cliente_id || null, comunidad_id: form.comunidad_id || null,
      contrato_id: form.contrato_id || null,
      fecha_instalacion: form.fecha_instalacion || null,
      fecha_garantia_fin: form.fecha_garantia_fin || null,
      ubicacion_descripcion: form.ubicacion_descripcion || null,
      ultima_revision: form.ultima_revision || null,
      proxima_revision: form.proxima_revision || null,
      notas: form.notas || null,
    })
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nombre y Tipo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del equipo *</label>
          <Input value={form.nombre} onChange={set('nombre')} placeholder="Ej: Caldera sala calderas" error={errors.nombre} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <Select value={form.tipo} onChange={set('tipo')}>
            {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
      </div>

      {/* Marca, Modelo, Nº Serie */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
          <Input value={form.marca} onChange={set('marca')} placeholder="Ej: Vaillant" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
          <Input value={form.modelo} onChange={set('modelo')} placeholder="Ej: ecoTEC plus" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nº Serie</label>
          <Input value={form.numero_serie} onChange={set('numero_serie')} placeholder="Número de serie" className="font-mono" />
        </div>
      </div>

      {/* Estado */}
      {isEdit && (
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <Select value={form.estado} onChange={set('estado')}>
            {ESTADO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
      )}

      {/* Cliente y Comunidad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <SearchablePicker
            value={form.cliente_id || ''}
            onChange={(id) => setForm({ ...form, cliente_id: id, comunidad_id: '', contrato_id: '' })}
            options={(clientes || []).map((c) => ({ value: c.id, label: `${c.nombre} ${c.apellidos}`.trim() }))}
            placeholder="Sin asignar" allowEmpty emptyOptionLabel="Sin asignar"
            label="Cliente" modalTitle="Seleccionar cliente" searchPlaceholder="Buscar..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Comunidad</label>
          <CommunityPicker
            value={form.comunidad_id}
            onChange={(v) => setForm({ ...form, comunidad_id: v })}
            comunidades={comunidadesCliente.length > 0 ? comunidadesCliente : (comunidades ?? [])}
            placeholder="Sin asignar" allowEmpty
          />
        </div>
      </div>

      {/* Contrato */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contrato de mantenimiento</label>
        <Select value={form.contrato_id} onChange={set('contrato_id')}>
          <option value="">Ninguno</option>
          {contratosCliente?.map((c) => (
            <option key={c.id} value={c.id}>{c.numero_contrato} - {c.titulo}</option>
          ))}
        </Select>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha instalación</label>
          <Input type="date" value={form.fecha_instalacion} onChange={set('fecha_instalacion')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fin garantía</label>
          <Input type="date" value={form.fecha_garantia_fin} onChange={set('fecha_garantia_fin')} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Última revisión</label>
          <Input type="date" value={form.ultima_revision} onChange={set('ultima_revision')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Próxima revisión</label>
          <Input type="date" value={form.proxima_revision} onChange={set('proxima_revision')} />
        </div>
      </div>

      {/* Ubicación */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación del equipo</label>
        <Input value={form.ubicacion_descripcion} onChange={set('ubicacion_descripcion')} placeholder="Ej: Sala de calderas, planta baja" />
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <Textarea value={form.notas} onChange={set('notas')} rows={2} placeholder="Observaciones sobre el equipo..." />
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="secondary" type="button" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button variant="primary" type="submit" loading={loading}>
          {isEdit ? 'Guardar cambios' : 'Registrar equipo'}
        </Button>
      </div>
    </form>
  )
}
