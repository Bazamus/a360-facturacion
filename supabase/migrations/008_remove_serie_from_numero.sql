-- =====================================================
-- Migración 008: Eliminar serie del número de factura
-- Cambiar formato de "2/230371985" a "230371985"
-- =====================================================

-- Paso 1: Eliminar vistas que dependen de numero_completo
DROP VIEW IF EXISTS v_facturas_pendientes_envio CASCADE;
DROP VIEW IF EXISTS v_facturas_pendientes_remesa CASCADE;
DROP VIEW IF EXISTS v_reporte_consumos_vivienda CASCADE;
DROP VIEW IF EXISTS v_envios_resumen CASCADE;
DROP VIEW IF EXISTS v_facturas_resumen CASCADE;

-- Paso 2: Eliminar la columna computed numero_completo
ALTER TABLE facturas DROP COLUMN numero_completo;

-- Paso 3: Recrear numero_completo sin el prefijo serie
ALTER TABLE facturas ADD COLUMN numero_completo TEXT
GENERATED ALWAYS AS (
  CASE
    WHEN numero IS NOT NULL
    THEN numero::TEXT
    ELSE NULL
  END
) STORED;

-- Paso 4: Recrear vista v_facturas_resumen
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
LEFT JOIN comunidades com ON f.comunidad_id = com.id
LEFT JOIN contadores cont ON f.contador_id = cont.id;

-- Paso 5: Recrear vista v_envios_resumen (de 005_envios_schema.sql)
CREATE VIEW v_envios_resumen AS
SELECT
  e.id,
  e.factura_id,
  f.numero_completo as factura_numero,
  f.cliente_nombre,
  f.cliente_email as email_destino,
  e.email_remitente,
  e.asunto,
  e.estado,
  e.fecha_envio,
  e.error_mensaje,
  e.intentos,
  e.ultimo_intento,
  e.created_at
FROM envios e
JOIN facturas f ON e.factura_id = f.id;

-- Paso 6: Recrear vista v_reporte_consumos_vivienda (de 006_remesas_reportes_schema.sql)
CREATE VIEW v_reporte_consumos_vivienda AS
SELECT
  f.id as factura_id,
  f.numero_completo,
  f.fecha_factura,
  f.periodo_inicio,
  f.periodo_fin,
  f.cliente_id,
  f.cliente_nombre,
  f.comunidad_id,
  com.nombre as comunidad_nombre,
  f.ubicacion_id,
  u.nombre as ubicacion_nombre,
  u.portal,
  u.piso,
  u.puerta,
  fl.concepto_codigo,
  fl.concepto_nombre,
  fl.unidad_medida,
  fl.cantidad,
  fl.precio_unitario,
  fl.subtotal,
  fl.lectura_anterior,
  fl.lectura_actual,
  fl.consumo,
  fl.fecha_lectura_actual
FROM facturas f
JOIN comunidades com ON f.comunidad_id = com.id
JOIN ubicaciones u ON f.ubicacion_id = u.id
JOIN facturas_lineas fl ON f.id = fl.factura_id
WHERE f.estado IN ('emitida', 'pagada');

-- Paso 7: Recrear vista v_facturas_pendientes_remesa (de 006_remesas_reportes_schema.sql)
CREATE VIEW v_facturas_pendientes_remesa AS
SELECT
  f.id,
  f.numero_completo,
  f.fecha_factura,
  f.fecha_vencimiento,
  f.cliente_id,
  f.cliente_nombre,
  f.cliente_nif,
  f.cliente_iban,
  f.comunidad_id,
  com.nombre as comunidad_nombre,
  f.total,
  f.estado,
  f.metodo_pago
FROM facturas f
JOIN comunidades com ON f.comunidad_id = com.id
WHERE f.estado IN ('emitida', 'pagada')
  AND f.metodo_pago = 'domiciliacion'
  AND f.cliente_iban IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM remesas_detalles rd
    WHERE rd.factura_id = f.id
  );

-- Paso 8: Recrear vista v_facturas_pendientes_envio (de 005_envios_schema.sql)
CREATE VIEW v_facturas_pendientes_envio AS
SELECT
  f.id,
  f.numero_completo,
  f.fecha_factura,
  f.cliente_id,
  f.cliente_nombre,
  f.cliente_email,
  f.comunidad_id,
  com.nombre as comunidad_nombre,
  f.total,
  f.estado
FROM facturas f
JOIN comunidades com ON f.comunidad_id = com.id
WHERE f.estado IN ('emitida', 'pagada')
  AND f.cliente_email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM envios e
    WHERE e.factura_id = f.id
      AND e.estado = 'enviado'
  );

-- Paso 9: Actualizar la función emitir_factura para retornar solo el número
CREATE OR REPLACE FUNCTION emitir_factura(p_factura_id UUID)
RETURNS TABLE (numero INTEGER, numero_completo TEXT) AS $$
DECLARE
  v_numero INTEGER;
  v_estado estado_factura;
BEGIN
  -- Verificar estado actual
  SELECT estado INTO v_estado FROM facturas WHERE id = p_factura_id;

  IF v_estado IS NULL THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;

  IF v_estado != 'borrador' THEN
    RAISE EXCEPTION 'Solo se pueden emitir facturas en estado borrador. Estado actual: %', v_estado;
  END IF;

  -- Obtener siguiente número
  v_numero := get_siguiente_numero_factura();

  -- Actualizar factura
  UPDATE facturas
  SET numero = v_numero,
      estado = 'emitida',
      fecha_factura = CURRENT_DATE,
      updated_at = now()
  WHERE id = p_factura_id;

  -- Marcar lecturas como facturadas
  UPDATE lecturas
  SET facturada = true,
      factura_id = p_factura_id,
      updated_at = now()
  WHERE id IN (
    SELECT lectura_id FROM facturas_lineas
    WHERE factura_id = p_factura_id AND lectura_id IS NOT NULL
  );

  -- Retornar solo el número (sin serie)
  RETURN QUERY
  SELECT v_numero, v_numero::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Paso 10: Comentario explicativo
COMMENT ON COLUMN facturas.numero_completo IS 'Número de factura sin prefijo de serie (ej: 230371985)';
