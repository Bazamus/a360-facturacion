import { FacturasEmbedded } from '@/features/facturacion/components/FacturasEmbedded'

export function ComunidadFacturasTab({ comunidad }) {
  return (
    <FacturasEmbedded
      comunidadId={comunidad.id}
      showCliente={true}
    />
  )
}
