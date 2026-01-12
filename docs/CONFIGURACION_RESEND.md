# Configuración de Resend para Envío de Facturas

## Requisitos Previos

1. Cuenta en Resend (https://resend.com)
2. Dominio verificado: `a360se.com`
3. Email remitente configurado: `facturacion@a360se.com`

## Paso 1: Obtener API Key

1. Ir a https://resend.com/api-keys
2. Click en "Create API Key"
3. Nombre: "A360 Facturación - Producción"
4. Permisos: "Send emails" (suficiente)
5. Copiar la key generada (empieza con `re_`)

**API Key actual:**
```
re_ULQ3xiAh_CH1MX8Hmftderb2c2Eowu6BX
```

## Paso 2: Configurar Variables de Entorno en Vercel

⚠️ **IMPORTANTE: Las variables NO se configuran en `.env.local` porque NO testeamos en local**

**Configuración en Vercel Dashboard:**

1. Ir a proyecto en Vercel → Settings → Environment Variables
2. Añadir las siguientes variables para **Production** y **Preview**:

```
VITE_RESEND_API_KEY=re_ULQ3xiAh_CH1MX8Hmftderb2c2Eowu6BX
VITE_RESEND_WEBHOOK_SECRET=whsec_xxxxxx
```

3. Guardar cambios
4. Hacer redeploy para que las variables surtan efecto

## Paso 3: Aplicar Migración de Base de Datos

La migración `006_add_es_test_to_envios.sql` añade el campo `es_test` a la tabla `envios_email`.

**Pasos:**

1. Ir a Supabase Dashboard → SQL Editor
2. Ejecutar el siguiente script:

```sql
-- Migración: Añadir campo es_test a la tabla envios_email
ALTER TABLE envios_email
ADD COLUMN es_test BOOLEAN DEFAULT FALSE NOT NULL;

CREATE INDEX idx_envios_email_es_test ON envios_email(es_test);

COMMENT ON COLUMN envios_email.es_test IS
'Indica si el envío fue realizado en modo test. Los envíos en modo test utilizan direcciones delivered+X@resend.dev de Resend en lugar de los emails reales de los clientes.';
```

3. Verificar que la migración se aplicó correctamente:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'envios_email' AND column_name = 'es_test';
```

## Paso 4: Configurar Webhook de Resend

### 4.1 Desplegar Edge Function

```bash
# Instalar Supabase CLI si no está instalado
npm install -g supabase

# Login en Supabase
supabase login

# Link al proyecto
supabase link --project-ref rvxmczogxoncdlxpptgb

# Desplegar función
supabase functions deploy resend-webhook

# Configurar secrets
supabase secrets set RESEND_WEBHOOK_SECRET=whsec_xxxxxx
```

### 4.2 Obtener URL del Webhook

La URL será:
```
https://rvxmczogxoncdlxpptgb.supabase.co/functions/v1/resend-webhook
```

### 4.3 Configurar en Resend Dashboard

1. Ir a https://resend.com/webhooks
2. Click "Add Endpoint"
3. URL: `https://rvxmczogxoncdlxpptgb.supabase.co/functions/v1/resend-webhook`
4. Seleccionar eventos:
   - ✅ `email.delivered`
   - ✅ `email.opened`
   - ✅ `email.bounced`
   - ✅ `email.complained`
5. Guardar y copiar el "Signing Secret" (comienza con `whsec_`)

### 4.4 Añadir Secret a Vercel

1. Ir a Vercel Dashboard → Settings → Environment Variables
2. Añadir:
   ```
   VITE_RESEND_WEBHOOK_SECRET=whsec_xxxxxx
   ```
3. Redeploy

## Paso 5: Verificar Configuración

### Verificar Variables de Entorno en Vercel

1. Ir al deployment en Vercel
2. Abrir DevTools del navegador (F12)
3. En Console, ejecutar:

```javascript
console.log('API Key configurada:', !!import.meta.env.VITE_RESEND_API_KEY)
```

Debe mostrar `true`. **NUNCA imprimas la key completa en console.log.**

### Verificar Conexión con Resend

En DevTools Console:

```javascript
const response = await fetch('https://api.resend.com/emails', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  }
})
console.log('Status:', response.status) // Debe ser 200 o 401 (si hay problema con key)
```

## Límites de Resend

| Plan | Emails/día | Emails/segundo | Precio |
|------|-----------|----------------|--------|
| Free | 100 | 10 | $0 |
| Pro  | 50,000 | 10 | $20/mes |
| Scale | 500,000 | 50 | $80/mes |

**Plan actual:** Free (100 emails/día)

**Configuración de rate limiting:**
- Delay entre envíos: 150ms
- Emails por segundo: ~6-7 (margen de seguridad sobre el límite de 10/seg)

## Modo Test

El sistema incluye un "Modo Test" para realizar pruebas sin enviar emails a clientes reales.

**Características:**
- ✅ Checkbox prominente en la UI de envío
- ✅ Emails se redirigen a `delivered+facturaXXXXXXXX@resend.dev`
- ✅ Flag `es_test = true` en base de datos
- ✅ Prefijo `[TEST]` en asunto del email
- ✅ Tag `modo_test: true` en Resend
- ✅ Resend simula entrega instantánea para direcciones de prueba
- ✅ No se envía copia admin en modo test

**Uso:**
1. Ir a Envío de Facturas
2. Activar checkbox "🧪 Modo Test"
3. Seleccionar facturas
4. Enviar normalmente

**Verificación:**
- Los emails NO llegan a los clientes
- Aparecen en Resend Dashboard con estado "Delivered"
- Se marcan con `es_test = true` en tabla `envios_email`

## Troubleshooting

### Error: "API Key inválida"
- Verificar que la key esté correcta en Vercel Dashboard
- Verificar que tenga el prefijo `VITE_`
- Hacer redeploy en Vercel

### Error: "Email bounced"
- Verificar que el email del cliente sea válido
- Revisar en Dashboard de Resend el motivo del rebote
- Actualizar email del cliente si es necesario

### Webhook no actualiza estados
- Verificar que la Edge Function esté desplegada: `supabase functions list`
- Verificar logs de la Edge Function en Supabase Dashboard
- Verificar que el webhook esté configurado en Resend Dashboard
- Verificar que el `RESEND_WEBHOOK_SECRET` sea correcto

### Emails no se envían (estado "enviando" permanente)
- Revisar logs del navegador (F12 → Console)
- Verificar que `VITE_RESEND_API_KEY` esté configurada en Vercel
- Verificar límite diario no excedido (100 emails en plan Free)

### Testing de 100 facturas consume toda la cuota diaria
- Usar **Modo Test** para evitar consumir cuota real
- Las direcciones `delivered+X@resend.dev` **NO cuentan** contra límites de Resend
- Permite testing ilimitado sin afectar cuota de producción

## Próximos Pasos (FASE 2)

Una vez completada la FASE 1, se procederá con la integración de OneDrive:
- Subida automática de PDFs después de envío
- Estructura de carpetas: `Facturas_Clientes/Comunidad/Cliente/YYYY/`
- Configuración de Azure AD y Microsoft Graph API

## Soporte

Para problemas técnicos:
- Documentación de Resend: https://resend.com/docs
- Dashboard de Resend: https://resend.com/overview
- Logs de Edge Functions: Supabase Dashboard → Edge Functions → resend-webhook → Logs
