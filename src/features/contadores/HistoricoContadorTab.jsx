import { useState } from 'react'
import { ChevronDown, ChevronRight, ArrowRight, RefreshCw, Edit3, User, Clock } from 'lucide-react'
import { Badge, EmptyState, LoadingSpinner } from '@/components/ui'
import { useHistorialCambiosContador, useHistorialLecturasContador } from '@/hooks'
import { formatDate, formatNumber } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function UsuarioLabel({ email, nombre }) {
  const display = nombre || email || 'Sistema'
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <User className="w-3 h-3" />
      {display}
    </span>
  )
}

function FechaLabel({ fecha }) {
  if (!fecha) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <Clock className="w-3 h-3" />
      {formatDate(fecha)}
    </span>
  )
}

// ─── Sección 1: Cambios de número de serie ────────────────────────────────────

function FilaCambioSerie({ cambio }) {
  const [expandido, setExpandido] = useState(false)
  const esCorreccion = cambio.tipo_cambio === 'correccion_serie'
  const tieneConceptos = cambio.conceptos_reseteados &&
    Array.isArray(cambio.conceptos_reseteados) &&
    cambio.conceptos_reseteados.length > 0

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-start gap-4 px-4 py-3 bg-white">
        {/* Icono tipo */}
        <div className={[
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5',
          esCorreccion ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
        ].join(' ')}>
          {esCorreccion
            ? <Edit3 className="w-4 h-4" />
            : <RefreshCw className="w-4 h-4" />
          }
        </div>

        {/* Contenido principal */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant={esCorreccion ? 'info' : 'warning'} className="text-xs">
              {esCorreccion ? 'Corrección de serie' : 'Sustitución de equipo'}
            </Badge>
            {!cambio.conserva_lecturas && (
              <Badge variant="danger" className="text-xs">Lecturas reseteadas</Badge>
            )}
          </div>

          {/* Serie anterior → nueva */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono text-gray-400 line-through">
              {cambio.numero_serie_anterior}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="font-mono font-semibold text-gray-900">
              {cambio.numero_serie_nuevo}
            </span>
          </div>

          {/* Datos del equipo si hay cambios */}
          {!esCorreccion && (
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
              {cambio.marca_nueva && cambio.marca_nueva !== cambio.marca_anterior && (
                <span>Marca: <span className="line-through">{cambio.marca_anterior || '—'}</span> → <strong>{cambio.marca_nueva}</strong></span>
              )}
              {cambio.modelo_nueva && cambio.modelo_nueva !== cambio.modelo_anterior && (
                <span>Modelo: <span className="line-through">{cambio.modelo_anterior || '—'}</span> → <strong>{cambio.modelo_nueva}</strong></span>
              )}
              {cambio.fecha_instalacion_nueva && cambio.fecha_instalacion_nueva !== cambio.fecha_instalacion_anterior && (
                <span>Instalación: <strong>{formatDate(cambio.fecha_instalacion_nueva)}</strong></span>
              )}
            </div>
          )}

          {cambio.motivo && (
            <p className="mt-1 text-xs text-gray-500 italic">"{cambio.motivo}"</p>
          )}

          <div className="flex items-center gap-3 mt-1.5">
            <FechaLabel fecha={cambio.created_at} />
            <UsuarioLabel email={cambio.usuario_email} nombre={cambio.usuario_nombre} />
          </div>
        </div>

        {/* Expandir conceptos reseteados */}
        {tieneConceptos && (
          <button
            type="button"
            onClick={() => setExpandido(!expandido)}
            className="flex-shrink-0 flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 mt-1"
          >
            {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {cambio.conceptos_reseteados.length} concepto(s)
          </button>
        )}
      </div>

      {/* Detalle de conceptos reseteados */}
      {tieneConceptos && expandido && (
        <div className="border-t border-orange-100 bg-orange-50 px-4 py-3">
          <p className="text-xs font-semibold text-orange-700 mb-2 uppercase tracking-wide">
            Lecturas reseteadas
          </p>
          <div className="space-y-1.5">
            {cambio.conceptos_reseteados.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="font-mono text-xs">
                    {c.concepto_codigo}
                  </Badge>
                  <span className="text-gray-700">{c.concepto_nombre}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-gray-400 line-through">{formatNumber(c.lectura_anterior)}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                  <span className="font-medium">{formatNumber(c.lectura_nueva)}</span>
                  <span className="text-xs text-gray-400">({formatDate(c.fecha_nueva)})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SeccionCambiosSerie({ contadorId }) {
  const { data, isLoading, error } = useHistorialCambiosContador(contadorId)

  if (isLoading) return <LoadingSpinner />
  if (error) return (
    <p className="text-sm text-red-600">Error al cargar el historial: {error.message}</p>
  )

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="Sin cambios de número de serie"
        description="No se han registrado cambios de número de serie para este contador."
        className="py-8"
      />
    )
  }

  return (
    <div className="space-y-2">
      {data.map((cambio) => (
        <FilaCambioSerie key={cambio.id} cambio={cambio} />
      ))}
    </div>
  )
}

// ─── Sección 2: Cambios en lecturas ──────────────────────────────────────────

const LABELS_CAMPO = {
  lectura_inicial:      'Lectura inicial',
  fecha_lectura_inicial: 'Fecha lectura inicial',
  ambos:                'Lectura inicial + fecha'
}

function FilaCambioLectura({ registro }) {
  return (
    <div className="flex items-start gap-4 px-4 py-3 border border-gray-200 rounded-lg bg-white">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mt-0.5">
        <Edit3 className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Badge variant="default" className="font-mono text-xs">
            {registro.concepto_codigo}
          </Badge>
          <span className="text-sm font-medium text-gray-900">{registro.concepto_nombre}</span>
          <Badge variant="info" className="text-xs">
            {LABELS_CAMPO[registro.campo_modificado] || registro.campo_modificado}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          {(registro.campo_modificado === 'lectura_inicial' || registro.campo_modificado === 'ambos') && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 text-xs">Lectura:</span>
              <span className="text-gray-400 line-through text-xs">
                {formatNumber(registro.valor_anterior_lectura)}
              </span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="font-medium text-gray-900">
                {formatNumber(registro.valor_nuevo_lectura)}
              </span>
            </div>
          )}
          {(registro.campo_modificado === 'fecha_lectura_inicial' || registro.campo_modificado === 'ambos') && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 text-xs">Fecha:</span>
              <span className="text-gray-400 line-through text-xs">
                {formatDate(registro.valor_anterior_fecha)}
              </span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="font-medium text-gray-900">
                {formatDate(registro.valor_nuevo_fecha)}
              </span>
            </div>
          )}
        </div>

        {registro.motivo && (
          <p className="mt-1 text-xs text-gray-500 italic">"{registro.motivo}"</p>
        )}

        <div className="flex items-center gap-3 mt-1.5">
          <FechaLabel fecha={registro.created_at} />
          <UsuarioLabel email={registro.usuario_email} nombre={registro.usuario_nombre} />
        </div>
      </div>
    </div>
  )
}

function SeccionCambiosLecturas({ contadorId }) {
  const { data, isLoading, error } = useHistorialLecturasContador(contadorId)

  if (isLoading) return <LoadingSpinner />
  if (error) return (
    <p className="text-sm text-red-600">Error al cargar el historial: {error.message}</p>
  )

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="Sin cambios en lecturas"
        description="No se han registrado modificaciones en lecturas para este contador."
        className="py-8"
      />
    )
  }

  return (
    <div className="space-y-2">
      {data.map((registro) => (
        <FilaCambioLectura key={registro.id} registro={registro} />
      ))}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function HistoricoContadorTab({ contador }) {
  return (
    <div className="space-y-8">
      {/* Cambios de número de serie */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">
            Cambios de número de serie
          </h3>
        </div>
        <SeccionCambiosSerie contadorId={contador.id} />
      </div>

      {/* Cambios en lecturas */}
      <div className="border-t pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Edit3 className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">
            Cambios en lecturas iniciales
          </h3>
        </div>
        <SeccionCambiosLecturas contadorId={contador.id} />
      </div>
    </div>
  )
}
