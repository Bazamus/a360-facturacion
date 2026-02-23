import { useState } from 'react'
import { useMaterialesIntervencion, useAnadirMaterialIntervencion, useEliminarMaterialIntervencion, useMateriales } from '@/hooks'
import { Button, Modal, SearchInput, EmptyState, Badge } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { Plus, Trash2, Package, Search } from 'lucide-react'

export function MaterialesIntervencion({ intervencionId, editable = false }) {
  const { data: materiales, isLoading } = useMaterialesIntervencion(intervencionId)
  const [showModal, setShowModal] = useState(false)
  const toast = useToast()
  const eliminar = useEliminarMaterialIntervencion()

  const total = materiales?.reduce((sum, m) => sum + Number(m.subtotal || 0), 0) ?? 0

  const handleEliminar = async (item) => {
    try {
      await eliminar.mutateAsync({ id: item.id, intervencion_id: intervencionId })
      toast.success('Material eliminado')
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (isLoading) {
    return <div className="animate-pulse space-y-2">
      <div className="h-4 bg-gray-200 rounded w-48" />
      <div className="h-10 bg-gray-200 rounded" />
    </div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-400" />
          Materiales utilizados
        </h3>
        {editable && (
          <Button variant="secondary" onClick={() => setShowModal(true)} className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Añadir material
          </Button>
        )}
      </div>

      {!materiales?.length ? (
        <EmptyState
          icon={Package}
          title="Sin materiales"
          description="No se han registrado materiales en esta intervención."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-2 pr-4 font-medium text-gray-500">Material</th>
                  <th className="py-2 pr-4 font-medium text-gray-500">Ref.</th>
                  <th className="py-2 pr-4 font-medium text-gray-500 text-right">Cantidad</th>
                  <th className="py-2 pr-4 font-medium text-gray-500 text-right">P. Unit.</th>
                  <th className="py-2 pr-4 font-medium text-gray-500 text-right">Subtotal</th>
                  {editable && <th className="py-2 w-10" />}
                </tr>
              </thead>
              <tbody>
                {materiales.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-900">{item.material?.nombre || '-'}</td>
                    <td className="py-2 pr-4 text-gray-500 font-mono text-xs">{item.material?.referencia || '-'}</td>
                    <td className="py-2 pr-4 text-right text-gray-900">
                      {item.cantidad} {item.material?.unidad_medida || ''}
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-600">{Number(item.precio_unitario).toFixed(2)} €</td>
                    <td className="py-2 pr-4 text-right font-medium text-gray-900">{Number(item.subtotal).toFixed(2)} €</td>
                    {editable && (
                      <td className="py-2">
                        <button
                          onClick={() => handleEliminar(item)}
                          disabled={eliminar.isPending}
                          className="p-1 text-gray-400 hover:text-red-500 rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td colSpan={editable ? 4 : 4} className="py-2 text-right font-semibold text-gray-700">Total:</td>
                  <td className="py-2 pr-4 text-right font-bold text-gray-900">{total.toFixed(2)} €</td>
                  {editable && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      <AnadirMaterialModal
        open={showModal}
        intervencionId={intervencionId}
        onClose={() => setShowModal(false)}
      />
    </div>
  )
}

function AnadirMaterialModal({ open, intervencionId, onClose }) {
  const [search, setSearch] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [selectedMaterial, setSelectedMaterial] = useState(null)
  const { data: catalogo } = useMateriales({ search, soloActivos: true })
  const anadir = useAnadirMaterialIntervencion()
  const toast = useToast()

  const handleSubmit = async () => {
    if (!selectedMaterial) return
    try {
      await anadir.mutateAsync({
        intervencion_id: intervencionId,
        material_id: selectedMaterial.id,
        cantidad,
        precio_unitario: selectedMaterial.precio_unitario,
      })
      toast.success('Material añadido')
      setSelectedMaterial(null)
      setCantidad(1)
      onClose()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Añadir material" size="lg">
      <div className="space-y-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar material por nombre o referencia..."
        />

        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
          {!catalogo?.length ? (
            <p className="p-4 text-sm text-gray-500 text-center">
              {search ? 'Sin resultados' : 'Busca un material del catálogo'}
            </p>
          ) : (
            catalogo.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMaterial(m)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 ${
                  selectedMaterial?.id === m.id ? 'bg-primary-50 border-primary-200' : ''
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.nombre}</p>
                  <p className="text-xs text-gray-500">{m.referencia || 'Sin referencia'} · {m.categoria}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{Number(m.precio_unitario).toFixed(2)} €</p>
                  <p className="text-xs text-gray-500">Stock: {m.stock_actual}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {selectedMaterial && (
          <div className="flex items-center gap-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
            <div className="flex-1">
              <p className="text-sm font-medium text-primary-900">{selectedMaterial.nombre}</p>
              <p className="text-xs text-primary-700">{Number(selectedMaterial.precio_unitario).toFixed(2)} € / {selectedMaterial.unidad_medida}</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-primary-700">Cant:</label>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
                className="w-16 px-2 py-1 text-sm border border-primary-300 rounded text-center"
              />
            </div>
            <p className="text-sm font-bold text-primary-900">
              {(cantidad * Number(selectedMaterial.precio_unitario)).toFixed(2)} €
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} loading={anadir.isPending} disabled={!selectedMaterial}>
            Añadir
          </Button>
        </div>
      </div>
    </Modal>
  )
}
