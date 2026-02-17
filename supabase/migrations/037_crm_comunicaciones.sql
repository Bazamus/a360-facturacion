-- ============================================================
-- Migracion 037: CRM Comunicaciones
-- Fase CRM 1 - Comunicaciones y WhatsApp
--
-- IMPACTO: NULO en tablas existentes
-- - Crea 3 tablas nuevas: comunicaciones, plantillas_mensaje, canales_configuracion
-- - Crea 1 vista nueva: v_comunicaciones_resumen
-- - Crea 2 funciones nuevas: buscar_cliente_por_telefono, get_comunicaciones_stats
-- - Inserta datos iniciales de canales y plantillas
-- ============================================================

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
  external_id TEXT,
  chatwoot_conversation_id TEXT,
  chatwoot_message_id TEXT,

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

  -- Contenido con variables: "Hola {{nombre}}, su factura..."
  contenido TEXT NOT NULL,
  variables TEXT[],

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

-- Comunicaciones: roles CRM pueden leer
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

-- Clientes ven sus propias comunicaciones
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

-- Plantillas: todos autenticados leen, admin modifica
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
-- 5. Vista resumen de comunicaciones
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
  com.remitente_email,
  com.destinatario,
  com.external_id,
  com.chatwoot_conversation_id,
  com.metadata,
  com.created_at,
  com.updated_at,
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

-- Buscar cliente por telefono (usada por n8n para asociar mensajes)
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

-- Estadisticas de comunicaciones
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

-- ============================================================
-- 7. Datos iniciales
-- ============================================================

-- Configuracion de canales
INSERT INTO canales_configuracion (canal, activo, configuracion) VALUES
  ('whatsapp', false, '{"evolution_api_url": "", "evolution_instance": "a360-whatsapp", "chatwoot_inbox_id": ""}'),
  ('email', true, '{"provider": "resend", "from_email": "clientes@a360se.com"}'),
  ('chat', false, '{"chatwoot_website_token": ""}'),
  ('telefono', false, '{"notas": "Registro manual de llamadas"}'),
  ('sms', false, '{}')
ON CONFLICT (canal) DO NOTHING;

-- Plantillas de mensaje
INSERT INTO plantillas_mensaje (nombre, canal, categoria, contenido, variables) VALUES
  ('Saludo WhatsApp', 'whatsapp', 'bienvenida',
   'Hola {{nombre}}, gracias por contactar con A360 Servicios Energeticos. En que podemos ayudarle?',
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
