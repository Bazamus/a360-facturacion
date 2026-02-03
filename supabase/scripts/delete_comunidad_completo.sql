-- =====================================================
-- SCRIPT: BORRAR COMUNIDAD COMPLETA (INCLUYE EL REGISTRO DE COMUNIDAD)
-- =====================================================
-- Comunidad: 262 VIV GETAFE II
-- ID: 98000df8-eecf-4ae1-9301-041c19fb2a4e
--
-- IMPORTANTE: Este script borra TODO, incluyendo el registro de la comunidad
-- Solo ejecutar después de haber ejecutado delete_comunidad_570_262_getafe.sql
-- =====================================================

-- =====================================================
-- PASO 1: VERIFICAR QUÉ QUEDA ANTES DE BORRAR LA COMUNIDAD
-- =====================================================

DO $$
DECLARE
    v_comunidad_id UUID := '98000df8-eecf-4ae1-9301-041c19fb2a4e';
    v_count_agrupaciones INTEGER;
    v_count_ubicaciones INTEGER;
    v_count_contadores INTEGER;
    v_count_clientes INTEGER;
    v_count_facturas INTEGER;
    v_count_lecturas INTEGER;
    v_count_facturas_lineas INTEGER;
    v_count_importaciones INTEGER;
    v_exists_comunidad BOOLEAN;
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'VERIFICACIÓN PRE-BORRADO DE COMUNIDAD';
    RAISE NOTICE '================================================';
    
    -- Verificar si existe la comunidad
    SELECT EXISTS(SELECT 1 FROM comunidades WHERE id = v_comunidad_id)
    INTO v_exists_comunidad;
    
    IF NOT v_exists_comunidad THEN
        RAISE NOTICE '⚠️  LA COMUNIDAD YA NO EXISTE EN LA BASE DE DATOS';
        RETURN;
    END IF;
    
    -- Contar agrupaciones
    SELECT COUNT(*) INTO v_count_agrupaciones
    FROM agrupaciones
    WHERE comunidad_id = v_comunidad_id;
    
    -- Contar ubicaciones
    SELECT COUNT(*) INTO v_count_ubicaciones
    FROM ubicaciones u
    JOIN agrupaciones a ON a.id = u.agrupacion_id
    WHERE a.comunidad_id = v_comunidad_id;
    
    -- Contar contadores
    SELECT COUNT(*) INTO v_count_contadores
    FROM contadores cont
    JOIN ubicaciones u ON u.id = cont.ubicacion_id
    JOIN agrupaciones a ON a.id = u.agrupacion_id
    WHERE a.comunidad_id = v_comunidad_id;
    
    -- Contar lecturas
    SELECT COUNT(*) INTO v_count_lecturas
    FROM lecturas l
    JOIN contadores cont ON cont.id = l.contador_id
    JOIN ubicaciones u ON u.id = cont.ubicacion_id
    JOIN agrupaciones a ON a.id = u.agrupacion_id
    WHERE a.comunidad_id = v_comunidad_id;
    
    -- Contar facturas (TODAS, no solo borradores)
    SELECT COUNT(*) INTO v_count_facturas
    FROM facturas
    WHERE comunidad_id = v_comunidad_id;
    
    -- Contar líneas de facturas
    SELECT COUNT(*) INTO v_count_facturas_lineas
    FROM facturas_lineas fl
    JOIN facturas f ON f.id = fl.factura_id
    WHERE f.comunidad_id = v_comunidad_id;
    
    -- Contar importaciones
    SELECT COUNT(*) INTO v_count_importaciones
    FROM importaciones
    WHERE comunidad_id = v_comunidad_id;
    
    -- Contar clientes (ubicaciones_clientes relacionadas)
    SELECT COUNT(DISTINCT uc.cliente_id) INTO v_count_clientes
    FROM ubicaciones_clientes uc
    JOIN ubicaciones u ON u.id = uc.ubicacion_id
    JOIN agrupaciones a ON a.id = u.agrupacion_id
    WHERE a.comunidad_id = v_comunidad_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 RESUMEN DE DATOS PENDIENTES:';
    RAISE NOTICE '================================';
    RAISE NOTICE 'Agrupaciones: %', v_count_agrupaciones;
    RAISE NOTICE 'Ubicaciones: %', v_count_ubicaciones;
    RAISE NOTICE 'Contadores: %', v_count_contadores;
    RAISE NOTICE 'Lecturas: %', v_count_lecturas;
    RAISE NOTICE 'Facturas (TODAS): %', v_count_facturas;
    RAISE NOTICE 'Líneas de facturas: %', v_count_facturas_lineas;
    RAISE NOTICE 'Importaciones: %', v_count_importaciones;
    RAISE NOTICE 'Clientes relacionados: %', v_count_clientes;
    RAISE NOTICE '';
    
    IF v_count_agrupaciones > 0 OR v_count_ubicaciones > 0 OR v_count_contadores > 0 OR 
       v_count_lecturas > 0 OR v_count_facturas > 0 OR v_count_facturas_lineas > 0 THEN
        RAISE NOTICE '⚠️  ATENCIÓN: AÚN QUEDAN DATOS RELACIONADOS';
        RAISE NOTICE '⚠️  Debes ejecutar primero delete_comunidad_570_262_getafe.sql';
        RAISE NOTICE '⚠️  O borrar manualmente estos datos antes de borrar la comunidad';
    ELSE
        RAISE NOTICE '✅ No quedan datos relacionados. SEGURO BORRAR LA COMUNIDAD';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    
