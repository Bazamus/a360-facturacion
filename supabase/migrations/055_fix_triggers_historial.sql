BEGIN;

-- ============================================================
-- 055: Fix triggers historial - quitar SECURITY DEFINER
-- El trigger se ejecuta dentro de crear_intervencion (SECURITY DEFINER)
-- lo que causa "permission denied for table users" al acceder auth.uid()
-- ============================================================

-- 1. Recrear función de cambio de estado SIN SECURITY DEFINER
CREATE OR REPLACE FUNCTION registrar_cambio_estado_intervencion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_uid UUID;
  v_nombre TEXT;
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    -- Intentar obtener uid de forma segura
    BEGIN
      v_uid := auth.uid();
    EXCEPTION WHEN OTHERS THEN
      v_uid := NULL;
    END;

    IF v_uid IS NOT NULL THEN
      SELECT nombre_completo INTO v_nombre
      FROM profiles WHERE id = v_uid;
    END IF;

    INSERT INTO intervenciones_historial (
      intervencion_id, estado_anterior, estado_nuevo,
      usuario_id, usuario_nombre
    ) VALUES (
      NEW.id, OLD.estado, NEW.estado,
      v_uid, v_nombre
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Recrear función de estado inicial SIN SECURITY DEFINER
CREATE OR REPLACE FUNCTION registrar_estado_inicial_intervencion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_uid UUID;
  v_nombre TEXT;
BEGIN
  BEGIN
    v_uid := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_uid := NULL;
  END;

  IF v_uid IS NOT NULL THEN
    SELECT nombre_completo INTO v_nombre
    FROM profiles WHERE id = v_uid;
  END IF;

  INSERT INTO intervenciones_historial (
    intervencion_id, estado_anterior, estado_nuevo,
    usuario_id, usuario_nombre
  ) VALUES (
    NEW.id, NULL, NEW.estado,
    v_uid, v_nombre
  );

  RETURN NEW;
END;
$$;

COMMIT;
