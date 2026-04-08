import { Card, CardContent } from '@/components/ui'
import { Phone, Mail, MessageCircle } from 'lucide-react'

export function ContactoRapido() {
  return (
    <Card>
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Contacto</h3>
      </div>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          <a
            href="tel:911591170"
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Phone className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">91 159 11 70</p>
              <p className="text-xs text-gray-500">Llamar</p>
            </div>
          </a>
          <a
            href="mailto:facturacion@a360se.com"
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Mail className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">facturacion@a360se.com</p>
              <p className="text-xs text-gray-500">Enviar email</p>
            </div>
          </a>
          <a
            href="https://wa.me/34911591170"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">WhatsApp</p>
              <p className="text-xs text-gray-500">Enviar mensaje</p>
            </div>
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
