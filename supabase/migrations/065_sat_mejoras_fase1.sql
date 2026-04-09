-- ============================================================
-- Migración 065: SAT Mejoras Fase 1
--
-- Cambios:
-- 1. Máquina de estados para intervenciones (trigger BEFORE UPDATE)
-- 2. Auto-crear cita al asignar técnico (trigger AFTER UPDATE)
-- 3. Columna parte_trabajo_url en intervenciones
-- 4. Columna parte_trabajo_url en v_intervenciones_resumen (recrear vista)
-- 5. Columnas GPS en intervenciones
--
-- Impacto en producción: NULO — Solo ADD COLUMN y CREATE FUNCTION/TRIGGER
-- No modifica datos existentes ni altera tipos de columnas
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Columnas nuevas en intervenciones
-- ============================================================

ALTER TABLE intervenciones
  ADD COLUMN IF NOT EXISTS parte_trabajo_url TEXT,
  ADD COLUMN IF NOT EXISTS ubicacion_tecnico_lat NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS ubicacion_tecnico_lng NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS ubicacion_tecnico_timestamp TIMESTAMPTZ;

-- ============================================================
-- 2. Máquina de estados: función de validación
-- ============================================================

CREATE OR REPLACE FUNCTION validar_transicion_intervencion(
  p_estado_actual TEXT,
  p_estado_nuevo TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_transiciones_validas TEXT[];
BEGIN
  -- Si el estado no cambia, siempre es válido
  IF p_estado_actual = p_estado_nuevo THEN
    RETURN TRUE;
  END IF;

  -- Mapa de transiciones permitidas
  CASE p_estado_actual
    WHEN 'pendiente' THEN
      v_transiciones_validas := ARRAY['asignada', 'cancelada'];
    WHEN 'asignada' THEN
      v_transiciones_validas := ARRAY['programada', 'en_camino', 'cancelada'];
    WHEN 'programada' THEN
      v_transiciones_validas := ARRAY['en_camino', 'en_curso', 'asignada', 'cancelada'];
    WHEN 'en_camino' THEN
      v_transiciones_validas := ARRAY['en_curso', 'asignada'];
    WHEN 'en_curso' THEN
      v_transiciones_validas := ARRAY['completada', 'asignada'];
    WHEN 'completada' THEN
      v_transiciones_validas := ARRAY['facturada'];
    WHEN 'cancelada' THEN
      v_transiciones_validas := ARRAY['pendiente'];
    WHEN 'facturada' THEN
      v_transiciones_validas := ARRAY[]::TEXT[];
    ELSE
      v_transiciones_validas := ARRAY[]::TEXT[];
  END CASE;

  RETURN p_estado_nuevo = ANY(v_transiciones_validas);
END;
$$;

-- ============================================================
-- 3. Trigger BEFORE UPDATE: validar transición de estado
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_validar_estado_intervencion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo validar si el estado está cambiando
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF NOT validar_transicion_intervencion(OLD.estado, NEW.estado) THEN
      RAISE EXCEPTION 'Transición de estado inválida: % → %. Estados permitidos desde %: %',
        OLD.estado,
        NEW.estado,
        OLD.estado,
        CASE OLD.estado
          WHEN 'pendiente' THEN 'asignada, cancelada'
          WHEN 'asignada' THEN 'programada, en_camino, cancelada'
          WHEN 'programada' THEN 'en_camino, en_curso, asignada, cancelada'
          WHEN 'en_camino' THEN 'en_curso, asignada'
          WHEN 'en_curso' THEN 'completada, asignada'
          WHEN 'completada' THEN 'facturada'
          WHEN 'cancelada' THEN 'pendiente'
          WHEN 'facturada' THEN '(ninguno)'
          ELSE '(desconocido)'
        END
      USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_estado_intervencion ON intervenciones;
CREATE TRIGGER trg_validar_estado_intervencion
  BEFORE UPDATE ON intervenciones
  FOR EACH ROW
  EXECUTE FUNCTION trigger_validar_estado_intervencion();

-- ============================================================
-- 4. Trigger AFTER UPDATE: auto-crear cita al asignar técnico
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_auto_crear_cita_intervencion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fecha_cita TIMESTAMPTZ;
  v_fecha_programada TIMESTAMPTZ;
BEGIN
  -- Solo actuar cuando se asigna técnico por primera vez
  -- (tecnico_id cambia de NULL a un valor) y el estado pasa a 'asignada'
  IF (OLD.tecnico_id IS NULL AND NEW.tecnico_id IS NOT NULL AND NEW.estado = 'asignada') THEN

    -- Usar fecha_programada si existe, sino calcular siguiente día laboral a las 09:00
    IF NEW.fecha_programada IS NOT NULL THEN
      v_fecha_cita := NEW.fecha_programada;
    ELSE
      -- Siguiente día laboral a las 09:00 (zona horaria Madrid)
      v_fecha_programada := (CURRENT_DATE + 1)::TIMESTAMPTZ AT TIME ZONE 'Europe/Madrid';
      -- Si cae en sábado (6) avanzar a lunes
      IF EXTRACT(DOW FROM v_fecha_programada) = 6 THEN
        v_fecha_programada := v_fecha_programada + INTERVAL '2 days';
      -- Si cae en domingo (0) avanzar a lunes
      ELSIF EXTRACT(DOW FROM v_fecha_programada) = 0 THEN
        v_fecha_programada := v_fecha_programada + INTERVAL '1 day';
      END IF;
      v_fecha_cita := date_trunc('day', v_fecha_programada) + INTERVAL '9 hours';
    END IF;

    -- Crear cita automáticamente
    INSERT INTO citas (
      intervencion_id,
      cliente_id,
      tecnico_id,
      fecha_hora,
      duracion_minutos,
      direccion,
      estado,
      notas
    ) VALUES (
      NEW.id,
      NEW.cliente_id,
      NEW.tecnico_id,
      v_fecha_cita,
      60,
      COALESCE(NEW.direccion || CASE WHEN NEW.codigo_postal IS NOT NULL THEN ', ' || NEW.codigo_postal ELSE '' END || CASE WHEN NEW.ciudad IS NOT NULL THEN ' ' || NEW.ciudad ELSE '' END, NULL),
      'programada',
      'Cita creada automáticamente al asignar técnico'
    );

    -- Actualizar fecha_programada en la intervención si no tenía
    IF OLD.fecha_programada IS NULL THEN
      NEW.fecha_programada := v_fecha_cita;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_crear_cita_intervencion ON intervenciones;
CREATE TRIGGER trg_auto_crear_cita_intervencion
  BEFORE UPDATE ON intervenciones
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_crear_cita_intervencion();

-- ============================================================
-- 5. Recrear vista v_intervenciones_resumen con nuevas columnas
-- ============================================================

DROP VIEW IF EXISTS v_intervenciones_resumen;

CREATE VIEW v_intervenciones_resumen AS
SELECT
  i.id,
  i.numero_parte,
  i.titulo,
  i.tipo,
  i.prioridad,
  i.estado,
  i.descripcion,
  i.diagnostico,
  i.solucion,
  i.observaciones_internas,
  i.fotos,
  i.firma_cliente,
  i.firma_tecnico,
  i.fecha_firma,
  i.fecha_solicitud,
  i.fecha_programada,
  i.fecha_inicio,
  i.fecha_fin,
  i.duracion_minutos,
  i.coste_materiales,
  i.coste_mano_obra,
  i.coste_desplazamiento,
  i.coste_total,
  i.parte_trabajo_url,
  i.ubicacion_tecnico_lat,
  i.ubicacion_tecnico_lng,
  i.ubicacion_tecnico_timestamp,
  i.cliente_id,
  i.comunidad_id,
  i.contrato_id,
  i.tecnico_id,
  i.encargado_id,
  i.factura_id,
  i.created_at,
  i.updated_at,

  -- Cliente
  c.nombre AS cliente_nombre,
  c.apellidos AS cliente_apellidos,
  c.nombre || ' ' || COALESCE(c.apellidos, '') AS cliente_nombre_completo,
  c.telefono AS cliente_telefono,
  c.email AS cliente_email,

  -- Comunidad
  com.nombre AS comunidad_nombre,

  -- Técnico (desde profiles)
  pt.nombre_completo AS tecnico_nombre,

  -- Encargado (desde profiles)
  pe.nombre_completo AS encargado_nombre,

  -- Contrato
  cm.numero_contrato,
  cm.titulo AS contrato_titulo,

  -- Materiales (agregados)
  COALESCE(mat.total_materiales, 0) AS total_materiales,
  COALESCE(mat.num_materiales, 0) AS num_materiales

FROM intervenciones i
LEFT JOIN clientes c ON c.id = i.cliente_id
LEFT JOIN comunidades com ON com.id = i.comunidad_id
LEFT JOIN profiles pt ON pt.id = i.tecnico_id
LEFT JOIN profiles pe ON pe.id = i.encargado_id
LEFT JOIN contratos_mantenimiento cm ON cm.id = i.contrato_id
LEFT JOIN (
  SELECT
    intervencion_id,
    SUM(subtotal) AS total_materiales,
    COUNT(*) AS num_materiales
  FROM intervenciones_materiales
  GROUP BY intervencion_id
) mat ON mat.intervencion_id = i.id;

-- ============================================================
-- 6. RLS: bucket sat-partes para partes de trabajo
-- Nota: el bucket debe crearse manualmente en Supabase Storage UI
-- o via el cliente de Supabase. Aquí solo documentamos la política.
-- ============================================================

-- Comentario: Crear bucket 'sat-partes' en Storage con:
-- - Public: false
-- - Política lectura: authenticated users
-- Se crea manualmente en Supabase Dashboard > Storage

COMMIT;
