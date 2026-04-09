/**
 * Máquina de estados para intervenciones SAT
 * Debe mantenerse sincronizada con trigger_validar_estado_intervencion en DB
 */

export const TRANSICIONES_VALIDAS = {
  pendiente: ['asignada', 'cancelada'],
  asignada: ['programada', 'en_camino', 'cancelada'],
  programada: ['en_camino', 'en_curso', 'asignada', 'cancelada'],
  en_camino: ['en_curso', 'asignada'],
  en_curso: ['completada', 'asignada'],
  completada: ['facturada'],
  cancelada: ['pendiente'],
  facturada: [],
}

/**
 * Comprueba si una transición de estado es válida
 */
export function canTransition(estadoActual, estadoNuevo) {
  if (!estadoActual || !estadoNuevo) return false
  if (estadoActual === estadoNuevo) return true
  return (TRANSICIONES_VALIDAS[estadoActual] || []).includes(estadoNuevo)
}

/**
 * Devuelve los estados válidos desde el estado actual
 */
export function getTransicionesPermitidas(estadoActual) {
  return TRANSICIONES_VALIDAS[estadoActual] || []
}

/**
 * Metadatos de cada estado para la UI
 */
export const ESTADO_CONFIG = {
  pendiente: {
    label: 'Pendiente',
    color: 'warning',
    icon: 'Clock',
    descripcion: 'Esperando asignación de técnico',
  },
  asignada: {
    label: 'Asignada',
    color: 'info',
    icon: 'User',
    descripcion: 'Técnico asignado, pendiente de programar',
  },
  programada: {
    label: 'Programada',
    color: 'info',
    icon: 'Calendar',
    descripcion: 'Cita programada con el cliente',
  },
  en_camino: {
    label: 'En camino',
    color: 'primary',
    icon: 'Truck',
    descripcion: 'Técnico desplazándose al lugar',
  },
  en_curso: {
    label: 'En curso',
    color: 'primary',
    icon: 'Play',
    descripcion: 'Intervención en ejecución',
  },
  completada: {
    label: 'Completada',
    color: 'success',
    icon: 'CheckCircle',
    descripcion: 'Trabajo finalizado, pendiente de facturar',
  },
  facturada: {
    label: 'Facturada',
    color: 'success',
    icon: 'FileText',
    descripcion: 'Intervención cerrada y facturada',
  },
  cancelada: {
    label: 'Cancelada',
    color: 'default',
    icon: 'XCircle',
    descripcion: 'Intervención cancelada',
  },
}
