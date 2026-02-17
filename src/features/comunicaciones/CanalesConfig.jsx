import { useState } from 'react'
import { Card, CardContent, Badge, Button, Modal, Input, EmptyState } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import {
  Settings,
  MessageSquare,
  Mail,
  Phone,
  MessageCircle,
  Smartphone,
  CheckCircle,
  XCircle,
  ExternalLink,
  Save,
} from 'lucide-react'
import { useCanalesConfig, useUpdateCanalConfig } from '@/hooks/useComunicaciones'

const CANAL_META = {
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageSquare,
    color: 'text-green-600',
    bg: 'bg-green-50',
    description: 'Comunicacion via Evolution API + Chatwoot (integracion nativa). Requiere vincular numero de telefono.',
    fields: [
      { key: 'evolution_api_url', label: 'URL Evolution API', placeholder: 'https://api-wa.a360se.com' },
      { key: 'evolution_instance', label: 'Nombre de instancia', placeholder: 'a360-whatsapp' },
      { key: 'chatwoot_inbox_id', label: 'Chatwoot Inbox ID', placeholder: '1' },
    ],
  },
  email: {
    label: 'Email',
    icon: Mail,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    description: 'Envio de emails via Resend. Ya configurado para facturacion.',
    fields: [
      { key: 'provider', label: 'Proveedor', placeholder: 'resend' },
      { key: 'from_email', label: 'Email de envio', placeholder: 'clientes@a360se.com' },
    ],
  },
  chat: {
    label: 'Live Chat',
    icon: MessageCircle,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    description: 'Widget de chat incrustado en la web via Chatwoot.',
    fields: [
      { key: 'chatwoot_website_token', label: 'Chatwoot Website Token', placeholder: 'TOKEN' },
    ],
  },
  telefono: {
    label: 'Telefono',
    icon: Phone,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    description: 'Registro manual de llamadas telefonicas.',
    fields: [
      { key: 'notas', label: 'Notas', placeholder: 'Configuracion del canal telefonico' },
    ],
  },
  sms: {
    label: 'SMS',
    icon: Smartphone,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    description: 'Canal SMS (pendiente de integracion).',
    fields: [],
  },
}

export function CanalesConfig() {
  const { data: canales, isLoading } = useCanalesConfig()
  const [editingCanal, setEditingCanal] = useState(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="h-7 w-7 text-primary-600" />
          Configuracion de Canales
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Configura y activa los canales de comunicacion con clientes
        </p>
      </div>

      {/* Links rapidos */}
      <div className="flex flex-wrap gap-2">
        <a
          href="https://chat.a360se.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Chatwoot
        </a>
        <a
          href="https://api-wa.a360se.com/manager"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Evolution API Manager
        </a>
        <a
          href="https://n8n.a360se.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium hover:bg-orange-100 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          n8n Workflows
        </a>
      </div>

      {/* Lista de canales */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-gray-200 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-200 rounded w-64" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !canales?.length ? (
        <EmptyState
          icon={Settings}
          title="Sin canales configurados"
          description="Ejecuta la migracion SQL para crear la configuracion inicial de canales."
        />
      ) : (
        <div className="space-y-4">
          {canales.map((canal) => {
            const meta = CANAL_META[canal.canal] || {}
            const Icon = meta.icon || Settings
            const isActive = canal.activo

            return (
              <Card
                key={canal.id}
                className={`transition-all duration-200 ${isActive ? 'border-l-4 border-l-green-500' : ''}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${meta.bg || 'bg-gray-50'}`}>
                        <Icon className={`h-6 w-6 ${meta.color || 'text-gray-600'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">{meta.label || canal.canal}</h3>
                          <Badge variant={isActive ? 'success' : 'default'}>
                            {isActive ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Activo
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                Inactivo
                              </span>
                            )}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCanal(canal)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Configurar
                    </Button>
                  </div>

                  {/* Preview de configuracion */}
                  {isActive && canal.configuracion && Object.keys(canal.configuracion).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(canal.configuracion).map(([key, value]) => (
                          <span
                            key={key}
                            className="inline-flex items-center px-2 py-1 rounded bg-gray-50 text-[10px] text-gray-600 font-mono"
                          >
                            {key}: {typeof value === 'string' && value.length > 30 ? value.slice(0, 30) + '...' : String(value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal editar canal */}
      {editingCanal && (
        <CanalConfigModal
          canal={editingCanal}
          meta={CANAL_META[editingCanal.canal]}
          onClose={() => setEditingCanal(null)}
        />
      )}
    </div>
  )
}

function CanalConfigModal({ canal, meta, onClose }) {
  const toast = useToast()
  const updateMutation = useUpdateCanalConfig()

  const [activo, setActivo] = useState(canal.activo)
  const [config, setConfig] = useState(canal.configuracion || {})

  const handleFieldChange = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        id: canal.id,
        activo,
        configuracion: config,
      })
      toast.success(`Canal ${meta?.label || canal.canal} actualizado`)
      onClose()
    } catch (err) {
      toast.error(err.message || 'Error al guardar configuracion')
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Configurar ${meta?.label || canal.canal}`}
      size="md"
    >
      <div className="space-y-4">
        {/* Activar/desactivar */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
          <div>
            <p className="text-sm font-medium text-gray-700">Estado del canal</p>
            <p className="text-xs text-gray-500">Activar o desactivar este canal de comunicacion</p>
          </div>
          <button
            type="button"
            onClick={() => setActivo(!activo)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              activo ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                activo ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Campos de configuracion */}
        {meta?.fields?.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Parametros</p>
            {meta.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-xs text-gray-600 mb-1">{field.label}</label>
                <Input
                  value={config[field.key] || ''}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} loading={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-1" />
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
