import { useState } from 'react'
import { Card, CardContent, Badge, Button, Modal, EmptyState, Input, Select, Textarea } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import {
  FileText,
  Plus,
  Edit2,
  MessageSquare,
  Mail,
  Phone,
  Tag,
  Variable,
  Copy,
} from 'lucide-react'
import { usePlantillas, useCreatePlantilla, useUpdatePlantilla } from '@/hooks/useComunicaciones'

const CANAL_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'chat', label: 'Chat' },
  { value: 'todos', label: 'Todos los canales' },
]

const CATEGORIA_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'facturacion', label: 'Facturacion' },
  { value: 'sat', label: 'SAT' },
  { value: 'urgencias', label: 'Urgencias' },
  { value: 'bienvenida', label: 'Bienvenida' },
]

const CANAL_ICONS = {
  whatsapp: MessageSquare,
  email: Mail,
  chat: MessageSquare,
  todos: FileText,
}

const CATEGORIA_COLORS = {
  general: 'default',
  facturacion: 'primary',
  sat: 'info',
  urgencias: 'danger',
  bienvenida: 'success',
}

function extractVariables(text) {
  const matches = text.match(/\{\{(\w+)\}\}/g)
  if (!matches) return []
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))]
}

export function PlantillasList() {
  const [filtroCanal, setFiltroCanal] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingPlantilla, setEditingPlantilla] = useState(null)

  const { data: plantillas, isLoading } = usePlantillas(filtroCanal)
  const toast = useToast()

  const handleNew = () => {
    setEditingPlantilla(null)
    setShowModal(true)
  }

  const handleEdit = (plantilla) => {
    setEditingPlantilla(plantilla)
    setShowModal(true)
  }

  const handleCopy = async (contenido) => {
    try {
      await navigator.clipboard.writeText(contenido)
      toast.success('Plantilla copiada al portapapeles')
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary-600" />
            Plantillas de Mensaje
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Plantillas reutilizables para respuestas frecuentes
          </p>
        </div>
        <Button variant="primary" onClick={handleNew}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva plantilla
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFiltroCanal(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !filtroCanal ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todos
        </button>
        {CANAL_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFiltroCanal(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filtroCanal === opt.value
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Lista de plantillas */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-5 animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !plantillas?.length ? (
        <EmptyState
          icon={FileText}
          title="Sin plantillas"
          description="Crea tu primera plantilla de mensaje para agilizar las respuestas a clientes."
          action={
            <Button variant="primary" onClick={handleNew}>
              <Plus className="h-4 w-4 mr-1" />
              Crear plantilla
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plantillas.map((p) => {
            const Icon = CANAL_ICONS[p.canal] || FileText
            const vars = p.variables || extractVariables(p.contenido)

            return (
              <Card key={p.id} hover className="transition-all duration-200 hover:shadow-md">
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                        <Icon className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{p.nombre}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant={CATEGORIA_COLORS[p.categoria] || 'default'} className="text-[10px]">
                            {p.categoria}
                          </Badge>
                          <span className="text-[10px] text-gray-400 capitalize">{p.canal}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(p.contenido)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        title="Copiar"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleEdit(p)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {p.contenido}
                    </p>
                  </div>

                  {/* Variables */}
                  {vars.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Variable className="h-3 w-3 text-gray-400" />
                      {vars.map((v) => (
                        <span
                          key={v}
                          className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 text-[10px] font-mono"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal crear/editar */}
      {showModal && (
        <PlantillaModal
          plantilla={editingPlantilla}
          onClose={() => {
            setShowModal(false)
            setEditingPlantilla(null)
          }}
        />
      )}
    </div>
  )
}

function PlantillaModal({ plantilla, onClose }) {
  const isEdit = !!plantilla
  const toast = useToast()
  const createMutation = useCreatePlantilla()
  const updateMutation = useUpdatePlantilla()

  const [form, setForm] = useState({
    nombre: plantilla?.nombre || '',
    canal: plantilla?.canal || 'whatsapp',
    categoria: plantilla?.categoria || 'general',
    contenido: plantilla?.contenido || '',
  })

  const [errors, setErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!form.nombre.trim()) errs.nombre = 'Nombre requerido'
    if (!form.contenido.trim()) errs.contenido = 'Contenido requerido'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    const variables = extractVariables(form.contenido)
    const payload = { ...form, variables }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: plantilla.id, ...payload })
        toast.success('Plantilla actualizada')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Plantilla creada')
      }
      onClose()
    } catch (err) {
      toast.error(err.message || 'Error al guardar plantilla')
    }
  }

  const detectedVars = extractVariables(form.contenido)
  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Editar plantilla' : 'Nueva plantilla'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <Input
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Saludo WhatsApp"
            error={errors.nombre}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Canal</label>
            <Select
              value={form.canal}
              onChange={(e) => setForm({ ...form, canal: e.target.value })}
              options={CANAL_OPTIONS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <Select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              options={CATEGORIA_OPTIONS}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contenido
            <span className="text-gray-400 font-normal ml-1">(usa {'{{variable}}'} para datos dinamicos)</span>
          </label>
          <Textarea
            value={form.contenido}
            onChange={(e) => setForm({ ...form, contenido: e.target.value })}
            placeholder="Hola {{nombre}}, gracias por contactar con A360..."
            rows={5}
            error={errors.contenido}
          />
        </div>

        {detectedVars.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-500">Variables detectadas:</span>
            {detectedVars.map((v) => (
              <span
                key={v}
                className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 text-[10px] font-mono"
              >
                {`{{${v}}}`}
              </span>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" loading={saving}>
            {isEdit ? 'Guardar cambios' : 'Crear plantilla'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
