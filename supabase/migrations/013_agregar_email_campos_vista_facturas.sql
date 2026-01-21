-- =====================================================
-- Migración 013: Agregar campos de email a vista v_facturas_resumen
-- Incluir email_enviado y fecha_email_enviado para icono dinámico en tabla
-- Fecha: Enero 2026
-- =====================================================

-- Recrear vista v_facturas_resumen con campos de email
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
  f.email_enviado,
  f.fecha_email_enviado,
  f.created_at,
  (SELECT COUNT(*) FROM facturas_lineas WHERE factura_id = f.id) as num_lineas
FROM facturas f
JOIN comunidades com ON com.id = f.comunidad_id
LEFT JOIN contadores cont ON cont.id = f.contador_id;

COMMENT ON VIEW v_facturas_resumen IS 
  'Vista resumida de facturas con datos relacionados. Incluye campos de envío de email para icono dinámico. Soporta facturas manuales sin contador.';
