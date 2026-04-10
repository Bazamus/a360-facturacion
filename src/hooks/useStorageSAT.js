import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { compressImage } from '@/lib/imageUtils'

const BUCKET = 'sat-fotos'
export const MAX_FOTOS = 4

/**
 * Subir foto a Supabase Storage para una intervención.
 * Comprime automáticamente antes de subir (máx 1200×1200, JPEG 0.82).
 */
export function useSubirFotoSAT() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ intervencionId, file }) => {
      // Comprimir antes de subir
      const compressed = await compressImage(file)
      const fileName = `${intervencionId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, compressed, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' })

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(fileName)

      // Añadir URL al array fotos de la intervención
      const { data: intervencion } = await supabase
        .from('intervenciones')
        .select('fotos')
        .eq('id', intervencionId)
        .single()

      const fotosActuales = intervencion?.fotos || []
      const { error: updateError } = await supabase
        .from('intervenciones')
        .update({ fotos: [...fotosActuales, urlData.publicUrl] })
        .eq('id', intervencionId)

      if (updateError) throw updateError

      return urlData.publicUrl
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['intervencion', variables.intervencionId] })
    },
  })
}

/**
 * Eliminar foto de Supabase Storage
 */
export function useEliminarFotoSAT() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ intervencionId, fotoUrl }) => {
      // Extraer path del archivo desde la URL
      const urlParts = fotoUrl.split(`${BUCKET}/`)
      const filePath = urlParts[urlParts.length - 1]

      if (filePath) {
        await supabase.storage.from(BUCKET).remove([filePath])
      }

      // Quitar URL del array fotos
      const { data: intervencion } = await supabase
        .from('intervenciones')
        .select('fotos')
        .eq('id', intervencionId)
        .single()

      const fotosActuales = intervencion?.fotos || []
      const { error } = await supabase
        .from('intervenciones')
        .update({ fotos: fotosActuales.filter((f) => f !== fotoUrl) })
        .eq('id', intervencionId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['intervencion', variables.intervencionId] })
    },
  })
}
