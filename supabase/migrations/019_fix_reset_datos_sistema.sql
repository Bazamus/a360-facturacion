-- =====================================================
-- Migración 019: Fix para reset_datos_sistema
-- Corregido con tablas reales y orden correcto de FK
-- Fecha: Enero 2026
-- =====================================================

CREATE OR REPLACE FUNCTION reset_datos_sistema()
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_deleted_counts jsonb;
  v_count INTEGER;
  v_total INTEGER := 0;
BEGIN
  -- Validar que solo admins pueden ejecutar
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden resetear el sistema';
  END IF;

  RAISE NOTICE 'Iniciando reset completo del sistema...';

  -- Inicializar objeto de conteos
  v_deleted_counts := '{}'::jsonb;

  -- =====================================================
  -- FASE 1: Eliminar datos de remesas y envíos
  -- =====================================================

  -- remesas_recibos
  SELECT COUNT(*) INTO v_count FROM remesas_recibos;
  DELETE FROM remesas_recibos WHERE true;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('remesas_recibos', v_count);
  v_total := v_total + v_count;

  -- remesas
  SELECT COUNT(*) INTO v_count FROM remesas;
  DELETE FROM remesas WHERE true;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('remesas', v_count);
  v_total := v_total + v_count;

  -- mandatos_sepa
  SELECT COUNT(*) INTO v_count FROM mandatos_sepa;
  DELETE FROM mandatos_sepa WHERE true;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('mandatos_sepa', v_count);
  v_total := v_total + v_count;

  -- almacenamiento_documentos
  SELECT COUNT(*) INTO v_count FROM almacenamiento_documentos;
  DELETE FROM almacenamiento_documentos WHERE true;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('almacenamiento_documentos', v_count);
  v_total := v_total + v_count;

  -- envios_email
  SELECT COUNT(*) INTO v_count FROM envios_email;
  DELETE FROM envios_email WHERE true;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('envios_email', v_count);
  v_total := v_total + v_count;

  -- =====================================================
  -- FASE 2: Eliminar facturas y relacionados
  -- =====================================================

  -- facturas_consumo_historico (si existe)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'facturas_consumo_historico') THEN
    SELECT COUNT(*) INTO v_count FROM facturas_consumo_historico;
    DELETE FROM facturas_consumo_historico WHERE true;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('facturas_consumo_historico', v_count);
    v_total := v_total + v_count;
  END IF;

  -- facturas_lineas
  SELECT COUNT(*) INTO v_count FROM facturas_lineas;
  DELETE FROM facturas_lineas WHERE true;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('facturas_lineas', v_count);
  v_total := v_total + v_count;

  -- facturas
  SELECT COUNT(*) INTO v_count FROM facturas;
  DELETE FROM facturas WHERE true;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('facturas', v_count);
  v_total := v_total + v_count;

  -- =====================================================
  -- FASE 3: Eliminar lecturas e importaciones
  -- Orden: lecturas -> importaciones_detalle -> importaciones
  -- =====================================================

  -- lecturas
  SELECT COUNT(*) INTO v_count FROM lecturas;
  DELETE FROM lecturas WHERE true;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('lecturas', v_count);
  v_total := v_total + v_count;

  -- alertas_configuracion (si existe)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alertas_configuracion') THEN
    SELECT COUNT(*) INTO v_count FROM alertas_configuracion;
    DELETE FROM alertas_configuracion WHERE true;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('alertas_configuracion', v_count);
    v_total := v_total + v_count;
  END IF;

  -- importaciones_detalle
  SELECT COUNT(*) INTO v_count FROM importaciones_detalle;
  DELETE FROM importaciones_detalle WHERE true;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('importaciones_detalle', v_count);
  v_total := v_total + v_count;

  -- =====================================================
  -- FASE 4: Eliminar contadores y precios
  -- =====================================================

  -- contadores_conceptos
  SELECT COUNT(*) INTO v_count FROM contadores_conceptos;
  DELETE FROM contadores_conceptos WHERE true;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('contadores_conceptos', v_count);
  v_total := v_total + v_count;

  -- contadores
  SELECT COUNT(*) INTO v_count FROM contadores;
  DELETE FROM contadores WHERE true;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('contadores', v_count);
  v_total := v_total + v_count;

  -- precios
  SELECT COUNT(*) INTO v_count FROM precios;
  DELETE FROM precios WHERE true;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('precios', v_count);
  v_total := v_total + v_count;

  -- =====================================================
  -- FASE 5: Eliminar clientes y ubicaciones
  -- =====================================================

  -- ubicaciones_clientes
  SELECT COUNT(*) INTO v_count FROM ubicaciones_clientes;
  DELETE FROM ubicaciones_clientes WHERE true;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('ubicaciones_clientes', v_count);
  v_total := v_total + v_count;

  -- clientes
  SELECT COUNT(*) INTO v_count FROM clientes;
  DELETE FROM clientes WHERE true;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('clientes', v_count);
  v_total := v_total + v_count;

  -- ubicaciones
  SELECT COUNT(*) INTO v_count FROM ubicaciones;
  DELETE FROM ubicaciones WHERE true;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('ubicaciones', v_count);
  v_total := v_total + v_count;

  -- =====================================================
  -- FASE 6: Eliminar estructura de comunidades
  -- =====================================================

  -- agrupaciones
  SELECT COUNT(*) INTO v_count FROM agrupaciones;
  DELETE FROM agrupaciones WHERE true;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('agrupaciones', v_count);
  v_total := v_total + v_count;

  -- importaciones (después de importaciones_detalle)
  SELECT COUNT(*) INTO v_count FROM importaciones;
  DELETE FROM importaciones WHERE true;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('importaciones', v_count);
  v_total := v_total + v_count;

  -- comunidades
  SELECT COUNT(*) INTO v_count FROM comunidades;
  DELETE FROM comunidades WHERE true;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('comunidades', v_count);
  v_total := v_total + v_count;

  -- =====================================================
  -- Resultado final
  -- =====================================================

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Reset completo ejecutado exitosamente',
    'deleted_counts', v_deleted_counts,
    'total_deleted', v_total,
    'preserved', jsonb_build_array('profiles', 'configuracion', 'configuracion_email', 'configuracion_sepa', 'conceptos')
  );

  RAISE NOTICE 'Reset completado. Total eliminados: %', v_total;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error durante el reset: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reset_datos_sistema IS
  'Resetea todos los datos del sistema excepto usuarios, configuración y conceptos (solo admins)';
