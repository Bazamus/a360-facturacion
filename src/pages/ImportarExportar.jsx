/**
 * Página de Importar/Exportar Datos
 * Sistema de Facturación A360
 */

import React from 'react'
import { ArrowLeft, Database, FileSpreadsheet, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, Card, Breadcrumb } from '@/components/ui'
import { ImportExportPanel } from '@/features/importacion'

export default function ImportarExportarPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: 'Configuración', href: '/configuracion' },
          { label: 'Importar/Exportar Datos' }
        ]} 
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/configuracion">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-6 h-6 text-blue-600" />
              Importar/Exportar Datos
            </h1>
            <p className="text-gray-500 mt-1">
              Gestiona la importación y exportación masiva de datos
            </p>
          </div>
        </div>
      </div>

      {/* Información */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">¿Cómo funciona?</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Descarga una <strong>plantilla Excel</strong> con el formato correcto</li>
              <li>Rellena los datos siguiendo las instrucciones incluidas</li>
              <li>Sube el archivo para <strong>validar</strong> los datos antes de importar</li>
              <li>Los registros existentes se <strong>actualizarán</strong> automáticamente</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Panel principal */}
      <ImportExportPanel />

      {/* Ayuda */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-700 mb-2">Campos comunes entre entidades</p>
            <p>
              Al importar <strong>Clientes</strong> o <strong>Contadores</strong>, puedes especificar la ubicación
              usando estos campos de referencia:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Código Comunidad:</strong> El código único de la comunidad (ej: TROYA40)</li>
              <li><strong>Portal:</strong> Nombre del portal/bloque dentro de la comunidad</li>
              <li><strong>Vivienda:</strong> Nombre de la vivienda dentro del portal</li>
            </ul>
            <p className="mt-2 text-gray-500">
              Asegúrate de que las comunidades, portales y viviendas existan antes de importar clientes o contadores.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

export { ImportarExportarPage }
