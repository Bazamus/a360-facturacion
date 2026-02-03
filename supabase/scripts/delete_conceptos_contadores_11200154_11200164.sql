-- =====================================================
-- SCRIPT DE ELIMINACIÓN DE CONCEPTOS DE CONTADORES
-- =====================================================
-- Contadores:
--   - 11200154 (PABLO MANZANO VAZQUEZ · Torre 11ºG)
--   - 11200164 (JUAN FRANCISCO MARTINEZ POMARES · Torre 1 16ºK)
--
-- Fecha: 2026-01-21
-- Descripción: Elimina los conceptos asignados (contadores_conceptos)
--              para poder volver a importarlos desde Excel
-- =====================================================

-- =====================================================
-- PASO 1: VERIFICAR CONCEPTOS ASIGNADOS
-- =====================================================

DO $$
DECLARE
    v_contador1_id UUID;
    v_contador2_id UUID;
    v_contador1_serie VARCHAR := '11200154';
    v_contador2_serie VARCHAR := '11200164';
    v_total_conceptos INTEGER;
    rec RECORD;
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'VERIFICACIÓN DE CONCEPTOS ASIGNADOS';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    
    -- Buscar contador 1
    SELECT id INTO v_contador1_id
    FROM contadores
    WHERE numero_serie = v_contador1_serie;
    
    IF v_contador1_id IS NULL THEN
        RAISE NOTICE '❌ Contador % no encontrado', v_contador1_serie;
    ELSE
        RAISE NOTICE '✓ Contador 1: % (ID: %)', v_contador1_serie, v_contador1_id;
        
        -- Mostrar conceptos del contador 1
        FOR rec IN (
            SELECT 
                cc.id,
                c.codigo,
                c.nombre,
                cc.lectura_inicial,
                cc.fecha_inicial,
                cc.lectura_actual,
                cc.activo
            FROM contadores_conceptos cc
            JOIN conceptos c ON c.id = cc.concepto_id
            WHERE cc.contador_id = v_contador1_id
            ORDER BY c.nombre
        ) LOOP
            RAISE NOTICE '  - % (%): Inicial: % (%) | Actual: % | Activo: %',
                rec.codigo,
                rec.nombre,
                rec.lectura_inicial,
                rec.fecha_inicial,
                rec.lectura_actual,
                rec.activo;
        END LOOP;
        
        SELECT COUNT(*) INTO v_total_conceptos
        FROM contadores_conceptos
        WHERE contador_id = v_contador1_id;
        
        RAISE NOTICE '  TOTAL: % conceptos', v_total_conceptos;
        RAISE NOTICE '';
    END IF;
    
    -- Buscar contador 2
    SELECT id INTO v_contador2_id
    FROM contadores
    WHERE numero_serie = v_contador2_serie;
    
    IF v_contador2_id IS NULL THEN
        RAISE NOTICE '❌ Contador % no encontrado', v_contador2_serie;
    ELSE
        RAISE NOTICE '✓ Contador 2: % (ID: %)', v_contador2_serie, v_contador2_id;
        
        -- Mostrar conceptos del contador 2
        FOR rec IN (
            SELECT 
                cc.id,
                c.codigo,
                c.nombre,
                cc.lectura_inicial,
                cc.fecha_inicial,
                cc.lectura_actual,
                cc.activo
            FROM contadores_conceptos cc
            JOIN conceptos c ON c.id = cc.concepto_id
            WHERE cc.contador_id = v_contador2_id
            ORDER BY c.nombre
        ) LOOP
            RAISE NOTICE '  - % (%): Inicial: % (%) | Actual: % | Activo: %',
                rec.codigo,
                rec.nombre,
                rec.lectura_inicial,
                rec.fecha_inicial,
                rec.lectura_actual,
                rec.activo;
        END LOOP;
        
        SELECT COUNT(*) INTO v_total_conceptos
        FROM contadores_conceptos
        WHERE contador_id = v_contador2_id;
        
        RAISE NOTICE '  TOTAL: % conceptos', v_total_conceptos;
        RAISE NOTICE '';
    END IF;
    
    -- Total general
    SELECT COUNT(*) INTO v_total_conceptos
    FROM contadores_conceptos
    WHERE contador_id IN (v_contador1_id, v_contador2_id);
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'TOTAL GENERAL: % conceptos a eliminar', v_total_conceptos;
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Para ejecutar la eliminación, descomenta el PASO 2';
    RAISE NOTICE '';
    
