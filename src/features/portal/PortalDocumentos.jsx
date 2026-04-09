import { useState } from 'react'
import { usePortalFacturas, usePortalIntervenciones, usePortalContratos } from '@/hooks/usePortal'
import { Card, CardContent, Badge, LoadingSpinner, EmptyState } from '@/components/ui'
import { FolderOpen, FileText, Wrench, Calendar, Download, ExternalLink, Eye } from 'lucide-react'

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
}

const TABS = [
  { id: 'facturas', label: 'Facturas', icon: FileText },
  { id: 'partes', label: 'Partes de trabajo', icon: Wrench },
  { id: 'contratos', label: 'Contratos', icon: Calendar },
]

// ---- Facturas tab ----
function TabFacturas() {
  const { data: resultado, isLoading } = usePortalFacturas({ pageSize: 50 })
  const facturas = resultado?.data ?? []

  if (isLoading) return <div className="py-12 flex justify-center"><LoadingSpinner size="lg" /></div>
  if (!facturas.length) return (
    <EmptyState icon={FileText} title="Sin facturas" description="No hay facturas disponibles" />
  )

  return (
    <div className="divide-y divide-gray-100">
      {facturas.map((f) => (
        <div key={f.id} className="px-4 py-3.5 flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="h-4 w-4 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{f.numero_factura}</p>
            <p className="text-xs text-gray-500">{formatDate(f.fecha_emision)}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-sm font-semibold text-gray-900">
              {f.total != null ? `${Number(f.total).toFixed(2)} €` : '—'}
            </span>
            <Badge
              variant={f.estado_pago === 'pagada' ? 'success' : f.estado_pago === 'pendiente' ? 'warning' : 'default'}
              className="text-[10px] capitalize"
            >
              {f.estado_pago}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- Partes de trabajo tab ----
function TabPartes() {
  const { data: intervenciones, isLoading } = usePortalIntervenciones()
  const conParte = (intervenciones ?? []).filter((i) => i.parte_trabajo_url)

  if (isLoading) return <div className="py-12 flex justify-center"><LoadingSpinner size="lg" /></div>
  if (!conParte.length) return (
    <EmptyState icon={Wrench} title="Sin partes" description="No hay partes de trabajo disponibles" />
  )

  return (
    <div className="divide-y divide-gray-100">
      {conParte.map((i) => (
        <div key={i.id} className="px-4 py-3.5 flex items-center gap-3">
          <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Wrench className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{i.titulo}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <span className="font-mono">{i.numero_parte}</span>
              <span>·</span>
              <span>{formatDate(i.fecha_solicitud)}</span>
            </p>
          </div>
          <a
            href={i.parte_trabajo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 transition-colors flex-shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Descargar
          </a>
        </div>
      ))}
    </div>
  )
}

// ---- Contratos tab ----
function TabContratos() {
  const { data: contratos, isLoading } = usePortalContratos()

  if (isLoading) return <div className="py-12 flex justify-center"><LoadingSpinner size="lg" /></div>
  if (!contratos?.length) return (
    <EmptyState icon={Calendar} title="Sin contratos" description="No tienes contratos de mantenimiento activos" />
  )

  const ESTADO_COLORS = {
    activo: 'bg-green-50 text-green-700 border-green-200',
    vencido: 'bg-red-50 text-red-700 border-red-200',
    pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelado: 'bg-gray-50 text-gray-500 border-gray-200',
  }

  return (
    <div className="divide-y divide-gray-100">
      {contratos.map((c) => (
        <div key={c.id} className="px-4 py-3.5 flex items-start gap-3">
          <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Calendar className="h-4 w-4 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-gray-900">{c.titulo}</p>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${ESTADO_COLORS[c.estado] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                {c.estado}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {c.numero_contrato && <span className="font-mono mr-2">{c.numero_contrato}</span>}
              {formatDate(c.fecha_inicio)} — {formatDate(c.fecha_fin)}
            </p>
            <p className="text-xs text-gray-400 capitalize">{c.tipo} · {c.periodicidad}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function PortalDocumentos() {
  const [tab, setTab] = useState('facturas')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary-600" />
          Mis Documentos
        </h1>
        <p className="text-sm text-gray-500">Facturas, partes de trabajo y contratos</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      <Card>
        {tab === 'facturas' && <TabFacturas />}
        {tab === 'partes' && <TabPartes />}
        {tab === 'contratos' && <TabContratos />}
      </Card>
    </div>
  )
}
