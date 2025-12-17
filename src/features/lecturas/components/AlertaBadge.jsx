import React from 'react'
import { cn } from '@/lib/utils'

const severityStyles = {
  error: 'bg-red-100 text-red-800 border-red-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200'
}

const severityIcons = {
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
}

/**
 * Badge para mostrar una alerta
 */
export function AlertaBadge({ alerta, showIcon = true, compact = false }) {
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1 rounded-full border',
        compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        severityStyles[alerta.severidad] || severityStyles.info
      )}
      title={alerta.mensaje}
    >
      {showIcon && (
        <span>{severityIcons[alerta.severidad] || severityIcons.info}</span>
      )}
      {!compact && <span>{alerta.mensaje}</span>}
      {compact && <span>{getAlertaLabel(alerta.tipo)}</span>}
    </span>
  )
}

function getAlertaLabel(tipo) {
  const labels = {
    'lectura_negativa': 'Negativa',
    'consumo_alto': 'Consumo alto',
    'consumo_cero': 'Sin consumo',
    'contador_no_encontrado': 'No encontrado',
    'concepto_no_asignado': 'Sin concepto',
    'cliente_bloqueado': 'Bloqueado',
    'fecha_futura': 'Fecha futura',
    'fecha_anterior': 'Fecha anterior',
    'lectura_duplicada': 'Duplicada',
    'formato_invalido': 'Formato'
  }
  return labels[tipo] || tipo
}

/**
 * Lista de badges de alertas
 */
export function AlertasList({ alertas = [], compact = false }) {
  if (!alertas || alertas.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-1', compact && 'max-w-xs')}>
      {alertas.map((alerta, index) => (
        <AlertaBadge 
          key={`${alerta.tipo}-${index}`} 
          alerta={alerta} 
          compact={compact}
        />
      ))}
    </div>
  )
}



