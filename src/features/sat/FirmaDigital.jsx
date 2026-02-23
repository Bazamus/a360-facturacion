import { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui'
import { Eraser, Save, Pen } from 'lucide-react'

export function FirmaDigital({ label = 'Firma', value, onChange, disabled = false }) {
  const sigRef = useRef(null)
  const [isEmpty, setIsEmpty] = useState(!value)

  const handleClear = () => {
    sigRef.current?.clear()
    setIsEmpty(true)
    onChange?.(null)
  }

  const handleSave = () => {
    if (sigRef.current?.isEmpty()) return
    const dataUrl = sigRef.current.toDataURL('image/png')
    onChange?.(dataUrl)
    setIsEmpty(false)
  }

  if (disabled && value) {
    return (
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
        <div className="border border-gray-200 rounded-lg bg-gray-50 p-2">
          <img src={value} alt={label} className="max-h-32 mx-auto" />
        </div>
      </div>
    )
  }

  if (disabled && !value) {
    return (
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
        <div className="border border-dashed border-gray-300 rounded-lg bg-gray-50 p-6 text-center">
          <Pen className="h-5 w-5 text-gray-400 mx-auto mb-1" />
          <p className="text-xs text-gray-400">Sin firma</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
        <SignatureCanvas
          ref={sigRef}
          penColor="black"
          canvasProps={{
            className: 'w-full',
            style: { width: '100%', height: 150 },
          }}
          onBegin={() => setIsEmpty(false)}
        />
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Button variant="secondary" type="button" onClick={handleClear} className="text-xs">
          <Eraser className="h-3.5 w-3.5 mr-1" />
          Limpiar
        </Button>
        <Button variant="primary" type="button" onClick={handleSave} disabled={isEmpty} className="text-xs">
          <Save className="h-3.5 w-3.5 mr-1" />
          Guardar firma
        </Button>
        {value && (
          <span className="text-xs text-green-600 ml-auto">Firma guardada</span>
        )}
      </div>
    </div>
  )
}
