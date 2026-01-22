import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { Settings, FileText, Mail, CreditCard, Users, Plus, Edit2, Building2, Database, AlertTriangle, UserPlus, Lock, RefreshCw, Trash2 } from 'lucide-react'
import { useConceptos, useCreateConcepto, useUpdateConcepto, useEmailConfig, useUpdateEmailConfig, useConfiguracion, useActualizarSecuenciaFacturas, useUsuarios, useCrearUsuario, useActualizarUsuario, useResetearPassword, useEliminarUsuario } from '@/hooks'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Modal, Input, Select, FormField, DataTable, LoadingSpinner, Checkbox } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import ConfiguracionSEPA from './ConfiguracionSEPA'
import ImportarExportarPage from './ImportarExportar'

const configSections = [
  { name: 'General', href: '/configuracion', icon: Settings },
  { name: 'Conceptos', href: '/configuracion/conceptos', icon: FileText },
  { name: 'Email', href: '/configuracion/email', icon: Mail },
  { name: 'SEPA', href: '/configuracion/sepa', icon: CreditCard },
  { name: 'Importar/Exportar', href: '/configuracion/importar-exportar', icon: Database },
  { name: 'Usuarios', href: '/configuracion/usuarios', icon: Users },
]

export function ConfiguracionPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Configuración</h1>
        <p className="page-description">
          Ajustes del sistema de facturación
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navegación lateral */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {configSections.map((section) => (
                  <NavLink
                    key={section.href}
                    to={section.href}
                    end={section.href === '/configuracion'}
                    className={({ isActive }) => cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <section.icon className="h-5 w-5" />
                    {section.name}
                  </NavLink>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Contenido */}
        <div className="lg:col-span-3">
          <Routes>
            <Route index element={<ConfigGeneral />} />
            <Route path="conceptos" element={<ConfigConceptos />} />
            <Route path="email" element={<ConfigEmail />} />
            <Route path="sepa" element={<ConfigSEPA />} />
            <Route path="importar-exportar" element={<ImportarExportarPage />} />
            <Route path="usuarios" element={<ConfigUsuarios />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

function ConfigGeneral() {
  const [modalOpen, setModalOpen] = useState(false)
  const [nuevoNumero, setNuevoNumero] = useState('')
  const [confirmaRiesgos, setConfirmaRiesgos] = useState(false)

  const { data: config, isLoading } = useConfiguracion()
  const actualizarMutation = useActualizarSecuenciaFacturas()
  const toast = useToast()

  const ultimoNumero = config?.serie_facturacion?.ultimo_numero || 0
  const serie = config?.serie_facturacion?.serie || 2
  const ivaAplicable = config?.iva_porcentaje || '21'

  const handleOpenModal = () => {
    setNuevoNumero(ultimoNumero.toString())
    setConfirmaRiesgos(false)
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!confirmaRiesgos) {
      toast.error('Debe confirmar que entiende las consecuencias')
      return
    }

    const numeroInt = parseInt(nuevoNumero)
    if (isNaN(numeroInt) || numeroInt < 1) {
      toast.error('El número debe ser mayor a 0')
      return
    }

    try {
      const result = await actualizarMutation.mutateAsync({
        nuevoNumero: numeroInt
      })
      toast.success(`Contador actualizado correctamente. La próxima factura será: ${result.numero_nuevo + 1}`)
      setModalOpen(false)
      setNuevoNumero('')
      setConfirmaRiesgos(false)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const proximaFactura = nuevoNumero && !isNaN(parseInt(nuevoNumero)) 
    ? parseInt(nuevoNumero) + 1 
    : ultimoNumero + 1

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Configuración General</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Datos de la Empresa</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Nombre:</dt>
                    <dd className="text-gray-900 font-medium">A360 Servicios Energéticos S.L.</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">CIF:</dt>
                    <dd className="text-gray-900 font-medium">B88313473</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Dirección:</dt>
                    <dd className="text-gray-900">C/ Polvoranca Nº 138, 28923 Alcorcón</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Teléfono:</dt>
                    <dd className="text-gray-900">91 159 11 70</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Email:</dt>
                    <dd className="text-gray-900">clientes@a360se.com</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Web:</dt>
                    <dd className="text-gray-900">www.a360se.com</dd>
                  </div>
                </dl>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Serie de Facturación</h4>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={handleOpenModal}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Editar Contador
                  </Button>
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Serie:</dt>
                    <dd className="text-gray-900 font-medium">{serie}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Último número:</dt>
                    <dd className="text-gray-900 font-mono">{ultimoNumero.toLocaleString('es-ES')}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Próxima factura:</dt>
                    <dd className="text-gray-900 font-mono text-primary-600 font-medium">
                      {(ultimoNumero + 1).toLocaleString('es-ES')}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">IVA aplicable:</dt>
                    <dd className="text-gray-900 font-medium">{ivaAplicable}%</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Configuración del Contador */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setNuevoNumero('')
          setConfirmaRiesgos(false)
        }}
        title="Configurar Contador de Facturas"
        size="md"
      >
        <div className="space-y-4">
          {/* Advertencia prominente */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-semibold text-amber-900">
                  ⚠️ Advertencia: Esta acción modificará el contador de facturas
                </h4>
                <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                  <li>La próxima factura emitida tendrá el número que configure aquí + 1</li>
                  <li>Asegúrese de que el número es correcto antes de confirmar</li>
                  <li>Si el número es menor al último emitido, se crearán duplicados</li>
                  <li>Esta acción no se puede deshacer automáticamente</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Información actual */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Estado Actual</h5>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Último número de factura:</span>
              <span className="font-mono font-bold text-gray-900 text-lg">
                {ultimoNumero.toLocaleString('es-ES')}
              </span>
            </div>
          </div>

          {/* Campo de nuevo número */}
          <FormField label="Nuevo último número de factura" required>
            <Input
              type="number"
              value={nuevoNumero}
              onChange={(e) => setNuevoNumero(e.target.value)}
              placeholder="Ej: 30000000"
              min="1"
              className="font-mono text-lg"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Este será el último número registrado. La próxima factura será: <span className="font-semibold">{proximaFactura.toLocaleString('es-ES')}</span>
            </p>
          </FormField>

          {/* Previsualización del cambio */}
          {nuevoNumero && !isNaN(parseInt(nuevoNumero)) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-center gap-3 text-sm">
                <div className="text-center">
                  <div className="text-gray-600">Actual</div>
                  <div className="font-mono font-bold text-gray-900">
                    {ultimoNumero.toLocaleString('es-ES')}
                  </div>
                </div>
                <div className="text-2xl text-blue-600">→</div>
                <div className="text-center">
                  <div className="text-gray-600">Nuevo</div>
                  <div className="font-mono font-bold text-blue-600">
                    {parseInt(nuevoNumero).toLocaleString('es-ES')}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-center text-xs text-gray-600">
                Próxima factura: <span className="font-semibold">{proximaFactura.toLocaleString('es-ES')}</span>
              </div>
            </div>
          )}

          {/* Checkbox de confirmación */}
          <div className="pt-2">
            <Checkbox
              checked={confirmaRiesgos}
              onChange={(e) => setConfirmaRiesgos(e.target.checked)}
              label="Entiendo las consecuencias y confirmo que el número es correcto"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalOpen(false)
                setNuevoNumero('')
                setConfirmaRiesgos(false)
              }}
              disabled={actualizarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              loading={actualizarMutation.isPending}
              disabled={!confirmaRiesgos || !nuevoNumero}
            >
              Confirmar Cambio
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function ConfigConceptos() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingConcepto, setEditingConcepto] = useState(null)
  
  const { data: conceptos, isLoading } = useConceptos({ activo: undefined })
  const createMutation = useCreateConcepto()
  const updateMutation = useUpdateConcepto()
  const toast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)

    const data = {
      codigo: editingConcepto ? editingConcepto.codigo : formData.get('codigo')?.toUpperCase(),
      nombre: formData.get('nombre'),
      descripcion: formData.get('descripcion') || null,
      unidad_medida: formData.get('unidad_medida'),
      es_termino_fijo: formData.get('es_termino_fijo') === 'on',
      orden: parseInt(formData.get('orden')) || 0,
      activo: true
    }

    try {
      if (editingConcepto) {
        await updateMutation.mutateAsync({ id: editingConcepto.id, ...data })
        toast.success('Concepto actualizado')
      } else {
        await createMutation.mutateAsync(data)
        toast.success('Concepto creado')
      }
      setModalOpen(false)
      setEditingConcepto(null)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const openEdit = (concepto) => {
    setEditingConcepto(concepto)
    setModalOpen(true)
  }

  const columns = [
    {
      key: 'codigo',
      header: 'Código',
      render: (value) => (
        <span className="font-mono font-medium text-primary-600">{value}</span>
      )
    },
    {
      key: 'nombre',
      header: 'Nombre'
    },
    {
      key: 'unidad_medida',
      header: 'Unidad'
    },
    {
      key: 'es_termino_fijo',
      header: 'Tipo',
      render: (value) => (
        <Badge variant={value ? 'warning' : 'primary'}>
          {value ? 'Término Fijo' : 'Variable'}
        </Badge>
      )
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (value) => (
        <Badge variant={value ? 'success' : 'default'}>
          {value ? 'Activo' : 'Inactivo'}
        </Badge>
      )
    },
    {
      key: 'acciones',
      header: '',
      sortable: false,
      render: (_, row) => (
        <button
          onClick={() => openEdit(row)}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
        >
          <Edit2 className="h-4 w-4" />
        </button>
      )
    }
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Conceptos de Facturación</CardTitle>
        <Button size="sm" onClick={() => { setEditingConcepto(null); setModalOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo Concepto
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <DataTable
            data={conceptos || []}
            columns={columns}
            pageSize={10}
          />
        )}
      </CardContent>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingConcepto(null) }}
        title={editingConcepto ? 'Editar Concepto' : 'Nuevo Concepto'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Código" required>
              <Input
                name="codigo"
                defaultValue={editingConcepto?.codigo || ''}
                placeholder="ACS"
                maxLength={10}
                className="uppercase"
                required
                disabled={editingConcepto && ['ACS', 'CAL', 'CLI', 'TF'].includes(editingConcepto.codigo)}
              />
            </FormField>

            <FormField label="Unidad de Medida" required>
              <Input
                name="unidad_medida"
                defaultValue={editingConcepto?.unidad_medida || ''}
                placeholder="m³, Kcal, Frig..."
                required
              />
            </FormField>
          </div>

          <FormField label="Nombre" required>
            <Input
              name="nombre"
              defaultValue={editingConcepto?.nombre || ''}
              placeholder="Agua Caliente Sanitaria"
              required
            />
          </FormField>

          <FormField label="Descripción">
            <Input
              name="descripcion"
              defaultValue={editingConcepto?.descripcion || ''}
              placeholder="Descripción opcional"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Orden">
              <Input
                name="orden"
                type="number"
                defaultValue={editingConcepto?.orden || 0}
                min={0}
              />
            </FormField>

            <FormField label="">
              <div className="flex items-center h-full pt-6">
                <Checkbox
                  name="es_termino_fijo"
                  defaultChecked={editingConcepto?.es_termino_fijo || false}
                  label="Es término fijo (no requiere lecturas)"
                />
              </div>
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => { setModalOpen(false); setEditingConcepto(null) }}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editingConcepto ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  )
}

