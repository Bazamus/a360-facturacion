-- =====================================================
-- Migración: Actualizar límite de envíos para Plan Pro
-- Descripción: Aumenta el límite de envíos por hora de 100 a 10,000
--              para reflejar las capacidades del Plan Pro de Resend
-- Fecha: 2026-01-30
-- =====================================================

-- Actualizar configuración existente
-- Plan Pro de Resend permite hasta 50,000 emails/mes sin límite diario estricto
-- Establecemos un límite razonable de 10,000 por hora

UPDATE configuracion_email
SET max_envios_por_hora = 10000
WHERE max_envios_por_hora = 100 OR max_envios_por_hora < 10000;

-- Verificar el cambio
DO $$
DECLARE
  v_max_envios INTEGER;
BEGIN
  SELECT max_envios_por_hora INTO v_max_envios
  FROM configuracion_email
  LIMIT 1;
  
  RAISE NOTICE 'Límite de envíos actualizado a: % facturas/hora', v_max_envios;
  RAISE NOTICE 'Plan Pro Resend: hasta 50,000 emails/mes';
END $$;
