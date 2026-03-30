BEGIN;

-- ============================================================
-- 060: Portal de Cliente - RLS + funciones de acceso
-- SEGURIDAD: Solo crea políticas RLS nuevas (no modifica existentes)
-- Solo añade lectura para rol 'cliente' a tablas SAT
-- NO toca tablas de facturación (solo añade políticas de lectura)
-- ============================================================

-- 1. Política RLS en facturas: cliente lee SUS facturas emitidas/pagadas
--    (NO modifica RLS existentes, solo AÑADE una nueva política)
CREATE POLICY "Cliente ve sus facturas"
  ON facturas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'cliente'
    )
    AND cliente_id IN (
      SELECT c.id FROM clientes c
      WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    AND estado IN ('emitida', 'pagada')
  );

-- 2. Política RLS en facturas_lineas: cliente lee líneas de sus facturas
CREATE POLICY "Cliente ve lineas de sus facturas"
  ON facturas_lineas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'cliente'
    )
    AND factura_id IN (
      SELECT f.id FROM facturas f
      WHERE f.cliente_id IN (
        SELECT c.id FROM clientes c
        WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
      AND f.estado IN ('emitida', 'pagada')
    )
  );

-- 3. Política RLS en intervenciones: cliente lee SUS intervenciones
CREATE POLICY "Cliente ve sus intervenciones"
  ON intervenciones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'cliente'
    )
    AND cliente_id IN (
      SELECT c.id FROM clientes c
      WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- 4. Política RLS en tickets: cliente ve SUS tickets
CREATE POLICY "Cliente ve sus tickets"
  ON tickets_sat FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'cliente'
    )
    AND cliente_id IN (
      SELECT c.id FROM clientes c
      WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- 5. Política: cliente puede CREAR tickets (solo INSERT)
CREATE POLICY "Cliente crea tickets"
  ON tickets_sat FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'cliente'
    )
  );

-- 6. Política: cliente ve comentarios públicos de sus tickets
CREATE POLICY "Cliente ve comentarios publicos"
  ON ticket_comentarios FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'cliente'
    )
    AND es_interno = false
    AND ticket_id IN (
      SELECT t.id FROM tickets_sat t
      WHERE t.cliente_id IN (
        SELECT c.id FROM clientes c
        WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- 7. Política: cliente puede añadir comentarios a sus tickets
CREATE POLICY "Cliente comenta en sus tickets"
  ON ticket_comentarios FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'cliente'
    )
    AND es_interno = false
    AND ticket_id IN (
      SELECT t.id FROM tickets_sat t
      WHERE t.cliente_id IN (
        SELECT c.id FROM clientes c
        WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  );

-- 8. Política: cliente ve sus equipos
CREATE POLICY "Cliente ve sus equipos"
  ON equipos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'cliente'
    )
    AND cliente_id IN (
      SELECT c.id FROM clientes c
      WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- 9. Política: cliente ve citas de sus intervenciones
CREATE POLICY "Cliente ve sus citas"
  ON citas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'cliente'
    )
    AND cliente_id IN (
      SELECT c.id FROM clientes c
      WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- 10. Función: obtener datos completos del portal para el cliente actual
CREATE OR REPLACE FUNCTION get_portal_cliente_datos()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email TEXT;
  v_cliente_id UUID;
  v_result JSON;
BEGIN
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  SELECT id INTO v_cliente_id FROM clientes WHERE email = v_user_email LIMIT 1;

  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró un cliente vinculado a este email';
  END IF;

  SELECT json_build_object(
    'cliente', (
      SELECT json_build_object(
        'id', c.id, 'nombre', c.nombre, 'apellidos', c.apellidos,
        'email', c.email, 'telefono', c.telefono,
        'direccion', c.direccion_correspondencia,
        'cp', c.cp_correspondencia, 'ciudad', c.ciudad_correspondencia
      )
      FROM clientes c WHERE c.id = v_cliente_id
    ),
    'facturas_resumen', json_build_object(
      'total', (SELECT COUNT(*) FROM facturas WHERE cliente_id = v_cliente_id AND estado IN ('emitida', 'pagada')),
      'pendientes', (SELECT COUNT(*) FROM facturas WHERE cliente_id = v_cliente_id AND estado = 'emitida'),
      'importe_pendiente', (SELECT COALESCE(SUM(total), 0) FROM facturas WHERE cliente_id = v_cliente_id AND estado = 'emitida')
    ),
    'tickets_abiertos', (
      SELECT COUNT(*) FROM tickets_sat
      WHERE cliente_id = v_cliente_id AND estado NOT IN ('resuelto', 'cerrado')
    ),
    'proximas_citas', (
      SELECT COALESCE(json_agg(ci ORDER BY ci.fecha_hora), '[]')
      FROM (
        SELECT ci.id, ci.fecha_hora, ci.duracion_minutos, ci.estado, ci.direccion,
               i.numero_parte, i.titulo AS intervencion_titulo
        FROM citas ci
        LEFT JOIN intervenciones i ON ci.intervencion_id = i.id
        WHERE ci.cliente_id = v_cliente_id
          AND ci.fecha_hora >= NOW()
          AND ci.estado NOT IN ('cancelada', 'completada')
        ORDER BY ci.fecha_hora LIMIT 5
      ) ci
    ),
    'contratos_activos', (
      SELECT COUNT(*) FROM contratos_mantenimiento
      WHERE cliente_id = v_cliente_id AND estado = 'activo'
    ),
    'equipos', (
      SELECT COUNT(*) FROM equipos
      WHERE cliente_id = v_cliente_id AND estado = 'activo'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_portal_cliente_datos TO authenticated;

COMMIT;
