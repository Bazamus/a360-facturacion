# PRD CRM Fase 1: Comunicaciones y WhatsApp

## Sistema CRM/SAT - Expansion sobre Facturacion A360

| Campo | Valor |
|-------|-------|
| **Cliente** | A360 Servicios Energeticos S.L. |
| **Proyecto** | CRM / SAT sobre Sistema de Facturacion |
| **Version** | 2.0 |
| **Fecha** | Enero 2026 |
| **Fase CRM** | 1 de 4 |
| **Dependencia** | Requiere CRM Fase 0 completada |

---

## 1. Objetivo de esta Fase

Implementar un sistema de comunicaciones omnicanal centrado en WhatsApp para reducir el volumen de llamadas telefonicas. Al completar esta fase, los agentes de A360 podran gestionar conversaciones de WhatsApp desde Chatwoot, con registro automatico en la base de datos de Supabase y asociacion a clientes existentes.

### Entregables principales

- Infraestructura VPS con Evolution API + Chatwoot + n8n desplegados (via EasyPanel)
- Tablas de comunicaciones en Supabase (sin tocar tablas existentes)
- Integracion nativa Evolution API <-> Chatwoot (sin workflow intermedio)
- Workflow n8n para sincronizacion con Supabase
- Dashboard de comunicaciones en la app React
- Widget de live chat integrado (via Chatwoot)

### Prioridad de negocio

El objetivo principal es **reducir el volumen de llamadas telefonicas** canalizando consultas por WhatsApp. Esto permite:
- Respuestas asincronas (no requiere atencion inmediata)
- Historial de conversaciones consultable
- Atencion simultanea a multiples clientes
- Base para automatizacion futura con IA

---

## 2. Garantias de Seguridad

### 2.1 Impacto en Base de Datos Existente

| Accion | Detalle |
|--------|---------|
| Tablas nuevas | 3 (`comunicaciones`, `plantillas_mensaje`, `canales_configuracion`) |
| Tablas modificadas | 0 |
| Funciones modificadas | 0 |
| Vistas modificadas | 0 |
| Politicas RLS modificadas | 0 |

**Riesgo para produccion: NULO** - Solo se crean tablas y funciones nuevas.

### 2.2 Arquitectura de Aislamiento

Las nuevas tablas se relacionan con `clientes` y `auth.users` mediante Foreign Keys de LECTURA. No modifican ni el esquema ni el comportamiento de estas tablas.

```
comunicaciones.cliente_id --> clientes.id (FK, no modifica clientes)
comunicaciones.usuario_id --> auth.users.id (FK, no modifica auth)
plantillas_mensaje (independiente)
canales_configuracion (independiente)
```

---

## 3. Arquitectura de Infraestructura

### 3.1 Stack de Comunicaciones

```
                    ┌──────────────────────────────────────────────┐
                    │              VPS (EasyPanel)                   │
                    │                                               │
 WhatsApp ◄────────┤  ┌─────────────┐    ┌──────────┐             │
 (usuarios)        │  │ Evolution   │═══►│ Chatwoot │             │
                    │  │ API         │    │ (Inbox   │             │
                    │  │ (Motor WA)  │    │ omnicanal)│            │
                    │  └─────┬───────┘    └─────┬────┘             │
                    │        │ Integracion       │                  │
                    │        │ nativa            │                  │
                    │        └───────────────────┘                  │
                    │                                               │
                    │          ┌────────┐                           │
                    │          │  n8n   │                           │
                    │          │(Sync   │                           │
                    │          │Supabase)│                          │
                    │          └────┬───┘                           │
                    │               │                               │
                    └───────────────┼───────────────────────────────┘
                                    │ Webhook / API
                                    ▼
                    ┌───────────────────────────────┐
                    │     Supabase (existente)       │
                    │  comunicaciones (tabla nueva)   │
                    │  clientes (lectura, asociar)    │
                    └───────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   React App (existente)        │
                    │  Dashboard Comunicaciones       │
                    │  (nueva pagina)                 │
                    └───────────────────────────────┘
```

