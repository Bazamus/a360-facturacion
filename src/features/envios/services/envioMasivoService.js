import { enviarFacturaEmail } from './emailService'
import { supabase } from '@/lib/supabase'
import { sleep } from '@/lib/resend'

/**
 * Envía múltiples facturas por email con control de rate limiting
 * @param {Array<string>} facturaIds - Array de IDs de facturas
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.modoTest - Si es true, usa direcciones delivered+X@resend.dev
 * @returns {Promise<Object>} Resultados del envío masivo
 */
export async function enviarFacturasMasivo(facturaIds, options = {}) {
  const {
    delayEntreEnvios = 150,  // ms entre cada envío (6-7 emails/segundo)
    onProgress,
    onError,
    emailCc,
    modoTest = false // ✅ NUEVO: Modo test
  } = options

  console.log(`📨 Iniciando envío masivo de ${facturaIds.length} facturas ${modoTest ? '(MODO TEST)' : ''}`)

  const resultados = {
    total: facturaIds.length,
    exitosos: 0,
    fallidos: 0,
    sinEmail: 0,
    yaEnviados: 0,
    detalles: []
  }

  // Obtener configuración para verificar límites
  const { data: config } = await supabase
    .from('configuracion_email')
    .select('max_envios_por_hora')
    .single()

  const maxPorHora = config?.max_envios_por_hora || 100

  if (facturaIds.length > maxPorHora) {
    throw new Error(
      `No se pueden enviar más de ${maxPorHora} facturas por hora según la configuración actual`
    )
  }

  // Procesar cada factura secuencialmente
  for (let i = 0; i < facturaIds.length; i++) {
    const facturaId = facturaIds[i]

    try {
      // Verificar email antes de enviar (obtener email actual del cliente, no snapshot)
      const { data: factura, error: facturaError } = await supabase
        .from('facturas')
        .select('numero_completo, cliente_email, email_enviado, estado, cliente:clientes(email)')
        .eq('id', facturaId)
        .single()

      if (facturaError) {
        throw new Error(`No se pudo obtener la factura: ${facturaError.message}`)
      }

      // Email actual del cliente (priorizar email de tabla clientes)
      const emailActual = factura.cliente?.email || factura.cliente_email

      // Validación: sin email
      if (!emailActual) {
        resultados.sinEmail++
        resultados.detalles.push({
          facturaId,
          numero: factura.numero_completo,
          status: 'sin_email',
          error: 'Cliente sin email configurado'
        })

        if (onProgress) {
          onProgress({
            actual: i + 1,
            total: facturaIds.length,
            porcentaje: Math.round(((i + 1) / facturaIds.length) * 100),
            status: 'sin_email',
            factura: factura.numero_completo
          })
        }

        continue
      }

      // Validación: ya enviado
      if (factura.email_enviado) {
        resultados.yaEnviados++
        resultados.detalles.push({
          facturaId,
          numero: factura.numero_completo,
          status: 'ya_enviado',
          mensaje: 'Factura ya fue enviada anteriormente'
        })

        if (onProgress) {
          onProgress({
            actual: i + 1,
            total: facturaIds.length,
            porcentaje: Math.round(((i + 1) / facturaIds.length) * 100),
            status: 'ya_enviado',
            factura: factura.numero_completo
          })
        }

        continue
      }

      // Validación: estado borrador
      if (factura.estado === 'borrador') {
        resultados.fallidos++
        resultados.detalles.push({
          facturaId,
          numero: factura.numero_completo,
          status: 'error',
          error: 'No se pueden enviar facturas en borrador'
        })

        if (onProgress) {
          onProgress({
            actual: i + 1,
            total: facturaIds.length,
            porcentaje: Math.round(((i + 1) / facturaIds.length) * 100),
            status: 'error',
            factura: factura.numero_completo
          })
        }

        continue
      }

      // Enviar factura
      console.log(`📧 Enviando ${i + 1}/${facturaIds.length}: ${factura.numero_completo}`)

      const resultado = await enviarFacturaEmail(facturaId, { emailCc, modoTest }) // ✅ Pasar modoTest

      resultados.exitosos++
      resultados.detalles.push({
        facturaId,
        numero: factura.numero_completo,
        email: resultado.email,
        status: 'enviado',
        resendId: resultado.resendId
      })

      console.log(`✅ Enviado ${i + 1}/${facturaIds.length}: ${factura.numero_completo}`)

      // Callback de progreso
      if (onProgress) {
        onProgress({
          actual: i + 1,
          total: facturaIds.length,
          porcentaje: Math.round(((i + 1) / facturaIds.length) * 100),
          status: 'enviado',
          factura: factura.numero_completo,
          email: resultado.email
        })
      }

    } catch (error) {
      console.error(`❌ Error enviando factura ${i + 1}:`, error)

      resultados.fallidos++
      resultados.detalles.push({
        facturaId,
        status: 'error',
        error: error.message
      })

      if (onError) {
        onError(facturaId, error)
      }

      // Callback de progreso con error
      if (onProgress) {
        onProgress({
          actual: i + 1,
          total: facturaIds.length,
          porcentaje: Math.round(((i + 1) / facturaIds.length) * 100),
          status: 'error',
          error: error.message
        })
      }
    }

    // Delay para rate limiting (excepto en la última iteración)
    if (i < facturaIds.length - 1) {
      await sleep(delayEntreEnvios)
    }
  }

  console.log('📊 Envío masivo completado:', {
    total: resultados.total,
    exitosos: resultados.exitosos,
    fallidos: resultados.fallidos,
    sinEmail: resultados.sinEmail,
    yaEnviados: resultados.yaEnviados
  })

  return resultados
}

/**
 * Obtiene facturas pendientes de envío (helper)
 */
export async function obtenerFacturasPendientesEnvio(filtros = {}) {
  const { comunidadId, limit } = filtros

  let query = supabase
    .from('v_facturas_pendientes_envio')
    .select('*')
    .order('fecha_factura', { ascending: false })

  if (comunidadId) {
    query = query.eq('comunidad_id', comunidadId)
  }

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}
