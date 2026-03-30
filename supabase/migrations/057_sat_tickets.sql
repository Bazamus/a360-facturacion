BEGIN;

-- ============================================================
-- 057: Sistema de Tickets/Incidencias SAT
-- SEGURIDAD: Solo crea tablas, funciones y vistas nuevas
-- No toca tablas de facturacion ni tablas SAT existentes
-- ============================================================

-- 1. Tabla: tickets_sat
CREATE TABLE IF NOT EXISTS tickets_sat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación
  numero_ticket TEXT UNIQUE NOT NULL,

  -- Relaciones
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  comunidad_id UUID REFERENCES comunidades(id) ON DELETE SET NULL,
  contrato_id UUID REFERENCES contratos_mantenimiento(id) ON DELETE SET NULL,

  -- Clasificación
  tipo TEXT NOT NULL DEFAULT 'incidencia'
    CHECK (tipo IN ('incidencia', 'consulta', 'solicitud', 'queja')),
  categoria TEXT,
  prioridad TEXT NOT NULL DEFAULT 'normal'
    CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente', 'critica')),

  -- Contenido
  asunto TEXT NOT NULL,
  descripcion TEXT,

  -- Estado
  estado TEXT NOT NULL DEFAULT 'abierto'
    CHECK (estado IN ('abierto', 'en_progreso', 'esperando_cliente', 'esperando_material', 'resuelto', 'cerrado')),

  -- Asignación
  asignado_a UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Resolución
  resolucion TEXT,
  satisfaccion_cliente INTEGER CHECK (satisfaccion_cliente BETWEEN 1 AND 5),

  -- Origen
  origen TEXT DEFAULT 'interno'
    CHECK (origen IN ('interno', 'email', 'telefono', 'whatsapp', 'portal_cliente')),

  -- Vinculación con intervención generada
  intervencion_id UUID REFERENCES intervenciones(id) ON DELETE SET NULL,

  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_cliente ON tickets_sat(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tickets_estado ON tickets_sat(estado);
CREATE INDEX IF NOT EXISTS idx_tickets_prioridad ON tickets_sat(prioridad);
CREATE INDEX IF NOT EXISTS idx_tickets_asignado ON tickets_sat(asignado_a);
CREATE INDEX IF NOT EXISTS idx_tickets_intervencion ON tickets_sat(intervencion_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets_sat(created_at);

CREATE TRIGGER tickets_sat_updated_at
  BEFORE UPDATE ON tickets_sat
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Tabla: ticket_comentarios
CREATE TABLE IF NOT EXISTS ticket_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets_sat(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id),
  contenido TEXT NOT NULL,
  es_interno BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_comentarios_ticket ON ticket_comentarios(ticket_id);

-- 3. RLS
ALTER TABLE tickets_sat ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comentarios ENABLE ROW LEVEL SECURITY;

-- Tickets: admin y encargado ven todo
CREATE POLICY "Admin y encargado gestionan tickets"
  ON tickets_sat FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol IN ('admin', 'encargado')
    )
  );

-- Tickets: técnico ve los asignados a él
CREATE POLICY "Tecnico ve sus tickets"
  ON tickets_sat FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'tecnico'
    )
    AND asignado_a = auth.uid()
  );

-- Comentarios: roles CRM acceden
CREATE POLICY "Roles CRM gestionan comentarios tickets"
  ON ticket_comentarios FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol IN ('admin', 'tecnico', 'encargado')
    )
  );

-- 4. Vista: v_tickets_resumen
CREATE OR REPLACE VIEW v_tickets_resumen AS
SELECT
  t.id,
  t.numero_ticket,
  t.tipo,
  t.categoria,
  t.prioridad,
  t.asunto,
  t.estado,
  t.origen,
  t.created_at,
  t.updated_at,
  t.intervencion_id,
  -- Cliente
  c.id AS cliente_id,
  c.nombre || ' ' || c.apellidos AS cliente_nombre,
  c.telefono AS cliente_telefono,
  -- Comunidad
  com.id AS comunidad_id,
  com.nombre AS comunidad_nombre,
  -- Asignado
  p.id AS asignado_id,
  p.nombre_completo AS asignado_nombre,
  -- Intervención vinculada
  i.numero_parte AS intervencion_numero,
  -- Conteo comentarios
  COALESCE(
    (SELECT COUNT(*) FROM ticket_comentarios tc WHERE tc.ticket_id = t.id),
    0
  ) AS num_comentarios
FROM tickets_sat t
LEFT JOIN clientes c ON t.cliente_id = c.id
LEFT JOIN comunidades com ON t.comunidad_id = com.id
LEFT JOIN profiles p ON t.asignado_a = p.id
LEFT JOIN intervenciones i ON t.intervencion_id = i.id;

