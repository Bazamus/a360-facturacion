import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { generarParteTrabajoPDF } from '@/features/sat/pdf/generarParteTrabajo'

const BUCKET = 'sat-partes'

/**
 * Genera el PDF del parte de trabajo, lo sube a Supabase Storage
 * y guarda la URL en intervenciones.parte_trabajo_url
 */
export function useGenerarParteTrabajo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ intervencion, materiales = [] }) => {
      if (!intervencion?.id) throw new Error('ID de intervención requerido')

      // 1. Generar PDF
      const blob = await generarParteTrabajoPDF(intervencion, materiales)

      // 2. Subir a Storage
      const fileName = `${intervencion.id}/PT-${intervencion.numero_parte || intervencion.id}.pdf`

      // Eliminar versión anterior si existe
      await supabase.storage.from(BUCKET).remove([fileName])

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, blob, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) throw uploadError

      // 3. Obtener URL pública
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName)
      const parteUrl = urlData.publicUrl

      // 4. Guardar URL en la intervención
      const { error: updateError } = await supabase
        .from('intervenciones')
        .update({ parte_trabajo_url: parteUrl })
        .eq('id', intervencion.id)

      if (updateError) throw updateError

      return parteUrl
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['intervencion', variables.intervencion.id] })
      queryClient.invalidateQueries({ queryKey: ['intervenciones'] })
    },
  })
}

/**
 * Descarga directamente el parte de trabajo como PDF sin subir a Storage
 * (útil para vista previa o reimpresión)
 */
export function useDescargarParteTrabajo() {
  return useMutation({
    mutationFn: async ({ intervencion, materiales = [] }) => {
      const blob = await generarParteTrabajoPDF(intervencion, materiales)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `PT-${intervencion.numero_parte || intervencion.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      return true
    },
  })
}
