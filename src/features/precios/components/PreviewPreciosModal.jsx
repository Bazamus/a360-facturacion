import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

/**
 * Modal de preview antes de aplicar actualización de precios
 * Muestra tabla old→new + facturas afectadas
 */
export function PreviewPreciosModal({
  open,
  onClose,
  onConfirm,
  previewData,
  factor,
  loading,
  recalcularFacturas,
  onToggleRecalcular
}) {
  const precios = previewData?.precios || []
  const facturasAfectadas = previewData?.facturas_afectadas || 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Vista previa de actualización"
      description={`Factor: ${factor ? parseFloat(factor).toFixed(5) : '—'}`}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={recalcularFacturas}
                onChange={(e) => onToggleRecalcular(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-700">
                Recalcular facturas borrador/emitidas no enviadas
              </span>
            </label>
            {facturasAfectadas > 0 && (
              <Badge variant="warning">{facturasAfectadas} factura{facturasAfectadas > 1 ? 's' : ''}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              loading={loading}
              disabled={precios.length === 0}
            >
              Aplicar cambios
            </Button>
          </div>
        </div>
      }
    >
      {precios.length === 0 ? (
        <div className="flex items-center gap-3 rounded-md bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            No se encontraron precios activos para la combinación seleccionada de comunidades y conceptos.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Comunidad</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio actual</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio nuevo</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {precios.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <span className="font-medium">{p.comunidad_codigo}</span>
                    <span className="ml-1.5 text-gray-500">{p.comunidad_nombre}</span>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="primary">{p.concepto_codigo}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatNumber(p.precio_actual, 4)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-medium text-primary-700">
                    {formatNumber(p.precio_nuevo, 4)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    <span className={p.diferencia > 0 ? 'text-amber-600' : p.diferencia < 0 ? 'text-green-600' : 'text-gray-500'}>
                      {p.diferencia > 0 ? '+' : ''}{formatNumber(p.diferencia, 4)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 px-3 text-xs text-gray-500">
            {precios.length} precio{precios.length > 1 ? 's' : ''} se actualizarán
          </div>
        </div>
      )}
    </Modal>
  )
}
