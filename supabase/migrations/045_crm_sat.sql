-- ============================================================
-- Migración 045: CRM Fase 2 — SAT (Servicio de Asistencia Técnica)
--
-- Tablas nuevas: contratos_mantenimiento, intervenciones, citas, materiales, intervenciones_materiales
-- Vistas nuevas: v_intervenciones_resumen, v_agenda_tecnicos, v_contratos_activos
-- RPCs: generar_numero_parte, generar_numero_contrato, crear_intervencion, cerrar_intervencion, get_agenda_tecnico, get_sat_stats
--
-- Impacto en producción: NULO — Solo crea objetos nuevos, no modifica tablas existentes
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Tabla: contratos_mantenimiento
-- ============================================================
CREATE TABLE IF NOT EXISTS contratos_mantenimiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relaciones
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  comunidad_id UUID REFERENCES comunidades(id) ON DELETE SET NULL,

  -- Identificación
  numero_contrato TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,

  -- Tipo y alcance
  tipo TEXT NOT NULL DEFAULT 'mantenimiento'
    CHECK (tipo IN ('mantenimiento', 'garantia', 'servicio_completo', 'puntual')),
  equipos_cubiertos TEXT[],

  -- Vigencia
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  renovacion_automatica BOOLEAN NOT NULL DEFAULT false,

  -- Condiciones
  periodicidad TEXT DEFAULT 'mensual'
    CHECK (periodicidad IN ('semanal', 'quincenal', 'mensual', 'trimestral', 'semestral', 'anual')),
  precio DECIMAL(10,2),
  condiciones TEXT,

  -- Estado
  estado TEXT NOT NULL DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'activo', 'suspendido', 'finalizado', 'cancelado')),

  -- Documentación
  documento_url TEXT,
  firma_cliente TEXT,
  fecha_firma DATE,

  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contratos_cliente ON contratos_mantenimiento(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_comunidad ON contratos_mantenimiento(comunidad_id);
CREATE INDEX IF NOT EXISTS idx_contratos_estado ON contratos_mantenimiento(estado);
CREATE INDEX IF NOT EXISTS idx_contratos_vigencia ON contratos_mantenimiento(fecha_inicio, fecha_fin);

CREATE TRIGGER contratos_mantenimiento_updated_at
  BEFORE UPDATE ON contratos_mantenimiento
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. Tabla: intervenciones (partes de trabajo)
-- ============================================================
CREATE TABLE IF NOT EXISTS intervenciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relaciones
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  comunidad_id UUID REFERENCES comunidades(id) ON DELETE SET NULL,
  contrato_id UUID REFERENCES contratos_mantenimiento(id) ON DELETE SET NULL,
  tecnico_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  encargado_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Identificación
  numero_parte TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,

  -- Tipo y prioridad
  tipo TEXT NOT NULL DEFAULT 'correctiva'
    CHECK (tipo IN ('correctiva', 'preventiva', 'instalacion', 'inspeccion', 'urgencia')),
  prioridad TEXT NOT NULL DEFAULT 'normal'
    CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),

  -- Estado
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'asignada', 'programada', 'en_camino', 'en_curso', 'completada', 'facturada', 'cancelada')),

  -- Descripción y resolución
  descripcion TEXT,
  diagnostico TEXT,
  solucion TEXT,
  observaciones_internas TEXT,

  -- Ubicación
  direccion TEXT,
  codigo_postal TEXT,
  ciudad TEXT,
  coordenadas_lat DECIMAL(10,7),
  coordenadas_lng DECIMAL(10,7),

  -- Tiempos
  fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_programada TIMESTAMPTZ,
  fecha_inicio TIMESTAMPTZ,
  fecha_fin TIMESTAMPTZ,
  duracion_minutos INTEGER,

  -- Materiales y costes
  coste_materiales DECIMAL(10,2) DEFAULT 0,
  coste_mano_obra DECIMAL(10,2) DEFAULT 0,
  coste_desplazamiento DECIMAL(10,2) DEFAULT 0,
  coste_total DECIMAL(10,2) DEFAULT 0,

  -- Documentación
  fotos TEXT[],
  firma_cliente TEXT,
  firma_tecnico TEXT,
  fecha_firma TIMESTAMPTZ,

  -- Vinculación a factura (sin FK — schema distinto)
  factura_id UUID,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intervenciones_cliente ON intervenciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_intervenciones_comunidad ON intervenciones(comunidad_id);
