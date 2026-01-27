-- =====================================================
-- Migración 020: Actualizar vista v_facturas_resumen
-- Descripción: Incluir columnas de estado del cliente
--              (cliente_estado_codigo, cliente_estado_nombre, cliente_estado_color)
-- =====================================================

-- Recrear vista v_facturas_resumen con campos de estado del cliente
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
  f.cliente_estado_codigo,
  f.cliente_estado_nombre,
  f.cliente_estado_color,
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
  'Vista resumida de facturas con datos relacionados. Incluye campos de envío de email y estado del cliente (snapshot al momento de facturar).';
