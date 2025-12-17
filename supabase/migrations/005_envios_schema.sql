-- Migration: 005_envios_schema.sql
-- Description: Schema para envío de facturas por email y almacenamiento en OneDrive
-- Date: 2025-12-17

-- =====================================================
-- TIPOS ENUMERADOS
-- =====================================================

-- Estado del envío de email
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

-- Tipo de rebote
CREATE TYPE tipo_rebote AS ENUM (
  'hard',           -- Rebote permanente (dirección no existe)
  'soft',           -- Rebote temporal (buzón lleno, etc.)
  'spam'            -- Marcado como spam
);

-- Estado del almacenamiento
CREATE TYPE estado_almacenamiento AS ENUM (
  'pendiente',
  'subiendo',
  'completado',
  'error'
);

-- =====================================================
-- TABLAS
-- =====================================================

-- Tabla de envíos de email
CREATE TABLE envios_email (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencias
  factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
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

-- Tabla de almacenamiento de documentos (OneDrive)
CREATE TABLE almacenamiento_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencias
  factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
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

-- Tabla de configuración de email
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

-- =====================================================
-- COLUMNAS ADICIONALES EN FACTURAS
-- =====================================================

-- Añadir columnas de envío a facturas
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS email_enviado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS fecha_email_enviado TIMESTAMPTZ;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS onedrive_url TEXT;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS onedrive_subido BOOLEAN NOT NULL DEFAULT false;

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX idx_envios_email_factura ON envios_email(factura_id);
CREATE INDEX idx_envios_email_cliente ON envios_email(cliente_id);
CREATE INDEX idx_envios_email_estado ON envios_email(estado);
CREATE INDEX idx_envios_email_fecha ON envios_email(created_at DESC);
CREATE INDEX idx_envios_email_pendientes ON envios_email(estado, proximo_reintento) 
  WHERE estado IN ('pendiente', 'fallido');
CREATE INDEX idx_envios_email_resend ON envios_email(resend_id) WHERE resend_id IS NOT NULL;

CREATE INDEX idx_almacenamiento_factura ON almacenamiento_documentos(factura_id);
CREATE INDEX idx_almacenamiento_cliente ON almacenamiento_documentos(cliente_id);
CREATE INDEX idx_almacenamiento_estado ON almacenamiento_documentos(estado);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER envios_email_updated_at
  BEFORE UPDATE ON envios_email
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER almacenamiento_documentos_updated_at
  BEFORE UPDATE ON almacenamiento_documentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE envios_email ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacenamiento_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_email ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura
CREATE POLICY "Usuarios autenticados pueden leer envios_email"
  ON envios_email FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden leer almacenamiento_documentos"
  ON almacenamiento_documentos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden leer configuracion_email"
  ON configuracion_email FOR SELECT TO authenticated USING (true);

-- Políticas de modificación
CREATE POLICY "Usuarios autenticados pueden modificar envios_email"
  ON envios_email FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden modificar almacenamiento_documentos"
  ON almacenamiento_documentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Solo admins pueden modificar configuracion_email"
  ON configuracion_email FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Insertar configuración por defecto
INSERT INTO configuracion_email (id) 
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- =====================================================
-- VISTAS
-- =====================================================

-- Vista resumen de envíos por factura
CREATE OR REPLACE VIEW v_envios_resumen AS
SELECT 
  f.id AS factura_id,
  f.numero_completo,
  f.cliente_nombre,
  f.cliente_email,
  f.total,
  f.email_enviado,
  f.fecha_email_enviado,
  f.onedrive_subido,
  f.onedrive_url,
  e.id AS ultimo_envio_id,
  e.estado AS ultimo_envio_estado,
  e.fecha_enviado AS ultimo_envio_fecha,
  e.intentos AS ultimo_envio_intentos,
  e.error_mensaje AS ultimo_envio_error
FROM facturas f
LEFT JOIN LATERAL (
  SELECT * FROM envios_email 
  WHERE factura_id = f.id 
  ORDER BY created_at DESC 
  LIMIT 1
) e ON true
WHERE f.estado = 'emitida';

-- Vista de facturas pendientes de envío
CREATE OR REPLACE VIEW v_facturas_pendientes_envio AS
SELECT 
  f.id,
  f.numero_completo,
  f.fecha_factura,
  f.cliente_id,
  f.cliente_nombre,
  f.cliente_email,
  f.total,
  c.nombre AS comunidad_nombre,
  CASE 
    WHEN f.cliente_email IS NULL OR f.cliente_email = '' THEN 'sin_email'
    WHEN f.email_enviado = true THEN 'enviado'
    ELSE 'pendiente'
  END AS estado_envio
FROM facturas f
JOIN comunidades c ON f.comunidad_id = c.id
WHERE f.estado = 'emitida';

-- Vista de estadísticas de envío
CREATE OR REPLACE VIEW v_envios_stats AS
SELECT 
  COUNT(*) FILTER (WHERE estado = 'enviado') AS total_enviados,
  COUNT(*) FILTER (WHERE estado = 'entregado') AS total_entregados,
  COUNT(*) FILTER (WHERE estado = 'abierto') AS total_abiertos,
  COUNT(*) FILTER (WHERE estado = 'rebotado') AS total_rebotados,
  COUNT(*) FILTER (WHERE estado = 'fallido') AS total_fallidos,
  COUNT(*) FILTER (WHERE estado = 'pendiente') AS total_pendientes,
  COUNT(*) AS total_registros
FROM envios_email;

-- =====================================================
-- FUNCIONES
-- =====================================================

-- Función para registrar un nuevo envío
CREATE OR REPLACE FUNCTION registrar_envio_email(
  p_factura_id UUID,
  p_email_destino TEXT,
  p_asunto TEXT,
  p_email_cc TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cliente_id UUID;
  v_envio_id UUID;
BEGIN
  -- Obtener cliente_id de la factura
  SELECT cliente_id INTO v_cliente_id
  FROM facturas
  WHERE id = p_factura_id;
  
  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;
  
  -- Crear registro de envío
  INSERT INTO envios_email (
    factura_id,
    cliente_id,
    email_destino,
    email_cc,
    asunto,
    estado,
    created_by
  )
  VALUES (
    p_factura_id,
    v_cliente_id,
    p_email_destino,
    p_email_cc,
    p_asunto,
    'pendiente',
    auth.uid()
  )
  RETURNING id INTO v_envio_id;
  
  RETURN v_envio_id;
END;
$$;

-- Función para actualizar estado de envío desde webhook
CREATE OR REPLACE FUNCTION actualizar_estado_envio(
  p_resend_id TEXT,
  p_estado estado_envio,
  p_fecha TIMESTAMPTZ DEFAULT now(),
  p_tipo_rebote tipo_rebote DEFAULT NULL,
  p_mensaje_rebote TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_factura_id UUID;
BEGIN
  -- Actualizar el envío
  UPDATE envios_email
  SET 
    estado = p_estado,
    fecha_entregado = CASE WHEN p_estado = 'entregado' THEN p_fecha ELSE fecha_entregado END,
    fecha_abierto = CASE WHEN p_estado = 'abierto' THEN p_fecha ELSE fecha_abierto END,
    fecha_rebote = CASE WHEN p_estado = 'rebotado' THEN p_fecha ELSE fecha_rebote END,
    tipo_rebote = COALESCE(p_tipo_rebote, tipo_rebote),
    mensaje_rebote = COALESCE(p_mensaje_rebote, mensaje_rebote),
    updated_at = now()
  WHERE resend_id = p_resend_id
  RETURNING factura_id INTO v_factura_id;
  
  IF v_factura_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Función para marcar factura como enviada por email
CREATE OR REPLACE FUNCTION marcar_factura_email_enviado(
  p_factura_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE facturas
  SET 
    email_enviado = true,
    fecha_email_enviado = now()
  WHERE id = p_factura_id;
  
  RETURN FOUND;
END;
$$;

-- Función para obtener facturas pendientes de reintento
CREATE OR REPLACE FUNCTION get_envios_pendientes_reintento()
RETURNS TABLE (
  envio_id UUID,
  factura_id UUID,
  email_destino TEXT,
  intentos INTEGER,
  max_intentos INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.factura_id,
    e.email_destino,
    e.intentos,
    e.max_intentos
  FROM envios_email e
  WHERE e.estado = 'fallido'
    AND e.intentos < e.max_intentos
    AND (e.proximo_reintento IS NULL OR e.proximo_reintento <= now());
END;
$$;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE envios_email IS 'Registro de envíos de facturas por email';
COMMENT ON TABLE almacenamiento_documentos IS 'Registro de documentos almacenados en OneDrive';
COMMENT ON TABLE configuracion_email IS 'Configuración del sistema de envío de emails';

COMMENT ON COLUMN envios_email.resend_id IS 'ID único devuelto por Resend para tracking';
COMMENT ON COLUMN envios_email.proximo_reintento IS 'Fecha/hora para el próximo intento si falló';

COMMENT ON VIEW v_facturas_pendientes_envio IS 'Facturas emitidas pendientes de envío por email';
COMMENT ON VIEW v_envios_stats IS 'Estadísticas de envíos de email';