-- 5. Función: generar número de ticket automático
CREATE OR REPLACE FUNCTION generar_numero_ticket()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_anio TEXT;
  v_secuencia INTEGER;
BEGIN
  v_anio := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(numero_ticket, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO v_secuencia
  FROM tickets_sat
  WHERE numero_ticket LIKE 'TKT-' || v_anio || '-%';

  RETURN 'TKT-' || v_anio || '-' || LPAD(v_secuencia::TEXT, 5, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION generar_numero_ticket TO authenticated;

-- 6. Función: crear ticket con número automático
CREATE OR REPLACE FUNCTION crear_ticket(
  p_asunto TEXT,
  p_tipo TEXT DEFAULT 'incidencia',
  p_prioridad TEXT DEFAULT 'normal',
  p_descripcion TEXT DEFAULT NULL,
  p_cliente_id UUID DEFAULT NULL,
  p_comunidad_id UUID DEFAULT NULL,
  p_contrato_id UUID DEFAULT NULL,
  p_categoria TEXT DEFAULT NULL,
  p_origen TEXT DEFAULT 'interno'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_numero TEXT;
  v_id UUID;
BEGIN
  v_numero := generar_numero_ticket();

  INSERT INTO tickets_sat (
    numero_ticket, asunto, tipo, prioridad, descripcion,
    cliente_id, comunidad_id, contrato_id, categoria, origen,
    created_by
  ) VALUES (
    v_numero, p_asunto, p_tipo, p_prioridad, p_descripcion,
    p_cliente_id, p_comunidad_id, p_contrato_id, p_categoria, p_origen,
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION crear_ticket TO authenticated;

-- 7. Función: crear intervención desde ticket
CREATE OR REPLACE FUNCTION crear_intervencion_desde_ticket(p_ticket_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket tickets_sat%ROWTYPE;
  v_intervencion_id UUID;
  v_numero_parte TEXT;
BEGIN
  -- Obtener ticket
  SELECT * INTO v_ticket FROM tickets_sat WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket no encontrado';
  END IF;

  IF v_ticket.intervencion_id IS NOT NULL THEN
    RAISE EXCEPTION 'Este ticket ya tiene una intervención vinculada';
  END IF;

  -- Generar número de parte
  v_numero_parte := generar_numero_parte();

  -- Crear intervención desde datos del ticket
  INSERT INTO intervenciones (
    numero_parte, titulo, tipo, prioridad, descripcion,
    cliente_id, comunidad_id, contrato_id,
    estado, created_by
  ) VALUES (
    v_numero_parte,
    v_ticket.asunto,
    CASE v_ticket.tipo
      WHEN 'incidencia' THEN 'correctiva'
      WHEN 'solicitud' THEN 'instalacion'
      ELSE 'correctiva'
    END,
    v_ticket.prioridad,
    v_ticket.descripcion,
    v_ticket.cliente_id,
    v_ticket.comunidad_id,
    v_ticket.contrato_id,
    'pendiente',
    auth.uid()
  )
  RETURNING id INTO v_intervencion_id;

  -- Vincular ticket con intervención
  UPDATE tickets_sat
  SET intervencion_id = v_intervencion_id,
      estado = CASE WHEN estado = 'abierto' THEN 'en_progreso' ELSE estado END
  WHERE id = p_ticket_id;

  RETURN v_intervencion_id;
END;
$$;

GRANT EXECUTE ON FUNCTION crear_intervencion_desde_ticket TO authenticated;

-- 8. Función: estadísticas de tickets
CREATE OR REPLACE FUNCTION get_tickets_stats(
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
    'total', (SELECT COUNT(*) FROM tickets_sat),
    'abiertos', (SELECT COUNT(*) FROM tickets_sat WHERE estado IN ('abierto', 'en_progreso', 'esperando_cliente', 'esperando_material')),
    'resueltos_periodo', (SELECT COUNT(*) FROM tickets_sat WHERE estado IN ('resuelto', 'cerrado') AND updated_at >= p_fecha_inicio AND updated_at <= p_fecha_fin + INTERVAL '1 day'),
    'criticos', (SELECT COUNT(*) FROM tickets_sat WHERE prioridad IN ('urgente', 'critica') AND estado NOT IN ('resuelto', 'cerrado')),
    'por_estado', (
      SELECT COALESCE(json_agg(row_to_json(s)), '[]')
      FROM (SELECT estado, COUNT(*) as cantidad FROM tickets_sat GROUP BY estado) s
    ),
    'por_tipo', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]')
      FROM (SELECT tipo, COUNT(*) as cantidad FROM tickets_sat GROUP BY tipo) t
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_tickets_stats TO authenticated;

COMMIT;
