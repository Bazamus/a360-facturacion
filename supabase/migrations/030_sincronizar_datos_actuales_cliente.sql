-- =====================================================
-- Migración 030: Sincronizar datos actuales del cliente en facturas
-- =====================================================
-- Problema: Las facturas guardan un snapshot de datos del cliente
--           pero no se actualizan cuando el cliente cambia sus datos
--
-- Solución: Modificar vistas para incluir datos actuales del cliente
--           con prefijo "cliente_actual_" y mantener los snapshots
--           históricos con prefijo "cliente_"
-- =====================================================

-- =====================================================
-- 1. Actualizar vista v_facturas_resumen
-- =====================================================

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
  f.metodo_pago,
  f.fecha_pago,
  
  -- Referencias
  f.cliente_id,
  f.comunidad_id,
  f.ubicacion_id,
  f.contador_id,
  
  -- Datos snapshot históricos (al momento de facturar)
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
  
  -- Datos ACTUALES del cliente (pueden haber cambiado)
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
  
  -- Estado actual del cliente
  ec.codigo AS cliente_actual_estado_codigo,
  ec.nombre AS cliente_actual_estado_nombre,
  ec.color AS cliente_actual_estado_color,
  
  -- Datos de comunidad
  com.nombre AS comunidad_nombre,
  com.codigo AS comunidad_codigo,
  
  -- Datos de ubicación
  f.ubicacion_direccion,
  
  -- Datos del contador
  cont.numero_serie AS contador_numero_serie,
  
  -- PDF y email
  f.pdf_generado,
  f.pdf_url,
  f.email_enviado,
  f.fecha_email_enviado,
  
  -- Auditoría
  f.created_at,
  f.updated_at,
  
  -- Estadísticas
  (SELECT COUNT(*) FROM facturas_lineas WHERE factura_id = f.id) AS num_lineas
  
FROM facturas f
JOIN comunidades com ON com.id = f.comunidad_id
LEFT JOIN contadores cont ON cont.id = f.contador_id
LEFT JOIN clientes cli ON cli.id = f.cliente_id
LEFT JOIN estados_cliente ec ON ec.id = cli.estado_cliente_id;

COMMENT ON VIEW v_facturas_resumen IS 
'Vista resumida de facturas con datos relacionados.
Incluye TANTO el snapshot histórico (cliente_*) como los datos actuales (cliente_actual_*) del cliente.
Usar cliente_actual_* para operaciones en tiempo real (envío emails, contacto, etc.)
Usar cliente_* para datos históricos/auditables de la factura.';


-- =====================================================
-- 2. Actualizar vista v_facturas_pendientes_envio
-- =====================================================

DROP VIEW IF EXISTS v_facturas_pendientes_envio CASCADE;

CREATE VIEW v_facturas_pendientes_envio AS
SELECT
  f.id,
  f.numero_completo,
  f.fecha_factura,
  f.cliente_id,
  f.cliente_nombre,
  f.comunidad_id,
  
  -- Email ACTUAL del cliente (prioridad sobre el snapshot)
  COALESCE(cli.email, f.cliente_email) AS cliente_email,
  
  -- Info adicional
  f.total,
  c.nombre AS comunidad_nombre,
  
  -- Estado de envío
  CASE
    WHEN cli.email IS NULL OR cli.email = '' THEN 'sin_email'
    WHEN f.email_enviado = true THEN 'enviado'
    ELSE 'pendiente'
  END AS estado_envio,
  
  -- Indicador de cambio de email
  CASE
    WHEN cli.email IS NOT NULL AND cli.email != '' AND cli.email != f.cliente_email
    THEN true
    ELSE false
  END AS email_actualizado
  
FROM facturas f
JOIN comunidades c ON f.comunidad_id = c.id
LEFT JOIN clientes cli ON f.cliente_id = cli.id
WHERE f.estado = 'emitida';

