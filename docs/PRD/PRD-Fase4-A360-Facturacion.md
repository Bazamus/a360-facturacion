# PRD Fase 4: Envío de Facturas y Almacenamiento

## Sistema de Facturación de Gestión Energética A360

| Campo | Valor |
|-------|-------|
| **Cliente** | A360 Servicios Energéticos S.L. |
| **Proyecto** | Sistema de Facturación Energética |
| **Versión** | 1.0 |
| **Fecha** | Diciembre 2025 |
| **Fase** | 4 de 5 |
| **Dependencia** | Requiere Fase 3 completada |

---

## 1. Objetivo de esta Fase

Esta fase implementa el sistema de envío masivo de facturas por correo electrónico utilizando Resend como plataforma de email transaccional, y la integración con OneDrive para el almacenamiento automático de las facturas PDF en carpetas organizadas por cliente. El sistema gestionará el estado de envío, reintentos automáticos y proporcionará un dashboard de seguimiento.

### Entregables principales

- Integración con API de Resend para envío de emails transaccionales
- Plantilla de email profesional para envío de facturas
- Sistema de envío masivo con control de rate limiting
- Gestión de estados de envío (pendiente, enviado, entregado, rebotado)
- Sistema de reintentos automáticos para emails fallidos
- Integración con Microsoft Graph API para OneDrive
- Almacenamiento automático de PDFs en estructura de carpetas por cliente
- Dashboard de seguimiento de envíos
- Configuración de cuenta de email remitente

---

## 2. Arquitectura de Integración

### 2.1 Diagrama de Flujo

```
┌─────────────────┐
│    Factura      │
│    Emitida      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│   Generar PDF   │────►│  Almacenar en   │
│   (si no existe)│     │    OneDrive     │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Preparar Email │
│  con plantilla  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│   Enviar via    │────►│    Resend       │
│     Resend      │     │    API          │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Registrar      │
│  estado envío   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│Webhook│ │Error  │
│entrega│ │reint. │
└───────┘ └───────┘
```

### 2.2 Servicios Externos

| Servicio | Uso | Documentación |
|----------|-----|---------------|
| **Resend** | Envío de emails transaccionales | https://resend.com/docs |
| **Microsoft Graph API** | Acceso a OneDrive | https://docs.microsoft.com/graph |

### 2.3 Credenciales Necesarias

```env
# Resend
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=facturas@a360se.com
RESEND_FROM_NAME=A360 Servicios Energéticos

# Microsoft Graph (OneDrive)
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MICROSOFT_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ONEDRIVE_ROOT_FOLDER=Facturas_Clientes
```

---

## 3. Esquema de Base de Datos

### 3.1 Tabla: `envios_email`

Registra cada intento de envío de email.

```sql
CREATE TYPE estado_envio AS ENUM (
  'pendiente',      -- En cola para enviar
  'enviando',       -- En proceso de envío
  'enviado',        -- Enviado a Resend (aceptado)
  'entregado',      -- Confirmado entregado (webhook)
  'abierto',        -- Email abierto por destinatario
  'rebotado',       -- Rebote (dirección inválida, etc.)
  'fallido',        -- Error en envío
  'cancelado'       -- Cancelado manualmente
);

CREATE TYPE tipo_rebote AS ENUM (
  'hard',           -- Rebote permanente (dirección no existe)
  'soft',           -- Rebote temporal (buzón lleno, etc.)
  'spam'            -- Marcado como spam
);

CREATE TABLE envios_email (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencias
  factura_id UUID NOT NULL REFERENCES facturas(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  
  -- Datos del envío
  email_destino TEXT NOT NULL,
  email_cc TEXT, -- Copia si aplica
  asunto TEXT NOT NULL,
  
  -- Estado
  estado estado_envio NOT NULL DEFAULT 'pendiente',
  
  -- Resend
  resend_id TEXT, -- ID devuelto por Resend
  resend_response JSONB, -- Respuesta completa de Resend
  
  -- Tracking
  fecha_enviado TIMESTAMPTZ,
  fecha_entregado TIMESTAMPTZ,
  fecha_abierto TIMESTAMPTZ,
  fecha_rebote TIMESTAMPTZ,
  
  -- Rebotes
  tipo_rebote tipo_rebote,
  mensaje_rebote TEXT,
  
  -- Reintentos
  intentos INTEGER NOT NULL DEFAULT 0,
  max_intentos INTEGER NOT NULL DEFAULT 3,
  proximo_reintento TIMESTAMPTZ,
  
  -- Error
  error_mensaje TEXT,
  error_codigo TEXT,
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_envios_email_factura ON envios_email(factura_id);
CREATE INDEX idx_envios_email_cliente ON envios_email(cliente_id);
CREATE INDEX idx_envios_email_estado ON envios_email(estado);
CREATE INDEX idx_envios_email_fecha ON envios_email(created_at DESC);
CREATE INDEX idx_envios_email_pendientes ON envios_email(estado, proximo_reintento) 
  WHERE estado IN ('pendiente', 'fallido');

CREATE TRIGGER envios_email_updated_at
  BEFORE UPDATE ON envios_email
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.2 Tabla: `almacenamiento_documentos`

Registra los documentos almacenados en OneDrive.

```sql
CREATE TYPE estado_almacenamiento AS ENUM (
  'pendiente',
  'subiendo',
  'completado',
  'error'
);

