import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle } from 'lucide-react'
import { formatNumber, cn } from '@/lib/utils'

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
        <div className="flex flex-col gap-3 w-full">
          {/* Toggle recalcular — prominente */}
          {facturasAfectadas > 0 && (
            <div className={cn(
              'flex items-center gap-3 rounded-lg px-4 py-3 border transition-colors',
              recalcularFacturas
                ? 'bg-primary-50 border-primary-300'
                : 'bg-amber-50 border-amber-200'
            )}>
              <input
                type="checkbox"
                id="recalcular-toggle"
                checked={recalcularFacturas}
                onChange={(e) => onToggleRecalcular(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="recalcular-toggle" className="flex-1 text-sm cursor-pointer">
                <span className="font-medium text-gray-900">
                  Aplicar también a facturas existentes
                </span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  {facturasAfectadas} factura{facturasAfectadas > 1 ? 's' : ''} en borrador/emitida no enviada{facturasAfectadas > 1 ? 's' : ''} se recalcularán con los nuevos precios
                </span>
              </label>
              <Badge variant={recalcularFacturas ? 'success' : 'warning'}>
                {facturasAfectadas}
              </Badge>
            </div>
          )}
          {/* Botones */}
          <div className="flex items-center justify-end gap-2">
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