function ConfigEmail() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Email</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Aviso sobre Resend */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-800 mb-2">
              ℹ️ Integración con Resend
            </h3>
            <p className="text-sm text-blue-700">
              El sistema de envío utiliza <strong>Resend</strong> como proveedor de email transaccional. 
              Para activar el envío real de emails, asegúrate de:
            </p>
            <ul className="text-sm text-blue-700 mt-2 list-disc list-inside">
              <li>Crear una cuenta en <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">resend.com</a></li>
              <li>Verificar tu dominio de envío</li>
              <li>Configurar la API Key en las variables de entorno (RESEND_API_KEY)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
      
      <ConfigEmailForm />
    </div>
  )
}

function ConfigEmailForm() {
  const { data: config, isLoading } = useEmailConfig()
  const updateConfig = useUpdateEmailConfig()
  const toast = useToast()
  
  const [formData, setFormData] = useState({
    from_email: 'facturas@a360se.com',
    from_name: 'A360 Servicios Energéticos',
    reply_to: 'clientes@a360se.com',
    asunto_template: 'Factura {numero_factura} - {periodo}',
    envio_automatico: false,
    hora_envio_preferida: '09:00',
    max_envios_por_hora: 100,
    reintentos_activos: true,
    intervalo_reintento_minutos: 60,
    max_reintentos: 3,
    enviar_copia_admin: false,
    email_copia_admin: ''
  })

  useEffect(() => {
    if (config) {
      setFormData(prev => ({
        ...prev,
        ...config
      }))
    }
  }, [config])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      await updateConfig.mutateAsync(formData)
      toast.success('Configuración guardada correctamente')
    } catch (error) {
      toast.error('Error al guardar la configuración')
    }
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Remitente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary-500" />
            Remitente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Email remitente">
              <Input
                type="email"
                value={formData.from_email}
                onChange={(e) => handleChange('from_email', e.target.value)}
                placeholder="facturas@empresa.com"
              />
            </FormField>
            <FormField label="Nombre remitente">
              <Input
                value={formData.from_name}
                onChange={(e) => handleChange('from_name', e.target.value)}
                placeholder="A360 Servicios Energéticos"
              />
            </FormField>
            <FormField label="Responder a" className="md:col-span-2">
              <Input
                type="email"
                value={formData.reply_to}
                onChange={(e) => handleChange('reply_to', e.target.value)}
                placeholder="clientes@empresa.com"
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Plantilla */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plantilla</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField label="Asunto del email">
            <Input
              value={formData.asunto_template}
              onChange={(e) => handleChange('asunto_template', e.target.value)}
              placeholder="Factura {numero_factura} - {periodo}"
            />
            <p className="mt-1 text-xs text-gray-500">
              Variables: {'{numero_factura}'}, {'{periodo}'}, {'{cliente}'}
            </p>
          </FormField>
        </CardContent>
      </Card>

      {/* Configuración de Envío */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuración de Envío</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={formData.envio_automatico}
                onChange={(e) => handleChange('envio_automatico', e.target.checked)}
                label="Envío automático al emitir factura"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Hora preferida de envío">
                <Input
                  type="time"
                  value={formData.hora_envio_preferida}
                  onChange={(e) => handleChange('hora_envio_preferida', e.target.value)}
                />
              </FormField>
              <FormField label="Máximo envíos por hora">
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={formData.max_envios_por_hora}
                  onChange={(e) => handleChange('max_envios_por_hora', parseInt(e.target.value))}
                />
              </FormField>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reintentos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reintentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={formData.reintentos_activos}
                onChange={(e) => handleChange('reintentos_activos', e.target.checked)}
                label="Reintentar envíos fallidos automáticamente"
              />
            </div>

            {formData.reintentos_activos && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                <FormField label="Intervalo entre reintentos (minutos)">
                  <Input
                    type="number"
                    min={1}
                    value={formData.intervalo_reintento_minutos}
                    onChange={(e) => handleChange('intervalo_reintento_minutos', parseInt(e.target.value))}
                  />
                </FormField>
                <FormField label="Máximo reintentos">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.max_reintentos}
                    onChange={(e) => handleChange('max_reintentos', parseInt(e.target.value))}
                  />
                </FormField>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Botón Guardar */}
      <div className="flex justify-end">
        <Button
          type="submit"
          loading={updateConfig.isPending}
        >
          Guardar configuración
        </Button>
      </div>
    </form>
  )
}

