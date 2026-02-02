-- =====================================================
-- Migración: Limpiar envíos atascados en estado "enviando"
-- Descripción: Detecta y corrige envíos que llevan mucho tiempo
--              en estado "enviando" (timeout)
-- Fecha: 2026-01-30
-- =====================================================

-- =====================================================
-- 1. Función para detectar envíos atascados
-- =====================================================

CREATE OR REPLACE FUNCTION detectar_envios_atascados(
  p_timeout_minutos INTEGER DEFAULT 60
)
RETURNS TABLE (
  id UUID,
  factura_id UUID,
  email_destino TEXT,
  created_at TIMESTAMPTZ,
  minutos_atascado INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.factura_id,
    e.email_destino,
    e.created_at,
    EXTRACT(EPOCH FROM (NOW() - e.created_at))::INTEGER / 60 as minutos_atascado
  FROM envios_email e
  WHERE e.estado = 'enviando'
    AND e.created_at < NOW() - (p_timeout_minutos || ' minutes')::INTERVAL
  ORDER BY e.created_at ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detectar_envios_atascados IS 'Detecta envíos que llevan mucho tiempo en estado enviando (timeout por defecto: 60 minutos)';

-- =====================================================
-- 2. Función para limpiar envíos atascados
-- =====================================================

CREATE OR REPLACE FUNCTION limpiar_envios_atascados(
  p_timeout_minutos INTEGER DEFAULT 60,
  p_marcar_como TEXT DEFAULT 'timeout' -- 'timeout' o 'fallido'
)
RETURNS JSON AS $$
DECLARE
  v_count INTEGER := 0;
  v_envio_record RECORD;
  v_envios_limpiados UUID[] := '{}';
BEGIN
  RAISE NOTICE 'Iniciando limpieza de envíos atascados (timeout: % minutos)...', p_timeout_minutos;
  
  -- Buscar y actualizar envíos atascados
  FOR v_envio_record IN
    SELECT * FROM detectar_envios_atascados(p_timeout_minutos)
  LOOP
    -- Actualizar estado a 'fallido' con mensaje de timeout
    UPDATE envios_email
    SET 
      estado = 'fallido',
      error_codigo = 'TIMEOUT',
      error_mensaje = format(
        'El envío se quedó en estado "enviando" por más de %s minutos. Proceso interrumpido o timeout.',
        v_envio_record.minutos_atascado
      ),
      updated_at = NOW(),
      proximo_reintento = CASE 
        WHEN reintentos_activos = true AND intentos < max_reintentos 
        THEN NOW() + (intervalo_reintento_minutos || ' minutes')::INTERVAL
        ELSE NULL
      END
    WHERE id = v_envio_record.id;
    
    v_count := v_count + 1;
    v_envios_limpiados := array_append(v_envios_limpiados, v_envio_record.id);
    
    RAISE NOTICE 'Limpiado: Envío % (Factura: %, Email: %, Tiempo atascado: % min)',
      v_envio_record.id,
      v_envio_record.factura_id,
      v_envio_record.email_destino,
      v_envio_record.minutos_atascado;
  END LOOP;
  
  RAISE NOTICE 'Limpieza completada: % envío(s) actualizado(s)', v_count;
  
  RETURN json_build_object(
    'success', true,
    'envios_limpiados', v_count,
    'ids', v_envios_limpiados,
    'timeout_minutos', p_timeout_minutos
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION limpiar_envios_atascados IS 'Marca como fallidos los envíos que llevan mucho tiempo en estado enviando';

-- =====================================================
-- 3. Ejecutar limpieza inmediata de envíos atascados
-- =====================================================

-- Detectar envíos atascados actuales (más de 30 minutos)
DO $$
DECLARE
  v_resultado JSON;
BEGIN
  RAISE NOTICE '=== LIMPIEZA DE ENVÍOS ATASCADOS ===';
  RAISE NOTICE '';
  
  -- Ejecutar limpieza con timeout de 30 minutos (ajusta según sea necesario)
  SELECT limpiar_envios_atascados(30) INTO v_resultado;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Resultado: %', v_resultado;
  RAISE NOTICE '=== FIN LIMPIEZA ===';
END $$;

-- =====================================================
-- 4. Trigger para prevenir envíos atascados
-- =====================================================

-- Función trigger para detectar envíos que llevan mucho tiempo
CREATE OR REPLACE FUNCTION check_envio_timeout()
RETURNS TRIGGER AS $$
DECLARE
  v_minutos_en_enviando INTEGER;
BEGIN
  -- Solo verificar si el estado es "enviando"
  IF NEW.estado = 'enviando' THEN
    -- Calcular cuánto tiempo lleva en "enviando"
    v_minutos_en_enviando := EXTRACT(EPOCH FROM (NOW() - NEW.created_at))::INTEGER / 60;
    
    -- Si lleva más de 60 minutos, marcar como timeout automáticamente
    IF v_minutos_en_enviando > 60 THEN
      NEW.estado := 'fallido';
      NEW.error_codigo := 'AUTO_TIMEOUT';
      NEW.error_mensaje := format(
        'Timeout automático: El envío llevaba %s minutos en estado "enviando"',
        v_minutos_en_enviando
      );
      NEW.updated_at := NOW();
      
      RAISE WARNING 'Timeout automático aplicado a envío %: % minutos en "enviando"',
        NEW.id, v_minutos_en_enviando;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger (solo si no existe)
DROP TRIGGER IF EXISTS trigger_check_envio_timeout ON envios_email;
CREATE TRIGGER trigger_check_envio_timeout
  BEFORE UPDATE ON envios_email
  FOR EACH ROW
  EXECUTE FUNCTION check_envio_timeout();

COMMENT ON TRIGGER trigger_check_envio_timeout ON envios_email IS 'Previene envíos atascados en estado enviando por más de 60 minutos';

-- =====================================================
-- 5. Vista para monitoreo de envíos
-- =====================================================

CREATE OR REPLACE VIEW v_envios_en_proceso AS
SELECT 
  e.id,
  e.factura_id,
  e.email_destino,
  e.estado,
  e.created_at,
  EXTRACT(EPOCH FROM (NOW() - e.created_at))::INTEGER / 60 as minutos_en_proceso,
  CASE 
    WHEN EXTRACT(EPOCH FROM (NOW() - e.created_at))::INTEGER / 60 > 60 THEN 'ALERTA: Posible timeout'
    WHEN EXTRACT(EPOCH FROM (NOW() - e.created_at))::INTEGER / 60 > 30 THEN 'ADVERTENCIA: Tiempo prolongado'
    ELSE 'Normal'
  END as alerta,
  f.numero_completo as factura_numero,
  c.nombre as cliente_nombre
FROM envios_email e
LEFT JOIN facturas f ON e.factura_id = f.id
LEFT JOIN clientes c ON e.cliente_id = c.id
WHERE e.estado IN ('enviando', 'pendiente')
ORDER BY e.created_at ASC;

COMMENT ON VIEW v_envios_en_proceso IS 'Vista de monitoreo de envíos en proceso con alertas de timeout';

-- =====================================================
-- 6. Grants
-- =====================================================

GRANT EXECUTE ON FUNCTION detectar_envios_atascados TO authenticated;
GRANT EXECUTE ON FUNCTION limpiar_envios_atascados TO authenticated;
GRANT SELECT ON v_envios_en_proceso TO authenticated;

-- =====================================================
-- 7. Instrucciones de uso
-- =====================================================

-- Para detectar envíos atascados manualmente:
-- SELECT * FROM detectar_envios_atascados(30);  -- Envíos con más de 30 minutos

-- Para limpiar envíos atascados manualmente:
-- SELECT limpiar_envios_atascados(30);  -- Limpiar envíos con más de 30 minutos

-- Para ver envíos en proceso con alertas:
-- SELECT * FROM v_envios_en_proceso;
