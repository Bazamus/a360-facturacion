-- =====================================================
-- Rollback de Migración 010: Revertir Facturas Manuales
-- En caso de necesitar revertir los cambios
-- =====================================================

-- Eliminar índice parcial
DROP INDEX IF EXISTS idx_facturas_contador;

-- Revertir vista a la versión original (solo si no hay facturas manuales)
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
JOIN contadores cont ON cont.id = f.contador_id;

-- ADVERTENCIA: Solo ejecutar si no existen facturas manuales
-- Hacer contador_id y ubicacion_id NOT NULL nuevamente
-- ALTER TABLE facturas ALTER COLUMN contador_id SET NOT NULL;
-- ALTER TABLE facturas ALTER COLUMN ubicacion_id SET NOT NULL;
