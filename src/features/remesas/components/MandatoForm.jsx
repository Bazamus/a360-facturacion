import { useState, useEffect } from 'react'
import { Button, Input } from '../../../components/ui'
import { validarIBAN, formatearIBAN, obtenerBIC, obtenerNombreBanco } from '../../../lib/validators/iban'
import { AlertTriangle, CheckCircle } from 'lucide-react'

export function MandatoForm({ 
  cliente, 
  mandatoActual,
  onGuardar, 
  onCancelar,
  isLoading 
}) {
  const [formData, setFormData] = useState({
    iban: mandatoActual?.iban || '',
    bic: mandatoActual?.bic || '',
    titular_cuenta: mandatoActual?.titular_cuenta || `${cliente?.nombre || ''} ${cliente?.apellidos || ''}`.trim(),
    fecha_firma: mandatoActual?.fecha_firma || new Date().toISOString().split('T')[0]
  })

  const [ibanValidation, setIbanValidation] = useState({ valido: false, error: null })
  const [nombreBanco, setNombreBanco] = useState(null)

  useEffect(() => {
    if (formData.iban.length >= 4) {
      const validation = validarIBAN(formData.iban)
      setIbanValidation(validation)

      if (validation.valido) {
        const bic = obtenerBIC(formData.iban)
        const banco = obtenerNombreBanco(formData.iban)
        
        if (bic && !formData.bic) {
          setFormData(prev => ({ ...prev, bic }))
        }
        setNombreBanco(banco)
      } else {
        setNombreBanco(null)
      }
    } else {
      setIbanValidation({ valido: false, error: null })
      setNombreBanco(null)
    }
  }, [formData.iban])

  const handleChange = (field, value) => {
    if (field === 'iban') {
      // Formatear IBAN mientras escribe
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    }
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!ibanValidation.valido) {
      return
    }

    onGuardar({
      ...formData,
      iban: formData.iban.replace(/\s/g, ''),
      cliente_id: cliente.id
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          IBAN *
        </label>
        <div className="relative">
          <Input
            value={formatearIBAN(formData.iban)}
            onChange={(e) => handleChange('iban', e.target.value)}
            placeholder="ES00 0000 0000 0000 0000 0000"
            className={`font-mono ${
              formData.iban.length > 10 
                ? ibanValidation.valido 
                  ? 'border-green-500' 
                  : 'border-red-500'
                : ''
            }`}
            maxLength={34}
          />
          {formData.iban.length > 10 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {ibanValidation.valido ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
            </div>
          )}
        </div>
        {ibanValidation.error && (
          <p className="text-sm text-red-600 mt-1">{ibanValidation.error}</p>
        )}
        {nombreBanco && (
          <p className="text-sm text-gray-500 mt-1">{nombreBanco}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          BIC/SWIFT
        </label>
        <Input
          value={formData.bic}
          onChange={(e) => handleChange('bic', e.target.value.toUpperCase())}
          placeholder="CAIXESBBXXX"
          className="font-mono"
          maxLength={11}
        />
        <p className="text-xs text-gray-500 mt-1">
          Se auto-completa para bancos españoles
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Titular de la cuenta *
        </label>
        <Input
          value={formData.titular_cuenta}
          onChange={(e) => handleChange('titular_cuenta', e.target.value)}
          placeholder="Nombre completo del titular"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fecha de firma del mandato *
        </label>
        <Input
          type="date"
          value={formData.fecha_firma}
          onChange={(e) => handleChange('fecha_firma', e.target.value)}
          max={new Date().toISOString().split('T')[0]}
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
        <p className="font-medium mb-1">Importante:</p>
        <p>
          El mandato SEPA debe estar firmado físicamente por el cliente 
          antes de poder realizar cargos en su cuenta.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={!ibanValidation.valido || !formData.titular_cuenta || isLoading}
        >
          {isLoading ? 'Guardando...' : mandatoActual ? 'Actualizar' : 'Crear Mandato'}
        </Button>
      </div>
    </form>
  )
}



