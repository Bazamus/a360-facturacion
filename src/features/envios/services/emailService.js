import { EMPRESA_CONFIG } from '@/lib/resend'
import { render } from '@react-email/render'
import { FacturaEmailTemplate } from '../templates/FacturaEmailTemplate'
import { supabase } from '@/lib/supabase'
import { getFacturaPDFBlob } from '@/features/facturacion/pdf'

/**
 * Envía email a través de nuestra API serverless (evita CORS)
 */
async function sendEmailViaAPI(emailData) {
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailData)
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Error al enviar email')
  }

  return result
}

/**
 * Función principal para enviar una factura por email
 * @param {string} facturaId - ID de la factura a enviar
 * @param {Object} options - Opciones adicionales
 * @param {boolean} options.modoTest - Si es true, usa direcciones delivered+X@resend.dev
 * @param {string} options.emailCc - Email en copia (opcional)
 * @returns {Promise<Object>} Resultado del envío
 */
export async function enviarFacturaEmail(facturaId, options = {}) {
  const { emailCc, modoTest = false } = options

  try {
    // 1. Obtener datos completos de la factura
    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .select(`
        *,
        cliente:clientes(*),
        comunidad:comunidades(nombre, codigo),
        lineas:facturas_lineas(*)
      `)
      .eq('id', facturaId)
      .single()

    if (facturaError) throw facturaError

    // 2. Si modo test, reemplazar email con dirección de prueba de Resend
    let emailDestino = factura.cliente_email
    if (modoTest) {
      // Usar el ID de factura para generar email de prueba único
      emailDestino = `delivered+factura${facturaId.slice(0, 8)}@resend.dev`
      console.log(`🧪 MODO TEST activado: Email original ${factura.cliente_email} → ${emailDestino}`)
    }

    // 3. Validar que tiene email
    if (!factura.cliente_email) {
      throw new Error('El cliente no tiene email configurado')
    }

    // 4. Validar que la factura está emitida (no es borrador)
    if (factura.estado === 'borrador') {
      throw new Error('No se pueden enviar facturas en borrador')
    }

    // 5. Obtener configuración de email
    const { data: config } = await supabase
      .from('configuracion_email')
      .select('*')
      .single()

    if (!config) {
      throw new Error('No se encontró configuración de email')
    }

    // 6. Preparar datos para la plantilla
    const datosEmail = prepararDatosEmail(factura)

    // 7. Preparar asunto del email
    const asunto = config.asunto_template
      .replace('{numero_factura}', factura.numero_completo)
      .replace('{periodo}', datosEmail.periodo_texto)
      .replace('{cliente}', factura.cliente_nombre)

    // 8. Crear registro de envío en BD (estado: enviando)
    const { data: envio, error: envioError } = await supabase
      .from('envios_email')
      .insert({
        factura_id: facturaId,
        cliente_id: factura.cliente_id,
        email_destino: emailDestino, // Usa emailDestino (puede ser test o real)
        email_cc: emailCc || null,
        asunto: asunto,
        estado: 'enviando',
        es_test: modoTest // ✅ NUEVO: Flag de modo test
      })
      .select()
      .single()

    if (envioError) throw envioError

    // 9. Generar PDF como Blob
    const { data: historico } = await supabase
      .from('v_historico_consumo_factura')
      .select('*')
      .eq('factura_id', facturaId)
      .order('fecha_lectura')

    const pdfBlob = await getFacturaPDFBlob(
      factura,
      factura.lineas || [],
      historico || []
    )

    // 10. Convertir Blob a base64 para Resend
    const pdfBase64 = await blobToBase64(pdfBlob)

    // 11. Renderizar plantilla HTML (llamando al componente como función)
    const htmlContent = await render(
      FacturaEmailTemplate({
        factura: datosEmail,
        empresa: EMPRESA_CONFIG
      })
    )

    // 12. Enviar via Resend
    const destinatarios = [emailDestino] // Usa emailDestino (test o real)
    if (emailCc) destinatarios.push(emailCc)
    if (config.enviar_copia_admin && config.email_copia_admin && !modoTest) {
      // No enviar copia admin en modo test
      destinatarios.push(config.email_copia_admin)
    }

    const emailData = {
      from: `${config.from_name || EMPRESA_CONFIG.from_name} <${config.from_email || EMPRESA_CONFIG.from_email}>`,
      to: destinatarios,
      reply_to: config.reply_to || EMPRESA_CONFIG.email,
      subject: modoTest ? `[TEST] ${asunto}` : asunto, // Prefijo [TEST] en modo prueba
      html: htmlContent,
      attachments: [
        {
          filename: `Factura_${factura.numero_completo.replace(/\//g, '-')}.pdf`,
          content: pdfBase64,
        }
      ],
      tags: [
        { name: 'tipo', value: 'factura' },
        { name: 'factura_id', value: facturaId },
        { name: 'comunidad_id', value: factura.comunidad_id },
        { name: 'modo_test', value: modoTest ? 'true' : 'false' } // ✅ NUEVO: Tag de modo test
      ]
    }

    console.log('📧 Enviando email via API serverless...', {
      to: emailData.to,
      subject: emailData.subject,
      attachments: emailData.attachments.length
    })

    // Enviar via nuestra API serverless (evita CORS)
    const resendResponse = await sendEmailViaAPI(emailData)

    console.log('✅ Email enviado exitosamente', resendResponse)

    // 13. Actualizar registro de envío (estado: enviado)
    await supabase
      .from('envios_email')
      .update({
        estado: 'enviado',
        resend_id: resendResponse.id,
        resend_response: resendResponse,
        fecha_enviado: new Date().toISOString(),
        intentos: 1
      })
      .eq('id', envio.id)

    // 14. Marcar factura como enviada
    await supabase
      .from('facturas')
      .update({
        email_enviado: true,
        fecha_email_enviado: new Date().toISOString()
      })
      .eq('id', facturaId)

    return {
      success: true,
      envioId: envio.id,
      resendId: resendResponse.id,
      email: factura.cliente_email
    }

  } catch (error) {
    console.error('❌ Error enviando factura:', error)

    // Registrar error si existe el envío
    if (options.envioId) {
      await supabase
        .from('envios_email')
        .update({
          estado: 'fallido',
          error_mensaje: error.message,
          error_codigo: error.code || 'UNKNOWN',
          intentos: 1,
          proximo_reintento: calcularProximoReintento(1, config || {})
        })
        .eq('id', options.envioId)
    }

    throw error
  }
}