CREATE INDEX IF NOT EXISTS idx_intervenciones_contrato ON intervenciones(contrato_id);
CREATE INDEX IF NOT EXISTS idx_intervenciones_tecnico ON intervenciones(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_intervenciones_estado ON intervenciones(estado);
CREATE INDEX IF NOT EXISTS idx_intervenciones_tipo ON intervenciones(tipo);
CREATE INDEX IF NOT EXISTS idx_intervenciones_prioridad ON intervenciones(prioridad);
CREATE INDEX IF NOT EXISTS idx_intervenciones_fecha_prog ON intervenciones(fecha_programada);

CREATE TRIGGER intervenciones_updated_at
  BEFORE UPDATE ON intervenciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. Tabla: citas
-- ============================================================
CREATE TABLE IF NOT EXISTS citas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relaciones
  intervencion_id UUID REFERENCES intervenciones(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  tecnico_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Programación
  fecha_hora TIMESTAMPTZ NOT NULL,
  duracion_minutos INTEGER NOT NULL DEFAULT 60,

  -- Ubicación
  direccion TEXT,
  notas TEXT,

  -- Estado
  estado TEXT NOT NULL DEFAULT 'programada'
    CHECK (estado IN ('programada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_show')),

  -- Integración calendario
  google_calendar_event_id TEXT,

  -- Notificaciones
  notificacion_enviada BOOLEAN DEFAULT false,
  recordatorio_enviado BOOLEAN DEFAULT false,

  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_citas_intervencion ON citas(intervencion_id);
CREATE INDEX IF NOT EXISTS idx_citas_tecnico ON citas(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado);
CREATE INDEX IF NOT EXISTS idx_citas_google ON citas(google_calendar_event_id);

CREATE TRIGGER citas_updated_at
  BEFORE UPDATE ON citas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. Tabla: materiales (catálogo)
-- ============================================================
CREATE TABLE IF NOT EXISTS materiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  nombre TEXT NOT NULL,
  referencia TEXT UNIQUE,
  descripcion TEXT,
  categoria TEXT DEFAULT 'general'
    CHECK (categoria IN ('general', 'fontaneria', 'electricidad', 'climatizacion', 'calefaccion', 'repuestos')),

  -- Precios
  precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  unidad_medida TEXT NOT NULL DEFAULT 'unidad',

  -- Stock
  stock_actual INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 0,

  -- Estado
  activo BOOLEAN NOT NULL DEFAULT true,

  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materiales_referencia ON materiales(referencia);
CREATE INDEX IF NOT EXISTS idx_materiales_categoria ON materiales(categoria);

CREATE TRIGGER materiales_updated_at
  BEFORE UPDATE ON materiales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. Tabla: intervenciones_materiales (materiales usados)
-- ============================================================
CREATE TABLE IF NOT EXISTS intervenciones_materiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  intervencion_id UUID NOT NULL REFERENCES intervenciones(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materiales(id) ON DELETE RESTRICT,

  cantidad DECIMAL(10,2) NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,

  notas TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_int_mat_intervencion ON intervenciones_materiales(intervencion_id);
CREATE INDEX IF NOT EXISTS idx_int_mat_material ON intervenciones_materiales(material_id);

-- ============================================================
-- 6. Políticas RLS
-- ============================================================
ALTER TABLE contratos_mantenimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervenciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervenciones_materiales ENABLE ROW LEVEL SECURITY;

-- Contratos: admin y encargado gestionan, técnico lee
CREATE POLICY "Admin y encargado gestionan contratos"
  ON contratos_mantenimiento FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol IN ('admin', 'encargado')
    )
  );

CREATE POLICY "Tecnico lee contratos"
  ON contratos_mantenimiento FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'tecnico'
    )
  );

