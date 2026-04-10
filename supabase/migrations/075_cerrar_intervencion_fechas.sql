-- Migración 075: cerrar_intervencion acepta fechas manuales
-- Permite al usuario especificar fecha_inicio y fecha_fin reales
-- en lugar de usar siempre NOW().

CREATE OR REPLACE FUNCTION cerrar_intervencion(
  p_intervencion_id UUID,
  p_diagnostico     TEXT        DEFAULT NULL,
  p_solucion        TEXT        DEFAULT NULL,
  p_firma_cliente   TEXT        DEFAULT NULL,
  p_firma_tecnico   TEXT        DEFAULT NULL,
  p_fecha_inicio    TIMESTAMPTZ DEFAULT NULL,
  p_fecha_fin       TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_intervencion intervenciones%ROWTYPE;
  v_duracion     INTEGER;
  v_coste_mat    DECIMAL(10,2);
  v_fecha_inicio TIMESTAMPTZ;
  v_fecha_fin    TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_intervencion FROM intervenciones WHERE id = p_intervencion_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intervención no encontrada';
  END IF;

  IF v_intervencion.estado NOT IN ('en_curso', 'programada', 'asignada', 'en_camino') THEN
    RAISE EXCEPTION 'La intervención no está en un estado que permita cierre (estado actual: %)', v_intervencion.estado;
  END IF;

  -- Usar fechas proporcionadas o caer en los valores almacenados / NOW()
  v_fecha_inicio := COALESCE(p_fecha_inicio, v_intervencion.fecha_inicio);
  v_fecha_fin    := COALESCE(p_fecha_fin, NOW());

  -- Calcular duración si hay fecha de inicio
  IF v_fecha_inicio IS NOT NULL THEN
    v_duracion := GREATEST(0, EXTRACT(EPOCH FROM (v_fecha_fin - v_fecha_inicio))::INTEGER / 60);
  END IF;

  -- Calcular coste materiales
  SELECT COALESCE(SUM(subtotal), 0) INTO v_coste_mat
  FROM intervenciones_materiales
  WHERE intervencion_id = p_intervencion_id;

  -- Actualizar intervención
  UPDATE intervenciones SET
    estado             = 'completada',
    diagnostico        = COALESCE(p_diagnostico, diagnostico),
    solucion           = COALESCE(p_solucion, solucion),
    firma_cliente      = COALESCE(p_firma_cliente, firma_cliente),
    firma_tecnico      = COALESCE(p_firma_tecnico, firma_tecnico),
    fecha_firma        = CASE WHEN p_firma_cliente IS NOT NULL THEN NOW() ELSE fecha_firma END,
    fecha_inicio       = COALESCE(v_fecha_inicio, fecha_inicio),
    fecha_fin          = v_fecha_fin,
    duracion_minutos   = COALESCE(v_duracion, duracion_minutos),
    coste_materiales   = v_coste_mat,
    coste_total        = v_coste_mat + COALESCE(coste_mano_obra, 0) + COALESCE(coste_desplazamiento, 0)
  WHERE id = p_intervencion_id;

  -- Actualizar stock de materiales usados
  UPDATE materiales m SET
    stock_actual = m.stock_actual - im.cantidad::INTEGER
  FROM intervenciones_materiales im
  WHERE im.intervencion_id = p_intervencion_id
    AND im.material_id = m.id;

  RETURN json_build_object(
    'success',           true,
    'duracion_minutos',  v_duracion,
    'coste_materiales',  v_coste_mat
  );
END;
$$;

GRANT EXECUTE ON FUNCTION cerrar_intervencion TO authenticated;
GRANT EXECUTE ON FUNCTION cerrar_intervencion TO service_role;
