-- =====================================================
-- SCRIPT DE ELIMINACIÓN DE LECTURAS
-- =====================================================
-- Contadores:
--   - 11200154 (PABLO MANZANO VAZQUEZ · Torre 11ºG)
--   - 11200164 (JUAN FRANCISCO MARTINEZ POMARES · Torre 1 16ºK)
--
-- Fecha: 2026-01-21
-- Descripción: Elimina todas las lecturas asociadas a estos contadores
-- =====================================================

-- =====================================================
-- PASO 1: VERIFICAR CONTADORES Y LECTURAS
-- =====================================================

DO $$
DECLARE
    v_contador1_id UUID;
    v_contador2_id UUID;
    v_contador1_serie VARCHAR := '11200154';
    v_contador2_serie VARCHAR := '11200164';
    v_contador1_nombre VARCHAR;
    v_contador2_nombre VARCHAR;
    v_total_lecturas INTEGER;
    rec RECORD;
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'VERIFICACIÓN DE CONTADORES Y LECTURAS';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    
    -- Buscar contador 1
    SELECT c.id, u.nombre || ' (' || com.nombre || ')'
    INTO v_contador1_id, v_contador1_nombre
    FROM contadores c
    LEFT JOIN ubicaciones u ON u.id = c.ubicacion_id
    LEFT JOIN agrupaciones a ON a.id = u.agrupacion_id
    LEFT JOIN comunidades com ON com.id = a.comunidad_id
    WHERE c.numero_serie = v_contador1_serie;
    
    IF v_contador1_id IS NULL THEN
        RAISE NOTICE '❌ Contador % no encontrado', v_contador1_serie;
    ELSE
        RAISE NOTICE '✓ Contador 1: %', v_contador1_serie;
        RAISE NOTICE '  ID: %', v_contador1_id;
        RAISE NOTICE '  Ubicación: %', v_contador1_nombre;
    END IF;
    
    RAISE NOTICE '';
    
    -- Buscar contador 2
    SELECT c.id, u.nombre || ' (' || com.nombre || ')'
    INTO v_contador2_id, v_contador2_nombre
    FROM contadores c
    LEFT JOIN ubicaciones u ON u.id = c.ubicacion_id
    LEFT JOIN agrupaciones a ON a.id = u.agrupacion_id
    LEFT JOIN comunidades com ON com.id = a.comunidad_id
    WHERE c.numero_serie = v_contador2_serie;
    
    IF v_contador2_id IS NULL THEN
        RAISE NOTICE '❌ Contador % no encontrado', v_contador2_serie;
    ELSE
        RAISE NOTICE '✓ Contador 2: %', v_contador2_serie;
        RAISE NOTICE '  ID: %', v_contador2_id;
        RAISE NOTICE '  Ubicación: %', v_contador2_nombre;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'DETALLE DE LECTURAS A ELIMINAR';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    
    -- Contador 1 - Lecturas por concepto
    IF v_contador1_id IS NOT NULL THEN
        RAISE NOTICE 'Contador %:', v_contador1_serie;
        FOR rec IN (
            SELECT 
                co.nombre AS concepto,
                COUNT(*) AS num_lecturas,
                MIN(l.fecha_lectura) AS fecha_min,
                MAX(l.fecha_lectura) AS fecha_max,
                SUM(l.consumo) AS total_consumo
            FROM lecturas l
            JOIN conceptos co ON co.id = l.concepto_id
            WHERE l.contador_id = v_contador1_id
            GROUP BY co.nombre
            ORDER BY co.nombre
        ) LOOP
            RAISE NOTICE '  - %: % lecturas (% a %) | Consumo total: %',
                rec.concepto,
                rec.num_lecturas,
                rec.fecha_min,
                rec.fecha_max,
                rec.total_consumo;
        END LOOP;
        
        SELECT COUNT(*) INTO v_total_lecturas
        FROM lecturas
        WHERE contador_id = v_contador1_id;
        
        RAISE NOTICE '  TOTAL: % lecturas', v_total_lecturas;
        RAISE NOTICE '';
    END IF;
    
    -- Contador 2 - Lecturas por concepto
    IF v_contador2_id IS NOT NULL THEN
        RAISE NOTICE 'Contador %:', v_contador2_serie;
        FOR rec IN (
            SELECT 
                co.nombre AS concepto,
                COUNT(*) AS num_lecturas,
                MIN(l.fecha_lectura) AS fecha_min,
                MAX(l.fecha_lectura) AS fecha_max,
                SUM(l.consumo) AS total_consumo
            FROM lecturas l
            JOIN conceptos co ON co.id = l.concepto_id
            WHERE l.contador_id = v_contador2_id
            GROUP BY co.nombre
            ORDER BY co.nombre
        ) LOOP
            RAISE NOTICE '  - %: % lecturas (% a %) | Consumo total: %',
                rec.concepto,
                rec.num_lecturas,
                rec.fecha_min,
                rec.fecha_max,
                rec.total_consumo;
        END LOOP;
        
        SELECT COUNT(*) INTO v_total_lecturas
        FROM lecturas
        WHERE contador_id = v_contador2_id;
        
        RAISE NOTICE '  TOTAL: % lecturas', v_total_lecturas;
        RAISE NOTICE '';
    END IF;
    
    -- Total general
    SELECT COUNT(*) INTO v_total_lecturas
    FROM lecturas
    WHERE contador_id IN (v_contador1_id, v_contador2_id);
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'TOTAL GENERAL: % lecturas a eliminar', v_total_lecturas;
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Para ejecutar la eliminación, descomenta el PASO 2';
    RAISE NOTICE '';
    