CREATE POLICY "Cliente ve sus contratos"
  ON contratos_mantenimiento FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN clientes c ON c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      WHERE p.id = auth.uid() AND p.rol = 'cliente'
      AND contratos_mantenimiento.cliente_id = c.id
    )
  );

-- Intervenciones: admin y encargado gestionan todo, técnico sus propias
CREATE POLICY "Admin y encargado gestionan intervenciones"
  ON intervenciones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol IN ('admin', 'encargado')
    )
  );

CREATE POLICY "Tecnico ve y edita sus intervenciones"
  ON intervenciones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'tecnico'
    )
    AND tecnico_id = auth.uid()
  );

-- Citas: admin y encargado gestionan todo, técnico sus propias
CREATE POLICY "Admin y encargado gestionan citas"
  ON citas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol IN ('admin', 'encargado')
    )
  );

CREATE POLICY "Tecnico ve y edita sus citas"
  ON citas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'tecnico'
    )
    AND tecnico_id = auth.uid()
  );

-- Materiales: todos CRM leen, admin y encargado modifican
CREATE POLICY "Roles CRM leen materiales"
  ON materiales FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol IN ('admin', 'tecnico', 'encargado')
    )
  );

CREATE POLICY "Admin y encargado modifican materiales"
  ON materiales FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol IN ('admin', 'encargado')
    )
  );

-- Intervenciones_materiales: acceso alineado con roles CRM
CREATE POLICY "Acceso a materiales de intervencion"
  ON intervenciones_materiales FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol IN ('admin', 'tecnico', 'encargado')
    )
  );

-- ============================================================
-- 7. Vistas
-- ============================================================

CREATE OR REPLACE VIEW v_intervenciones_resumen AS
SELECT
  i.id,
  i.numero_parte,
  i.titulo,
  i.tipo,
  i.prioridad,
  i.estado,
  i.descripcion,
  i.fecha_solicitud,
  i.fecha_programada,
  i.fecha_inicio,
  i.fecha_fin,
  i.duracion_minutos,
  i.coste_total,
  i.firma_cliente IS NOT NULL AS tiene_firma,
  i.created_at,
  -- Cliente
  c.id AS cliente_id,
  c.nombre || ' ' || c.apellidos AS cliente_nombre,
  c.telefono AS cliente_telefono,
  -- Comunidad
  com.id AS comunidad_id,
  com.nombre AS comunidad_nombre,
  -- Técnico
  pt.id AS tecnico_id,
  pt.nombre_completo AS tecnico_nombre,
  -- Encargado
  pe.id AS encargado_id,
  pe.nombre_completo AS encargado_nombre,
  -- Contrato
  ct.id AS contrato_id,
  ct.numero_contrato,
  ct.titulo AS contrato_titulo,
  -- Materiales usados
  COALESCE(
    (SELECT SUM(im.subtotal) FROM intervenciones_materiales im WHERE im.intervencion_id = i.id),
    0
  ) AS coste_materiales_total,
  COALESCE(
    (SELECT COUNT(*) FROM intervenciones_materiales im WHERE im.intervencion_id = i.id),
    0
  )::INTEGER AS num_materiales
FROM intervenciones i
LEFT JOIN clientes c ON i.cliente_id = c.id
LEFT JOIN comunidades com ON i.comunidad_id = com.id
LEFT JOIN profiles pt ON i.tecnico_id = pt.id
LEFT JOIN profiles pe ON i.encargado_id = pe.id
LEFT JOIN contratos_mantenimiento ct ON i.contrato_id = ct.id;