END $$;


-- =====================================================
-- PASO 2: BORRAR IMPORTACIONES DE LA COMUNIDAD
-- =====================================================
-- Descomenta este bloque para ejecutar el borrado real

/*
DO $$
DECLARE
    v_comunidad_id UUID := '98000df8-eecf-4ae1-9301-041c19fb2a4e';
    v_deleted_importaciones INTEGER;
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'BORRANDO IMPORTACIONES DE LA COMUNIDAD';
    RAISE NOTICE '================================================';
    
    -- Borrar importaciones
    DELETE FROM importaciones
    WHERE comunidad_id = v_comunidad_id;
    
    GET DIAGNOSTICS v_deleted_importaciones = ROW_COUNT;
    RAISE NOTICE '✓ Importaciones borradas: %', v_deleted_importaciones;
    
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ IMPORTACIONES BORRADAS EXITOSAMENTE';
    RAISE NOTICE '================================================';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ Error al borrar importaciones: % %', SQLERRM, SQLSTATE;
        ROLLBACK;
END $$;
*/


-- =====================================================
-- PASO 3: BORRAR LA COMUNIDAD
-- =====================================================
-- Descomenta este bloque para ejecutar el borrado real

DO $$
DECLARE
    v_comunidad_id UUID := '98000df8-eecf-4ae1-9301-041c19fb2a4e';
    v_comunidad_nombre VARCHAR;
    v_deleted_comunidad INTEGER;
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'BORRANDO REGISTRO DE COMUNIDAD';
    RAISE NOTICE '================================================';
    
    -- Obtener el nombre de la comunidad antes de borrarla
    SELECT nombre INTO v_comunidad_nombre
    FROM comunidades
    WHERE id = v_comunidad_id;
    
    IF v_comunidad_nombre IS NULL THEN
        RAISE NOTICE '⚠️  La comunidad ya no existe';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Borrando comunidad: %', v_comunidad_nombre;
    
    -- Borrar la comunidad
    DELETE FROM comunidades
    WHERE id = v_comunidad_id;
    
    GET DIAGNOSTICS v_deleted_comunidad = ROW_COUNT;
    
    IF v_deleted_comunidad = 1 THEN
        RAISE NOTICE '✓ Comunidad borrada: %', v_comunidad_nombre;
        RAISE NOTICE '';
        RAISE NOTICE '================================================';
        RAISE NOTICE '✅ COMUNIDAD BORRADA EXITOSAMENTE';
        RAISE NOTICE '================================================';
    ELSE
        RAISE NOTICE '⚠️  No se borró ninguna comunidad';
    END IF;
    
EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE EXCEPTION '❌ Error: Aún existen datos relacionados con esta comunidad. Mensaje: %', SQLERRM;
        ROLLBACK;
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ Error al borrar comunidad: % %', SQLERRM, SQLSTATE;
        ROLLBACK;
END $$;
*/


-- =====================================================
-- PASO 4: VERIFICACIÓN POST-BORRADO
-- =====================================================
-- Descomenta este bloque para verificar después del borrado

DO $$
DECLARE
    v_comunidad_id UUID := '98000df8-eecf-4ae1-9301-041c19fb2a4e';
    v_exists BOOLEAN;
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'VERIFICACIÓN POST-BORRADO';
    RAISE NOTICE '================================================';
    
    SELECT EXISTS(SELECT 1 FROM comunidades WHERE id = v_comunidad_id)
    INTO v_exists;
    
    IF v_exists THEN
        RAISE NOTICE '⚠️  LA COMUNIDAD TODAVÍA EXISTE';
    ELSE
        RAISE NOTICE '✅ LA COMUNIDAD HA SIDO BORRADA COMPLETAMENTE';
        RAISE NOTICE '';
        RAISE NOTICE '📝 Resumen final:';
        RAISE NOTICE '   - Comunidad ID: %', v_comunidad_id;
        RAISE NOTICE '   - Estado: BORRADA';
        RAISE NOTICE '   - Fecha: %', NOW();
    END IF;
    
    RAISE NOTICE '================================================';
END $$;
*/


-- =====================================================
-- INSTRUCCIONES DE USO:
-- =====================================================
-- 1. Ejecutar PASO 1 para verificar qué datos quedan
-- 2. Si todo está OK (0 en todos los contadores), descomentar PASO 2
-- 3. Ejecutar PASO 2 para borrar importaciones
-- 4. Descomentar PASO 3 y ejecutar para borrar la comunidad
-- 5. Descomentar PASO 4 y ejecutar para verificar
--
-- IMPORTANTE: 
-- - Este script borra PERMANENTEMENTE la comunidad
-- - No se puede deshacer esta operación
-- - Asegúrate de que todos los datos relacionados fueron borrados primero
-- =====================================================
