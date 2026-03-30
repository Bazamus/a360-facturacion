import { useState, useEffect } from 'react'
import { Package, Plus, Edit2, AlertTriangle } from 'lucide-react'
import { useMateriales, useCrearMaterial, useActualizarMaterial } from '@/hooks'
import {
  Button, Card, CardContent, EmptyState, LoadingSpinner,
  DataTable, SearchInput, Badge, Select, Modal, Input, Textarea,
} from '@/components/ui'
import { useToast } from '@/components/ui/Toast'

const CATEGORIA_OPTIONS = [
  { value: '', label: 'Todas las categorías' },
  { value: 'general', label: 'General' },
  { value: 'fontaneria', label: 'Fontanería' },
  { value: 'electricidad', label: 'Electricidad' },
  { value: 'climatizacion', label: 'Climatización' },
  { value: 'calefaccion', label: 'Calefacción' },
  { value: 'repuestos', label: 'Repuestos' },
  { value: 'consumible', label: 'Consumible' },
  { value: 'herramienta', label: 'Herramienta' },
  { value: 'equipo', label: 'Equipo' },
  { value: 'otro', label: 'Otro' },
]

export function MaterialesCatalogo() {
  const [search, setSearch] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [soloActivos, setSoloActivos] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)

  const { data: materiales, isLoading, error } = useMateriales({
    search: search || undefined,
    categoria: filtroCategoria || undefined,
    soloActivos,
  })

  const handleNuevo = () => {
    setEditando(null)
    setModalOpen(true)
  }

  const handleEditar = (material) => {
    setEditando(material)
    setModalOpen(true)
  }

  const columns = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (value, row) => (
        <div>
          <span className="text-sm font-medium text-gray-900">{value}</span>
          {row.stock_actual != null && row.stock_minimo != null && row.stock_actual < row.stock_minimo && (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 inline ml-2" title="Stock bajo" />
          )}
        </div>
      ),
    },
    {
      key: 'referencia',
      header: 'Referencia',
      render: (value) => (
        <span className="font-mono text-xs text-gray-600">{value || '-'}</span>
      ),
    },
    {
      key: 'categoria',
      header: 'Categoría',
      render: (value) => (
        <span className="text-xs text-gray-600 capitalize">{value || '-'}</span>
      ),
    },
    {
      key: 'precio_unitario',
      header: 'Precio',
      render: (value) => (
        <span className="text-sm font-medium text-gray-900">
          {value != null ? `${Number(value).toFixed(2)} €` : '-'}
        </span>
      ),
    },
    {
      key: 'stock_actual',
      header: 'Stock',
      render: (value, row) => {
        const bajo = value != null && row.stock_minimo != null && value < row.stock_minimo
        return (
          <span className={`text-sm ${bajo ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
            {value ?? '-'}
            {row.unidad_medida && ` ${row.unidad_medida}`}
          </span>
        )
      },
    },
    {
      key: 'stock_minimo',
      header: 'Mín.',
      render: (value) => (
        <span className="text-xs text-gray-400">{value ?? '-'}</span>
      ),
    },
    {
      key: 'activo',
      header: 'Estado',
      render: (value) => (
        <Badge variant={value ? 'success' : 'default'} className="text-xs">
          {value ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'acciones',
      header: '',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleEditar(row)}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-red-600">
          Error al cargar materiales: {error.message}
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Catálogo de Materiales</h1>
          <p className="page-description">Gestión de materiales, repuestos y consumibles</p>
        </div>
        <Button onClick={handleNuevo}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Material
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre, referencia..."
            />
            <Select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
            >
              {CATEGORIA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="soloActivos"
                checked={soloActivos}
                onChange={(e) => setSoloActivos(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="soloActivos" className="text-sm text-gray-700">Solo activos</label>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : !materiales?.length ? (
          <CardContent className="p-0">
            <EmptyState
              icon={Package}
              title="Sin materiales"
              description={search ? 'No se encontraron materiales con ese criterio' : 'Añade el primer material al catálogo.'}
              action={!search && (
                <Button onClick={handleNuevo}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Material
                </Button>
              )}
            />
          </CardContent>
        ) : (
          <DataTable
            data={materiales}
            columns={columns}
            onRowClick={handleEditar}
          />
        )}
      </Card>

      <MaterialFormModal
        open={modalOpen}
        material={editando}
        onClose={() => { setModalOpen(false); setEditando(null) }}
      />
    </div>
  )
}

function MaterialFormModal({ open, material, onClose }) {
  const crear = useCrearMaterial()
  const actualizar = useActualizarMaterial()
  const toast = useToast()
  const isEdit = !!material

  const [form, setForm] = useState({
    nombre: '', referencia: '', categoria: 'repuesto', descripcion: '',
    unidad_medida: 'ud', precio_unitario: '', stock_actual: '', stock_minimo: '',
    activo: true,
  })

  useEffect(() => {
    if (!open) return
    if (material) {
      setForm({
        nombre: material.nombre || '',
        referencia: material.referencia || '',
        categoria: material.categoria || 'general',
        descripcion: material.descripcion || '',
        unidad_medida: material.unidad_medida || 'ud',
        precio_unitario: material.precio_unitario ?? '',
        stock_actual: material.stock_actual ?? '',
        stock_minimo: material.stock_minimo ?? '',
        activo: material.activo ?? true,
      })
    } else {
      setForm({
        nombre: '', referencia: '', categoria: 'general', descripcion: '',
        unidad_medida: 'ud', precio_unitario: '', stock_actual: '', stock_minimo: '',
        activo: true,
      })
    }
  }, [open, material])

  const handleSubmit = async () => {
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    const payload = {
      nombre: form.nombre,
      referencia: form.referencia || null,
      categoria: form.categoria || null,
      descripcion: form.descripcion || null,
      unidad_medida: form.unidad_medida || 'ud',
      precio_unitario: form.precio_unitario ? Number(form.precio_unitario) : null,
      stock_actual: form.stock_actual !== '' ? Number(form.stock_actual) : null,
      stock_minimo: form.stock_minimo !== '' ? Number(form.stock_minimo) : null,
      activo: form.activo,
    }

    try {
      if (isEdit) {
        await actualizar.mutateAsync({ id: material.id, ...payload })
        toast.success('Material actualizado')
      } else {
        await crear.mutateAsync(payload)
        toast.success('Material creado')
      }
      onClose()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Material' : 'Nuevo Material'} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <Input value={form.nombre} onChange={set('nombre')} placeholder="Nombre del material" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
            <Input value={form.referencia} onChange={set('referencia')} placeholder="REF-001" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <Select value={form.categoria} onChange={set('categoria')}>
              {CATEGORIA_OPTIONS.filter((o) => o.value).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de medida</label>
            <Select value={form.unidad_medida} onChange={set('unidad_medida')}>
              <option value="ud">Unidad</option>
              <option value="m">Metro</option>
              <option value="m2">Metro²</option>
              <option value="kg">Kilogramo</option>
              <option value="l">Litro</option>
              <option value="h">Hora</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio unitario</label>
            <Input type="number" step="0.01" min="0" value={form.precio_unitario} onChange={set('precio_unitario')} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock actual</label>
            <Input type="number" min="0" value={form.stock_actual} onChange={set('stock_actual')} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
            <Input type="number" min="0" value={form.stock_minimo} onChange={set('stock_minimo')} placeholder="0" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <Textarea value={form.descripcion} onChange={set('descripcion')} rows={2} placeholder="Descripción del material..." />
        </div>

        {isEdit && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="materialActivo"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="materialActivo" className="text-sm text-gray-700">Material activo</label>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} loading={crear.isPending || actualizar.isPending}>
            {isEdit ? 'Guardar cambios' : 'Crear material'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