COMMENT ON VIEW v_facturas_pendientes_envio IS
'Facturas emitidas pendientes de envío por email.
Usa SIEMPRE el email ACTUAL del cliente (tabla clientes), nunca el snapshot.
Incluye flag email_actualizado para saber si el email cambió desde la emisión.';


-- =====================================================
-- 3. Función helper para obtener email actual de factura
-- =====================================================

CREATE OR REPLACE FUNCTION get_email_actual_factura(p_factura_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_email_actual TEXT;
BEGIN
  SELECT COALESCE(cli.email, f.cliente_email)
  INTO v_email_actual
  FROM facturas f
  LEFT JOIN clientes cli ON cli.id = f.cliente_id
  WHERE f.id = p_factura_id;
  
  RETURN v_email_actual;
END;
$$;

COMMENT ON FUNCTION get_email_actual_factura IS 
'Devuelve el email ACTUAL del cliente asociado a una factura.
Si el cliente fue modificado, devuelve el email actualizado.
Si el cliente fue eliminado, devuelve el snapshot histórico.';


-- =====================================================
-- 4. Función helper para obtener datos actuales del cliente
-- =====================================================

CREATE OR REPLACE FUNCTION get_cliente_actual_datos(p_cliente_id UUID)
RETURNS TABLE (
  email TEXT,
  nombre_completo TEXT,
  nif TEXT,
  telefono TEXT,
  direccion TEXT,
  cp TEXT,
  ciudad TEXT,
  provincia TEXT,
  iban TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.email,
    c.nombre || ' ' || COALESCE(c.apellidos, '') AS nombre_completo,
    c.nif,
    c.telefono,
    c.direccion_correspondencia,
    c.cp_correspondencia,
    c.ciudad_correspondencia,
    c.provincia_correspondencia,
    c.iban
  FROM clientes c
  WHERE c.id = p_cliente_id;
END;
$$;

COMMENT ON FUNCTION get_cliente_actual_datos IS 
'Devuelve los datos ACTUALES de un cliente.
Útil para obtener información actualizada en tiempo real.';


-- =====================================================
-- 5. Índices para optimizar las consultas
-- =====================================================

-- Índice para búsquedas por email actual
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email) WHERE email IS NOT NULL AND email != '';

-- Índice para facturas pendientes de envío
CREATE INDEX IF NOT EXISTS idx_facturas_estado_emitida ON facturas(estado) WHERE estado = 'emitida';


-- =====================================================
-- VERIFICACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Migración 030: Sincronización datos actuales cliente';
  RAISE NOTICE '================================================';
  
  -- Verificar que las vistas existen
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'v_facturas_resumen') THEN
    RAISE NOTICE '✓ Vista v_facturas_resumen recreada correctamente';
  ELSE
    RAISE WARNING '⚠ Vista v_facturas_resumen no encontrada';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'v_facturas_pendientes_envio') THEN
    RAISE NOTICE '✓ Vista v_facturas_pendientes_envio recreada correctamente';
  ELSE
    RAISE WARNING '⚠ Vista v_facturas_pendientes_envio no encontrada';
  END IF;
  
  -- Verificar funciones
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_email_actual_factura') THEN
    RAISE NOTICE '✓ Función get_email_actual_factura creada correctamente';
  ELSE
    RAISE WARNING '⚠ Función get_email_actual_factura no encontrada';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_cliente_actual_datos') THEN
    RAISE NOTICE '✓ Función get_cliente_actual_datos creada correctamente';
  ELSE
    RAISE WARNING '⚠ Función get_cliente_actual_datos no encontrada';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANTE:';
  RAISE NOTICE '- Usa cliente_actual_* para datos en tiempo real';
  RAISE NOTICE '- Usa cliente_* para datos históricos/auditoría';
  RAISE NOTICE '- Los emails siempre usarán el dato actual';
  RAISE NOTICE '================================================';
END $$;