function ConfigSEPA() {
  return <ConfiguracionSEPA />
}

function ConfigUsuarios() {
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null })
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    email: '',
    nombreCompleto: '',
    password: '',
    activo: true
  })

  const { data: usuarios, isLoading } = useUsuarios()
  const crearMutation = useCrearUsuario()
  const actualizarMutation = useActualizarUsuario()
  const resetPasswordMutation = useResetearPassword()
  const eliminarMutation = useEliminarUsuario()
  const toast = useToast()

  // Generador de contraseñas simple (6 caracteres - mínimo requerido por Supabase)
  const generarPassword = () => {
    // Excluye caracteres confusos: 0/O, 1/I/l
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 6; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const handleGenerarPassword = () => {
    const newPassword = generarPassword()
    setFormData(prev => ({ ...prev, password: newPassword }))
  }

  const handleOpenModal = (user = null) => {
    if (user) {
      // Editar usuario existente
      setEditingUser(user)
      setFormData({
        email: user.email,
        nombreCompleto: user.nombre_completo,
        password: '',
        activo: user.activo
      })
    } else {
      // Nuevo usuario
      setEditingUser(null)
      setFormData({
        email: '',
        nombreCompleto: '',
        password: generarPassword(),
        activo: true
      })
    }
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingUser(null)
    setFormData({
      email: '',
      nombreCompleto: '',
      password: '',
      activo: true
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingUser) {
        // Actualizar usuario existente
        await actualizarMutation.mutateAsync({
          userId: editingUser.id,
          nombreCompleto: formData.nombreCompleto,
          activo: formData.activo
        })
        toast.success('Usuario actualizado correctamente')
      } else {
        // Crear nuevo usuario
        await crearMutation.mutateAsync({
          email: formData.email,
          password: formData.password,
          nombreCompleto: formData.nombreCompleto
        })
        toast.success(`Usuario creado. Contraseña: ${formData.password}`, { duration: 10000 })
      }
      handleCloseModal()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleResetPassword = async (email) => {
    try {
      await resetPasswordMutation.mutateAsync({ email })
      toast.success('Email de recuperación enviado')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleOpenDeleteModal = (user) => {
    setDeleteModal({ open: true, user })
  }

  const handleCloseDeleteModal = () => {
    setDeleteModal({ open: false, user: null })
  }

  const handleConfirmDelete = async () => {
    if (!deleteModal.user) return

    try {
      await eliminarMutation.mutateAsync({
        userId: deleteModal.user.id
      })
      toast.success('Usuario eliminado correctamente')
      handleCloseDeleteModal()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const columns = [
    {
      key: 'email',
      header: 'Email',
      render: (value) => (
        <span className="font-medium text-gray-900">{value}</span>
      )
    },
    {
      key: 'nombre_completo',
      header: 'Nombre Completo'
    },
    {
      key: 'rol',
      header: 'Rol',
      render: (value) => (
        <Badge variant={value === 'admin' ? 'warning' : 'default'}>
          {value === 'admin' ? 'Administrador' : 'Usuario'}
        </Badge>
      )
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (value) => (
        <Badge variant={value ? 'success' : 'default'}>
          {value ? 'Activo' : 'Inactivo'}
        </Badge>
      )
    },
    {
      key: 'last_sign_in_at',
      header: 'Último Acceso',
      render: (value) => value 
        ? new Date(value).toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'Nunca'
    },
    {
      key: 'acciones',
      header: 'Acciones',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenModal(row)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Editar usuario"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleResetPassword(row.email)}
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
            title="Enviar email de recuperación"
            disabled={resetPasswordMutation.isPending}
          >
            <Lock className="h-4 w-4" />
          </button>
          {row.rol !== 'admin' && (
            <button
              onClick={() => handleOpenDeleteModal(row)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="Eliminar usuario"
              disabled={eliminarMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gestión de Usuarios</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Administración de usuarios del sistema
            </p>
          </div>
          <Button size="sm" onClick={() => handleOpenModal()}>
            <UserPlus className="h-4 w-4 mr-1" />
            Nuevo Usuario
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <DataTable
              data={usuarios || []}
              columns={columns}
              pageSize={10}
            />
          )}
        </CardContent>
      </Card>

      {/* Modal Crear/Editar Usuario */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Email" required={!editingUser}>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="usuario@ejemplo.com"
              required={!editingUser}
              disabled={editingUser}
            />
            {editingUser && (
              <p className="mt-1 text-xs text-gray-500">
                El email no se puede modificar
              </p>
            )}
          </FormField>

          <FormField label="Nombre Completo" required>
            <Input
              value={formData.nombreCompleto}
              onChange={(e) => setFormData(prev => ({ ...prev, nombreCompleto: e.target.value }))}
              placeholder="Nombre y apellidos"
              required
            />
          </FormField>

          {!editingUser && (
            <FormField label="Contraseña" required>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Contraseña"
                  required
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleGenerarPassword}
                  title="Generar contraseña aleatoria"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Usa el botón para generar una contraseña aleatoria de 6 caracteres
              </p>
            </FormField>
          )}

          {editingUser && (
            <div className="flex items-center pt-2">
              <Checkbox
                checked={formData.activo}
                onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.checked }))}
                label="Usuario activo"
              />
            </div>
          )}

          {!editingUser && formData.password && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Importante:</strong> Guarda esta contraseña. Se mostrará una sola vez.
              </p>
              <p className="text-sm font-mono font-bold text-blue-900 mt-1">
                {formData.password}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseModal}
              disabled={crearMutation.isPending || actualizarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={crearMutation.isPending || actualizarMutation.isPending}
            >
              {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Eliminar Usuario */}
      <Modal
        open={deleteModal.open}
        onClose={handleCloseDeleteModal}
        title="Eliminar Usuario"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-semibold text-red-900">
                  ⚠️ Advertencia: Esta acción no se puede deshacer
                </h4>
                <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                  <li>Se eliminará permanentemente el usuario del sistema</li>
                  <li>El usuario perderá acceso inmediatamente</li>
                  <li>Esta acción es irreversible</li>
                </ul>
              </div>
            </div>
          </div>

          {deleteModal.user && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Usuario a eliminar:</h5>
              <div className="space-y-1">
                <p className="text-sm"><strong>Email:</strong> {deleteModal.user.email}</p>
                <p className="text-sm"><strong>Nombre:</strong> {deleteModal.user.nombre_completo}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseDeleteModal}
              disabled={eliminarMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirmDelete}
              loading={eliminarMutation.isPending}
            >
              Eliminar Usuario
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