CREATE OR REPLACE VIEW v_agenda_tecnicos AS
SELECT
  ci.id AS cita_id,
  ci.fecha_hora,
  ci.duracion_minutos,
  ci.fecha_hora + ci.duracion_minutos * INTERVAL '1 minute' AS fecha_hora_fin,
  ci.estado AS cita_estado,
  ci.direccion,
  ci.notas,
  ci.google_calendar_event_id,
  -- Intervención asociada
  i.id AS intervencion_id,
  i.numero_parte,
  i.titulo AS intervencion_titulo,
  i.tipo AS intervencion_tipo,
  i.prioridad,
  -- Técnico
  p.id AS tecnico_id,
  p.nombre_completo AS tecnico_nombre,
  -- Cliente
  c.id AS cliente_id,
  c.nombre || ' ' || c.apellidos AS cliente_nombre,
  c.telefono AS cliente_telefono
FROM citas ci
LEFT JOIN intervenciones i ON ci.intervencion_id = i.id
LEFT JOIN profiles p ON ci.tecnico_id = p.id
LEFT JOIN clientes c ON ci.cliente_id = c.id
ORDER BY ci.fecha_hora;

CREATE OR REPLACE VIEW v_contratos_activos AS
SELECT
  ct.id,
  ct.numero_contrato,
  ct.titulo,
  ct.tipo,
  ct.estado,
  ct.fecha_inicio,
  ct.fecha_fin,
  ct.periodicidad,
  ct.precio,
  ct.renovacion_automatica,
  ct.created_at,
  -- Cliente
  c.id AS cliente_id,
  c.nombre || ' ' || c.apellidos AS cliente_nombre,
  -- Comunidad
  com.id AS comunidad_id,
  com.nombre AS comunidad_nombre,
  -- Intervenciones vinculadas
  COALESCE(
    (SELECT COUNT(*) FROM intervenciones i WHERE i.contrato_id = ct.id),
    0
  )::INTEGER AS num_intervenciones,
  COALESCE(
    (SELECT COUNT(*) FROM intervenciones i WHERE i.contrato_id = ct.id AND i.estado = 'completada'),
    0
  )::INTEGER AS num_completadas
FROM contratos_mantenimiento ct
LEFT JOIN clientes c ON ct.cliente_id = c.id
LEFT JOIN comunidades com ON ct.comunidad_id = com.id;

-- ============================================================
-- 8. Funciones / RPCs
-- ============================================================

