import { useState, useMemo, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { usePlantillas } from '@/hooks/useComunicaciones'
import { useCliente } from '@/hooks/useClientes'
import {
  FileText,
  Copy,
  ExternalLink,
  Search,
  Check,
  Variable,
  ChevronRight,
} from 'lucide-react'

const CATEGORIA_COLORS = {
  general: 'bg-gray-100 text-gray-700',
  facturacion: 'bg-blue-50 text-blue-700',
  sat: 'bg-cyan-50 text-cyan-700',
  urgencias: 'bg-red-50 text-red-700',
  bienvenida: 'bg-emerald-50 text-emerald-700',
}

function extractVariables(text) {
  const matches = text.match(/\{\{(\w+)\}\}/g)
  if (!matches) return []
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))]
}

/** Mapea variables a datos del cliente */
function buildAutoFill(cliente) {
  if (!cliente) return {}

  const nombre = [cliente.nombre, cliente.apellidos].filter(Boolean).join(' ')
  const uc = cliente.ubicaciones_clientes?.[0] || {}

  return {
    nombre: nombre || '',
    telefono: cliente.telefono || '',
    email: cliente.email || '',
    direccion: cliente.direccion || '',
    localidad: cliente.localidad || '',
    comunidad: uc.ubicacion?.agrupacion?.comunidad?.nombre || '',
    fecha: new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
  }
}

function replaceVariables(text, values) {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const val = values[key]
    return val ? val : match
  })
}

const CHATWOOT_ACCOUNT_ID = 1

export function UsarPlantillaModal({
  open,
  onClose,
  canal,
  clienteId,
  chatwootUrl,
  chatwootConversationId,
}) {
  const toast = useToast()
  const { data: plantillas = [], isLoading: loadingPlantillas, isError } = usePlantillas(canal)
  const { data: cliente } = useCliente(clienteId)
  const copyTimerRef = useRef(null)

  const [selectedId, setSelectedId] = useState(null)
  const [variableValues, setVariableValues] = useState({})
  const [filterText, setFilterText] = useState('')
  const [copied, setCopied] = useState(false)

  // Reset state al abrir/cerrar
  useEffect(() => {
    if (open) {
      clearTimeout(copyTimerRef.current)
      setSelectedId(null)
      setVariableValues({})
      setFilterText('')
      setCopied(false)
    }
    return () => clearTimeout(copyTimerRef.current)
  }, [open])

  const filteredPlantillas = useMemo(() => {
    if (!filterText) return plantillas
    const lower = filterText.toLowerCase()
    return plantillas.filter(
      (p) =>
        p.nombre.toLowerCase().includes(lower) ||
        p.contenido.toLowerCase().includes(lower) ||
        p.categoria?.toLowerCase().includes(lower)
    )
  }, [plantillas, filterText])

  const selectedPlantilla = useMemo(
    () => plantillas.find((p) => p.id === selectedId),
    [plantillas, selectedId]
  )

  const variables = useMemo(
    () => (selectedPlantilla ? extractVariables(selectedPlantilla.contenido) : []),
    [selectedPlantilla]
  )

  // Auto-rellenar variables del cliente cuando se selecciona plantilla
  useEffect(() => {
    if (!selectedPlantilla) return
    const autoFill = buildAutoFill(cliente)
    const vars = extractVariables(selectedPlantilla.contenido)
    const initial = {}
    for (const v of vars) {
      initial[v] = autoFill[v] || ''
    }
    setVariableValues(initial)
  }, [selectedPlantilla, cliente])

  const processedText = useMemo(() => {
    if (!selectedPlantilla) return ''
    return replaceVariables(selectedPlantilla.contenido, variableValues)
  }, [selectedPlantilla, variableValues])

  const hasEmptyVars = variables.some((v) => !variableValues[v])

  async function handleCopy(openChatwoot = false) {
    try {
      await navigator.clipboard.writeText(processedText)
      setCopied(true)
      clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
      toast.success('Texto copiado al portapapeles')

      if (openChatwoot && chatwootUrl) {
        const url = chatwootConversationId
          ? `${chatwootUrl}/app/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${chatwootConversationId}`
          : `${chatwootUrl}/app/accounts/${CHATWOOT_ACCOUNT_ID}/conversations`
        window.open(url, '_blank', 'noopener,noreferrer')
      }

      onClose()
    } catch {
      toast.error('No se pudo copiar al portapapeles')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Usar plantilla"
      description="Selecciona una plantilla, completa las variables y copia el mensaje"
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {/* PASO 1: Selector de plantilla */}
        {!selectedPlantilla ? (
          <div className="space-y-3">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Buscar plantilla..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Lista */}
            {loadingPlantillas ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-lg" />
                ))}
              </div>
            ) : isError ? (
              <div className="text-center py-8 text-sm text-red-500">
                Error al cargar las plantillas. Intenta de nuevo.
              </div>
            ) : filteredPlantillas.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                {filterText
                  ? 'No hay plantillas que coincidan'
                  : 'No hay plantillas disponibles para este canal'}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[340px] overflow-y-auto">
                {filteredPlantillas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className="w-full text-left p-3 rounded-lg border border-gray-150 hover:border-primary-300 hover:bg-primary-50/40 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {p.nombre}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            CATEGORIA_COLORS[p.categoria] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {p.categoria}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-primary-500 transition-colors" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {p.contenido}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* PASO 2: Variables + Preview */
          <div className="space-y-4">
            {/* Header plantilla seleccionada */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary-600" />
                <span className="text-sm font-semibold text-gray-900">
                  {selectedPlantilla.nombre}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    CATEGORIA_COLORS[selectedPlantilla.categoria] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {selectedPlantilla.categoria}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedId(null)
                  setVariableValues({})
                  setCopied(false)
                }}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Cambiar
              </button>
            </div>

            {/* Formulario de variables */}
            {variables.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Variable className="h-3.5 w-3.5" />
                  Variables ({variables.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {variables.map((v) => (
                    <div key={v}>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">
                        {`{{${v}}}`}
                      </label>
                      <input
                        type="text"
                        value={variableValues[v] || ''}
                        onChange={(e) =>
                          setVariableValues((prev) => ({ ...prev, [v]: e.target.value }))
                        }
                        placeholder={`Valor para ${v}`}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview texto resultante */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Mensaje resultante
              </h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {processedText}
                </p>
              </div>
              {hasEmptyVars && (
                <p className="text-[11px] text-amber-600 mt-1">
                  Hay variables sin completar — se mantendrán como {'{{variable}}'} en el texto
                </p>
              )}
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleCopy(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-sm transition-all"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Copiar y abrir Chatwoot
              </button>
              <button
                onClick={() => handleCopy(false)}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
              >
                <Copy className="h-4 w-4" />
                Solo copiar
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