**Ventaja clave de la nueva arquitectura:** Evolution API se integra nativamente con
Chatwoot mediante su endpoint `/chatwoot/set/{{instance}}`, eliminando la necesidad
de un workflow n8n intermedio para el flujo de mensajes WhatsApp <-> Chatwoot.
n8n solo se usa para sincronizar datos con Supabase.

### 3.2 Componentes del Stack

| Servicio | Funcion | Puerto | Imagen Docker |
|----------|---------|--------|---------------|
| Evolution API | Motor WhatsApp (API REST, integracion nativa Chatwoot) | 8080 | `atendai/evolution-api` |
| Chatwoot | Plataforma omnicanal | 3000 | `chatwoot/chatwoot` |
| n8n | Orquestador de workflows (sync Supabase) | 5678 | `n8nio/n8n` |
| PostgreSQL (Chatwoot) | BD dedicada para Chatwoot | 5433 | `postgres:15` |
| Redis | Cache para Chatwoot + Evolution API | 6379 | `redis:7` |

**Nota:** Chatwoot usa su propia PostgreSQL separada de Supabase. No comparten base de datos.

**Nota:** Evolution API se despliega facilmente desde el catalogo de EasyPanel (template oficial disponible).

### 3.3 Despliegue en EasyPanel

Los servicios se despliegan como aplicaciones independientes en EasyPanel:

**1. Evolution API** (desde catalogo EasyPanel - template oficial)
- Image: `atendai/evolution-api` (o `evoapicloud/evolution-api:v2.3.7`)
- Puerto: 8080

**2. Chatwoot** (desde catalogo EasyPanel o Docker Compose)
- Incluye: chatwoot, chatwoot_worker, chatwoot_db, chatwoot_redis

**3. n8n** (desde catalogo EasyPanel)
- Puerto: 5678

#### Docker Compose alternativo (si no se usa catalogo)

```yaml
version: '3.8'

services:
  evolution-api:
    image: atendai/evolution-api
    container_name: evolution_api
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - AUTHENTICATION_API_KEY=${EVOLUTION_API_KEY}
      - SERVER_URL=https://api-wa.a360se.com
      - CONFIG_SESSION_PHONE_CLIENT=A360
      - CONFIG_SESSION_PHONE_NAME=Chrome
      - CACHE_REDIS_ENABLED=true
      - CACHE_REDIS_URI=redis://redis:6379
      - CACHE_REDIS_PREFIX_KEY=evolution
      - WEBHOOK_GLOBAL_ENABLED=true
      - WEBHOOK_GLOBAL_URL=https://n8n.a360se.com/webhook/evolution
    volumes:
      - evolution_store:/evolution/store
      - evolution_instances:/evolution/instances

  chatwoot_db:
    image: postgres:15
    container_name: chatwoot_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: chatwoot
      POSTGRES_USER: chatwoot
      POSTGRES_PASSWORD: ${CHATWOOT_DB_PASS}
    volumes:
      - chatwoot_pg_data:/var/lib/postgresql/data
    ports:
      - "5433:5432"

  redis:
    image: redis:7
    container_name: redis
    restart: unless-stopped
    volumes:
      - redis_data:/data

  chatwoot:
    image: chatwoot/chatwoot:latest
    container_name: chatwoot
    restart: unless-stopped
    depends_on:
      - chatwoot_db
      - redis
    ports:
      - "3000:3000"
    environment:
      - RAILS_ENV=production
      - SECRET_KEY_BASE=${CHATWOOT_SECRET}
      - FRONTEND_URL=https://chat.a360se.com
      - DATABASE_URL=postgresql://chatwoot:${CHATWOOT_DB_PASS}@chatwoot_db:5432/chatwoot
      - REDIS_URL=redis://redis:6379
      - RAILS_LOG_TO_STDOUT=true
    command: bundle exec rails s -p 3000 -b 0.0.0.0

  chatwoot_worker:
    image: chatwoot/chatwoot:latest
    container_name: chatwoot_worker
    restart: unless-stopped
    depends_on:
      - chatwoot_db
      - redis
    environment:
      - RAILS_ENV=production
      - SECRET_KEY_BASE=${CHATWOOT_SECRET}
      - DATABASE_URL=postgresql://chatwoot:${CHATWOOT_DB_PASS}@chatwoot_db:5432/chatwoot
      - REDIS_URL=redis://redis:6379
    command: bundle exec sidekiq -C config/sidekiq.yml

  n8n:
    image: n8nio/n8n
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASS}
      - WEBHOOK_URL=https://n8n.a360se.com/
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  evolution_store:
  evolution_instances:
  chatwoot_pg_data:
  redis_data:
  n8n_data:
```

