-- Migración 073: RPC para verificar conflictos de citas antes de reprogramar
-- Comprueba si un técnico tiene alguna cita activa que se solape
-- con el nuevo slot propuesto (drag-and-drop calendario).

DROP FUNCTION IF EXISTS verificar_conflicto_cita(UUID, TIMESTAMPTZ, INTEGER, UUID);

CREATE FUNCTION verificar_conflicto_cita(
  p_tecnico_id       UUID,
  p_fecha_hora       TIMESTAMPTZ,
  p_duracion_minutos INTEGER DEFAULT 60,
  p_excluir_cita_id  UUID    DEFAULT NULL
)
RETURNS TABLE(tiene_conflicto BOOLEAN, cita_id UUID, fecha_hora TIMESTAMPTZ, titulo TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fecha_fin TIMESTAMPTZ;
BEGIN
  v_fecha_fin := p_fecha_hora + (COALESCE(p_duracion_minutos, 60) * INTERVAL '1 minute');

  RETURN QUERY
  SELECT
    true AS tiene_conflicto,
    c.id AS cita_id,
    c.fecha_hora,
    COALESCE(i.titulo, 'Cita') AS titulo
  FROM citas c
  LEFT JOIN intervenciones i ON i.id = c.intervencion_id
  WHERE c.tecnico_id = p_tecnico_id
    AND c.estado NOT IN ('cancelada', 'completada', 'no_show')
    AND (p_excluir_cita_id IS NULL OR c.id != p_excluir_cita_id)
    AND c.fecha_hora < v_fecha_fin
    AND (c.fecha_hora + (COALESCE(c.duracion_minutos, 60) * INTERVAL '1 minute')) > p_fecha_hora
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TEXT;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION verificar_conflicto_cita(UUID, TIMESTAMPTZ, INTEGER, UUID) TO authenticated;
