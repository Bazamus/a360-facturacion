-- =====================================================
-- Migración 011: Hacer periodo opcional en facturas manuales
-- Permitir facturas sin periodo de tiempo (servicios puntuales)
-- =====================================================

-- Hacer periodo_inicio nullable
ALTER TABLE facturas 
  ALTER COLUMN periodo_inicio DROP NOT NULL;

-- Hacer periodo_fin nullable
ALTER TABLE facturas 
  ALTER COLUMN periodo_fin DROP NOT NULL;

-- Hacer dias_periodo nullable
ALTER TABLE facturas 
  ALTER COLUMN dias_periodo DROP NOT NULL;

-- Actualizar comentarios
COMMENT ON COLUMN facturas.periodo_inicio IS 
  'Fecha de inicio del periodo de facturación. NULL para facturas de servicios puntuales sin periodo.';

COMMENT ON COLUMN facturas.periodo_fin IS 
  'Fecha de fin del periodo de facturación. NULL para facturas de servicios puntuales sin periodo.';

COMMENT ON COLUMN facturas.dias_periodo IS 
  'Número de días del periodo. NULL para facturas sin periodo definido.';

-- Verificar integridad
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM facturas 
    WHERE (periodo_inicio IS NULL AND periodo_fin IS NOT NULL)
       OR (periodo_inicio IS NOT NULL AND periodo_fin IS NULL)
  ) THEN
    RAISE WARNING 'Hay facturas con periodo inconsistente (solo una fecha definida)';
  END IF;
END $$;