END $$;


-- =====================================================
-- PASO 2: ELIMINAR LECTURAS
-- =====================================================
-- ⚠️  DESCOMENTA ESTE BLOQUE PARA EJECUTAR LA ELIMINACIÓN
/*
DO $$
DECLARE
    v_contador1_id UUID;
    v_contador2_id UUID;
    v_contador1_serie VARCHAR := '11200154';
    v_contador2_serie VARCHAR := '11200164';
    v_deleted_lecturas INTEGER := 0;
    v_lecturas_contador1 INTEGER := 0;
    v_lecturas_contador2 INTEGER := 0;
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'ELIMINANDO LECTURAS';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    
    -- Obtener IDs de contadores
    SELECT id INTO v_contador1_id
    FROM contadores
    WHERE numero_serie = v_contador1_serie;
    
    SELECT id INTO v_contador2_id
    FROM contadores
    WHERE numero_serie = v_contador2_serie;
    
    -- Eliminar lecturas del contador 1
    IF v_contador1_id IS NOT NULL THEN
        DELETE FROM lecturas
        WHERE contador_id = v_contador1_id;
        
        GET DIAGNOSTICS v_lecturas_contador1 = ROW_COUNT;
        RAISE NOTICE '✓ Contador % (%): % lecturas eliminadas',
            v_contador1_serie,
            v_contador1_id,
            v_lecturas_contador1;
    END IF;
    
    -- Eliminar lecturas del contador 2
    IF v_contador2_id IS NOT NULL THEN
        DELETE FROM lecturas
        WHERE contador_id = v_contador2_id;
        
        GET DIAGNOSTICS v_lecturas_contador2 = ROW_COUNT;
        RAISE NOTICE '✓ Contador % (%): % lecturas eliminadas',
            v_contador2_serie,
            v_contador2_id,
            v_lecturas_contador2;
    END IF;
    
    v_deleted_lecturas := v_lecturas_contador1 + v_lecturas_contador2;
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ ELIMINACIÓN COMPLETADA';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total de lecturas eliminadas: %', v_deleted_lecturas;
    RAISE NOTICE '';
    
EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE EXCEPTION '❌ Error: Las lecturas están referenciadas por otros registros. Mensaje: %', SQLERRM;
        ROLLBACK;
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ Error al eliminar lecturas: % %', SQLERRM, SQLSTATE;
        ROLLBACK;
END $$;
*/


-- =====================================================
-- PASO 3 (OPCIONAL): VERIFICAR ELIMINACIÓN
-- =====================================================
-- Descomenta este bloque después de ejecutar el PASO 2
/*
DO $$
DECLARE
    v_contador1_id UUID;
    v_contador2_id UUID;
    v_contador1_serie VARCHAR := '11200154';
    v_contador2_serie VARCHAR := '11200164';
    v_lecturas_restantes INTEGER;
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'VERIFICACIÓN POST-ELIMINACIÓN';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    
    -- Obtener IDs de contadores
    SELECT id INTO v_contador1_id
    FROM contadores
    WHERE numero_serie = v_contador1_serie;
    
    SELECT id INTO v_contador2_id
    FROM contadores
    WHERE numero_serie = v_contador2_serie;
    
    -- Verificar lecturas restantes
    SELECT COUNT(*) INTO v_lecturas_restantes
    FROM lecturas
    WHERE contador_id IN (v_contador1_id, v_contador2_id);
    
    IF v_lecturas_restantes = 0 THEN
        RAISE NOTICE '✅ Todas las lecturas fueron eliminadas correctamente';
    ELSE
        RAISE NOTICE '⚠️  Aún quedan % lecturas', v_lecturas_restantes;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    
END $$;
*/