CREATE TABLE almacenamiento_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencias
  factura_id UUID NOT NULL REFERENCES facturas(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  
  -- Archivo
  nombre_archivo TEXT NOT NULL,
  tipo_documento TEXT NOT NULL DEFAULT 'factura',
  tamano_bytes INTEGER,
  
  -- OneDrive
  onedrive_item_id TEXT,
  onedrive_path TEXT,
  onedrive_web_url TEXT,
  onedrive_download_url TEXT,
  
  -- Estado
  estado estado_almacenamiento NOT NULL DEFAULT 'pendiente',
  error_mensaje TEXT,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_almacenamiento_factura ON almacenamiento_documentos(factura_id);
CREATE INDEX idx_almacenamiento_cliente ON almacenamiento_documentos(cliente_id);
CREATE INDEX idx_almacenamiento_estado ON almacenamiento_documentos(estado);

CREATE TRIGGER almacenamiento_documentos_updated_at
  BEFORE UPDATE ON almacenamiento_documentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.3 Tabla: `configuracion_email`

Configuración del sistema de emails.

```sql
CREATE TABLE configuracion_email (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Remitente
  from_email TEXT NOT NULL DEFAULT 'facturas@a360se.com',
  from_name TEXT NOT NULL DEFAULT 'A360 Servicios Energéticos',
  reply_to TEXT DEFAULT 'clientes@a360se.com',
  
  -- Plantilla
  asunto_template TEXT NOT NULL DEFAULT 'Factura {numero_factura} - {periodo}',
  
  -- Configuración de envío
  envio_automatico BOOLEAN NOT NULL DEFAULT false,
  hora_envio_preferida TIME DEFAULT '09:00',
  max_envios_por_hora INTEGER NOT NULL DEFAULT 100,
  
  -- Reintentos
  reintentos_activos BOOLEAN NOT NULL DEFAULT true,
  intervalo_reintento_minutos INTEGER NOT NULL DEFAULT 60,
  max_reintentos INTEGER NOT NULL DEFAULT 3,
  
  -- Copia
  enviar_copia_admin BOOLEAN NOT NULL DEFAULT false,
  email_copia_admin TEXT,
  
  -- Auditoría
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Solo puede haber una fila de configuración
CREATE UNIQUE INDEX idx_configuracion_email_singleton ON configuracion_email((true));

-- Insertar configuración por defecto
INSERT INTO configuracion_email (id) VALUES (gen_random_uuid());
```

### 3.4 Actualizar tabla `facturas`

```sql
-- Añadir columnas de envío a facturas
ALTER TABLE facturas ADD COLUMN email_enviado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE facturas ADD COLUMN fecha_email_enviado TIMESTAMPTZ;
ALTER TABLE facturas ADD COLUMN onedrive_url TEXT;
ALTER TABLE facturas ADD COLUMN onedrive_subido BOOLEAN NOT NULL DEFAULT false;
```

### 3.5 Políticas RLS

```sql
ALTER TABLE envios_email ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacenamiento_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_email ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer" ON envios_email
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer" ON almacenamiento_documentos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer" ON configuracion_email
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden modificar" ON envios_email
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar" ON almacenamiento_documentos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Solo admins pueden modificar config" ON configuracion_email
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );
```

---

## 4. Integración con Resend

### 4.1 Configuración del Cliente

```javascript
// src/lib/resend.js
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

export default resend;

// Configuración de rate limiting
export const RATE_LIMIT = {
  maxPerSecond: 10,
  maxPerHour: 100,
  maxPerDay: 1000
};
```

### 4.2 Plantilla de Email

```javascript
// src/features/envios/templates/FacturaEmailTemplate.jsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Img,
  Hr,
  Row,
  Column
} from '@react-email/components';

export function FacturaEmailTemplate({ factura, empresa }) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header con logo */}
          <Section style={styles.header}>
            <Img
              src="https://a360se.com/logo.png"
              width="120"
              alt="A360 Servicios Energéticos"
            />
          </Section>

          {/* Saludo */}
          <Section style={styles.content}>
            <Text style={styles.greeting}>
              Estimado/a {factura.cliente_nombre},
            </Text>
            
            <Text style={styles.paragraph}>
              Adjunto encontrará la factura correspondiente a los servicios de 
              gestión energética del periodo <strong>{factura.periodo_texto}</strong>.
            </Text>
          </Section>

          {/* Resumen de factura */}
          <Section style={styles.invoiceBox}>
            <Text style={styles.invoiceTitle}>Resumen de Factura</Text>
            
            <Row>
              <Column>
                <Text style={styles.label}>Nº Factura:</Text>
                <Text style={styles.value}>{factura.numero_completo}</Text>
              </Column>
              <Column>
                <Text style={styles.label}>Fecha:</Text>
                <Text style={styles.value}>{factura.fecha_formateada}</Text>
              </Column>
            </Row>
            
            <Row>
              <Column>
                <Text style={styles.label}>Periodo:</Text>
                <Text style={styles.value}>{factura.periodo_texto}</Text>
              </Column>
              <Column>
                <Text style={styles.label}>Vencimiento:</Text>
                <Text style={styles.value}>{factura.vencimiento_formateado}</Text>
              </Column>
            </Row>
            
            <Hr style={styles.divider} />
            
            <Row>
              <Column>
                <Text style={styles.totalLabel}>TOTAL A PAGAR:</Text>
              </Column>
              <Column>
                <Text style={styles.totalValue}>{factura.total_formateado}</Text>
              </Column>
            </Row>
          </Section>

          {/* Información de pago */}
          <Section style={styles.content}>
            <Text style={styles.paragraph}>
              {factura.metodo_pago === 'domiciliacion' ? (
                <>
                  El importe será cargado en su cuenta bancaria terminada en 
                  ****{factura.iban_ultimos4} en la fecha de vencimiento indicada.
                </>
              ) : (
                <>
                  Por favor, realice el pago antes de la fecha de vencimiento 
                  mediante transferencia bancaria a la cuenta indicada en la factura.
                </>
              )}
            </Text>
          </Section>

          {/* Botón de descarga */}
          <Section style={styles.buttonSection}>
            <Link href={factura.pdf_url} style={styles.button}>
              📄 Descargar Factura PDF
            </Link>
          </Section>

          {/* Contacto */}
          <Section style={styles.content}>
            <Text style={styles.paragraph}>
              Si tiene alguna consulta sobre esta factura, no dude en contactarnos:
            </Text>
            <Text style={styles.contact}>
              📧 {empresa.email}<br />
              📞 {empresa.telefono}
            </Text>
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Hr style={styles.divider} />
            <Text style={styles.footerText}>
              {empresa.nombre}<br />
              {empresa.direccion}<br />
              {empresa.cp} {empresa.ciudad}, {empresa.provincia}<br />
              CIF: {empresa.cif}
            </Text>
            <Text style={styles.legal}>
              Este correo electrónico y sus adjuntos son confidenciales y están 
              dirigidos exclusivamente a su destinatario.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: '#f6f6f6',
    fontFamily: 'Arial, sans-serif',
  },
  container: {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px',
    maxWidth: '600px',
  },
  header: {
    textAlign: 'center',
    padding: '20px 0',
    borderBottom: '2px solid #1B4F72',
  },
  content: {
    padding: '20px 0',
  },
  greeting: {
    fontSize: '16px',
    color: '#333333',
    marginBottom: '15px',
  },
  paragraph: {
    fontSize: '14px',
    color: '#555555',
    lineHeight: '1.6',
    marginBottom: '15px',
  },
  invoiceBox: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    padding: '20px',
    margin: '20px 0',
  },
  invoiceTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1B4F72',
    marginBottom: '15px',
  },
  label: {
    fontSize: '12px',
    color: '#666666',
    marginBottom: '2px',
  },
  value: {
    fontSize: '14px',
    color: '#333333',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  divider: {
    borderTop: '1px solid #dee2e6',
    margin: '15px 0',
  },
  totalLabel: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333333',
  },
  totalValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1B4F72',
    textAlign: 'right',
  },
  buttonSection: {
    textAlign: 'center',
    padding: '20px 0',
  },
  button: {
    backgroundColor: '#1B4F72',
    color: '#ffffff',
    padding: '12px 30px',
    borderRadius: '5px',
    textDecoration: 'none',
    fontWeight: 'bold',
    display: 'inline-block',
  },
  contact: {
    fontSize: '14px',
    color: '#1B4F72',
    lineHeight: '1.8',
  },
  footer: {
    textAlign: 'center',
    padding: '20px 0',
  },
  footerText: {
    fontSize: '12px',
    color: '#888888',
    lineHeight: '1.6',
  },
  legal: {
    fontSize: '10px',
    color: '#aaaaaa',
    marginTop: '15px',
    fontStyle: 'italic',
  },
};
```

### 4.3 Servicio de Envío

```javascript
// src/features/envios/services/emailService.js
import resend from '@/lib/resend';
import { render } from '@react-email/render';
import { FacturaEmailTemplate } from '../templates/FacturaEmailTemplate';
import { supabase } from '@/lib/supabase';

export async function enviarFacturaEmail(facturaId) {
  // 1. Obtener datos de la factura
  const { data: factura, error: facturaError } = await supabase
    .from('facturas')
    .select('*, cliente:clientes(*)')
    .eq('id', facturaId)
    .single();
  
  if (facturaError) throw facturaError;
  
  // 2. Verificar que tiene email
  if (!factura.cliente_email) {
    throw new Error('El cliente no tiene email configurado');
  }
  
  // 3. Obtener configuración de email
  const { data: config } = await supabase
    .from('configuracion_email')
    .select('*')
    .single();
  
  // 4. Obtener datos de la empresa
  const { data: empresaConfig } = await supabase
    .from('configuracion')
    .select('valor')
    .eq('clave', 'empresa')
    .single();
  
  const empresa = empresaConfig?.valor;
  
  // 5. Preparar datos para la plantilla
  const datosEmail = {
    cliente_nombre: factura.cliente_nombre,
    numero_completo: factura.numero_completo,
    fecha_formateada: formatDate(factura.fecha_factura),
    periodo_texto: `${formatDate(factura.periodo_inicio)} - ${formatDate(factura.periodo_fin)}`,
    vencimiento_formateado: formatDate(factura.fecha_vencimiento),
    total_formateado: formatCurrency(factura.total),
    metodo_pago: factura.metodo_pago,
    iban_ultimos4: factura.cliente_iban?.slice(-4),
    pdf_url: factura.pdf_url || await generarPDFUrl(facturaId),
  };
  
  // 6. Renderizar plantilla
  const htmlContent = render(
    <FacturaEmailTemplate factura={datosEmail} empresa={empresa} />
  );
  
  // 7. Preparar asunto
  const asunto = config.asunto_template
    .replace('{numero_factura}', factura.numero_completo)
    .replace('{periodo}', datosEmail.periodo_texto);
  
  // 8. Crear registro de envío
  const { data: envio, error: envioError } = await supabase
    .from('envios_email')
    .insert({
      factura_id: facturaId,
      cliente_id: factura.cliente_id,
      email_destino: factura.cliente_email,
      asunto: asunto,
      estado: 'enviando'
    })
    .select()
    .single();
  
  if (envioError) throw envioError;
  
  try {
    // 9. Enviar via Resend
    const { data: resendResponse, error: resendError } = await resend.emails.send({
      from: `${config.from_name} <${config.from_email}>`,
      to: factura.cliente_email,
      reply_to: config.reply_to,
      subject: asunto,
      html: htmlContent,
      attachments: [
        {
          filename: `Factura_${factura.numero_completo.replace('/', '-')}.pdf`,
          path: factura.pdf_url,
        }
      ],
      tags: [
        { name: 'tipo', value: 'factura' },
        { name: 'factura_id', value: facturaId },
        { name: 'comunidad', value: factura.comunidad_id },
      ]
    });
    
    if (resendError) throw resendError;
    
    // 10. Actualizar estado a enviado
    await supabase
      .from('envios_email')
      .update({
        estado: 'enviado',
        resend_id: resendResponse.id,
        resend_response: resendResponse,
        fecha_enviado: new Date().toISOString(),
        intentos: envio.intentos + 1
      })
      .eq('id', envio.id);
    
    // 11. Actualizar factura
    await supabase
      .from('facturas')
      .update({
        email_enviado: true,
        fecha_email_enviado: new Date().toISOString()
      })
      .eq('id', facturaId);
    
    return { success: true, envioId: envio.id, resendId: resendResponse.id };
    
  } catch (error) {
    // Registrar error
    await supabase
      .from('envios_email')
      .update({
        estado: 'fallido',
        error_mensaje: error.message,
        error_codigo: error.code,
        intentos: envio.intentos + 1,
        proximo_reintento: calcularProximoReintento(envio.intentos + 1, config)
      })
      .eq('id', envio.id);
    
    throw error;
  }
}

function calcularProximoReintento(intentos, config) {
  if (intentos >= config.max_reintentos) return null;
  
  const minutos = config.intervalo_reintento_minutos * Math.pow(2, intentos - 1);
  return new Date(Date.now() + minutos * 60 * 1000).toISOString();
}
```

### 4.4 Envío Masivo

```javascript
// src/features/envios/services/envioMasivoService.js
import { enviarFacturaEmail } from './emailService';
import { supabase } from '@/lib/supabase';

export async function enviarFacturasMasivo(facturaIds, options = {}) {
  const { 
    delayEntreEnvios = 200, // ms entre cada envío
    onProgress,
    onError 
  } = options;
  
  const resultados = {
    total: facturaIds.length,
    exitosos: 0,
    fallidos: 0,
    sinEmail: 0,
    detalles: []
  };
  
  for (let i = 0; i < facturaIds.length; i++) {
    const facturaId = facturaIds[i];
    
    try {
      // Verificar si la factura tiene email
      const { data: factura } = await supabase
        .from('facturas')
        .select('cliente_email, numero_completo')
        .eq('id', facturaId)
        .single();
      
      if (!factura.cliente_email) {
        resultados.sinEmail++;
        resultados.detalles.push({
          facturaId,
          numero: factura.numero_completo,
          status: 'sin_email',
          error: 'Cliente sin email configurado'
        });
        continue;
      }
      
      // Enviar email
      const resultado = await enviarFacturaEmail(facturaId);
      
      resultados.exitosos++;
      resultados.detalles.push({
        facturaId,
        numero: factura.numero_completo,
        status: 'enviado',
        resendId: resultado.resendId
      });
      
    } catch (error) {
      resultados.fallidos++;
      resultados.detalles.push({
        facturaId,
        status: 'error',
        error: error.message
      });
      
      if (onError) onError(facturaId, error);
    }
    
    // Callback de progreso
    if (onProgress) {
      onProgress({
        actual: i + 1,
        total: facturaIds.length,
        porcentaje: Math.round(((i + 1) / facturaIds.length) * 100)
      });
    }
    
    // Delay para rate limiting
    if (i < facturaIds.length - 1) {
      await sleep(delayEntreEnvios);
    }
  }
  
  return resultados;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 4.5 Webhook de Resend

```javascript
// api/webhooks/resend.js (Vercel Serverless Function)
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Verificar firma del webhook
  const signature = req.headers['svix-signature'];
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  
  if (!verifyWebhookSignature(req.body, signature, webhookSecret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const event = req.body;
  
  try {
    switch (event.type) {
      case 'email.delivered':
        await handleDelivered(event.data);
        break;
        
      case 'email.opened':
        await handleOpened(event.data);
        break;
        
      case 'email.bounced':
        await handleBounced(event.data);
        break;
        
      case 'email.complained':
        await handleComplaint(event.data);
        break;
    }
    
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleDelivered(data) {
  await supabase
    .from('envios_email')
    .update({
      estado: 'entregado',
      fecha_entregado: new Date().toISOString()
    })
    .eq('resend_id', data.email_id);
}

async function handleOpened(data) {
  await supabase
    .from('envios_email')
    .update({
      estado: 'abierto',
      fecha_abierto: new Date().toISOString()
    })
    .eq('resend_id', data.email_id);
}

async function handleBounced(data) {
  const tipoRebote = data.bounce.type === 'hard' ? 'hard' : 'soft';
  
  await supabase
    .from('envios_email')
    .update({
      estado: 'rebotado',
      tipo_rebote: tipoRebote,
      mensaje_rebote: data.bounce.message,
      fecha_rebote: new Date().toISOString()
    })
    .eq('resend_id', data.email_id);
}

async function handleComplaint(data) {
  await supabase
    .from('envios_email')
    .update({
      estado: 'rebotado',
      tipo_rebote: 'spam',
      mensaje_rebote: 'Marcado como spam por el destinatario',
      fecha_rebote: new Date().toISOString()
    })
    .eq('resend_id', data.email_id);
}
```

---

## 5. Integración con OneDrive

### 5.1 Configuración de Microsoft Graph

```javascript
// src/lib/microsoft-graph.js
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';

const credential = new ClientSecretCredential(
  process.env.MICROSOFT_TENANT_ID,
  process.env.MICROSOFT_CLIENT_ID,
  process.env.MICROSOFT_CLIENT_SECRET
);

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ['https://graph.microsoft.com/.default']
});

export const graphClient = Client.initWithMiddleware({
  authProvider: authProvider
});

export const ONEDRIVE_CONFIG = {
  driveId: process.env.ONEDRIVE_DRIVE_ID,
  rootFolder: process.env.ONEDRIVE_ROOT_FOLDER || 'Facturas_Clientes'
};
```

### 5.2 Estructura de Carpetas en OneDrive

```
Facturas_Clientes/
├── Comunidad_Troya40/
│   ├── Cliente_11817440V_OscarZurro/
│   │   ├── 2024/
│   │   │   ├── Factura_2-230371001.pdf
│   │   │   └── ...
│   │   └── 2025/
│   │       ├── Factura_2-230371945.pdf
│   │       ├── Factura_2-230371950.pdf
│   │       └── ...
│   └── Cliente_12345678A_MariaLopez/
│       └── ...
├── Comunidad_Hermes12/
│   └── ...
└── ...
```

### 5.3 Servicio de Almacenamiento

```javascript
// src/features/envios/services/onedriveService.js
import { graphClient, ONEDRIVE_CONFIG } from '@/lib/microsoft-graph';
import { supabase } from '@/lib/supabase';

export async function subirFacturaOneDrive(facturaId, pdfBuffer) {
  // 1. Obtener datos de la factura
  const { data: factura } = await supabase
    .from('facturas')
    .select(`
      *,
      comunidad:comunidades(nombre, codigo),
      cliente:clientes(nif, nombre, apellidos)
    `)
    .eq('id', facturaId)
    .single();
  
  // 2. Construir ruta de carpeta
  const comunidadFolder = sanitizeFolderName(
    `Comunidad_${factura.comunidad.codigo}`
  );
  const clienteFolder = sanitizeFolderName(
    `Cliente_${factura.cliente.nif}_${factura.cliente.nombre}${factura.cliente.apellidos}`
  );
  const yearFolder = new Date(factura.fecha_factura).getFullYear().toString();
  
  const folderPath = `${ONEDRIVE_CONFIG.rootFolder}/${comunidadFolder}/${clienteFolder}/${yearFolder}`;
  
  // 3. Crear carpetas si no existen
  await ensureFolderExists(folderPath);
  
  // 4. Nombre del archivo
  const fileName = `Factura_${factura.numero_completo.replace('/', '-')}.pdf`;
  
  // 5. Crear registro de almacenamiento
  const { data: registro } = await supabase
    .from('almacenamiento_documentos')
    .insert({
      factura_id: facturaId,
      cliente_id: factura.cliente_id,
      nombre_archivo: fileName,
      tipo_documento: 'factura',
      tamano_bytes: pdfBuffer.length,
      estado: 'subiendo',
      onedrive_path: `${folderPath}/${fileName}`
    })
    .select()
    .single();
  
  try {
    // 6. Subir archivo a OneDrive
    const uploadUrl = `/drives/${ONEDRIVE_CONFIG.driveId}/root:/${folderPath}/${fileName}:/content`;
    
    const response = await graphClient
      .api(uploadUrl)
      .put(pdfBuffer);
    
    // 7. Actualizar registro con datos de OneDrive
    await supabase
      .from('almacenamiento_documentos')
      .update({
        estado: 'completado',
        onedrive_item_id: response.id,
        onedrive_web_url: response.webUrl,
        onedrive_download_url: response['@microsoft.graph.downloadUrl']
      })
      .eq('id', registro.id);
    
    // 8. Actualizar factura
    await supabase
      .from('facturas')
      .update({
        onedrive_url: response.webUrl,
        onedrive_subido: true,
        pdf_url: response['@microsoft.graph.downloadUrl']
      })
      .eq('id', facturaId);
    
    return {
      success: true,
      itemId: response.id,
      webUrl: response.webUrl,
      downloadUrl: response['@microsoft.graph.downloadUrl']
    };
    
  } catch (error) {
    // Registrar error
    await supabase
      .from('almacenamiento_documentos')
      .update({
        estado: 'error',
        error_mensaje: error.message
      })
      .eq('id', registro.id);
    
    throw error;
  }
}

async function ensureFolderExists(folderPath) {
  const folders = folderPath.split('/');
  let currentPath = '';
  
  for (const folder of folders) {
    currentPath = currentPath ? `${currentPath}/${folder}` : folder;
    
    try {
      await graphClient
        .api(`/drives/${ONEDRIVE_CONFIG.driveId}/root:/${currentPath}`)
        .get();
    } catch (error) {
      if (error.statusCode === 404) {
        // Crear carpeta
        const parentPath = currentPath.split('/').slice(0, -1).join('/');
        const createUrl = parentPath 
          ? `/drives/${ONEDRIVE_CONFIG.driveId}/root:/${parentPath}:/children`
          : `/drives/${ONEDRIVE_CONFIG.driveId}/root/children`;
        
        await graphClient
          .api(createUrl)
          .post({
            name: folder,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'fail'
          });
      } else {
        throw error;
      }
    }
  }
}

function sanitizeFolderName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[<>:"/\\|?*]/g, '_')   // Reemplazar caracteres inválidos
    .replace(/\s+/g, '_')            // Espacios por guiones bajos
    .substring(0, 50);               // Limitar longitud
}
```

### 5.4 Subida Masiva a OneDrive

```javascript
// src/features/envios/services/onedriveMasivoService.js
import { subirFacturaOneDrive } from './onedriveService';
import { generarPDFBuffer } from '@/features/facturacion/services/pdfService';
import { supabase } from '@/lib/supabase';

export async function subirFacturasOneDriveMasivo(facturaIds, options = {}) {
  const { onProgress, onError } = options;
  
  const resultados = {
    total: facturaIds.length,
    exitosos: 0,
    fallidos: 0,
    detalles: []
  };
  
  for (let i = 0; i < facturaIds.length; i++) {
    const facturaId = facturaIds[i];
    
    try {
      // Generar PDF si no existe
      const pdfBuffer = await generarPDFBuffer(facturaId);
      
      // Subir a OneDrive
      const resultado = await subirFacturaOneDrive(facturaId, pdfBuffer);
      
      resultados.exitosos++;
      resultados.detalles.push({
        facturaId,
        status: 'subido',
        webUrl: resultado.webUrl
      });
      
    } catch (error) {
      resultados.fallidos++;
      resultados.detalles.push({
        facturaId,
        status: 'error',
        error: error.message
      });
      
      if (onError) onError(facturaId, error);
    }
    
    if (onProgress) {
      onProgress({
        actual: i + 1,
        total: facturaIds.length,
        porcentaje: Math.round(((i + 1) / facturaIds.length) * 100)
      });
    }
  }
  
  return resultados;
}
```

---

## 6. Interfaces de Usuario

### 6.1 Pantalla: Envío de Facturas

**Ruta:** `/facturacion/enviar`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ✉️ Envío de Facturas                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Filtrar: [Todas las comunidades ▼] [Emitidas sin enviar ▼] [Nov 2025▼]│
│                                                                         │
│  Facturas pendientes de envío: 45                                       │
│                                                                         │
│  ☑️ Seleccionar todas con email válido (42)                             │
│                                                                         │
│  ┌────┬──────────────┬──────────────┬─────────────────┬───────┬───────┐│
│  │ ☑️ │ Nº Factura   │ Cliente      │ Email           │ Total │Estado ││
│  ├────┼──────────────┼──────────────┼─────────────────┼───────┼───────┤│
│  │ ☑️ │ 2/230371950  │ Oscar Zurro  │ ozurro@mail.com │ 18.30€│📨 Pend││
│  │ ☑️ │ 2/230371949  │ María López  │ mlopez@mail.com │ 25.45€│📨 Pend││
│  │ ☐ │ 2/230371948  │ Juan García  │ ⚠️ Sin email    │ 32.10€│⚠️ S/Em││
│  │ ☑️ │ 2/230371947  │ Ana Martín   │ amartin@mail.es │ 15.60€│📨 Pend││
│  │ ...│ ...          │ ...          │ ...             │ ...   │ ...   ││
│  └────┴──────────────┴──────────────┴─────────────────┴───────┴───────┘│
│                                                                         │
│  Seleccionadas: 42 facturas                                            │
│                                                                         │
│  ☑️ Subir automáticamente a OneDrive después de enviar                 │
│                                                                         │
│              [Cancelar]                [✉️ Enviar 42 facturas →]        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Modal: Progreso de Envío

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Enviando facturas...                                              [X] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ 62%   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Enviando: 26 de 42                                                    │
│  Tiempo estimado restante: ~2 minutos                                  │
│                                                                         │
│  Último enviado: Factura 2/230371947 → amartin@mail.es ✅              │
│                                                                         │
│  Resumen parcial:                                                       │
│  • ✅ Enviados: 25                                                      │
│  • ❌ Fallidos: 1                                                       │
│  • ⏳ Pendientes: 16                                                    │
│                                                                         │
│                                              [Cancelar envío]           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Pantalla: Dashboard de Envíos

**Ruta:** `/facturacion/envios`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📊 Dashboard de Envíos                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Periodo: [Noviembre 2025 ▼]                                           │
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │    156      │ │    148      │ │    142      │ │     3       │       │
│  │  Enviados   │ │ Entregados  │ │  Abiertos   │ │  Rebotados  │       │
│  │    📨       │ │     ✅      │ │     👁️      │ │     ⚠️      │       │
│  │   100%      │ │    95%      │ │    91%      │ │     2%      │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Gráfico de envíos por día                                      │   │
│  │  [Gráfico de líneas mostrando envíos diarios del mes]          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ENVÍOS RECIENTES                                      [Ver todos →]   │
│  ┌──────────────┬──────────────┬─────────────────┬────────┬─────────┐ │
│  │ Fecha/Hora   │ Factura      │ Destinatario    │ Estado │ Acción  │ │
│  ├──────────────┼──────────────┼─────────────────┼────────┼─────────┤ │
│  │ Hoy 10:32    │ 2/230371950  │ ozurro@mail.com │ ✅ Abie│ 👁️      │ │
│  │ Hoy 10:31    │ 2/230371949  │ mlopez@mail.com │ ✅ Entr│ 👁️      │ │
│  │ Hoy 10:30    │ 2/230371948  │ jgarcia@mail.com│ ⚠️ Rebo│ 👁️ 🔄   │ │
│  │ Ayer 15:22   │ 2/230371940  │ pedro@mail.es   │ ✅ Abie│ 👁️      │ │
│  └──────────────┴──────────────┴─────────────────┴────────┴─────────┘ │
│                                                                         │
│  REBOTES PENDIENTES DE REVISAR                                         │
│  ┌──────────────┬──────────────┬─────────────────┬──────────────────┐  │
│  │ Factura      │ Cliente      │ Email           │ Motivo           │  │
│  ├──────────────┼──────────────┼─────────────────┼──────────────────┤  │
│  │ 2/230371948  │ Juan García  │ jgarcia@mail.com│ Buzón no existe  │  │
│  │ 2/230371935  │ Luis Pérez   │ lperez@old.com  │ Dominio inválido │  │
│  └──────────────┴──────────────┴─────────────────┴──────────────────┘  │
│  [Actualizar emails de clientes]                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Pantalla: Historial de Envíos

**Ruta:** `/facturacion/envios/historial`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📋 Historial de Envíos                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Filtrar: [Todas ▼] [Todos los estados ▼] [Último mes ▼]               │
│  Buscar:  [Email, nº factura, cliente...              ] [🔍]           │
│                                                                         │
│  ┌──────────────┬──────────────┬──────────────┬─────────────┬────────┐ │
│  │ Fecha        │ Factura      │ Destinatario │ Estado      │ Acción │ │
│  ├──────────────┼──────────────┼──────────────┼─────────────┼────────┤ │
│  │ 26/11 10:32  │ 2/230371950  │ ozurro@...   │ 👁️ Abierto  │ 👁️     │ │
│  │ 26/11 10:31  │ 2/230371949  │ mlopez@...   │ ✅ Entregado│ 👁️     │ │
│  │ 26/11 10:30  │ 2/230371948  │ jgarcia@...  │ ⚠️ Rebotado │ 👁️ 🔄  │ │
│  │ 25/11 15:22  │ 2/230371940  │ pedro@...    │ 👁️ Abierto  │ 👁️     │ │
│  │ 25/11 15:20  │ 2/230371939  │ ana@...      │ ✅ Entregado│ 👁️     │ │
│  │ ...          │ ...          │ ...          │ ...         │ ...    │ │
│  └──────────────┴──────────────┴──────────────┴─────────────┴────────┘ │
│                                                                         │
│  Estados: 📨 Enviado  ✅ Entregado  👁️ Abierto  ⚠️ Rebotado  ❌ Fallido│
│                                                                         │
│  Mostrando 1-20 de 523 envíos                  [◄ Anterior] [Sig ►]    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.5 Pantalla: Configuración de Email

**Ruta:** `/configuracion/email`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚙️ Configuración de Email                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  REMITENTE                                                              │
│  ──────────                                                             │
│  Email remitente:    [facturas@a360se.com          ]                   │
│  Nombre remitente:   [A360 Servicios Energéticos   ]                   │
│  Responder a:        [clientes@a360se.com          ]                   │
│                                                                         │
│  PLANTILLA                                                              │
│  ─────────                                                              │
│  Asunto:             [Factura {numero_factura} - {periodo}]            │
│                      Variables: {numero_factura}, {periodo}, {cliente} │
│                                                                         │
│  [Vista previa de plantilla →]                                         │
│                                                                         │
│  CONFIGURACIÓN DE ENVÍO                                                 │
│  ──────────────────────                                                 │
│  ☐ Envío automático al emitir factura                                  │
│  Hora preferida de envío:        [09:00 ▼]                             │
│  Máximo envíos por hora:         [100    ]                             │
│                                                                         │
│  REINTENTOS                                                             │
│  ──────────                                                             │
│  ☑️ Reintentar envíos fallidos automáticamente                         │
│  Intervalo entre reintentos:     [60     ] minutos                     │
│  Máximo reintentos:              [3      ]                             │
│                                                                         │
│  COPIA ADMINISTRATIVA                                                   │
│  ────────────────────                                                   │
│  ☐ Enviar copia de cada factura a:                                     │
│     [admin@a360se.com                    ]                             │
│                                                                         │
│                           [Cancelar]    [💾 Guardar configuración]      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.6 Pantalla: Gestión OneDrive

**Ruta:** `/configuracion/onedrive`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ☁️ Configuración OneDrive                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ESTADO DE CONEXIÓN                                                     │
│  ──────────────────                                                     │
│  Estado: ✅ Conectado                                                   │
│  Cuenta: facturas@a360se.com                                           │
│  Última sincronización: Hoy 10:45                                      │
│                                                                         │
│  [🔄 Reconectar]  [🔓 Desconectar]                                      │
│                                                                         │
│  CARPETA RAÍZ                                                           │
│  ────────────                                                           │
│  Carpeta de facturas:  [Facturas_Clientes          ]                   │
│  Ruta completa: /Facturas_Clientes                                     │
│                                                                         │
│  [📂 Abrir en OneDrive]                                                │
│                                                                         │
│  ESTADÍSTICAS                                                           │
│  ────────────                                                           │
│  Documentos almacenados: 1,245                                         │
│  Espacio utilizado: 128 MB                                             │
│  Comunidades: 35                                                       │
│  Clientes con carpeta: 892                                             │
│                                                                         │
│  SUBIDA PENDIENTE                                                       │
│  ───────────────                                                        │
│  Facturas sin subir a OneDrive: 23                                     │
│                                                                         │
│  [☁️ Subir facturas pendientes]                                         │
│                                                                         │
│                           [Cancelar]    [💾 Guardar configuración]      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Componentes

### 7.1 Componentes de Envío

| Componente | Descripción |
|------------|-------------|
| `EnvioFacturasTable` | Tabla de facturas para enviar |
| `EnvioFilters` | Filtros de estado y comunidad |
| `EnvioProgress` | Modal de progreso de envío masivo |
| `EnvioResultado` | Resumen de resultados de envío |
| `EmailPreview` | Vista previa del email |

### 7.2 Componentes de Dashboard

| Componente | Descripción |
|------------|-------------|
| `EnviosStats` | Tarjetas de estadísticas |
| `EnviosChart` | Gráfico de envíos por día |
| `EnviosRecientes` | Lista de envíos recientes |
| `RebotesPendientes` | Lista de rebotes por revisar |

### 7.3 Componentes de Historial

| Componente | Descripción |
|------------|-------------|
| `HistorialEnviosTable` | Tabla de historial |
| `HistorialFilters` | Filtros de búsqueda |
| `EnvioDetalle` | Modal de detalle de envío |
| `EstadoEnvioBadge` | Badge de estado con colores |

### 7.4 Componentes de Configuración

| Componente | Descripción |
|------------|-------------|
| `EmailConfigForm` | Formulario de configuración |
| `PlantillaPreview` | Vista previa de plantilla |
| `OneDriveConfig` | Configuración de OneDrive |
| `OneDriveStatus` | Estado de conexión |

---

## 8. Hooks Personalizados

```javascript
// Envíos
useEnviosPendientes(filtros)           // Facturas pendientes de enviar
useEnviosHistorial(filtros)            // Historial de envíos
useEnvio(id)                           // Detalle de un envío
useEnviarFactura()                     // Enviar factura individual
useEnviarFacturasMasivo()              // Envío masivo
useReintentarEnvio()                   // Reintentar envío fallido

// Dashboard
useEnviosStats(periodo)                // Estadísticas de envíos
useEnviosRecientes(limit)              // Últimos envíos
useRebotesPendientes()                 // Rebotes sin revisar

// Configuración
useEmailConfig()                       // Configuración de email
useUpdateEmailConfig()                 // Actualizar configuración

// OneDrive
useOneDriveStatus()                    // Estado de conexión
useSubirOneDrive()                     // Subir factura individual
useSubirOneDriveMasivo()               // Subida masiva
useOneDriveStats()                     // Estadísticas de almacenamiento
```

---

## 9. Tareas de Implementación

### 9.1 Base de Datos

- [ ] Crear archivo `supabase/migrations/005_envios_schema.sql`
- [ ] Crear tipos ENUM (estado_envio, tipo_rebote, estado_almacenamiento)
- [ ] Crear tabla `envios_email`
- [ ] Crear tabla `almacenamiento_documentos`
- [ ] Crear tabla `configuracion_email`
- [ ] Añadir columnas a tabla `facturas`
- [ ] Insertar configuración por defecto
- [ ] Crear políticas RLS
- [ ] Crear índices

### 9.2 Dependencias

```bash
npm install resend @react-email/components @microsoft/microsoft-graph-client @azure/identity
```

- [ ] Instalar `resend` - Cliente de Resend
- [ ] Instalar `@react-email/components` - Componentes para plantillas
- [ ] Instalar `@microsoft/microsoft-graph-client` - Cliente Graph API
- [ ] Instalar `@azure/identity` - Autenticación Azure

### 9.3 Configuración Externa

- [ ] Crear cuenta en Resend
- [ ] Verificar dominio en Resend (a360se.com)
- [ ] Obtener API Key de Resend
- [ ] Configurar webhook de Resend
- [ ] Registrar aplicación en Azure AD
- [ ] Configurar permisos de Microsoft Graph
- [ ] Obtener credenciales de Azure
- [ ] Añadir variables de entorno en Vercel

### 9.4 Estructura de Carpetas

- [ ] Crear `src/features/envios/`
- [ ] Crear `src/features/envios/components/`
- [ ] Crear `src/features/envios/hooks/`
- [ ] Crear `src/features/envios/services/`
- [ ] Crear `src/features/envios/templates/`
- [ ] Crear `api/webhooks/` para serverless functions

### 9.5 Servicios de Email

- [ ] Implementar `src/lib/resend.js`
- [ ] Crear plantilla `FacturaEmailTemplate.jsx`
- [ ] Implementar `emailService.js`
- [ ] Implementar `envioMasivoService.js`
- [ ] Crear webhook `api/webhooks/resend.js`

### 9.6 Servicios de OneDrive

- [ ] Implementar `src/lib/microsoft-graph.js`
- [ ] Implementar `onedriveService.js`
- [ ] Implementar `onedriveMasivoService.js`

### 9.7 Hooks

- [ ] Implementar `useEnviosPendientes`
- [ ] Implementar `useEnviosHistorial`
- [ ] Implementar `useEnviarFactura`
- [ ] Implementar `useEnviarFacturasMasivo`
- [ ] Implementar `useEnviosStats`
- [ ] Implementar `useEmailConfig`
- [ ] Implementar `useOneDriveStatus`
- [ ] Implementar `useSubirOneDrive`
- [ ] Implementar `useSubirOneDriveMasivo`

### 9.8 Componentes de Envío

- [ ] Implementar `EnvioFacturasTable`
- [ ] Implementar `EnvioFilters`
- [ ] Implementar `EnvioProgress`
- [ ] Implementar `EnvioResultado`
- [ ] Implementar `EmailPreview`
- [ ] Crear página `EnviarFacturasPage`

### 9.9 Componentes de Dashboard

- [ ] Implementar `EnviosStats`
- [ ] Implementar `EnviosChart`
- [ ] Implementar `EnviosRecientes`
- [ ] Implementar `RebotesPendientes`
- [ ] Crear página `EnviosDashboardPage`

### 9.10 Componentes de Historial

- [ ] Implementar `HistorialEnviosTable`
- [ ] Implementar `HistorialFilters`
- [ ] Implementar `EnvioDetalle`
- [ ] Implementar `EstadoEnvioBadge`
- [ ] Crear página `HistorialEnviosPage`

### 9.11 Componentes de Configuración

- [ ] Implementar `EmailConfigForm`
- [ ] Implementar `PlantillaPreview`
- [ ] Implementar `OneDriveConfig`
- [ ] Implementar `OneDriveStatus`
- [ ] Crear página `EmailConfigPage`
- [ ] Crear página `OneDriveConfigPage`

### 9.12 Navegación

- [ ] Añadir "Envíos" al submenú de Facturación
- [ ] Añadir páginas de configuración
- [ ] Añadir rutas a React Router

### 9.13 Testing

- [ ] Probar envío individual de email
- [ ] Probar envío masivo
- [ ] Probar recepción de webhooks
- [ ] Probar reintentos automáticos
- [ ] Probar conexión con OneDrive
- [ ] Probar subida de archivos
- [ ] Probar creación de carpetas
- [ ] Verificar estructura de carpetas en OneDrive

### 9.14 Documentación

- [ ] Crear `docs/PRD/fase-4.md`
- [ ] Documentar configuración de Resend
- [ ] Documentar configuración de Azure/OneDrive
- [ ] Merge de `phase/4` a `develop`

---

## 10. Criterios de Aceptación

| # | Criterio | Verificación |
|---|----------|--------------|
| 1 | **Envío individual** | Se puede enviar una factura por email correctamente |
| 2 | **Envío masivo** | Se pueden enviar múltiples facturas con progreso visible |
| 3 | **Plantilla profesional** | El email recibido tiene formato profesional |
| 4 | **Adjunto PDF** | La factura PDF se adjunta correctamente |
| 5 | **Estados de envío** | Los estados se actualizan (enviado, entregado, abierto) |
| 6 | **Webhooks** | Los eventos de Resend actualizan el estado |
| 7 | **Reintentos** | Los envíos fallidos se reintentan automáticamente |
| 8 | **Dashboard** | Las estadísticas de envío son correctas |
| 9 | **Subida OneDrive** | Los PDFs se suben a OneDrive |
| 10 | **Estructura carpetas** | Las carpetas se crean correctamente por cliente |
| 11 | **URLs de descarga** | Los enlaces de descarga funcionan |
| 12 | **Configuración** | Se puede configurar remitente y plantilla |

---

## 11. Dependencias

### 11.1 Requiere de Fase 3

- Facturas en estado `emitida`
- PDFs generados
- Emails de clientes disponibles

### 11.2 Bloquea Fase 5

La Fase 5 (Remesas Bancarias y Reportes) requiere:
- Sistema de facturación completo funcionando
- Facturas enviadas y almacenadas

---

## 12. Notas para Agentes de IA

### Orden de Implementación Recomendado

1. **Primero:** Configuración de servicios externos (Resend, Azure)
2. **Segundo:** Migraciones de base de datos
3. **Tercero:** Servicios de email
4. **Cuarto:** Webhook de Resend
5. **Quinto:** Servicios de OneDrive
6. **Sexto:** Hooks y componentes de UI
7. **Séptimo:** Dashboard y configuración

### Rate Limiting

```javascript
// Importante: Resend tiene límites de envío
// Plan gratuito: 100 emails/día, 10/segundo
// Plan Pro: 50,000 emails/mes

// Implementar delay entre envíos
const DELAY_ENTRE_ENVIOS = 200; // ms

async function enviarConDelay(facturas) {
  for (const factura of facturas) {
    await enviarFacturaEmail(factura.id);
    await new Promise(r => setTimeout(r, DELAY_ENTRE_ENVIOS));
  }
}
```

### Manejo de Errores de Resend

```javascript
try {
  const result = await resend.emails.send(emailData);
} catch (error) {
  if (error.statusCode === 429) {
    // Rate limit - esperar y reintentar
    await sleep(60000);
    return retry();
  }
  if (error.statusCode === 422) {
    // Email inválido - marcar como error permanente
    return markAsPermanentError(error);
  }
  // Otros errores - programar reintento
  return scheduleRetry(error);
}
```

### Autenticación de Microsoft Graph

```javascript
// Usar Client Credentials Flow para aplicación server-side
// No requiere interacción del usuario

// Permisos necesarios en Azure AD:
// - Files.ReadWrite.All (para OneDrive)
// - User.Read (para verificar conexión)

// Scope para client credentials:
const scopes = ['https://graph.microsoft.com/.default'];
```

### Variables de Entorno

```env
# Añadir a .env.local y Vercel
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MICROSOFT_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ONEDRIVE_DRIVE_ID=xxxxxxxxxxxxxxxx
ONEDRIVE_ROOT_FOLDER=Facturas_Clientes
```

---

*Fin del PRD Fase 4*
