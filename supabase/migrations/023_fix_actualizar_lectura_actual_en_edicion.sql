-- =====================================================
-- Migración: Fix actualizar lectura_actual al editar
-- Descripción: Actualiza la función para que también modifique
--              lectura_actual y fecha_lectura_actual
-- Fecha: 2026-01-30
-- =====================================================

-- Problema detectado:
-- Al editar lectura_inicial/fecha_lectura_inicial, no se actualizaba
-- lectura_actual/fecha_lectura_actual, causando errores en importaciones.

-- =====================================================
-- Actualizar función editar_lectura_inicial
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
BEGIN
  -- Validar si se puede editar
  SELECT puede_editar, razon_bloqueo, lecturas_posteriores, facturas_relacionadas
  INTO v_puede_editar, v_razon_bloqueo, v_lecturas, v_facturas
  FROM validar_edicion_lectura_inicial(p_contador_concepto_id);
  
  IF NOT v_puede_editar THEN
    RETURN json_build_object(
      'success', false,
      'error', v_razon_bloqueo,
      'lecturas_posteriores', v_lecturas,
      'facturas_relacionadas', v_facturas
    );
  END IF;
  
  -- Obtener valores anteriores
  SELECT lectura_inicial, fecha_lectura_inicial
  INTO v_lectura_anterior, v_fecha_anterior
  FROM contadores_conceptos
  WHERE id = p_contador_concepto_id;
  
  -- Determinar qué campo se modificó
  IF p_nueva_lectura IS NOT NULL AND p_nueva_fecha IS NOT NULL THEN
    v_campo_modificado := 'ambos';
  ELSIF p_nueva_lectura IS NOT NULL THEN
    v_campo_modificado := 'lectura_inicial';
  ELSIF p_nueva_fecha IS NOT NULL THEN
    v_campo_modificado := 'fecha_lectura_inicial';
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'Debe proporcionar al menos un valor a modificar'
    );
  END IF;
  
  -- Actualizar contador_conceptos
  -- IMPORTANTE: También actualizamos lectura_actual y fecha_lectura_actual
  -- porque en un contador sin lecturas posteriores, la lectura inicial
  -- ES la lectura actual. Esto permite que las importaciones funcionen correctamente.
  UPDATE contadores_conceptos
  SET 
    lectura_inicial = COALESCE(p_nueva_lectura, lectura_inicial),
    fecha_lectura_inicial = COALESCE(p_nueva_fecha, fecha_lectura_inicial),
    lectura_actual = COALESCE(p_nueva_lectura, lectura_actual),
    fecha_lectura_actual = COALESCE(p_nueva_fecha, fecha_lectura_actual),
    updated_at = NOW()
  WHERE id = p_contador_concepto_id;
  
  -- Registrar en historial
  INSERT INTO contador_conceptos_historial (
    contador_concepto_id,
    campo_modificado,
    valor_anterior_lectura,
    valor_nuevo_lectura,
    valor_anterior_fecha,
    valor_nuevo_fecha,
    motivo,
    usuario_id,
    tipo_modificacion
  ) VALUES (
    p_contador_concepto_id,
    v_campo_modificado,
    v_lectura_anterior,
    COALESCE(p_nueva_lectura, v_lectura_anterior),
    v_fecha_anterior,
    COALESCE(p_nueva_fecha, v_fecha_anterior),
    p_motivo,
    COALESCE(p_usuario_id, auth.uid()),
    'manual'
  ) RETURNING id INTO v_historial_id;
  
  -- Retornar resultado exitoso
  RETURN json_build_object(
    'success', true,
    'historial_id', v_historial_id,
    'campo_modificado', v_campo_modificado,
    'valores_anteriores', json_build_object(
      'lectura', v_lectura_anterior,
      'fecha', v_fecha_anterior
    ),
    'valores_nuevos', json_build_object(
      'lectura', COALESCE(p_nueva_lectura, v_lectura_anterior),
      'fecha', COALESCE(p_nueva_fecha, v_fecha_anterior)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION editar_lectura_inicial IS 'Edita lectura inicial y actual con validación y auditoría automática';

-- =====================================================
-- Script de corrección para datos existentes
-- =====================================================

-- Este script sincroniza lectura_actual con lectura_inicial
-- en contadores que NO tienen lecturas posteriores

-- Identificar contadores afectados
DO $$
DECLARE
  v_contador_record RECORD;
  v_contador_id UUID;
  v_concepto_id UUID;
  v_tiene_lecturas INTEGER;
  v_actualizados INTEGER := 0;
BEGIN
  RAISE NOTICE 'Iniciando sincronización de lecturas inicial/actual...';
  
  -- Buscar todos los contadores_conceptos donde lectura_inicial != lectura_actual
  -- o fecha_lectura_inicial != fecha_lectura_actual
  FOR v_contador_record IN
    SELECT 
      cc.id,
      cc.contador_id,
      cc.concepto_id,
      cc.lectura_inicial,
      cc.fecha_lectura_inicial,
      cc.lectura_actual,
      cc.fecha_lectura_actual,
      c.numero_serie,
      con.codigo
    FROM contadores_conceptos cc
    INNER JOIN contadores c ON cc.contador_id = c.id
    INNER JOIN conceptos con ON cc.concepto_id = con.id
    WHERE 
      (cc.lectura_inicial != cc.lectura_actual 
       OR cc.fecha_lectura_inicial != cc.fecha_lectura_actual)
      AND cc.activo = true
  LOOP
    -- Verificar si tiene lecturas posteriores
    SELECT COUNT(*)
    INTO v_tiene_lecturas
    FROM lecturas
    WHERE contador_id = v_contador_record.contador_id
      AND concepto_id = v_contador_record.concepto_id;
    
    -- Si NO tiene lecturas posteriores, sincronizar
    IF v_tiene_lecturas = 0 THEN
      UPDATE contadores_conceptos
      SET 
        lectura_actual = lectura_inicial,
        fecha_lectura_actual = fecha_lectura_inicial,
        updated_at = NOW()
      WHERE id = v_contador_record.id;
      
      v_actualizados := v_actualizados + 1;
      
      RAISE NOTICE 'Sincronizado: Contador % (%), Concepto %',
        v_contador_record.numero_serie,
        v_contador_record.contador_id,
        v_contador_record.codigo;
    ELSE
      RAISE NOTICE 'OMITIDO (tiene % lecturas): Contador % (%), Concepto %',
        v_tiene_lecturas,
        v_contador_record.numero_serie,
        v_contador_record.contador_id,
        v_contador_record.codigo;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Sincronización completada: % registros actualizados', v_actualizados;
END $$;
