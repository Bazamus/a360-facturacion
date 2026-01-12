import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

serve(async (req) => {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Verificar firma del webhook (Svix)
    const signature = req.headers.get('svix-signature')
    const webhookId = req.headers.get('svix-id')
    const timestamp = req.headers.get('svix-timestamp')

    // En producción, verificar la firma con el secret
    // Por ahora, solo validamos que existan los headers
    if (!signature || !webhookId || !timestamp) {
      console.error('Missing webhook headers')
      return new Response('Missing headers', { status: 401 })
    }

    const event = await req.json()
    console.log('📨 Webhook received:', event.type)

    // Procesar según tipo de evento
    switch (event.type) {
      case 'email.delivered':
        await handleDelivered(event.data)
        break

      case 'email.opened':
        await handleOpened(event.data)
        break

      case 'email.bounced':
        await handleBounced(event.data)
        break

      case 'email.complained':
        await handleComplaint(event.data)
        break

      default:
        console.log('⚠️ Unhandled event type:', event.type)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    )
  }
})

async function handleDelivered(data: any) {
  console.log('✅ Email delivered:', data.email_id)

  await supabase
    .from('envios_email')
    .update({
      estado: 'entregado',
      fecha_entregado: new Date().toISOString()
    })
    .eq('resend_id', data.email_id)
}

async function handleOpened(data: any) {
  console.log('👁️ Email opened:', data.email_id)

  await supabase
    .from('envios_email')
    .update({
      estado: 'abierto',
      fecha_abierto: new Date().toISOString()
    })
    .eq('resend_id', data.email_id)
}

async function handleBounced(data: any) {
  console.log('⚠️ Email bounced:', data.email_id)

  const tipoRebote = data.bounce?.type === 'hard' ? 'hard' : 'soft'

  await supabase
    .from('envios_email')
    .update({
      estado: 'rebotado',
      tipo_rebote: tipoRebote,
      mensaje_rebote: data.bounce?.message || 'Rebote detectado',
      fecha_rebote: new Date().toISOString()
    })
    .eq('resend_id', data.email_id)
}

async function handleComplaint(data: any) {
  console.log('🚫 Email complaint (spam):', data.email_id)

  await supabase
    .from('envios_email')
    .update({
      estado: 'rebotado',
      tipo_rebote: 'spam',
      mensaje_rebote: 'Marcado como spam por el destinatario',
      fecha_rebote: new Date().toISOString()
    })
    .eq('resend_id', data.email_id)
}
