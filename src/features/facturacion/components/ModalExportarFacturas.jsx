import React, { useState } from 'react'
import { FileSpreadsheet, Info } from 'lucide-react'
import { Modal, Button } from '@/components/ui'

/**
 * Modal de configuración para exportar facturas a Excel
 */
export function ModalExportarFacturas({
  isOpen,
  onClose,
  onExport,
  totalFacturas = 0,
  isExporting = false
}) {
  const [config, setConfig] = useState({
    // Formato de exportación
    formato: 'completo', // 'resumen' | 'completo' | 'detallado'

    // Columnas adicionales
    columnasAdicionales: {
      direccion: false,
      email: false,
      iban: false,
      numeroContador: false,
      ubicacion: false
    },

    // Formato de números
    formatoNumeros: 'espanol', // 'espanol' | 'internacional'

    // Opciones avanzadas
    formatoAvanzado: true, // Colores, filtros, etc.
  })

  const handleExport = () => {
    onExport(config)
  }

  const handleChangeFormato = (formato) => {
    setConfig(prev => ({ ...prev, formato }))
  }

  const handleToggleColumna = (columna) => {
    setConfig(prev => ({
      ...prev,
      columnasAdicionales: {
        ...prev.columnasAdicionales,
        [columna]: !prev.columnasAdicionales[columna]
      }
    }))
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Exportar Facturas a Excel"
      size="lg"
    >
      <div className="space-y-6">
        {/* Información */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Se exportarán {totalFacturas} facturas</p>
            <p className="text-blue-700">
              Las facturas exportadas respetarán los filtros aplicados actualmente en la tabla.
            </p>
          </div>
        </div>

        {/* Formato de exportación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Formato de exportación
          </label>
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="formato"
                value="resumen"
                checked={config.formato === 'resumen'}
                onChange={(e) => handleChangeFormato(e.target.value)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Resumen (solo totales)</div>
                <div className="text-sm text-gray-500">
                  Una fila por factura con datos generales. Ideal para contabilidad.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border-2 border-blue-500 bg-blue-50 rounded-lg cursor-pointer">
              <input
                type="radio"
                name="formato"
                value="completo"
                checked={config.formato === 'completo'}
                onChange={(e) => handleChangeFormato(e.target.value)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">Completo (2 pestañas)</span>
                  <span className="px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded">
                    Recomendado
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Pestaña 1: Facturas + Pestaña 2: Detalles de consumo. Estructura normalizada.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="formato"
                value="detallado"
                checked={config.formato === 'detallado'}
                onChange={(e) => handleChangeFormato(e.target.value)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Detallado (1 pestaña)</div>
                <div className="text-sm text-gray-500">
                  Todas las líneas de todas las facturas en una tabla. Ideal para análisis con tablas dinámicas.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Columnas adicionales */}
        {(config.formato === 'resumen' || config.formato === 'completo') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Columnas adicionales
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.columnasAdicionales.direccion}
                  onChange={() => handleToggleColumna('direccion')}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Dirección cliente</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.columnasAdicionales.email}
                  onChange={() => handleToggleColumna('email')}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Email cliente</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.columnasAdicionales.iban}
                  onChange={() => handleToggleColumna('iban')}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">IBAN cliente</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.columnasAdicionales.numeroContador}
                  onChange={() => handleToggleColumna('numeroContador')}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Número contador</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.columnasAdicionales.ubicacion}
                  onChange={() => handleToggleColumna('ubicacion')}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Ubicación</span>
              </label>
            </div>
          </div>
        )}

        {/* Formato de números */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Formato de números
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="formatoNumeros"
                value="espanol"
                checked={config.formatoNumeros === 'espanol'}
                onChange={(e) => setConfig(prev => ({ ...prev, formatoNumeros: e.target.value }))}
              />
              <span className="text-sm text-gray-700">Español (1.234,56)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="formatoNumeros"
                value="internacional"
                checked={config.formatoNumeros === 'internacional'}
                onChange={(e) => setConfig(prev => ({ ...prev, formatoNumeros: e.target.value }))}
              />
              <span className="text-sm text-gray-700">Internacional (1,234.56)</span>
            </label>
          </div>
        </div>

        {/* Formato avanzado */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.formatoAvanzado}
              onChange={(e) => setConfig(prev => ({ ...prev, formatoAvanzado: e.target.checked }))}
              className="rounded"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Formato Excel avanzado</span>
              <p className="text-xs text-gray-500">
                Incluye colores, filtros automáticos, congelación de paneles y anchos optimizados
              </p>
            </div>
          </label>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || totalFacturas === 0}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
