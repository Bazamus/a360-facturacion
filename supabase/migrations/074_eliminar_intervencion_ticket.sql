-- Migración 074: RPCs para eliminación permanente de intervenciones y tickets
-- Solo accesible por admin/encargado.
-- Intervenciones: solo si están en estado 'pendiente' o 'cancelada'.
-- Tickets: solo si están en estado 'abierto' o 'cerrado'.

-- ─────────────────────────────────────────────
-- RPC: eliminar_intervencion
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION eliminar_intervencion(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rol TEXT;
  v_estado TEXT;
BEGIN
  -- Verificar rol del usuario
  SELECT rol INTO v_rol FROM profiles WHERE id = auth.uid();
  IF v_rol NOT IN ('admin', 'encargado') THEN
    RAISE EXCEPTION 'Sin permisos para eliminar intervenciones';
  END IF;

  -- Verificar estado de la intervención
  SELECT estado INTO v_estado FROM intervenciones WHERE id = p_id;
  IF v_estado IS NULL THEN
    RAISE EXCEPTION 'Intervención no encontrada';
  END IF;
  IF v_estado NOT IN ('pendiente', 'cancelada') THEN
    RAISE EXCEPTION 'Solo se pueden eliminar intervenciones en estado pendiente o cancelada. Estado actual: %', v_estado;
  END IF;

  -- Liberar FK en tablas relacionadas (SET NULL)
  UPDATE tickets_sat SET intervencion_id = NULL WHERE intervencion_id = p_id;
  UPDATE citas SET intervencion_id = NULL WHERE intervencion_id = p_id;

  -- Eliminar registros hijos
  DELETE FROM intervenciones_materiales WHERE intervencion_id = p_id;
  DELETE FROM intervenciones_historial WHERE intervencion_id = p_id;
  DELETE FROM encuestas_satisfaccion WHERE intervencion_id = p_id;

  -- Eliminar fotos si existe la tabla
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fotos_intervenciones') THEN
    DELETE FROM fotos_intervenciones WHERE intervencion_id = p_id;
  END IF;

  -- Eliminar la intervención
  DELETE FROM intervenciones WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION eliminar_intervencion(UUID) TO authenticated;


-- ─────────────────────────────────────────────
-- RPC: eliminar_ticket
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION eliminar_ticket(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rol TEXT;
  v_estado TEXT;
BEGIN
  -- Verificar rol del usuario
  SELECT rol INTO v_rol FROM profiles WHERE id = auth.uid();
  IF v_rol NOT IN ('admin', 'encargado') THEN
    RAISE EXCEPTION 'Sin permisos para eliminar tickets';
  END IF;

  -- Verificar estado del ticket
  SELECT estado INTO v_estado FROM tickets_sat WHERE id = p_id;
  IF v_estado IS NULL THEN
    RAISE EXCEPTION 'Ticket no encontrado';
  END IF;
  IF v_estado NOT IN ('abierto', 'cerrado') THEN
    RAISE EXCEPTION 'Solo se pueden eliminar tickets en estado abierto o cerrado. Estado actual: %', v_estado;
  END IF;

  -- Eliminar registros hijos si existen
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_comentarios') THEN
    DELETE FROM ticket_comentarios WHERE ticket_id = p_id;
  END IF;

  -- Eliminar el ticket
  DELETE FROM tickets_sat WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION eliminar_ticket(UUID) TO authenticated;
