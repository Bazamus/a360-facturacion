-- =====================================================
-- Migracion 053: Preferencia de presentacion de conceptos
-- Permite agrupar conceptos en el documento de cliente
-- =====================================================

ALTER TABLE facturas
ADD COLUMN IF NOT EXISTS agrupar_conceptos_en_documento BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN facturas.agrupar_conceptos_en_documento IS
'Si es true, el PDF/email agrupa lineas por concepto para presentacion al cliente y usa periodo global calculado desde las lineas.';

DROP VIEW IF EXISTS v_facturas_resumen CASCADE;

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
  f.tipo,
  f.factura_rectificada_id,
  f.agrupar_conceptos_en_documento,
  f.metodo_pago,
  f.fecha_pago,
  f.motivo_anulacion,

  f.cliente_id,
  f.comunidad_id,
  f.ubicacion_id,
  f.contador_id,

  f.cliente_nombre,
  f.cliente_nif,
  f.cliente_email,
  f.cliente_direccion,
  f.cliente_cp,
  f.cliente_ciudad,
  f.cliente_provincia,
  f.cliente_iban,
  f.cliente_estado_codigo,
  f.cliente_estado_nombre,
  f.cliente_estado_color,

  cli.email AS cliente_actual_email,
  COALESCE(cli.nombre || ' ' || COALESCE(cli.apellidos, ''), f.cliente_nombre) AS cliente_actual_nombre,
  cli.nif AS cliente_actual_nif,
  cli.telefono AS cliente_actual_telefono,
  cli.telefono_secundario AS cliente_actual_telefono_secundario,
  COALESCE(cli.direccion_correspondencia, f.cliente_direccion) AS cliente_actual_direccion,
  cli.cp_correspondencia AS cliente_actual_cp,
  cli.ciudad_correspondencia AS cliente_actual_ciudad,
  cli.provincia_correspondencia AS cliente_actual_provincia,
  cli.iban AS cliente_actual_iban,
  cli.codigo_cliente AS cliente_codigo_cliente,

  ec.codigo AS cliente_actual_estado_codigo,
  ec.nombre AS cliente_actual_estado_nombre,
  ec.color AS cliente_actual_estado_color,

  com.nombre AS comunidad_nombre,
  com.codigo AS comunidad_codigo,

  f.ubicacion_direccion,

  cont.numero_serie AS contador_numero_serie,

  f.pdf_generado,
  f.pdf_url,
  f.email_enviado,
  f.fecha_email_enviado,

  f.created_at,
  f.updated_at,

  (SELECT COUNT(*) FROM facturas_lineas WHERE factura_id = f.id) AS num_lineas

FROM facturas f
JOIN comunidades com ON com.id = f.comunidad_id
LEFT JOIN contadores cont ON cont.id = f.contador_id
LEFT JOIN clientes cli ON cli.id = f.cliente_id
LEFT JOIN estados_cliente ec ON ec.id = cli.estado_id;

COMMENT ON VIEW v_facturas_resumen IS
'Vista resumida de facturas con datos relacionados.
Incluye tipo (cargo/abono), factura_rectificada_id y agrupar_conceptos_en_documento,
ademas del snapshot historico (cliente_*) y datos actuales (cliente_actual_*).';

