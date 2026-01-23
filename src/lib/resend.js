import { Resend } from 'resend'

// Cliente Resend
export const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY)

// Configuración de rate limiting (Plan Free de Resend)
export const RATE_LIMIT = {
  maxPerSecond: 10,    // Resend permite 10 emails/segundo (todos los planes)
  maxPerDay: 100       // Plan Free: 100 emails/día
}

// Configuración de la empresa
export const EMPRESA_CONFIG = {
  nombre: 'A360 SERVICIOS ENERGÉTICOS S.L.',
  direccion: 'C/ Polvoranca Nº 138',
  cp: '28923',
  ciudad: 'Alcorcón',
  provincia: 'Madrid',
  telefono: '91 159 11 70',
  email: 'clientes@a360se.com',
  cif: 'B88313473',
  from_email: 'facturacion@a360se.com',
  from_name: 'A360 Servicios Energéticos',
  // Logo URL - usa variable de entorno en desarrollo, URL de producción por defecto
  get logoUrl() {
    const baseUrl = import.meta.env.VITE_APP_URL || 'https://facturas.a360se.com'
    return `${baseUrl}/logo.jpg`
  }
}

/**
 * Función helper para esperar entre llamadas (rate limiting)
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Función helper para verificar la conexión con Resend
 */
export async function verificarConexionResend() {
  try {
    // Intenta obtener información básica para verificar la API key
    const response = await fetch('https://api.resend.com/emails', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.status === 401) {
      throw new Error('API Key de Resend inválida')
    }

    return { success: true, status: response.status }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default resend