-- Generar número de parte automático: SAT-YYYY-NNNNN
CREATE OR REPLACE FUNCTION generar_numero_parte()
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
    CAST(SPLIT_PART(numero_parte, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO v_secuencia
  FROM intervenciones
  WHERE numero_parte LIKE 'SAT-' || v_anio || '-%';

  RETURN 'SAT-' || v_anio || '-' || LPAD(v_secuencia::TEXT, 5, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION generar_numero_parte TO authenticated;
GRANT EXECUTE ON FUNCTION generar_numero_parte TO service_role;

-- Generar número de contrato automático: CTR-YYYY-NNNN
CREATE OR REPLACE FUNCTION generar_numero_contrato()
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
    CAST(SPLIT_PART(numero_contrato, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO v_secuencia
  FROM contratos_mantenimiento
  WHERE numero_contrato LIKE 'CTR-' || v_anio || '-%';

  RETURN 'CTR-' || v_anio || '-' || LPAD(v_secuencia::TEXT, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION generar_numero_contrato TO authenticated;
GRANT EXECUTE ON FUNCTION generar_numero_contrato TO service_role;

-- Crear intervención con número automático
CREATE OR REPLACE FUNCTION crear_intervencion(
  p_titulo TEXT,
  p_tipo TEXT DEFAULT 'correctiva',
  p_prioridad TEXT DEFAULT 'normal',
  p_descripcion TEXT DEFAULT NULL,
  p_cliente_id UUID DEFAULT NULL,
  p_comunidad_id UUID DEFAULT NULL,
  p_contrato_id UUID DEFAULT NULL,
  p_tecnico_id UUID DEFAULT NULL,
  p_direccion TEXT DEFAULT NULL,
  p_codigo_postal TEXT DEFAULT NULL,
  p_ciudad TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_numero TEXT;
  v_id UUID;
BEGIN
  v_numero := generar_numero_parte();

  INSERT INTO intervenciones (
    numero_parte, titulo, tipo, prioridad, descripcion,
    cliente_id, comunidad_id, contrato_id, tecnico_id,
    direccion, codigo_postal, ciudad,
    estado, created_by
  ) VALUES (
    v_numero, p_titulo, p_tipo, p_prioridad, p_descripcion,
    p_cliente_id, p_comunidad_id, p_contrato_id, p_tecnico_id,
    p_direccion, p_codigo_postal, p_ciudad,
    CASE WHEN p_tecnico_id IS NOT NULL THEN 'asignada' ELSE 'pendiente' END,
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION crear_intervencion TO authenticated;
GRANT EXECUTE ON FUNCTION crear_intervencion TO service_role;

-- Cerrar intervención con cálculos automáticos
CREATE OR REPLACE FUNCTION cerrar_intervencion(
  p_intervencion_id UUID,
  p_diagnostico TEXT DEFAULT NULL,
  p_solucion TEXT DEFAULT NULL,
  p_firma_cliente TEXT DEFAULT NULL,
  p_firma_tecnico TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_intervencion intervenciones%ROWTYPE;
  v_duracion INTEGER;
  v_coste_mat DECIMAL(10,2);
BEGIN
  SELECT * INTO v_intervencion FROM intervenciones WHERE id = p_intervencion_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intervención no encontrada';
  END IF;

  IF v_intervencion.estado NOT IN ('en_curso', 'programada', 'asignada', 'en_camino') THEN
    RAISE EXCEPTION 'La intervención no está en un estado que permita cierre (estado actual: %)', v_intervencion.estado;
  END IF;

  -- Calcular duración si hay fecha de inicio
  IF v_intervencion.fecha_inicio IS NOT NULL THEN
    v_duracion := EXTRACT(EPOCH FROM (NOW() - v_intervencion.fecha_inicio)) / 60;
  END IF;

  -- Calcular coste materiales
  SELECT COALESCE(SUM(subtotal), 0) INTO v_coste_mat
  FROM intervenciones_materiales
  WHERE intervencion_id = p_intervencion_id;

  -- Actualizar intervención
  UPDATE intervenciones SET
    estado = 'completada',
    diagnostico = COALESCE(p_diagnostico, diagnostico),
    solucion = COALESCE(p_solucion, solucion),
    firma_cliente = COALESCE(p_firma_cliente, firma_cliente),
    firma_tecnico = COALESCE(p_firma_tecnico, firma_tecnico),
    fecha_firma = CASE WHEN p_firma_cliente IS NOT NULL THEN NOW() ELSE fecha_firma END,
    fecha_fin = NOW(),
    duracion_minutos = COALESCE(v_duracion, duracion_minutos),
    coste_materiales = v_coste_mat,
    coste_total = v_coste_mat + COALESCE(coste_mano_obra, 0) + COALESCE(coste_desplazamiento, 0)
  WHERE id = p_intervencion_id;

  -- Actualizar stock de materiales usados
  UPDATE materiales m SET
    stock_actual = m.stock_actual - im.cantidad::INTEGER
  FROM intervenciones_materiales im
  WHERE im.intervencion_id = p_intervencion_id
    AND im.material_id = m.id;

  RETURN json_build_object(
    'success', true,
    'duracion_minutos', v_duracion,
    'coste_materiales', v_coste_mat
  );
END;
$$;

GRANT EXECUTE ON FUNCTION cerrar_intervencion TO authenticated;
GRANT EXECUTE ON FUNCTION cerrar_intervencion TO service_role;

-- Obtener agenda de un técnico
CREATE OR REPLACE FUNCTION get_agenda_tecnico(
  p_tecnico_id UUID,
  p_fecha_inicio DATE DEFAULT CURRENT_DATE,
  p_fecha_fin DATE DEFAULT (CURRENT_DATE + INTERVAL '7 days')::DATE
)
RETURNS TABLE (
  cita_id UUID,
  fecha_hora TIMESTAMPTZ,
  duracion_minutos INTEGER,
  cita_estado TEXT,
  intervencion_id UUID,
  numero_parte TEXT,
  titulo TEXT,
  tipo TEXT,
  prioridad TEXT,
  cliente_nombre TEXT,
  cliente_telefono TEXT,
  direccion TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.id,
    ci.fecha_hora,
    ci.duracion_minutos,
    ci.estado,
    i.id,
    i.numero_parte,
    i.titulo,
    i.tipo,
    i.prioridad,
    c.nombre || ' ' || c.apellidos,
    c.telefono,
    COALESCE(ci.direccion, i.direccion)
  FROM citas ci
  LEFT JOIN intervenciones i ON ci.intervencion_id = i.id
  LEFT JOIN clientes c ON ci.cliente_id = c.id
  WHERE ci.tecnico_id = p_tecnico_id
    AND ci.fecha_hora >= p_fecha_inicio
    AND ci.fecha_hora < p_fecha_fin + INTERVAL '1 day'
    AND ci.estado NOT IN ('cancelada')
  ORDER BY ci.fecha_hora;
END;
$$;

GRANT EXECUTE ON FUNCTION get_agenda_tecnico TO authenticated;
GRANT EXECUTE ON FUNCTION get_agenda_tecnico TO service_role;

-- Estadísticas SAT
CREATE OR REPLACE FUNCTION get_sat_stats(
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
    'total_intervenciones', COUNT(*),
    'por_estado', json_build_object(
      'pendiente', COUNT(*) FILTER (WHERE estado = 'pendiente'),
      'asignada', COUNT(*) FILTER (WHERE estado = 'asignada'),
      'programada', COUNT(*) FILTER (WHERE estado = 'programada'),
      'en_camino', COUNT(*) FILTER (WHERE estado = 'en_camino'),
      'en_curso', COUNT(*) FILTER (WHERE estado = 'en_curso'),
      'completada', COUNT(*) FILTER (WHERE estado = 'completada'),
      'cancelada', COUNT(*) FILTER (WHERE estado = 'cancelada')
    ),
    'por_tipo', json_build_object(
      'correctiva', COUNT(*) FILTER (WHERE tipo = 'correctiva'),
      'preventiva', COUNT(*) FILTER (WHERE tipo = 'preventiva'),
      'instalacion', COUNT(*) FILTER (WHERE tipo = 'instalacion'),
      'inspeccion', COUNT(*) FILTER (WHERE tipo = 'inspeccion'),
      'urgencia', COUNT(*) FILTER (WHERE tipo = 'urgencia')
    ),
    'urgencias_activas', COUNT(*) FILTER (WHERE tipo = 'urgencia' AND estado NOT IN ('completada', 'facturada', 'cancelada')),
    'abiertas', COUNT(*) FILTER (WHERE estado NOT IN ('completada', 'facturada', 'cancelada')),
    'completadas_periodo', COUNT(*) FILTER (WHERE estado = 'completada' AND fecha_fin >= p_fecha_inicio),
    'tiempo_medio_minutos', COALESCE(
      AVG(duracion_minutos) FILTER (WHERE estado = 'completada' AND duracion_minutos IS NOT NULL),
      0
    )::INTEGER,
    'coste_total_periodo', COALESCE(
      SUM(coste_total) FILTER (WHERE estado = 'completada' AND fecha_fin >= p_fecha_inicio),
      0
    )
  ) INTO v_result
  FROM intervenciones
  WHERE created_at >= p_fecha_inicio
    AND created_at < p_fecha_fin + INTERVAL '1 day';

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sat_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_sat_stats TO service_role;

COMMIT;
