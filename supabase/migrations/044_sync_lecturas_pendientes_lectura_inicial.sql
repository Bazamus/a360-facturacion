-- =====================================================
-- Migración 044: Sincronizar lecturas pendientes al cambiar lectura_inicial
-- =====================================================
-- 1. Trigger: al actualizar lectura_inicial en contadores_conceptos, se
--    actualiza la lectura pendiente (facturada=false) para que Generar
--    Facturas muestre el consumo correcto.
-- 2. Permitir editar lectura inicial cuando solo hay lecturas pendientes o
--    facturas en borrador (no emitidas).
-- 3. Al editar con lecturas existentes, no sobrescribir lectura_actual.
-- =====================================================

CREATE OR REPLACE FUNCTION sync_lectura_pendiente_al_cambiar_inicial()
RETURNS TRIGGER AS $$
DECLARE
  v_lectura_id UUID;
  v_lectura_valor DECIMAL(12,4);
BEGIN
  -- Solo actuar si cambió lectura_inicial o fecha_lectura_inicial
  IF (OLD.lectura_inicial IS NOT DISTINCT FROM NEW.lectura_inicial
      AND OLD.fecha_lectura_inicial IS NOT DISTINCT FROM NEW.fecha_lectura_inicial) THEN
    RETURN NEW;
  END IF;

  -- Obtener la lectura pendiente más reciente (no facturada) para este contador+concepto
  SELECT l.id, l.lectura_valor
  INTO v_lectura_id, v_lectura_valor
  FROM lecturas l
  WHERE l.contador_id = NEW.contador_id
    AND l.concepto_id = NEW.concepto_id
    AND l.facturada = false
  ORDER BY l.fecha_lectura DESC, l.created_at DESC
  LIMIT 1;

  IF v_lectura_id IS NOT NULL THEN
    UPDATE lecturas
    SET
      lectura_anterior = NEW.lectura_inicial,
      fecha_lectura_anterior = NEW.fecha_lectura_inicial,
      consumo = v_lectura_valor - NEW.lectura_inicial,
      updated_at = NOW()
    WHERE id = v_lectura_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger si existía (por idempotencia)
DROP TRIGGER IF EXISTS trg_sync_lectura_pendiente_lectura_inicial ON contadores_conceptos;

CREATE TRIGGER trg_sync_lectura_pendiente_lectura_inicial
  AFTER UPDATE OF lectura_inicial, fecha_lectura_inicial
  ON contadores_conceptos
  FOR EACH ROW
  EXECUTE FUNCTION sync_lectura_pendiente_al_cambiar_inicial();

COMMENT ON FUNCTION sync_lectura_pendiente_al_cambiar_inicial() IS
'Sincroniza la lectura pendiente de facturar (lecturas.facturada=false) cuando se edita lectura_inicial en contadores_conceptos: actualiza lectura_anterior, fecha_lectura_anterior y consumo para que v_lecturas_pendientes_facturar refleje el cambio.';

-- =====================================================
-- Corrección puntual: sincronizar lecturas pendientes ya existentes
-- donde lectura_anterior no coincide con contadores_conceptos.lectura_inicial
-- =====================================================
UPDATE lecturas l
SET
  lectura_anterior = cc.lectura_inicial,
  fecha_lectura_anterior = cc.fecha_lectura_inicial,
  consumo = l.lectura_valor - cc.lectura_inicial,
  updated_at = NOW()
FROM contadores_conceptos cc
WHERE l.contador_id = cc.contador_id
  AND l.concepto_id = cc.concepto_id
  AND l.facturada = false
  AND cc.activo = true
  AND (l.lectura_anterior IS DISTINCT FROM cc.lectura_inicial
       OR l.fecha_lectura_anterior IS DISTINCT FROM cc.fecha_lectura_inicial);

-- =====================================================
-- Permitir editar lectura inicial cuando solo hay pendientes o factura borrador
-- =====================================================
CREATE OR REPLACE FUNCTION validar_edicion_lectura_inicial(
  p_contador_concepto_id UUID
)
RETURNS TABLE (
  puede_editar BOOLEAN,
  razon_bloqueo TEXT,
  lecturas_posteriores INTEGER,
  facturas_relacionadas INTEGER
) AS $$
DECLARE
  v_contador_id UUID;
  v_concepto_id UUID;
  v_lecturas_count INTEGER;
  v_facturas_count INTEGER;
  v_facturas_emitidas INTEGER;
