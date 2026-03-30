import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePortalTickets, usePortalCrearTicket } from '@/hooks/usePortal'
import { Card, CardContent, Badge, LoadingSpinner, Select, EmptyState, Modal, Input, Textarea, Button } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { TicketCheck, Plus, MessageSquare } from 'lucide-react'
import { useTicketComentarios, useCrearComentario } from '@/hooks/useTickets'

const ESTADO_VARIANTS = { abierto: 'warning', en_progreso: 'info', esperando_cliente: 'default', resuelto: 'success', cerrado: 'default' }
const TIPO_OPTIONS = [
  { value: 'incidencia', label: 'Incidencia' },
  { value: 'consulta', label: 'Consulta' },
  { value: 'solicitud', label: 'Solicitud' },
  { value: 'queja', label: 'Queja' },
]

function formatDate(d) { return d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' }

export function PortalTickets() {
  const [searchParams] = useSearchParams()
  const [filtroEstado, setFiltroEstado] = useState('')
  const [showNuevo, setShowNuevo] = useState(searchParams.get('nuevo') === '1')
  const [selectedTicket, setSelectedTicket] = useState(null)

  const { data: result, isLoading } = usePortalTickets({ estado: filtroEstado || undefined })
  const tickets = result?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mis Tickets</h1>
          <p className="text-sm text-gray-500">Incidencias y solicitudes de soporte</p>
        </div>
        <Button onClick={() => setShowNuevo(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nueva incidencia
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-48">
            <option value="">Todos los estados</option>
            <option value="abierto">Abierto</option>
            <option value="en_progreso">En progreso</option>
            <option value="resuelto">Resuelto</option>
            <option value="cerrado">Cerrado</option>
          </Select>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner size="lg" /></div>
        ) : tickets.length === 0 ? (
          <CardContent className="p-0">
            <EmptyState icon={TicketCheck} title="Sin tickets" description="No tienes incidencias registradas" />
          </CardContent>
        ) : (
          <div className="divide-y divide-gray-100">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className="flex items-center justify-between w-full px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-500">{t.numero_ticket}</span>
                    <Badge variant={ESTADO_VARIANTS[t.estado] || 'default'} className="text-[10px] capitalize">
                      {t.estado?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{t.asunto}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(t.created_at)}</p>
                </div>
                <MessageSquare className="h-4 w-4 text-gray-400 shrink-0 ml-3" />
              </button>
            ))}
          </div>
        )}
      </Card>

      <NuevoTicketModal open={showNuevo} onClose={() => setShowNuevo(false)} />
      <TicketDetalleModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
    </div>
  )
}

function NuevoTicketModal({ open, onClose }) {
  const crear = usePortalCrearTicket()
  const toast = useToast()
  const [form, setForm] = useState({ asunto: '', tipo: 'incidencia', prioridad: 'normal', descripcion: '' })

  const handleSubmit = async () => {
    if (!form.asunto.trim()) { toast.error('El asunto es requerido'); return }
    try {
      await crear.mutateAsync(form)
      toast.success('Incidencia registrada correctamente')
      setForm({ asunto: '', tipo: 'incidencia', prioridad: 'normal', descripcion: '' })
      onClose()
    } catch (err) { toast.error(err.message) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva Incidencia" size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Asunto *</label>
          <Input value={form.asunto} onChange={(e) => setForm({ ...form, asunto: e.target.value })} placeholder="Describe brevemente el problema" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {TIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
            <Select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </Select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={4} placeholder="Describe el problema con detalle..." />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={crear.isPending}>Enviar</Button>
        </div>
      </div>
    </Modal>
  )
}

function TicketDetalleModal({ ticket, onClose }) {
  if (!ticket) return null
  const { data: comentarios } = useTicketComentarios(ticket.id)
  const crearComentario = useCrearComentario()
  const toast = useToast()
  const [msg, setMsg] = useState('')

  const handleEnviar = async () => {
    if (!msg.trim()) return
    try {
      await crearComentario.mutateAsync({ ticket_id: ticket.id, contenido: msg.trim(), es_interno: false })
      setMsg('')
    } catch (err) { toast.error(err.message) }
  }

  return (
    <Modal open={!!ticket} onClose={onClose} title={ticket.numero_ticket} size="lg">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900">{ticket.asunto}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={ESTADO_VARIANTS[ticket.estado] || 'default'} className="text-xs capitalize">{ticket.estado?.replace('_', ' ')}</Badge>
            <span className="text-xs text-gray-500">{formatDate(ticket.created_at)}</span>
          </div>
        </div>

        {/* Comentarios */}
        <div className="border rounded-lg max-h-[300px] overflow-y-auto">
          {!comentarios?.length ? (
            <p className="text-sm text-gray-500 text-center py-6">Sin comentarios</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {comentarios.map((c) => (
                <div key={c.id} className="px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">{c.usuario_nombre}</span>
                    <span className="text-[10px] text-gray-400">{formatDate(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{c.contenido}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Responder */}
        {!['cerrado', 'resuelto'].includes(ticket.estado) && (
          <div className="flex gap-2">
            <Input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Escribe un mensaje..."
              onKeyDown={(e) => e.key === 'Enter' && handleEnviar()} className="flex-1" />
            <Button size="sm" onClick={handleEnviar} loading={crearComentario.isPending} disabled={!msg.trim()}>
              Enviar
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
