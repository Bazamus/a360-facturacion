import { useNavigate } from 'react-router-dom'
import { Modal, Badge, Button } from '@/components/ui'
import {
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  ExternalLink,
  AlertTriangle,
  Building2,
} from 'lucide-react'
import { useCliente } from '@/hooks/useClientes'

/* ── Modal de vista rápida del cliente ─────────────────────── */

export function ClienteQuickViewModal({ clienteId, open, onClose }) {
  const navigate = useNavigate()
  const { data: cliente, isLoading, error } = useCliente(clienteId)

  function handleVerDetalle() {
    onClose()
    navigate(`/clientes/${clienteId}`)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isLoading ? 'Cargando...' : (cliente ? `${cliente.nombre} ${cliente.apellidos}` : 'Cliente')}
      description={cliente?.nif ? `NIF: ${cliente.nif}` : undefined}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={handleVerDetalle}>
            <ExternalLink className="h-4 w-4 mr-1.5" />
            Ver detalle completo
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-20 mb-1.5" />
              <div className="h-4 bg-gray-200 rounded w-48" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          Error al cargar el cliente
        </div>
      ) : cliente ? (
        <div className="space-y-5">
          {/* Estado + Tipo */}
          <div className="flex items-center gap-2 flex-wrap">
            {cliente.estado && (
              <Badge
                style={cliente.estado.color ? { backgroundColor: cliente.estado.color, color: '#fff' } : undefined}
                variant={!cliente.estado.color ? 'primary' : undefined}
              >
                {cliente.estado.nombre}
              </Badge>
            )}
            {cliente.tipo && (
              <Badge variant="default">
                {cliente.tipo === 'propietario' ? 'Propietario' : 'Inquilino'}
              </Badge>
            )}
            {cliente.bloqueado && (
              <Badge variant="danger" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Bloqueado
              </Badge>
            )}
          </div>

          {/* Bloqueo motivo */}
          {cliente.bloqueado && cliente.motivo_bloqueo && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {cliente.motivo_bloqueo}
            </div>
          )}

          {/* Contacto */}
          <Section icon={Phone} title="Contacto">
            <InfoRow label="Teléfono" value={cliente.telefono} />
            {cliente.telefono_secundario && (
              <InfoRow label="Tel. secundario" value={cliente.telefono_secundario} />
            )}
            {cliente.email && (
              <InfoRow
                label="Email"
                value={
                  <a
                    href={`mailto:${cliente.email}`}
                    className="text-primary-600 hover:underline"
                  >
                    {cliente.email}
                  </a>
                }
              />
            )}
          </Section>

          {/* Ubicación actual */}
          {(() => {
            const ubicActual = cliente.ubicaciones_clientes?.find((uc) => uc.es_actual)
            if (!ubicActual?.ubicacion) return null
            const ub = ubicActual.ubicacion
            const comunidad = ub.agrupacion?.comunidad?.nombre
            const agrupacion = ub.agrupacion?.nombre
            return (
              <Section icon={Building2} title="Ubicación actual">
                <InfoRow label="Comunidad" value={comunidad} />
                {agrupacion && <InfoRow label="Agrupación" value={agrupacion} />}
                <InfoRow label="Ubicación" value={ub.nombre} />
                <InfoRow
                  label="Desde"
                  value={
                    ubicActual.fecha_inicio
                      ? new Date(ubicActual.fecha_inicio).toLocaleDateString('es-ES')
                      : '—'
                  }
                />
              </Section>
            )
          })()}

          {/* Dirección */}
          {cliente.direccion_correspondencia && (
            <Section icon={MapPin} title="Dirección">
              <p className="text-sm text-gray-700">
                {cliente.direccion_correspondencia}
                {cliente.cp_correspondencia && `, ${cliente.cp_correspondencia}`}
                {cliente.ciudad_correspondencia && ` ${cliente.ciudad_correspondencia}`}
                {cliente.provincia_correspondencia && ` (${cliente.provincia_correspondencia})`}
              </p>
            </Section>
          )}

          {/* IBAN */}
          {cliente.iban && (
            <Section icon={CreditCard} title="Datos bancarios">
              <InfoRow label="IBAN" value={formatIban(cliente.iban)} />
              {cliente.titular_cuenta && (
                <InfoRow label="Titular" value={cliente.titular_cuenta} />
              )}
            </Section>
          )}

          {/* Observaciones */}
          {cliente.observaciones && (
            <Section icon={FileText} title="Observaciones">
              <p className="text-sm text-gray-600 whitespace-pre-line line-clamp-4">
                {cliente.observaciones}
              </p>
            </Section>
          )}
        </div>
      ) : null}
    </Modal>
  )
}

/* ── Componentes internos ────────────────────────────────────── */

function Section({ icon: Icon, title, children }) {
  return (
    <div>
      <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h4>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-gray-400 min-w-[100px]">{label}</span>
      <span className="text-sm text-gray-800 font-medium">{value}</span>
    </div>
  )
}

function formatIban(iban) {
  if (!iban) return ''
  const clean = iban.replace(/\s/g, '')
  return clean.replace(/(.{4})/g, '$1 ').trim()
}
