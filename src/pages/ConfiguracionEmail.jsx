import { Mail, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { EmailConfigForm } from '../features/envios/components'

export default function ConfiguracionEmail() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/configuracion')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="text-primary-500" />
            Configuración de Email
          </h1>
          <p className="text-gray-500">
            Configura el sistema de envío de facturas por correo electrónico
          </p>
        </div>
      </div>

      {/* Aviso sobre Resend */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">
          ℹ️ Integración con Resend
        </h3>
        <p className="text-sm text-blue-700">
          El sistema de envío utiliza <strong>Resend</strong> como proveedor de email transaccional. 
          Para activar el envío real de emails, asegúrate de:
        </p>
        <ul className="text-sm text-blue-700 mt-2 list-disc list-inside">
          <li>Crear una cuenta en <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">resend.com</a></li>
          <li>Verificar tu dominio de envío</li>
          <li>Configurar la API Key en las variables de entorno (RESEND_API_KEY)</li>
        </ul>
      </div>

      {/* Formulario */}
      <EmailConfigForm />
    </div>
  )
}



