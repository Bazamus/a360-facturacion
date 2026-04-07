import React, { useState } from 'react'
import { Info } from 'lucide-react'
import { Modal, Button } from '@/components/ui'

export function ModalExportarContadores({
  isOpen,
  onClose,
  onExport,
  total = 0,
  totalSeleccionados = 0,
  isExporting = false
}) {
  const [soloSeleccionados, setSoloSeleccionados] = useState(false)

  const canSoloSeleccionados = totalSeleccionados > 0

  const handleExport = () => {
    onExport({ soloSeleccionados: canSoloSeleccionados ? soloSeleccionados : false })
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Exportar Contadores a Excel" size="lg">
      <div className="space-y-6">
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">
              Se exportarán {canSoloSeleccionados && soloSeleccionados ? totalSeleccionados : total} contadores
            </p>
            <p className="text-blue-700">
              La exportación incluye las columnas del listado: Nº serie, comunidad, ubicación, conceptos, cliente y estado.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className={`flex items-center gap-2 ${canSoloSeleccionados ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
            <input
              type="checkbox"
              checked={soloSeleccionados}
              onChange={(e) => setSoloSeleccionados(e.target.checked)}
              disabled={!canSoloSeleccionados || isExporting}
              className="rounded"
            />
            <span className="text-sm text-gray-700">
              Exportar solo seleccionados ({totalSeleccionados})
            </span>
          </label>
          {!canSoloSeleccionados && (
            <p className="text-xs text-gray-500">
              Selecciona uno o más contadores en la tabla para habilitar esta opción.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={isExporting || total === 0}>
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

