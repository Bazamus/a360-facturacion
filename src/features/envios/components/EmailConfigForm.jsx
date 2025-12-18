import { useState, useEffect } from 'react'
import { Input, Select, Checkbox, Button } from '../../../components/ui'
import { useEmailConfig, useUpdateEmailConfig } from '../../../hooks/useEnvios'
import { useToast } from '../../../components/ui/Toast'
import { Save, Mail, Clock, RefreshCw, Copy } from 'lucide-react'

export function EmailConfigForm() {
  const { data: config, isLoading } = useEmailConfig()
  const updateConfig = useUpdateEmailConfig()
  const { showToast } = useToast()
  
  const [formData, setFormData] = useState({
    from_email: '',
    from_name: '',
    reply_to: '',
    asunto_template: '',
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
      setFormData({
        from_email: config.from_email || '',
        from_name: config.from_name || '',
        reply_to: config.reply_to || '',
        asunto_template: config.asunto_template || '',
        envio_automatico: config.envio_automatico || false,
        hora_envio_preferida: config.hora_envio_preferida || '09:00',
        max_envios_por_hora: config.max_envios_por_hora || 100,
        reintentos_activos: config.reintentos_activos ?? true,
        intervalo_reintento_minutos: config.intervalo_reintento_minutos || 60,
        max_reintentos: config.max_reintentos || 3,
        enviar_copia_admin: config.enviar_copia_admin || false,
        email_copia_admin: config.email_copia_admin || ''
      })
    }
  }, [config])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      await updateConfig.mutateAsync(formData)
      showToast('Configuración guardada correctamente', 'success')
    } catch (error) {
      showToast('Error al guardar la configuración', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Sección Remitente */}
      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="text-primary-500" size={20} />
          <h3 className="font-semibold text-gray-900">Remitente</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email remitente
            </label>
            <Input
              type="email"
              value={formData.from_email}
              onChange={(e) => handleChange('from_email', e.target.value)}
              placeholder="facturas@empresa.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre remitente
            </label>
            <Input
              value={formData.from_name}
              onChange={(e) => handleChange('from_name', e.target.value)}
              placeholder="A360 Servicios Energéticos"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responder a
            </label>
            <Input
              type="email"
              value={formData.reply_to}
              onChange={(e) => handleChange('reply_to', e.target.value)}
              placeholder="clientes@empresa.com"
            />
          </div>
        </div>
      </section>

      {/* Sección Plantilla */}
      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Copy className="text-primary-500" size={20} />
          <h3 className="font-semibold text-gray-900">Plantilla</h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Asunto del email
          </label>
          <Input
            value={formData.asunto_template}
            onChange={(e) => handleChange('asunto_template', e.target.value)}
            placeholder="Factura {numero_factura} - {periodo}"
          />
          <p className="mt-1 text-xs text-gray-500">
            Variables disponibles: {'{numero_factura}'}, {'{periodo}'}, {'{cliente}'}
          </p>
        </div>
      </section>

      {/* Sección Configuración de Envío */}
      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="text-primary-500" size={20} />
          <h3 className="font-semibold text-gray-900">Configuración de Envío</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={formData.envio_automatico}
              onChange={(e) => handleChange('envio_automatico', e.target.checked)}
              id="envio_automatico"
            />
            <label htmlFor="envio_automatico" className="text-sm text-gray-700">
              Envío automático al emitir factura
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora preferida de envío
              </label>
              <Input
                type="time"
                value={formData.hora_envio_preferida}
                onChange={(e) => handleChange('hora_envio_preferida', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Máximo envíos por hora
              </label>
              <Input
                type="number"
                min={1}
                max={1000}
                value={formData.max_envios_por_hora}
                onChange={(e) => handleChange('max_envios_por_hora', parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Sección Reintentos */}
      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="text-primary-500" size={20} />
          <h3 className="font-semibold text-gray-900">Reintentos</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={formData.reintentos_activos}
              onChange={(e) => handleChange('reintentos_activos', e.target.checked)}
              id="reintentos_activos"
            />
            <label htmlFor="reintentos_activos" className="text-sm text-gray-700">
              Reintentar envíos fallidos automáticamente
            </label>
          </div>

          {formData.reintentos_activos && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Intervalo entre reintentos (minutos)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={formData.intervalo_reintento_minutos}
                  onChange={(e) => handleChange('intervalo_reintento_minutos', parseInt(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Máximo reintentos
                </label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.max_reintentos}
                  onChange={(e) => handleChange('max_reintentos', parseInt(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sección Copia Administrativa */}
      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Copia Administrativa</h3>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={formData.enviar_copia_admin}
              onChange={(e) => handleChange('enviar_copia_admin', e.target.checked)}
              id="enviar_copia_admin"
            />
            <label htmlFor="enviar_copia_admin" className="text-sm text-gray-700">
              Enviar copia de cada factura a:
            </label>
          </div>

          {formData.enviar_copia_admin && (
            <div className="pl-6">
              <Input
                type="email"
                value={formData.email_copia_admin}
                onChange={(e) => handleChange('email_copia_admin', e.target.value)}
                placeholder="admin@empresa.com"
              />
            </div>
          )}
        </div>
      </section>

      {/* Botón Guardar */}
      <div className="flex justify-end">
        <Button
          type="submit"
          isLoading={updateConfig.isPending}
          className="flex items-center gap-2"
        >
          <Save size={18} />
          Guardar configuración
        </Button>
      </div>
    </form>
  )
}



