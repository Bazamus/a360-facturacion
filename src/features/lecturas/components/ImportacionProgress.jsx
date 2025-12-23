/**
 * Componente ImportacionProgress para mostrar el progreso del procesamiento
 * Sistema de Facturación A360
 */

import React from 'react'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export function ImportacionProgress({ estado, progreso, stats, error }) {
  const porcentaje = progreso.total > 0 
    ? Math.round((progreso.current / progreso.total) * 100) 
    : 0

  return (
    <div className="space-y-4">
      {/* Barra de progreso */}
      {(estado === 'processing' || estado === 'analyzing') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-primary-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              {estado === 'analyzing' ? 'Analizando archivo...' : 'Procesando lecturas...'}
            </span>
            <span className="text-gray-600">
              {progreso.current} / {progreso.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>
      )}

      {/* Estado completado */}
      {estado === 'completed' && stats && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700 font-medium mb-3">
            <CheckCircle className="w-5 h-5" />
            <span>Procesamiento completado</span>
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label="Total lecturas"
              value={stats.total}
              color="gray"
            />
            <StatCard
              label="Válidas"
              value={stats.validas}
              color="green"
            />
            <StatCard
              label="Con alertas"
              value={stats.conAlertas}
              color="amber"
            />
            <StatCard
              label="Errores"
              value={stats.errores}
              color="red"
            />
          </div>

          <div className="mt-3 text-sm text-gray-600">
            <span className="font-medium">{stats.contadoresUnicos}</span> contadores procesados • 
            Conceptos: <span className="font-medium">{stats.conceptosEncontrados.join(', ')}</span>
          </div>
        </div>
      )}

      {/* Estado de error */}
      {estado === 'error' && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700 font-medium">
            <XCircle className="w-5 h-5" />
            <span>Error en el procesamiento</span>
          </div>
          <p className="mt-2 text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-800',
    green: 'bg-green-100 text-green-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800'
  }

  return (
    <div className={`rounded-lg p-3 text-center ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-80">{label}</p>
    </div>
  )
}

export default ImportacionProgress



