BEGIN;

-- ============================================================
-- 058: Añadir campos dirección a tickets + mejorar RPC traspaso
-- SEGURIDAD: Solo ADD COLUMN en tabla SAT propia + recrear RPC
-- ============================================================

-- 1. Añadir campos de dirección a tickets_sat
ALTER TABLE tickets_sat
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS codigo_postal TEXT,
  ADD COLUMN IF NOT EXISTS ciudad TEXT;

-- 2. Mejorar RPC crear_ticket para incluir dirección
CREATE OR REPLACE FUNCTION crear_ticket(
  p_asunto TEXT,
  p_tipo TEXT DEFAULT 'incidencia',
  p_prioridad TEXT DEFAULT 'normal',
  p_descripcion TEXT DEFAULT NULL,
  p_cliente_id UUID DEFAULT NULL,
  p_comunidad_id UUID DEFAULT NULL,
  p_contrato_id UUID DEFAULT NULL,
  p_categoria TEXT DEFAULT NULL,
  p_origen TEXT DEFAULT 'interno',
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
  v_numero := generar_numero_ticket();

  INSERT INTO tickets_sat (
    numero_ticket, asunto, tipo, prioridad, descripcion,
    cliente_id, comunidad_id, contrato_id, categoria, origen,
    direccion, codigo_postal, ciudad,
    created_by
  ) VALUES (
    v_numero, p_asunto, p_tipo, p_prioridad, p_descripcion,
    p_cliente_id, p_comunidad_id, p_contrato_id, p_categoria, p_origen,
    p_direccion, p_codigo_postal, p_ciudad,
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION crear_ticket TO authenticated;

-- 3. Mejorar RPC crear_intervencion_desde_ticket para traspasar dirección
CREATE OR REPLACE FUNCTION crear_intervencion_desde_ticket(p_ticket_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket tickets_sat%ROWTYPE;
  v_intervencion_id UUID;
  v_numero_parte TEXT;
  v_direccion TEXT;
  v_cp TEXT;
  v_ciudad TEXT;
BEGIN
  SELECT * INTO v_ticket FROM tickets_sat WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket no encontrado';
  END IF;

  IF v_ticket.intervencion_id IS NOT NULL THEN
    RAISE EXCEPTION 'Este ticket ya tiene una intervención vinculada';
  END IF;

  -- Dirección: usar la del ticket, o si no tiene, la del cliente
  v_direccion := v_ticket.direccion;
  v_cp := v_ticket.codigo_postal;
  v_ciudad := v_ticket.ciudad;

  IF v_direccion IS NULL AND v_ticket.cliente_id IS NOT NULL THEN
    SELECT
      direccion_correspondencia, cp_correspondencia, ciudad_correspondencia
    INTO v_direccion, v_cp, v_ciudad
    FROM clientes
    WHERE id = v_ticket.cliente_id;
  END IF;

  v_numero_parte := generar_numero_parte();

  INSERT INTO intervenciones (
    numero_parte, titulo, tipo, prioridad, descripcion,
    cliente_id, comunidad_id, contrato_id,
    direccion, codigo_postal, ciudad,
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
    v_direccion, v_cp, v_ciudad,
    'pendiente',
    auth.uid()
  )
  RETURNING id INTO v_intervencion_id;

  UPDATE tickets_sat
  SET intervencion_id = v_intervencion_id,
      estado = CASE WHEN estado = 'abierto' THEN 'en_progreso' ELSE estado END
  WHERE id = p_ticket_id;

  RETURN v_intervencion_id;
END;
$$;

GRANT EXECUTE ON FUNCTION crear_intervencion_desde_ticket TO authenticated;

COMMIT;
