import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Save, AlertTriangle } from 'lucide-react'
import { Button, Input } from '../components/ui'
import { useConfiguracionSEPA, useUpdateConfiguracionSEPA } from '../hooks/useRemesas'
import { validarIBAN, formatearIBAN, obtenerBIC, obtenerNombreBanco } from '../lib/validators/iban'
import { useToast } from '../components/ui/Toast'

// Códigos de rechazo SEPA comunes
const CODIGOS_RECHAZO = [
  { codigo: 'AC01', descripcion: 'Cuenta incorrecta' },
  { codigo: 'AC04', descripcion: 'Cuenta cerrada' },
  { codigo: 'AC06', descripcion: 'Cuenta bloqueada' },
  { codigo: 'AG01', descripcion: 'Transacción no permitida' },
  { codigo: 'AM04', descripcion: 'Fondos insuficientes' },
  { codigo: 'BE04', descripcion: 'Dirección del acreedor incorrecta' },
  { codigo: 'MD01', descripcion: 'Sin mandato válido' },
  { codigo: 'MD02', descripcion: 'Datos del mandato incorrectos' },
  { codigo: 'MS02', descripcion: 'Rechazo por el deudor' },
  { codigo: 'MS03', descripcion: 'Razón no especificada' },
  { codigo: 'SL01', descripcion: 'Servicio no disponible' }
]

export default function ConfiguracionSEPA() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  
  const { data: config, isLoading } = useConfiguracionSEPA()
  const updateMutation = useUpdateConfiguracionSEPA()

  const [formData, setFormData] = useState({
    nombre_acreedor: '',
    cif_acreedor: '',
    identificador_acreedor: '',
    iban_principal: '',
    bic_principal: '',
    nombre_banco: '',
    prefijo_remesa: 'A360-REM',
    prefijo_mandato: 'A360-CLI',
    dias_antelacion_cobro: 5
  })

  const [ibanValidation, setIbanValidation] = useState({ valido: false })
  const [showCodigos, setShowCodigos] = useState(false)

  useEffect(() => {
    if (config) {
      setFormData({
        nombre_acreedor: config.nombre_acreedor || '',
        cif_acreedor: config.cif_acreedor || '',
        identificador_acreedor: config.identificador_acreedor || '',
        iban_principal: config.iban_principal || '',
        bic_principal: config.bic_principal || '',
        nombre_banco: config.nombre_banco || '',
        prefijo_remesa: config.prefijo_remesa || 'A360-REM',
        prefijo_mandato: config.prefijo_mandato || 'A360-CLI',
        dias_antelacion_cobro: config.dias_antelacion_cobro || 5
      })
    }
  }, [config])

  useEffect(() => {
    if (formData.iban_principal && formData.iban_principal.length > 10) {
      const validation = validarIBAN(formData.iban_principal)
      setIbanValidation(validation)

      if (validation.valido) {
        const bic = obtenerBIC(formData.iban_principal)
        const banco = obtenerNombreBanco(formData.iban_principal)
        
        if (bic && !formData.bic_principal) {
          setFormData(prev => ({ ...prev, bic_principal: bic }))
        }
        if (banco && !formData.nombre_banco) {
          setFormData(prev => ({ ...prev, nombre_banco: banco }))
        }
      }
    }
  }, [formData.iban_principal])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!ibanValidation.valido && formData.iban_principal.length > 10) {
      showToast('El IBAN no es válido', 'error')
      return
    }

    try {
      await updateMutation.mutateAsync(formData)
      showToast('Configuración guardada correctamente', 'success')
    } catch (error) {
      showToast(error.message, 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/configuracion')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Configuración SEPA
          </h1>
          <p className="text-gray-500">
            Datos del acreedor para remesas bancarias
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos del acreedor */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Datos del Acreedor
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del acreedor *
              </label>
              <Input
                value={formData.nombre_acreedor}
                onChange={(e) => handleChange('nombre_acreedor', e.target.value)}
                placeholder="A360 SERVICIOS ENERGETICOS SL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CIF *
              </label>
              <Input
                value={formData.cif_acreedor}
                onChange={(e) => handleChange('cif_acreedor', e.target.value.toUpperCase())}
                placeholder="B88313473"
                maxLength={9}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Identificador SEPA *
              </label>
              <Input
                value={formData.identificador_acreedor}
                onChange={(e) => handleChange('identificador_acreedor', e.target.value.toUpperCase())}
                placeholder="ES12000B88313473"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formato: ES + 2 dígitos control + CIF
              </p>
            </div>
          </div>
        </div>

        {/* Cuenta de cobro */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Cuenta de Cobro Principal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IBAN *
              </label>
              <Input
                value={formatearIBAN(formData.iban_principal)}
                onChange={(e) => handleChange('iban_principal', e.target.value.replace(/\s/g, '').toUpperCase())}
                placeholder="ES00 0000 0000 0000 0000 0000"
                className={`font-mono ${
                  formData.iban_principal.length > 10
                    ? ibanValidation.valido 
                      ? 'border-green-500' 
                      : 'border-red-500'
                    : ''
                }`}
              />
              {ibanValidation.error && (
                <p className="text-sm text-red-600 mt-1">{ibanValidation.error}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                BIC/SWIFT *
              </label>
              <Input
                value={formData.bic_principal}
                onChange={(e) => handleChange('bic_principal', e.target.value.toUpperCase())}
                placeholder="CAIXESBBXXX"
                className="font-mono"
                maxLength={11}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del banco
              </label>
              <Input
                value={formData.nombre_banco}
                onChange={(e) => handleChange('nombre_banco', e.target.value)}
                placeholder="Banco Santander"
              />
            </div>
          </div>
        </div>

        {/* Configuración de remesas */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Configuración de Remesas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prefijo remesas
              </label>
              <Input
                value={formData.prefijo_remesa}
                onChange={(e) => handleChange('prefijo_remesa', e.target.value.toUpperCase())}
                placeholder="A360-REM"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prefijo mandatos
              </label>
              <Input
                value={formData.prefijo_mandato}
                onChange={(e) => handleChange('prefijo_mandato', e.target.value.toUpperCase())}
                placeholder="A360-CLI"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Días antelación cobro
              </label>
              <Input
                type="number"
                value={formData.dias_antelacion_cobro}
                onChange={(e) => handleChange('dias_antelacion_cobro', parseInt(e.target.value) || 5)}
                min={1}
                max={30}
              />
            </div>
          </div>
        </div>

        {/* Códigos de rechazo */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <button
            type="button"
            onClick={() => setShowCodigos(!showCodigos)}
            className="flex items-center justify-between w-full text-left"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              Códigos de Rechazo SEPA
            </h2>
            <span className="text-blue-600">
              {showCodigos ? 'Ocultar' : 'Ver'}
            </span>
          </button>
          
          {showCodigos && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Código</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-600">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {CODIGOS_RECHAZO.map(cr => (
                    <tr key={cr.codigo}>
                      <td className="px-4 py-2 font-mono">{cr.codigo}</td>
                      <td className="px-4 py-2 text-gray-600">{cr.descripcion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/configuracion')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="w-4 h-4 mr-1" />
            {updateMutation.isPending ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </div>
      </form>
    </div>
  )
}



