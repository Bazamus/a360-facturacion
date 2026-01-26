-- =====================================================
-- Migración 019: Fix para reset_datos_sistema
-- Agrega WHERE true a los DELETE para evitar error de Supabase
-- "DELETE requires a WHERE clause"
-- Fecha: Enero 2026
-- =====================================================

CREATE OR REPLACE FUNCTION reset_datos_sistema()
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_deleted_counts jsonb;
  v_count_remesas_recibos INTEGER;
  v_count_remesas INTEGER;
  v_count_almacenamiento INTEGER;
  v_count_envios INTEGER;
  v_count_facturas_lineas INTEGER;
  v_count_facturas INTEGER;
  v_count_importaciones_detalle INTEGER;
  v_count_importaciones INTEGER;
  v_count_lecturas INTEGER;
  v_count_contadores INTEGER;
  v_count_clientes INTEGER;
  v_count_ubicaciones INTEGER;
  v_count_portales INTEGER;
  v_count_comunidades INTEGER;
BEGIN
  -- Validar que solo admins pueden ejecutar
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden resetear el sistema';
  END IF;

  -- Registrar mensaje de inicio
  RAISE NOTICE 'Iniciando reset completo del sistema...';

  -- =====================================================
  -- FASE 1: Eliminar datos relacionados con facturas
  -- =====================================================

  -- 1. Remesas recibos (depende de remesas y facturas)
  SELECT COUNT(*) INTO v_count_remesas_recibos FROM remesas_recibos;
  DELETE FROM remesas_recibos WHERE true;
  RAISE NOTICE 'Eliminados % registros de remesas_recibos', v_count_remesas_recibos;

  -- 2. Remesas
  SELECT COUNT(*) INTO v_count_remesas FROM remesas;
  DELETE FROM remesas WHERE true;
  RAISE NOTICE 'Eliminadas % remesas', v_count_remesas;

  -- 3. Almacenamiento de documentos
  SELECT COUNT(*) INTO v_count_almacenamiento FROM almacenamiento_documentos;
  DELETE FROM almacenamiento_documentos WHERE true;
  RAISE NOTICE 'Eliminados % documentos almacenados', v_count_almacenamiento;

  -- 4. Envíos de email
  SELECT COUNT(*) INTO v_count_envios FROM envios_email;
  DELETE FROM envios_email WHERE true;
  RAISE NOTICE 'Eliminados % envíos de email', v_count_envios;

  -- 5. Líneas de facturas
  SELECT COUNT(*) INTO v_count_facturas_lineas FROM facturas_lineas;
  DELETE FROM facturas_lineas WHERE true;
  RAISE NOTICE 'Eliminadas % líneas de facturas', v_count_facturas_lineas;

  -- 6. Facturas
  SELECT COUNT(*) INTO v_count_facturas FROM facturas;
  DELETE FROM facturas WHERE true;
  RAISE NOTICE 'Eliminadas % facturas', v_count_facturas;

  -- =====================================================
  -- FASE 2: Eliminar lecturas e importaciones
  -- Orden: lecturas -> importaciones_detalle -> contadores -> importaciones
  -- (lecturas FK-> importaciones_detalle FK-> contadores)
  -- =====================================================

  -- 7. Lecturas (depende de importaciones_detalle)
  SELECT COUNT(*) INTO v_count_lecturas FROM lecturas;
  DELETE FROM lecturas WHERE true;
  RAISE NOTICE 'Eliminadas % lecturas', v_count_lecturas;

  -- 8. Importaciones detalle (depende de contadores e importaciones)
  SELECT COUNT(*) INTO v_count_importaciones_detalle FROM importaciones_detalle;
  DELETE FROM importaciones_detalle WHERE true;
  RAISE NOTICE 'Eliminados % detalles de importaciones', v_count_importaciones_detalle;

  -- 9. Contadores (ahora libre de referencias)
  SELECT COUNT(*) INTO v_count_contadores FROM contadores;
  DELETE FROM contadores WHERE true;
  RAISE NOTICE 'Eliminados % contadores', v_count_contadores;

  -- 10. Importaciones
  SELECT COUNT(*) INTO v_count_importaciones FROM importaciones;
  DELETE FROM importaciones WHERE true;
  RAISE NOTICE 'Eliminadas % importaciones', v_count_importaciones;

  -- =====================================================
  -- FASE 4: Eliminar clientes y estructura
  -- =====================================================

  -- 11. Clientes
  SELECT COUNT(*) INTO v_count_clientes FROM clientes;
  DELETE FROM clientes WHERE true;
  RAISE NOTICE 'Eliminados % clientes', v_count_clientes;

  -- 12. Ubicaciones (viviendas)
  SELECT COUNT(*) INTO v_count_ubicaciones FROM ubicaciones;
  DELETE FROM ubicaciones WHERE true;
  RAISE NOTICE 'Eliminadas % ubicaciones', v_count_ubicaciones;

  -- 13. Portales
  SELECT COUNT(*) INTO v_count_portales FROM portales;
  DELETE FROM portales WHERE true;
  RAISE NOTICE 'Eliminados % portales', v_count_portales;

  -- 14. Comunidades
  SELECT COUNT(*) INTO v_count_comunidades FROM comunidades;
  DELETE FROM comunidades WHERE true;
  RAISE NOTICE 'Eliminadas % comunidades', v_count_comunidades;

  -- =====================================================
  -- FASE 5: Resetear secuencias
  -- =====================================================

  -- Resetear secuencia de facturas al valor configurado
  -- La secuencia se mantendrá en el valor actual de configuración
  -- Si se desea resetear a 0, descomentar la siguiente línea:
  -- PERFORM setval('seq_factura_numero', 1, false);

  RAISE NOTICE 'Secuencia de facturas mantenida en su valor actual';

  -- =====================================================
  -- FASE 6: Construir resultado
  -- =====================================================

  v_deleted_counts := jsonb_build_object(
    'remesas_recibos', v_count_remesas_recibos,
    'remesas', v_count_remesas,
    'almacenamiento_documentos', v_count_almacenamiento,
    'envios_email', v_count_envios,
    'facturas_lineas', v_count_facturas_lineas,
    'facturas', v_count_facturas,
    'importaciones_detalle', v_count_importaciones_detalle,
    'importaciones', v_count_importaciones,
    'lecturas', v_count_lecturas,
    'contadores', v_count_contadores,
    'clientes', v_count_clientes,
    'ubicaciones', v_count_ubicaciones,
    'portales', v_count_portales,
    'comunidades', v_count_comunidades
  );

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Reset completo ejecutado exitosamente',
    'deleted_counts', v_deleted_counts,
    'total_deleted', (
      v_count_remesas_recibos + v_count_remesas + v_count_almacenamiento +
      v_count_envios + v_count_facturas_lineas + v_count_facturas +
      v_count_importaciones_detalle + v_count_importaciones +
      v_count_lecturas + v_count_contadores + v_count_clientes +
      v_count_ubicaciones + v_count_portales + v_count_comunidades
    ),
    'preserved', jsonb_build_array('usuarios', 'configuracion', 'secuencias')
  );

  RAISE NOTICE 'Reset completado exitosamente';

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error durante el reset: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reset_datos_sistema IS
  'Resetea todos los datos del sistema excepto usuarios y configuración (solo admins)';
