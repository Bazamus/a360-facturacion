-- =====================================================
-- Migración: Historial de cambios en contador_conceptos
-- Descripción: Sistema de auditoría para cambios en lecturas iniciales
-- Fecha: 2026-01-30
-- =====================================================

-- Tabla de historial de cambios
CREATE TABLE IF NOT EXISTS contador_conceptos_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contador_concepto_id UUID NOT NULL REFERENCES contadores_conceptos(id) ON DELETE CASCADE,
  
  -- Información del cambio
  campo_modificado VARCHAR(50) NOT NULL, -- 'lectura_inicial', 'fecha_lectura_inicial', 'ambos'
  valor_anterior_lectura DECIMAL(12,4),
  valor_nuevo_lectura DECIMAL(12,4),
  valor_anterior_fecha DATE,
  valor_nuevo_fecha DATE,
  
  -- Contexto del cambio
  motivo TEXT, -- Razón del cambio (opcional pero recomendado)
  usuario_id UUID REFERENCES auth.users(id), -- Usuario que realizó el cambio
  tipo_modificacion VARCHAR(20) NOT NULL DEFAULT 'manual', -- 'manual', 'importacion', 'sistema'
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Índices
  CONSTRAINT chk_campo_modificado CHECK (campo_modificado IN ('lectura_inicial', 'fecha_lectura_inicial', 'ambos'))
);

-- Índices para rendimiento
CREATE INDEX idx_contador_conceptos_historial_concepto ON contador_conceptos_historial(contador_concepto_id);
CREATE INDEX idx_contador_conceptos_historial_usuario ON contador_conceptos_historial(usuario_id);
CREATE INDEX idx_contador_conceptos_historial_fecha ON contador_conceptos_historial(created_at DESC);

-- Comentarios
COMMENT ON TABLE contador_conceptos_historial IS 'Historial de cambios en lecturas iniciales de contador_conceptos';
COMMENT ON COLUMN contador_conceptos_historial.campo_modificado IS 'Campo que se modificó: lectura_inicial, fecha_lectura_inicial o ambos';
COMMENT ON COLUMN contador_conceptos_historial.motivo IS 'Razón del cambio proporcionada por el usuario';
COMMENT ON COLUMN contador_conceptos_historial.tipo_modificacion IS 'Origen del cambio: manual (UI), importacion (Excel) o sistema (automático)';

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE contador_conceptos_historial ENABLE ROW LEVEL SECURITY;

-- Política de lectura: todos los usuarios autenticados pueden leer el historial
CREATE POLICY "Usuarios pueden ver historial de contador_conceptos"
  ON contador_conceptos_historial FOR SELECT
  TO authenticated
  USING (true);

-- Política de inserción: solo el sistema puede insertar (a través de funciones)
CREATE POLICY "Sistema puede insertar en historial"
  ON contador_conceptos_historial FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- Función para validar edición de lectura inicial
-- =====================================================

CREATE OR REPLACE FUNCTION validar_edicion_lectura_inicial(
  p_contador_concepto_id UUID
)
RETURNS TABLE (
  puede_editar BOOLEAN,
  razon_bloqueo TEXT,
  lecturas_posteriores INTEGER,
  facturas_relacionadas INTEGER
) AS $$
DECLARE
  v_contador_id UUID;
  v_concepto_id UUID;
  v_lecturas_count INTEGER;
  v_facturas_count INTEGER;
BEGIN
  -- Obtener contador_id y concepto_id
  SELECT contador_id, concepto_id
  INTO v_contador_id, v_concepto_id
  FROM contadores_conceptos
  WHERE id = p_contador_concepto_id;
  
  -- Contar lecturas posteriores (excluyendo la inicial)
  SELECT COUNT(*)
  INTO v_lecturas_count
  FROM lecturas
  WHERE contador_id = v_contador_id
    AND concepto_id = v_concepto_id;
  
  -- Contar facturas relacionadas con este contador
  SELECT COUNT(DISTINCT fl.factura_id)
  INTO v_facturas_count
  FROM facturas_lineas fl
  INNER JOIN lecturas l ON fl.lectura_id = l.id
  WHERE l.contador_id = v_contador_id
    AND l.concepto_id = v_concepto_id;
  
  -- Determinar si se puede editar
  IF v_lecturas_count > 0 THEN
    RETURN QUERY SELECT 
      false,
      'Existen ' || v_lecturas_count || ' lectura(s) posterior(es) registrada(s)',
      v_lecturas_count,
      v_facturas_count;
  ELSIF v_facturas_count > 0 THEN
    RETURN QUERY SELECT 
      false,
      'Existen ' || v_facturas_count || ' factura(s) relacionada(s)',
      v_lecturas_count,
      v_facturas_count;
  ELSE
    RETURN QUERY SELECT 
      true,
      NULL::TEXT,
      v_lecturas_count,
      v_facturas_count;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validar_edicion_lectura_inicial IS 'Valida si una lectura inicial puede ser editada';

-- =====================================================
-- Función para editar lectura inicial con auditoría
-- =====================================================