BEGIN
  SELECT contador_id, concepto_id INTO v_contador_id, v_concepto_id
  FROM contadores_conceptos WHERE id = p_contador_concepto_id;

  SELECT COUNT(*) INTO v_lecturas_count
  FROM lecturas
  WHERE contador_id = v_contador_id AND concepto_id = v_concepto_id;

  SELECT COUNT(DISTINCT fl.factura_id) INTO v_facturas_count
  FROM facturas_lineas fl
  INNER JOIN lecturas l ON fl.lectura_id = l.id
  WHERE l.contador_id = v_contador_id AND l.concepto_id = v_concepto_id;

  -- Facturas ya emitidas/pagadas/anuladas (no borrador)
  SELECT COUNT(DISTINCT f.id) INTO v_facturas_emitidas
  FROM facturas f
  INNER JOIN facturas_lineas fl ON fl.factura_id = f.id
  INNER JOIN lecturas l ON fl.lectura_id = l.id
  WHERE l.contador_id = v_contador_id AND l.concepto_id = v_concepto_id
    AND f.estado != 'borrador';

  IF v_facturas_emitidas > 0 THEN
    RETURN QUERY SELECT false,
      'Existen ' || v_facturas_emitidas || ' factura(s) emitida(s) relacionada(s). No se puede editar la lectura inicial.',
      v_lecturas_count, v_facturas_count;
  ELSE
    RETURN QUERY SELECT true, NULL::TEXT, v_lecturas_count, v_facturas_count;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Al editar lectura_inicial, no sobrescribir lectura_actual si ya hay lecturas
-- =====================================================
CREATE OR REPLACE FUNCTION editar_lectura_inicial(
  p_contador_concepto_id UUID,
  p_nueva_lectura DECIMAL(12,4) DEFAULT NULL,
  p_nueva_fecha DATE DEFAULT NULL,
  p_motivo TEXT DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_puede_editar BOOLEAN;
  v_razon_bloqueo TEXT;
  v_lecturas INTEGER;
  v_facturas INTEGER;
  v_lectura_anterior DECIMAL(12,4);
  v_fecha_anterior DATE;
  v_campo_modificado VARCHAR(50);
  v_historial_id UUID;
  v_tiene_lecturas BOOLEAN;
BEGIN
  SELECT puede_editar, razon_bloqueo, lecturas_posteriores, facturas_relacionadas
  INTO v_puede_editar, v_razon_bloqueo, v_lecturas, v_facturas
  FROM validar_edicion_lectura_inicial(p_contador_concepto_id);

  IF NOT v_puede_editar THEN
    RETURN json_build_object('success', false, 'error', v_razon_bloqueo,
      'lecturas_posteriores', v_lecturas, 'facturas_relacionadas', v_facturas);
  END IF;

  SELECT lectura_inicial, fecha_lectura_inicial INTO v_lectura_anterior, v_fecha_anterior
  FROM contadores_conceptos WHERE id = p_contador_concepto_id;

  v_tiene_lecturas := (v_lecturas > 0);

  IF p_nueva_lectura IS NOT NULL AND p_nueva_fecha IS NOT NULL THEN
    v_campo_modificado := 'ambos';
  ELSIF p_nueva_lectura IS NOT NULL THEN
    v_campo_modificado := 'lectura_inicial';
  ELSIF p_nueva_fecha IS NOT NULL THEN
    v_campo_modificado := 'fecha_lectura_inicial';
  ELSE
    RETURN json_build_object('success', false, 'error', 'Debe proporcionar al menos un valor a modificar');
  END IF;

  -- Actualizar solo lectura_inicial/fecha; si ya hay lecturas, NO tocar lectura_actual
  IF v_tiene_lecturas THEN
    UPDATE contadores_conceptos
    SET lectura_inicial = COALESCE(p_nueva_lectura, lectura_inicial),
        fecha_lectura_inicial = COALESCE(p_nueva_fecha, fecha_lectura_inicial),
        updated_at = NOW()
    WHERE id = p_contador_concepto_id;
  ELSE
    UPDATE contadores_conceptos
    SET lectura_inicial = COALESCE(p_nueva_lectura, lectura_inicial),
        fecha_lectura_inicial = COALESCE(p_nueva_fecha, fecha_lectura_inicial),
        lectura_actual = COALESCE(p_nueva_lectura, lectura_actual),
        fecha_lectura_actual = COALESCE(p_nueva_fecha, fecha_lectura_actual),
        updated_at = NOW()
    WHERE id = p_contador_concepto_id;
  END IF;

  -- El trigger sync_lectura_pendiente_al_cambiar_inicial actualizará la lectura pendiente

  INSERT INTO contador_conceptos_historial (
    contador_concepto_id, campo_modificado,
    valor_anterior_lectura, valor_nuevo_lectura,
    valor_anterior_fecha, valor_nuevo_fecha,
    motivo, usuario_id, tipo_modificacion
  ) VALUES (
    p_contador_concepto_id, v_campo_modificado,
    v_lectura_anterior, COALESCE(p_nueva_lectura, v_lectura_anterior),
    v_fecha_anterior, COALESCE(p_nueva_fecha, v_fecha_anterior),
    p_motivo, COALESCE(p_usuario_id, auth.uid()), 'manual'
  ) RETURNING id INTO v_historial_id;

  RETURN json_build_object(
    'success', true, 'historial_id', v_historial_id, 'campo_modificado', v_campo_modificado,
    'valores_anteriores', json_build_object('lectura', v_lectura_anterior, 'fecha', v_fecha_anterior),
    'valores_nuevos', json_build_object(
      'lectura', COALESCE(p_nueva_lectura, v_lectura_anterior),
      'fecha', COALESCE(p_nueva_fecha, v_fecha_anterior)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
