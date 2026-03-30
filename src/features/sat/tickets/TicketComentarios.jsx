import { useState } from 'react'
import { useTicketComentarios, useCrearComentario } from '@/hooks/useTickets'
import { Button, Textarea, Badge, LoadingSpinner } from '@/components/ui'
import { Send, Lock, Globe } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

function formatFecha(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function TicketComentarios({ ticketId }) {
  const { data: comentarios, isLoading } = useTicketComentarios(ticketId)
  const crearComentario = useCrearComentario()
  const toast = useToast()
  const [contenido, setContenido] = useState('')
  const [esInterno, setEsInterno] = useState(false)

  const handleEnviar = async () => {
    if (!contenido.trim()) return
    try {
      await crearComentario.mutateAsync({
        ticket_id: ticketId,
        contenido: contenido.trim(),
        es_interno: esInterno,
      })
      setContenido('')
      toast.success('Comentario añadido')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleEnviar()
    }
  }

  if (isLoading) {
    return <div className="py-8 flex justify-center"><LoadingSpinner size="sm" /></div>
  }

  return (
    <div className="space-y-4">
      {/* Lista de comentarios */}
      {comentarios?.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No hay comentarios todavía</p>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {comentarios?.map((com) => (
            <div
              key={com.id}
              className={`p-3 rounded-lg ${
                com.es_interno
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{com.usuario_nombre}</span>
                  {com.es_interno && (
                    <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                      <Lock className="h-2.5 w-2.5 mr-0.5" /> Interno
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-gray-400">{formatFecha(com.created_at)}</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{com.contenido}</p>
            </div>
          ))}
        </div>
      )}

      {/* Formulario nuevo comentario */}
      <div className="border-t border-gray-200 pt-4">
        <Textarea
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un comentario... (Ctrl+Enter para enviar)"
          rows={3}
        />
        <div className="flex items-center justify-between mt-2">
          <button
            type="button"
            onClick={() => setEsInterno(!esInterno)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              esInterno
                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            {esInterno ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
            {esInterno ? 'Nota interna' : 'Público'}
          </button>
          <Button
            size="sm"
            onClick={handleEnviar}
            loading={crearComentario.isPending}
            disabled={!contenido.trim()}
          >
            <Send className="h-3.5 w-3.5 mr-1" /> Enviar
          </Button>
        </div>
      </div>
    </div>
  )
}