CREATE OR REPLACE FUNCTION editar_lectura_inicial(
  p_contador_concepto_id UUID,
  p_nueva_lectura DECIMAL(12,4) DEFAULT NULL,
  p_nueva_fecha DATE DEFAULT NULL,
  p_motivo TEXT DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_puede_editar BOOLEAN;
  v_razon_bloqueo TEXT;
  v_lecturas INTEGER;
  v_facturas INTEGER;
  v_lectura_anterior DECIMAL(12,4);
  v_fecha_anterior DATE;
  v_campo_modificado VARCHAR(50);
  v_historial_id UUID;
BEGIN
  -- Validar si se puede editar
  SELECT puede_editar, razon_bloqueo, lecturas_posteriores, facturas_relacionadas
  INTO v_puede_editar, v_razon_bloqueo, v_lecturas, v_facturas
  FROM validar_edicion_lectura_inicial(p_contador_concepto_id);
  
  IF NOT v_puede_editar THEN
    RETURN json_build_object(
      'success', false,
      'error', v_razon_bloqueo,
      'lecturas_posteriores', v_lecturas,
      'facturas_relacionadas', v_facturas
    );
  END IF;
  
  -- Obtener valores anteriores
  SELECT lectura_inicial, fecha_lectura_inicial
  INTO v_lectura_anterior, v_fecha_anterior
  FROM contadores_conceptos
  WHERE id = p_contador_concepto_id;
  
  -- Determinar qué campo se modificó
  IF p_nueva_lectura IS NOT NULL AND p_nueva_fecha IS NOT NULL THEN
    v_campo_modificado := 'ambos';
  ELSIF p_nueva_lectura IS NOT NULL THEN
    v_campo_modificado := 'lectura_inicial';
  ELSIF p_nueva_fecha IS NOT NULL THEN
    v_campo_modificado := 'fecha_lectura_inicial';
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'Debe proporcionar al menos un valor a modificar'
    );
  END IF;
  
  -- Actualizar contador_conceptos
  UPDATE contadores_conceptos
  SET 
    lectura_inicial = COALESCE(p_nueva_lectura, lectura_inicial),
    fecha_lectura_inicial = COALESCE(p_nueva_fecha, fecha_lectura_inicial),
    updated_at = NOW()
  WHERE id = p_contador_concepto_id;
  
  -- Registrar en historial
  INSERT INTO contador_conceptos_historial (
    contador_concepto_id,
    campo_modificado,
    valor_anterior_lectura,
    valor_nuevo_lectura,
    valor_anterior_fecha,
    valor_nuevo_fecha,
    motivo,
    usuario_id,
    tipo_modificacion
  ) VALUES (
    p_contador_concepto_id,
    v_campo_modificado,
    v_lectura_anterior,
    COALESCE(p_nueva_lectura, v_lectura_anterior),
    v_fecha_anterior,
    COALESCE(p_nueva_fecha, v_fecha_anterior),
    p_motivo,
    COALESCE(p_usuario_id, auth.uid()),
    'manual'
  ) RETURNING id INTO v_historial_id;
  
  -- Retornar resultado exitoso
  RETURN json_build_object(
    'success', true,
    'historial_id', v_historial_id,
    'campo_modificado', v_campo_modificado,
    'valores_anteriores', json_build_object(
      'lectura', v_lectura_anterior,
      'fecha', v_fecha_anterior
    ),
    'valores_nuevos', json_build_object(
      'lectura', COALESCE(p_nueva_lectura, v_lectura_anterior),
      'fecha', COALESCE(p_nueva_fecha, v_fecha_anterior)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION editar_lectura_inicial IS 'Edita lectura inicial con validación y auditoría automática';

-- =====================================================
-- Vista para historial con información de usuario
-- =====================================================

CREATE OR REPLACE VIEW v_contador_conceptos_historial AS
SELECT 
  h.id,
  h.contador_concepto_id,
  h.campo_modificado,
  h.valor_anterior_lectura,
  h.valor_nuevo_lectura,
  h.valor_anterior_fecha,
  h.valor_nuevo_fecha,
  h.motivo,
  h.tipo_modificacion,
  h.created_at,
  
  -- Información del usuario
  u.id as usuario_id,
  u.email as usuario_email,
  u.raw_user_meta_data->>'nombre' as usuario_nombre,
  
  -- Información del contador y concepto
  c.numero_serie as contador_numero_serie,
  con.codigo as concepto_codigo,
  con.nombre as concepto_nombre
  
FROM contador_conceptos_historial h
LEFT JOIN auth.users u ON h.usuario_id = u.id
LEFT JOIN contadores_conceptos cc ON h.contador_concepto_id = cc.id
LEFT JOIN contadores c ON cc.contador_id = c.id
LEFT JOIN conceptos con ON cc.concepto_id = con.id
ORDER BY h.created_at DESC;

COMMENT ON VIEW v_contador_conceptos_historial IS 'Vista enriquecida del historial con información de usuarios y contadores';

-- =====================================================
-- Grants
-- =====================================================

GRANT EXECUTE ON FUNCTION validar_edicion_lectura_inicial TO authenticated;
GRANT EXECUTE ON FUNCTION editar_lectura_inicial TO authenticated;
GRANT SELECT ON v_contador_conceptos_historial TO authenticated;