### 3.4 Variables de Entorno VPS

```env
# Evolution API
EVOLUTION_API_KEY=<api-key-segura>

# Chatwoot
CHATWOOT_SECRET=<secret-key-64-chars>
CHATWOOT_DB_PASS=<password-seguro>

# n8n
N8N_USER=admin
N8N_PASS=<password-seguro>

# Supabase (para n8n)
SUPABASE_URL=https://rvxmczogxoncdlxpptgb.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
```

### 3.5 Dominios y SSL

| Subdominio | Servicio | Puerto interno |
|------------|----------|----------------|
| `chat.a360se.com` | Chatwoot | 3000 |
| `api-wa.a360se.com` | Evolution API (Manager + API) | 8080 |
| `n8n.a360se.com` | n8n | 5678 |

SSL via EasyPanel (Let's Encrypt automatico).

### 3.6 Configuracion de la integracion Evolution API <-> Chatwoot

Una vez desplegados ambos servicios, la integracion se configura con una sola
llamada API a Evolution API. No requiere workflow n8n intermedio.

**Crear instancia con Chatwoot integrado:**

```bash
curl -X POST "https://api-wa.a360se.com/instance/create" \
  -H "apikey: ${EVOLUTION_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "a360-whatsapp",
    "integration": "CHATWOOT",
    "chatwootAccountId": 1,
    "chatwootToken": "<CHATWOOT_API_TOKEN>",
    "chatwootUrl": "https://chat.a360se.com",
    "chatwootSignMsg": true,
    "chatwootReopenConversation": true,
    "chatwootConversationPending": false,
    "chatwootImportContacts": true,
    "chatwootImportMessages": true,
    "chatwootDaysLimitImportMessages": 30,
    "chatwootAutoCreate": true
  }'
```

**Parametros clave:**
| Parametro | Funcion |
|-----------|---------|
| `chatwootAutoCreate` | Crea automaticamente el inbox en Chatwoot |
| `chatwootSignMsg` | Firma los mensajes con nombre del agente |
| `chatwootReopenConversation` | Reabre conversacion al recibir nuevo mensaje |
| `chatwootImportContacts` | Sincroniza contactos de WhatsApp a Chatwoot |
| `chatwootImportMessages` | Importa historial de mensajes recientes |

Tras crear la instancia, acceder al Manager de Evolution API
(`https://api-wa.a360se.com/manager`) para escanear el QR de WhatsApp.

---

## 4. Migracion SQL: `037_crm_comunicaciones.sql`

### 4.1 Tablas Nuevas

```sql
BEGIN;

-- ============================================================
-- 1. Tabla: comunicaciones
--    Registro centralizado de todos los mensajes (WhatsApp, email, chat)
-- ============================================================
CREATE TABLE IF NOT EXISTS comunicaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relaciones (FK de lectura, no modifican tablas existentes)
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Canal y direccion
  canal TEXT NOT NULL CHECK (canal IN ('whatsapp', 'email', 'chat', 'telefono', 'sms')),
  direccion TEXT NOT NULL CHECK (direccion IN ('entrante', 'saliente')),
  
  -- Contenido
  contenido TEXT NOT NULL,
  contenido_tipo TEXT NOT NULL DEFAULT 'texto' 
    CHECK (contenido_tipo IN ('texto', 'imagen', 'documento', 'audio', 'video', 'ubicacion')),
  
  -- Metadatos del mensaje
  remitente_nombre TEXT,
  remitente_telefono TEXT,
  remitente_email TEXT,
  destinatario TEXT,
  
  -- Estado
  estado TEXT NOT NULL DEFAULT 'recibido' 
    CHECK (estado IN ('recibido', 'leido', 'respondido', 'archivado', 'enviado', 'entregado', 'fallido')),
  
  -- IDs externos para trazabilidad
  external_id TEXT,           -- ID del mensaje en Evolution API / WhatsApp
  chatwoot_conversation_id TEXT, -- ID de conversacion en Chatwoot
  chatwoot_message_id TEXT,   -- ID del mensaje en Chatwoot
  
  -- Metadata adicional (flexible)
  metadata JSONB DEFAULT '{}',
  
  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_comunicaciones_cliente ON comunicaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_comunicaciones_canal ON comunicaciones(canal);
CREATE INDEX IF NOT EXISTS idx_comunicaciones_estado ON comunicaciones(estado);
CREATE INDEX IF NOT EXISTS idx_comunicaciones_created ON comunicaciones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comunicaciones_telefono ON comunicaciones(remitente_telefono);
CREATE INDEX IF NOT EXISTS idx_comunicaciones_external ON comunicaciones(external_id);

CREATE TRIGGER comunicaciones_updated_at
  BEFORE UPDATE ON comunicaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. Tabla: plantillas_mensaje
--    Plantillas reutilizables para respuestas frecuentes
-- ============================================================
CREATE TABLE IF NOT EXISTS plantillas_mensaje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  nombre TEXT NOT NULL,
  canal TEXT NOT NULL CHECK (canal IN ('whatsapp', 'email', 'chat', 'todos')),
  categoria TEXT DEFAULT 'general' 
    CHECK (categoria IN ('general', 'facturacion', 'sat', 'urgencias', 'bienvenida')),
  
  -- Contenido con variables (ej: "Hola {{nombre}}, su factura...")
  contenido TEXT NOT NULL,
  variables TEXT[], -- Lista de variables disponibles: ['nombre', 'factura', 'importe']
  
  -- Estado
  activa BOOLEAN NOT NULL DEFAULT true,
  
  -- Auditoria
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER plantillas_mensaje_updated_at
  BEFORE UPDATE ON plantillas_mensaje
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. Tabla: canales_configuracion
--    Configuracion por canal de comunicacion
-- ============================================================
CREATE TABLE IF NOT EXISTS canales_configuracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  canal TEXT NOT NULL UNIQUE CHECK (canal IN ('whatsapp', 'email', 'chat', 'telefono', 'sms')),
  activo BOOLEAN NOT NULL DEFAULT false,
  
  -- Configuracion especifica del canal (JSON flexible)
  -- WhatsApp: { evolution_api_url, evolution_instance, chatwoot_inbox_id }
  -- Email: { resend_api_key, from_email }
  -- Chat: { chatwoot_website_token }
  configuracion JSONB NOT NULL DEFAULT '{}',
  
  -- Auditoria
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER canales_configuracion_updated_at
  BEFORE UPDATE ON canales_configuracion
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. Politicas RLS
-- ============================================================
ALTER TABLE comunicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas_mensaje ENABLE ROW LEVEL SECURITY;
ALTER TABLE canales_configuracion ENABLE ROW LEVEL SECURITY;

-- Comunicaciones: roles CRM pueden leer, admin puede todo
CREATE POLICY "Roles CRM pueden leer comunicaciones"
  ON comunicaciones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.rol IN ('admin', 'encargado', 'tecnico')
    )
  );

CREATE POLICY "Roles CRM pueden crear comunicaciones"
  ON comunicaciones FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.rol IN ('admin', 'encargado')
    )
  );

CREATE POLICY "Admin puede modificar comunicaciones"
  ON comunicaciones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

-- Clientes pueden ver sus propias comunicaciones
CREATE POLICY "Clientes ven sus comunicaciones"
  ON comunicaciones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN clientes c ON c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      WHERE p.id = auth.uid() 
      AND p.rol = 'cliente'
      AND comunicaciones.cliente_id = c.id
    )
  );

-- Plantillas: todos los autenticados leen, admin modifica
CREATE POLICY "Autenticados pueden leer plantillas"
  ON plantillas_mensaje FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin puede modificar plantillas"
  ON plantillas_mensaje FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

-- Canales: todos leen, admin modifica
CREATE POLICY "Autenticados pueden leer canales"
  ON canales_configuracion FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin puede modificar canales"
  ON canales_configuracion FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

-- ============================================================
-- 5. Vistas
-- ============================================================
CREATE OR REPLACE VIEW v_comunicaciones_resumen AS
SELECT 
  com.id,
  com.canal,
  com.direccion,
  com.contenido,
  com.contenido_tipo,
  com.estado,
  com.remitente_nombre,
  com.remitente_telefono,
  com.created_at,
  -- Datos del cliente asociado
  c.id AS cliente_id,
  c.nombre || ' ' || c.apellidos AS cliente_nombre,
  c.telefono AS cliente_telefono,
  c.email AS cliente_email,
  -- Datos del usuario que gestiono
  p.nombre_completo AS usuario_nombre
FROM comunicaciones com
LEFT JOIN clientes c ON com.cliente_id = c.id
LEFT JOIN profiles p ON com.usuario_id = p.id
ORDER BY com.created_at DESC;

-- ============================================================
-- 6. Funciones
-- ============================================================

-- Funcion para buscar cliente por telefono (usada por n8n)
CREATE OR REPLACE FUNCTION buscar_cliente_por_telefono(p_telefono TEXT)
RETURNS TABLE (
  cliente_id UUID,
  nombre TEXT,
  apellidos TEXT,
  email TEXT,
  telefono TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Buscar por telefono principal o secundario
  -- Normalizar: quitar espacios, guiones, prefijo +34
  RETURN QUERY
  SELECT 
    c.id,
    c.nombre,
    c.apellidos,
    c.email,
    c.telefono
  FROM clientes c
  WHERE 
    REPLACE(REPLACE(REPLACE(c.telefono, ' ', ''), '-', ''), '+34', '') = 
    REPLACE(REPLACE(REPLACE(p_telefono, ' ', ''), '-', ''), '+34', '')
    OR
    REPLACE(REPLACE(REPLACE(c.telefono_secundario, ' ', ''), '-', ''), '+34', '') = 
    REPLACE(REPLACE(REPLACE(p_telefono, ' ', ''), '-', ''), '+34', '')
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION buscar_cliente_por_telefono TO authenticated;

-- Funcion para estadisticas de comunicaciones
CREATE OR REPLACE FUNCTION get_comunicaciones_stats(
  p_fecha_inicio DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
  p_fecha_fin DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_mensajes', COUNT(*),
    'entrantes', COUNT(*) FILTER (WHERE direccion = 'entrante'),
    'salientes', COUNT(*) FILTER (WHERE direccion = 'saliente'),
    'por_canal', json_build_object(
      'whatsapp', COUNT(*) FILTER (WHERE canal = 'whatsapp'),
      'email', COUNT(*) FILTER (WHERE canal = 'email'),
      'chat', COUNT(*) FILTER (WHERE canal = 'chat'),
      'telefono', COUNT(*) FILTER (WHERE canal = 'telefono')
    ),
    'pendientes_respuesta', COUNT(*) FILTER (WHERE estado = 'recibido' AND direccion = 'entrante'),
    'clientes_contactados', COUNT(DISTINCT cliente_id)
  ) INTO v_result
  FROM comunicaciones
  WHERE created_at >= p_fecha_inicio
    AND created_at < p_fecha_fin + INTERVAL '1 day';
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_comunicaciones_stats TO authenticated;

-- Insertar configuracion inicial de canales
INSERT INTO canales_configuracion (canal, activo, configuracion) VALUES
  ('whatsapp', false, '{"evolution_api_url": "", "evolution_instance": "a360-whatsapp", "chatwoot_inbox_id": ""}'),
  ('email', true, '{"provider": "resend", "from_email": "clientes@a360se.com"}'),
  ('chat', false, '{"chatwoot_website_token": ""}'),
  ('telefono', false, '{"notas": "Registro manual de llamadas"}'),
  ('sms', false, '{}')
ON CONFLICT (canal) DO NOTHING;

-- Insertar plantillas iniciales
INSERT INTO plantillas_mensaje (nombre, canal, categoria, contenido, variables) VALUES
  ('Saludo WhatsApp', 'whatsapp', 'bienvenida', 
   'Hola {{nombre}}, gracias por contactar con A360 Servicios Energeticos. ¿En que podemos ayudarle?', 
   ARRAY['nombre']),
  ('Factura disponible', 'whatsapp', 'facturacion',
   'Hola {{nombre}}, le informamos que su factura {{numero_factura}} por importe de {{importe}} ya esta disponible. Puede consultarla en su portal de cliente.',
   ARRAY['nombre', 'numero_factura', 'importe']),
  ('Cita confirmada', 'whatsapp', 'sat',
   'Hola {{nombre}}, confirmamos su cita para el dia {{fecha}} a las {{hora}}. Nuestro tecnico {{tecnico}} le atendera.',
   ARRAY['nombre', 'fecha', 'hora', 'tecnico']),
  ('Aviso urgencia', 'whatsapp', 'urgencias',
   'AVISO: Se ha detectado una incidencia en su comunidad {{comunidad}}. Nuestro equipo tecnico ya esta trabajando en la solucion.',
   ARRAY['comunidad'])
ON CONFLICT DO NOTHING;

COMMIT;
```

---

## 5. Workflows n8n

**Nota:** Con Evolution API, el flujo WhatsApp <-> Chatwoot es **nativo** y no requiere
workflow n8n. Los workflows de n8n se centran en la sincronizacion con Supabase.

### 5.1 Workflow: Registrar mensajes en Supabase

**Trigger:** Webhook de Evolution API (eventos `MESSAGES_UPSERT`, `SEND_MESSAGE`)

**Flujo:**
1. Recibir webhook de Evolution API con datos del mensaje
2. Determinar direccion (entrante/saliente) segun el evento
3. Extraer telefono del remitente
4. Llamar a `buscar_cliente_por_telefono()` en Supabase para asociar cliente
5. Insertar registro en tabla `comunicaciones`
6. Si es entrante y no hay cliente asociado, marcar como pendiente de vinculacion

### 5.2 Workflow: Sincronizacion de Clientes

**Trigger:** Programado (diario) o webhook de Supabase (nuevo cliente)

**Flujo:**
1. Obtener clientes nuevos/actualizados de Supabase
2. Crear/actualizar contactos en Chatwoot via API
3. Vincular por telefono

### 5.3 Workflow: Actualizacion de estados

**Trigger:** Webhook de Evolution API (evento `MESSAGES_UPDATE`)

**Flujo:**
1. Recibir evento de actualizacion (entregado, leido)
2. Buscar mensaje en tabla `comunicaciones` por `external_id`
3. Actualizar campo `estado` segun el nuevo estado del mensaje

---

## 6. Frontend: Dashboard de Comunicaciones

### 6.1 Estructura de Paginas

```
/comunicaciones               -> Dashboard principal
/comunicaciones/conversaciones -> Lista de conversaciones (iframe Chatwoot)
/comunicaciones/plantillas     -> Gestion de plantillas
/comunicaciones/configuracion  -> Configuracion de canales
```

### 6.2 Dashboard Principal

**Componentes:**

- **KPIs superiores:** Mensajes hoy, Pendientes de respuesta, Tiempo medio respuesta, Clientes contactados
- **Grafico:** Volumen de mensajes por dia (ultimos 30 dias) con Recharts
- **Lista:** Ultimos mensajes entrantes sin responder
- **Acceso rapido:** Boton "Abrir Chatwoot" (nueva pestana)

### 6.3 Hooks

**Archivo nuevo:** `src/hooks/useComunicaciones.js`

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Lista de comunicaciones con filtros
export function useComunicaciones({ canal, estado, clienteId, limit = 50 } = {}) {
  return useQuery({
    queryKey: ['comunicaciones', { canal, estado, clienteId, limit }],
    queryFn: async () => {
      let query = supabase
        .from('v_comunicaciones_resumen')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (canal) query = query.eq('canal', canal)
      if (estado) query = query.eq('estado', estado)
      if (clienteId) query = query.eq('cliente_id', clienteId)
      
      const { data, error } = await query
      if (error) throw error
      return data
    },
    refetchInterval: 30000, // Refrescar cada 30 segundos
  })
}

// Estadisticas de comunicaciones
export function useComunicacionesStats(fechaInicio, fechaFin) {
  return useQuery({
    queryKey: ['comunicaciones-stats', fechaInicio, fechaFin],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_comunicaciones_stats', {
        p_fecha_inicio: fechaInicio,
        p_fecha_fin: fechaFin
      })
      if (error) throw error
      return data
    },
    refetchInterval: 60000,
  })
}