/**
 * Prepara los datos de la factura para la plantilla de email
 */
function prepararDatosEmail(factura) {
  return {
    cliente_nombre: factura.cliente_nombre || 'Cliente',
    numero_completo: factura.numero_completo,
    fecha_formateada: formatDate(factura.fecha_factura),
    periodo_texto: formatPeriodo(factura.periodo_inicio, factura.periodo_fin),
    vencimiento_formateado: formatDate(factura.fecha_vencimiento),
    total_formateado: formatCurrency(factura.total),
    metodo_pago: factura.metodo_pago,
    iban_ultimos4: factura.cliente_iban?.slice(-4) || '0000',
    pdf_url: null, // OneDrive URL en Fase 2
  }
}

/**
 * Convierte Blob a base64
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1]
      resolve(base64String)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Calcula el timestamp del próximo reintento (backoff exponencial)
 */
function calcularProximoReintento(intentos, config) {
  if (intentos >= (config.max_reintentos || 3)) return null

  const minutosBase = config.intervalo_reintento_minutos || 60
  const minutos = minutosBase * Math.pow(2, intentos - 1) // Backoff exponencial
  return new Date(Date.now() + minutos * 60 * 1000).toISOString()
}

/**
 * Formatea fecha a DD/MM/YYYY
 */
function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formatea periodo de facturación
 */
function formatPeriodo(inicio, fin) {
  if (!inicio || !fin) return '-'
  return `${formatDate(inicio)} - ${formatDate(fin)}`
}

/**
 * Formatea moneda a formato español
 */
function formatCurrency(value) {
  if (value == null) return '0,00 €'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(value)
}
