import { Resend } from 'resend'

// Inicializar cliente Resend con API key del servidor
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { to, subject, html, attachments, tags, reply_to, from } = req.body

    // Validar campos requeridos
    if (!to || !subject || !html) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, html' 
      })
    }

    // Configurar email
    const emailData = {
      from: from || `A360 Servicios Energéticos <${process.env.RESEND_FROM_EMAIL || 'facturacion@a360se.com'}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      reply_to: reply_to || 'facturacion@a360se.com',
      tags: tags || []
    }

    // Añadir adjuntos si existen
    if (attachments && attachments.length > 0) {
      emailData.attachments = attachments.map(att => ({
        filename: att.filename,
        content: att.content // Base64
      }))
    }

    console.log('📧 Enviando email via Resend API...', {
      to: emailData.to,
      subject: emailData.subject,
      attachments: emailData.attachments?.length || 0
    })

    // Enviar via Resend
    const response = await resend.emails.send(emailData)

    if (response.error) {
      console.error('❌ Resend error:', response.error)
      return res.status(400).json({ 
        error: response.error.message,
        code: response.error.name 
      })
    }

    console.log('✅ Email enviado:', response.data)

    return res.status(200).json({
      success: true,
      id: response.data.id
    })

  } catch (error) {
    console.error('❌ Server error:', error)
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}
