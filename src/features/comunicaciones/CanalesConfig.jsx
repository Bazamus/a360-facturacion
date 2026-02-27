import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, Badge, Button, Modal, Input, EmptyState } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import {
  Settings,
  MessageSquare,
  Mail,
  Phone,
  MessageCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Save,
  ArrowLeft,
  Link2,
} from 'lucide-react'
import { useUpdateCanalConfig, useComunicacionesConfig } from '@/hooks/useComunicaciones'

const CANAL_META = {
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageSquare,
    color: 'text-green-600',
    bg: 'bg-green-50',
    description: 'Comunicación vía Evolution API + Chatwoot. Canal principal de mensajería con clientes.',
    fields: [
      { key: 'chatwoot_url', label: 'URL de Chatwoot', placeholder: 'https://chat.a360se.com' },
      { key: 'chatwoot_account_id', label: 'Chatwoot Account ID', placeholder: '1', type: 'number' },
      { key: 'enlace_chatwoot', label: 'Enlace rápido — Chatwoot', placeholder: 'https://chat.a360se.com' },
      { key: 'enlace_evolution', label: 'Enlace rápido — Evolution API Manager', placeholder: 'https://api-wa.a360se.com/manager' },
      { key: 'enlace_n8n', label: 'Enlace rápido — n8n Workflows', placeholder: 'https://n8n.a360se.com' },
    ],
  },
  email: {
    label: 'Email',
    icon: Mail,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    description: 'Envío de emails vía Resend. Configurado para facturación y comunicaciones.',
    fields: [
      { key: 'from_email', label: 'Email de envío', placeholder: 'facturacion@a360se.com' },
      { key: 'from_name', label: 'Nombre de remitente', placeholder: 'A360 Servicios Energéticos' },
    ],
  },
  chat: {
    label: 'Live Chat',
    icon: MessageCircle,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    description: 'Widget de chat incrustado en la web vía Chatwoot.',
    fields: [],
  },
  telefono: {
    label: 'Teléfono',
    icon: Phone,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    description: 'Registro manual de llamadas telefónicas.',
    fields: [],
  },
}

const CANAL_ORDER = ['whatsapp', 'email', 'chat', 'telefono']

const QUICK_LINKS = [
  { key: 'chatwoot', label: 'Chatwoot', bg: 'bg-blue-50', text: 'text-blue-700', hover: 'hover:bg-blue-100' },
  { key: 'evolution', label: 'Evolution API Manager', bg: 'bg-green-50', text: 'text-green-700', hover: 'hover:bg-green-100' },
  { key: 'n8n', label: 'n8n Workflows', bg: 'bg-orange-50', text: 'text-orange-700', hover: 'hover:bg-orange-100' },
]

export function CanalesConfig() {
  const navigate = useNavigate()
  const { canales, isLoading, enlaces } = useComunicacionesConfig()
  const [editingCanal, setEditingCanal] = useState(null)

  const sortedCanales = canales
    ? [...canales]
        .filter((c) => CANAL_ORDER.includes(c.canal))
        .sort((a, b) => CANAL_ORDER.indexOf(a.canal) - CANAL_ORDER.indexOf(b.canal))
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-7 w-7 text-primary-600" />
            Configuración de Canales
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configura las URLs y parámetros de los canales de comunicación. Los valores guardados aquí se usan en el Dashboard y las plantillas.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => navigate('/comunicaciones')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Ir al Dashboard
        </Button>
      </div>

      {/* Links rápidos (dinámicos desde config) */}
      <div className="flex flex-wrap gap-2">
        {QUICK_LINKS.map((link) => {
          const url = enlaces[link.key]
          if (!url) return null
          return (
            <a
              key={link.key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${link.bg} ${link.text} text-xs font-medium ${link.hover} transition-colors`}
            >
              <ExternalLink className="h-3 w-3" />
              {link.label}
            </a>
          )
        })}
      </div>

      {/* Lista de canales */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
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
      ) : sortedCanales.length === 0 ? (
        <EmptyState
          icon={Settings}
          title="Sin canales configurados"
          description="Ejecuta la migración SQL para crear la configuración inicial de canales."
        />
      ) : (
        <div className="space-y-4">
          {sortedCanales.map((canal) => {
            const meta = CANAL_META[canal.canal] || {}
            const Icon = meta.icon || Settings
            const isActive = canal.activo
            const configEntries = canal.configuracion
              ? Object.entries(canal.configuracion).filter(([, v]) => v)
              : []

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

                    {meta.fields?.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCanal(canal)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Configurar
                      </Button>
                    )}
                  </div>

                  {/* Preview de configuración */}
                  {isActive && configEntries.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex flex-wrap gap-2">
                        {configEntries.map(([key, value]) => (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-50 text-[10px] text-gray-600 font-mono"
                          >
                            <Link2 className="h-2.5 w-2.5 text-gray-400" />
                            {key}: {typeof value === 'string' && value.length > 40 ? value.slice(0, 40) + '…' : String(value)}
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
      toast.error(err.message || 'Error al guardar configuración')
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Configurar ${meta?.label || canal.canal}`}
      size="md"
    >
      <div className="space-y-4">
        {/* Activar/desactivar */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
          <div>
            <p className="text-sm font-medium text-gray-700">Estado del canal</p>
            <p className="text-xs text-gray-500">Activar o desactivar este canal de comunicación</p>
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

        {/* Campos de configuración */}
        {meta?.fields?.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Parámetros</p>
            {meta.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-xs text-gray-600 mb-1">{field.label}</label>
                <Input
                  type={field.type || 'text'}
                  value={config[field.key] || ''}
                  onChange={(e) => handleFieldChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
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