// Registrar comunicacion manual (ej: llamada telefonica)
export function useRegistrarComunicacion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (comunicacion) => {
      const { data, error } = await supabase
        .from('comunicaciones')
        .insert(comunicacion)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comunicaciones'] })
      queryClient.invalidateQueries({ queryKey: ['comunicaciones-stats'] })
    }
  })
}

// Plantillas de mensaje
export function usePlantillas(canal) {
  return useQuery({
    queryKey: ['plantillas-mensaje', canal],
    queryFn: async () => {
      let query = supabase
        .from('plantillas_mensaje')
        .select('*')
        .eq('activa', true)
        .order('categoria')
      
      if (canal && canal !== 'todos') {
        query = query.or(`canal.eq.${canal},canal.eq.todos`)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data
    }
  })
}
```

---

## 7. Tareas de Implementacion

### 7.1 Infraestructura VPS

- [ ] Acceder al VPS via EasyPanel
- [ ] Desplegar Evolution API desde catalogo EasyPanel (template oficial)
- [ ] Desplegar Chatwoot desde catalogo EasyPanel o Docker Compose
- [ ] Desplegar n8n desde catalogo EasyPanel
- [ ] Configurar variables de entorno de cada servicio
- [ ] Configurar subdominios DNS (chat, api-wa, n8n)
- [ ] Verificar SSL en los 3 subdominios
- [ ] Crear instancia en Evolution API con integracion Chatwoot nativa (ver seccion 3.6)
- [ ] Escanear QR WhatsApp desde Manager de Evolution API
- [ ] Verificar que inbox se crea automaticamente en Chatwoot
- [ ] Configurar n8n: crear credenciales de Supabase y webhook de Evolution API

### 7.2 Base de Datos

- [ ] Crear `supabase/migrations/037_crm_comunicaciones.sql`
- [ ] Ejecutar en entorno local primero
- [ ] Verificar que tablas existentes no se ven afectadas
- [ ] Ejecutar en produccion (con backup)

### 7.3 Workflows n8n

- [ ] Crear workflow: Registrar mensajes en Supabase (webhook Evolution API -> Supabase)
- [ ] Crear workflow: Sincronizacion clientes (Supabase -> Chatwoot API)
- [ ] Crear workflow: Actualizacion de estados (webhook Evolution API -> Supabase)
- [ ] Probar flujo completo: enviar WhatsApp -> recibir en Chatwoot -> responder -> recibir respuesta

### 7.4 Frontend

- [ ] Crear `src/hooks/useComunicaciones.js`
- [ ] Exportar hooks desde `src/hooks/index.js`
- [ ] Expandir `src/pages/Comunicaciones.jsx` (reemplazar placeholder)
- [ ] Crear componentes en `src/features/comunicaciones/`:
  - [ ] `ComunicacionesDashboard.jsx` - Dashboard con KPIs
  - [ ] `UltimosMensajes.jsx` - Lista de mensajes recientes
  - [ ] `PlantillasList.jsx` - Gestion de plantillas
  - [ ] `CanalesConfig.jsx` - Configuracion de canales
- [ ] Actualizar rutas en Comunicaciones.jsx
- [ ] Verificar build: `npm run build`

### 7.5 Validacion

- [ ] Enviar mensaje WhatsApp al numero de A360
- [ ] Verificar que aparece en Chatwoot
- [ ] Verificar que se registra en tabla `comunicaciones`
- [ ] Responder desde Chatwoot
- [ ] Verificar que el cliente recibe la respuesta en WhatsApp
- [ ] Verificar que el dashboard muestra estadisticas correctas
- [ ] Verificar que rutas existentes (/facturacion, etc.) no se ven afectadas

---

## 8. Criterios de Aceptacion

| # | Criterio | Verificacion |
|---|----------|--------------|
| 1 | **VPS operativo** | Evolution API, Chatwoot y n8n corriendo en EasyPanel |
| 2 | **Evolution API conectado** | WhatsApp vinculado via QR, instancia activa |
| 3 | **Chatwoot funcional** | Inbox creado automaticamente, agentes pueden gestionar conversaciones |
| 4 | **Flujo bidireccional** | Mensajes fluyen: WhatsApp <-> Evolution API <-> Chatwoot (nativo) + registro en Supabase (via n8n) |
| 5 | **BD sin impacto** | Tablas existentes funcionan identicas |
| 6 | **Dashboard operativo** | Estadisticas y lista de mensajes en la app React |
| 7 | **Clientes asociados** | Mensajes se vinculan automaticamente al cliente por telefono |
| 8 | **Plantillas funcionan** | Se pueden usar plantillas predefinidas para responder |

---

## 9. Dependencias

### 9.1 Requiere

- CRM Fase 0 completada (roles, rutas, sidebar)
- VPS con EasyPanel operativo
- Numero de telefono dedicado para WhatsApp Business
- Dominio con capacidad de crear subdominios (a360se.com)

### 9.2 Bloquea

- **CRM Fase 2** (SAT): Usara comunicaciones para notificar citas y partes de trabajo
- **CRM Fase 3** (Portal): Widget de chat Chatwoot se incrustara en el portal
- **CRM Fase 4** (IA): Chatwoot Captain se configura sobre esta infraestructura

---

## 10. Notas para Agentes de IA

### Orden de Implementacion

1. **Primero:** Migracion SQL (tablas, funciones, plantillas)
2. **Segundo:** Infraestructura VPS (EasyPanel: Evolution API, Chatwoot, n8n)
3. **Tercero:** Configuracion servicios (crear instancia Evolution API con integracion Chatwoot nativa)
4. **Cuarto:** Workflows n8n (sync con Supabase)
5. **Quinto:** Frontend (hooks, dashboard, componentes)

### Consideraciones importantes

- La infraestructura VPS se despliega via **EasyPanel** (templates oficiales disponibles)
- Evolution API se integra **nativamente** con Chatwoot (no requiere n8n intermedio para el flujo de mensajes)
- Los workflows n8n se configuran via **UI web** (no son codigo) y solo se usan para sincronizar con Supabase
- Evolution API requiere **escanear un QR** de WhatsApp desde su Manager web (proceso manual)
- El frontend solo CONSULTA datos de `comunicaciones` - no envia mensajes directamente
- La gestion de conversaciones se hace en la **UI de Chatwoot** (no en nuestra app)
- Evolution API soporta tanto Baileys (WhatsApp Web) como WhatsApp Cloud API oficial

### Archivos que se CREAN

- `supabase/migrations/037_crm_comunicaciones.sql`
- `src/hooks/useComunicaciones.js`
- `src/features/comunicaciones/ComunicacionesDashboard.jsx`
- `src/features/comunicaciones/UltimosMensajes.jsx`
- `src/features/comunicaciones/PlantillasList.jsx`
- `src/features/comunicaciones/CanalesConfig.jsx`
- `docker-compose.yml` (en el VPS, no en el repo)

### Archivos que se MODIFICAN

- `src/pages/Comunicaciones.jsx` - Reemplazar placeholder
- `src/hooks/index.js` - Anadir exports

---

*Fin del PRD CRM Fase 1*
