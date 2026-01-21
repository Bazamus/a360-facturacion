-- =====================================================
-- Migración 010: Permitir Facturas Manuales
-- Hacer nullable contador_id y ubicacion_id para soportar facturas manuales
-- Fecha: Enero 2026
-- =====================================================

-- Hacer contador_id nullable para permitir facturas manuales sin contador asociado
ALTER TABLE facturas 
  ALTER COLUMN contador_id DROP NOT NULL;

-- Hacer ubicacion_id nullable para permitir facturas manuales sin ubicación específica
ALTER TABLE facturas 
  ALTER COLUMN ubicacion_id DROP NOT NULL;

-- Actualizar comentarios
COMMENT ON COLUMN facturas.contador_id IS 
  'ID del contador asociado. NULL para facturas manuales sin contador específico.';

COMMENT ON COLUMN facturas.ubicacion_id IS 
  'ID de la ubicación. NULL para facturas manuales sin ubicación específica.';

-- Crear índice parcial para facturas con contador
CREATE INDEX idx_facturas_contador 
  ON facturas(contador_id) 
  WHERE contador_id IS NOT NULL;

-- Actualizar vista v_facturas_resumen para soportar facturas sin contador
DROP VIEW IF EXISTS v_facturas_resumen;

CREATE VIEW v_facturas_resumen AS
SELECT 
  f.id,
  f.serie,
  f.numero,
  f.numero_completo,
  f.fecha_factura,
  f.fecha_vencimiento,
  f.periodo_inicio,
  f.periodo_fin,
  f.es_periodo_parcial,
  f.dias_periodo,
  f.base_imponible,
  f.importe_iva,
  f.total,
  f.estado,
  f.metodo_pago,
  f.fecha_pago,
  f.cliente_id,
  f.cliente_nombre,
  f.cliente_nif,
  f.cliente_email,
  f.comunidad_id,
  com.nombre as comunidad_nombre,
  com.codigo as comunidad_codigo,
  f.ubicacion_id,
  f.ubicacion_direccion,
  f.contador_id,
  cont.numero_serie as contador_numero_serie,
  f.pdf_generado,
  f.pdf_url,
  f.created_at,
  (SELECT COUNT(*) FROM facturas_lineas WHERE factura_id = f.id) as num_lineas
FROM facturas f
JOIN comunidades com ON com.id = f.comunidad_id
LEFT JOIN contadores cont ON cont.id = f.contador_id;  -- LEFT JOIN para facturas manuales

COMMENT ON VIEW v_facturas_resumen IS 
  'Vista resumida de facturas con datos relacionados. Soporta facturas manuales sin contador.';

-- Verificar integridad de datos
-- Asegurar que las facturas que tienen contador_id también tengan ubicacion_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM facturas 
    WHERE contador_id IS NOT NULL AND ubicacion_id IS NULL
  ) THEN
    RAISE NOTICE 'Advertencia: Existen facturas con contador pero sin ubicación';
  END IF;
END $$;
