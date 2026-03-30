import { useState, useRef } from 'react'
import { Camera, Trash2, X, ZoomIn, Upload } from 'lucide-react'
import { useSubirFotoSAT, useEliminarFotoSAT } from '@/hooks/useStorageSAT'
import { Button, Modal } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'

export function FotosIntervencion({ intervencionId, fotos = [], editable = true }) {
  const subirFoto = useSubirFotoSAT()
  const eliminarFoto = useEliminarFotoSAT()
  const toast = useToast()
  const inputRef = useRef(null)
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const [eliminando, setEliminando] = useState(null)

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} no es una imagen válida`)
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} supera el límite de 10MB`)
        continue
      }
      try {
        await subirFoto.mutateAsync({ intervencionId, file })
        toast.success('Foto subida correctamente')
      } catch (err) {
        toast.error(`Error subiendo ${file.name}: ${err.message}`)
      }
    }

    // Limpiar input para permitir subir el mismo archivo de nuevo
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleEliminar = async (fotoUrl) => {
    setEliminando(fotoUrl)
    try {
      await eliminarFoto.mutateAsync({ intervencionId, fotoUrl })
      toast.success('Foto eliminada')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setEliminando(null)
    }
  }

  return (
    <div>
      {/* Botón de subida */}
      {editable && (
        <div className="mb-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            loading={subirFoto.isPending}
          >
            <Upload className="h-4 w-4 mr-2" />
            Subir fotos
          </Button>
          <span className="text-xs text-gray-500 ml-3">Máx. 10MB por imagen</span>
        </div>
      )}

      {/* Galería */}
      {fotos.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Camera className="h-10 w-10 mx-auto mb-2" />
          <p className="text-sm">No hay fotos registradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {fotos.map((url, idx) => (
            <div key={idx} className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square">
              <img
                src={url}
                alt={`Foto ${idx + 1}`}
                className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                onClick={() => setLightboxUrl(url)}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <button
                className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                onClick={() => setLightboxUrl(url)}
              >
                <ZoomIn className="h-3.5 w-3.5 text-gray-700" />
              </button>
              {editable && (
                <button
                  className="absolute bottom-2 right-2 p-1.5 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  onClick={() => handleEliminar(url)}
                  disabled={eliminando === url}
                >
                  <Trash2 className="h-3.5 w-3.5 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/40"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <img
            src={lightboxUrl}
            alt="Vista ampliada"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