END $$;


-- =====================================================
-- PASO 2: ELIMINAR CONCEPTOS
-- =====================================================
-- ⚠️  DESCOMENTA ESTE BLOQUE PARA EJECUTAR LA ELIMINACIÓN
/*
DO $$
DECLARE
    v_contador1_id UUID;
    v_contador2_id UUID;
    v_contador1_serie VARCHAR := '11200154';
    v_contador2_serie VARCHAR := '11200164';
    v_deleted_conceptos INTEGER := 0;
    v_conceptos_contador1 INTEGER := 0;
    v_conceptos_contador2 INTEGER := 0;
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'ELIMINANDO CONCEPTOS';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    
    -- Obtener IDs de contadores
    SELECT id INTO v_contador1_id
    FROM contadores
    WHERE numero_serie = v_contador1_serie;
    
    SELECT id INTO v_contador2_id
    FROM contadores
    WHERE numero_serie = v_contador2_serie;
    
    -- Eliminar conceptos del contador 1
    IF v_contador1_id IS NOT NULL THEN
        DELETE FROM contadores_conceptos
        WHERE contador_id = v_contador1_id;
        
        GET DIAGNOSTICS v_conceptos_contador1 = ROW_COUNT;
        RAISE NOTICE '✓ Contador % (%): % conceptos eliminados',
            v_contador1_serie,
            v_contador1_id,
            v_conceptos_contador1;
    END IF;
    
    -- Eliminar conceptos del contador 2
    IF v_contador2_id IS NOT NULL THEN
        DELETE FROM contadores_conceptos
        WHERE contador_id = v_contador2_id;
        
        GET DIAGNOSTICS v_conceptos_contador2 = ROW_COUNT;
        RAISE NOTICE '✓ Contador % (%): % conceptos eliminados',
            v_contador2_serie,
            v_contador2_id,
            v_conceptos_contador2;
    END IF;
    
    v_deleted_conceptos := v_conceptos_contador1 + v_conceptos_contador2;
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ ELIMINACIÓN COMPLETADA';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total de conceptos eliminados: %', v_deleted_conceptos;
    RAISE NOTICE '';
    RAISE NOTICE '📝 Ahora puedes volver a importar los datos desde Excel';
    RAISE NOTICE '';
    
EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE EXCEPTION '❌ Error: Los conceptos están referenciados por otros registros. Mensaje: %', SQLERRM;
        ROLLBACK;
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ Error al eliminar conceptos: % %', SQLERRM, SQLSTATE;
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
    v_conceptos_restantes INTEGER;
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
    
    -- Verificar conceptos restantes
    SELECT COUNT(*) INTO v_conceptos_restantes
    FROM contadores_conceptos
    WHERE contador_id IN (v_contador1_id, v_contador2_id);
    
    IF v_conceptos_restantes = 0 THEN
        RAISE NOTICE '✅ Todos los conceptos fueron eliminados correctamente';
        RAISE NOTICE '';
        RAISE NOTICE '📝 Los contadores están listos para nueva importación:';
        RAISE NOTICE '   - Contador % sin conceptos asignados', v_contador1_serie;
        RAISE NOTICE '   - Contador % sin conceptos asignados', v_contador2_serie;
    ELSE
        RAISE NOTICE '⚠️  Aún quedan % conceptos', v_conceptos_restantes;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    
END $$;
*/
