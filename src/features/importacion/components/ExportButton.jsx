/**
 * Componente ExportButton - Botón de exportación con estados
 * Sistema de Facturación A360
 */

import React, { useState } from 'react'
import { Download, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui'

export function ExportButton({ 
  entidad, 
  onExport, 
  variant = 'outline',
  size = 'default',
  label
}) {
  const [estado, setEstado] = useState('idle') // idle, loading, success
  
  const handleClick = async () => {
    setEstado('loading')
    try {
      await onExport(entidad)
      setEstado('success')
      setTimeout(() => setEstado('idle'), 2000)
    } catch (error) {
      setEstado('idle')
    }
  }

  const getLabel = () => {
    if (label) return label
    switch (entidad) {
      case 'comunidades': return 'Exportar Comunidades'
      case 'clientes': return 'Exportar Clientes'
      case 'contadores': return 'Exportar Contadores'
      default: return 'Exportar'
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={estado === 'loading'}
    >
      {estado === 'loading' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {estado === 'success' && <Check className="w-4 h-4 mr-2 text-green-500" />}
      {estado === 'idle' && <Download className="w-4 h-4 mr-2" />}
      {getLabel()}
    </Button>
  )
}

export default ExportButton

