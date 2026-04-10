-- =====================================================
-- Migración 075: Historial de cambios de número de serie de contador
-- Descripción: Sistema de auditoría para cambios de N/S y cambio de equipo
-- Fecha: 2026-04-10
-- =====================================================

-- =====================================================
-- Tabla: contadores_cambios_historial
-- =====================================================
CREATE TABLE IF NOT EXISTS contadores_cambios_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contador_id UUID NOT NULL REFERENCES contadores(id) ON DELETE CASCADE,

  -- Datos anteriores del equipo
  numero_serie_anterior TEXT NOT NULL,
  marca_anterior TEXT,
  modelo_anterior TEXT,
  fecha_instalacion_anterior DATE,

  -- Datos nuevos del equipo
  numero_serie_nuevo TEXT NOT NULL,
  marca_nueva TEXT,
  modelo_nueva TEXT,
  fecha_instalacion_nueva DATE,

  -- Tipo y contexto del cambio
  tipo_cambio VARCHAR(30) NOT NULL
    CONSTRAINT chk_tipo_cambio CHECK (tipo_cambio IN ('correccion_serie', 'cambio_equipo')),
  conserva_lecturas BOOLEAN NOT NULL DEFAULT true,
  motivo TEXT,

  -- Detalle de conceptos reseteados (sólo cuando conserva_lecturas = false)
  -- Array JSON: [{concepto_id, concepto_codigo, concepto_nombre,
  --               lectura_anterior, fecha_anterior,
  --               lectura_nueva, fecha_nueva}]
  conceptos_reseteados JSONB,

  -- Auditoría
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_contadores_cambios_historial_contador
  ON contadores_cambios_historial(contador_id);
CREATE INDEX idx_contadores_cambios_historial_fecha
  ON contadores_cambios_historial(created_at DESC);

-- Comentarios
COMMENT ON TABLE contadores_cambios_historial
  IS 'Auditoría de cambios de número de serie y sustituciones de equipo en contadores';
COMMENT ON COLUMN contadores_cambios_historial.tipo_cambio
  IS 'correccion_serie = mismo equipo, número erróneo; cambio_equipo = sustitución física';
COMMENT ON COLUMN contadores_cambios_historial.conserva_lecturas
  IS 'true = lecturas iniciales no modificadas; false = se resetearon lecturas en algunos conceptos';
COMMENT ON COLUMN contadores_cambios_historial.conceptos_reseteados
  IS 'JSON con detalle de cada concepto cuya lectura inicial fue reseteada';

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE contadores_cambios_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver historial de cambios de contadores"
  ON contadores_cambios_historial FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sistema puede insertar en historial de cambios de contadores"
  ON contadores_cambios_historial FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- Función RPC: cambiar_numero_serie_contador
-- =====================================================
CREATE OR REPLACE FUNCTION cambiar_numero_serie_contador(
  p_contador_id        UUID,
  p_numero_serie_nuevo TEXT,
  p_marca              TEXT    DEFAULT NULL,
  p_modelo             TEXT    DEFAULT NULL,
  p_fecha_instalacion  DATE    DEFAULT NULL,
  p_tipo_cambio        VARCHAR(30) DEFAULT 'correccion_serie',
  p_conserva_lecturas  BOOLEAN DEFAULT true,
  p_motivo             TEXT    DEFAULT NULL,
  p_conceptos_reset    JSONB   DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_serie_anterior    TEXT;
  v_marca_anterior    TEXT;
  v_modelo_anterior   TEXT;
  v_fecha_ant         DATE;
  v_historial_id      UUID;
  v_concepto          JSONB;
  v_cc_id             UUID;
  v_lectura_ant       DECIMAL(12,3);
  v_fecha_lec_ant     DATE;
  v_conceptos_log     JSONB := '[]'::JSONB;
BEGIN
  -- Validaciones básicas
  IF p_numero_serie_nuevo IS NULL OR trim(p_numero_serie_nuevo) = '' THEN
    RETURN json_build_object('success', false, 'error', 'El número de serie nuevo no puede estar vacío');
  END IF;

  IF p_tipo_cambio NOT IN ('correccion_serie', 'cambio_equipo') THEN
    RETURN json_build_object('success', false, 'error', 'Tipo de cambio no válido');
  END IF;

  -- Verificar que el nuevo número de serie no existe ya en otro contador
  IF EXISTS (
    SELECT 1 FROM contadores
    WHERE numero_serie = p_numero_serie_nuevo
      AND id <> p_contador_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ya existe otro contador con el número de serie ' || p_numero_serie_nuevo
    );
  END IF;

  -- Obtener valores actuales del contador
  SELECT numero_serie, marca, modelo, fecha_instalacion
    INTO v_serie_anterior, v_marca_anterior, v_modelo_anterior, v_fecha_ant
  FROM contadores
  WHERE id = p_contador_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Contador no encontrado');
  END IF;

  -- Actualizar el contador
  UPDATE contadores
  SET
    numero_serie       = p_numero_serie_nuevo,
    marca              = COALESCE(p_marca,             marca),
    modelo             = COALESCE(p_modelo,            modelo),
    fecha_instalacion  = COALESCE(p_fecha_instalacion, fecha_instalacion),
    updated_at         = NOW()
  WHERE id = p_contador_id;

  -- Si se deben resetear lecturas, procesar cada concepto indicado
  IF NOT p_conserva_lecturas AND p_conceptos_reset IS NOT NULL THEN
    FOR v_concepto IN SELECT * FROM jsonb_array_elements(p_conceptos_reset)
    LOOP
      -- Obtener el id de contadores_conceptos y los valores anteriores
      SELECT cc.id, cc.lectura_inicial, cc.fecha_lectura_inicial
        INTO v_cc_id, v_lectura_ant, v_fecha_lec_ant
      FROM contadores_conceptos cc
      WHERE cc.contador_id = p_contador_id
        AND cc.concepto_id = (v_concepto->>'concepto_id')::UUID;

      IF FOUND THEN
        -- Actualizar lectura inicial y actual (la nueva lectura inicial ES la lectura actual)
        UPDATE contadores_conceptos
        SET
          lectura_inicial       = (v_concepto->>'lectura_inicial')::DECIMAL(12,3),
          fecha_lectura_inicial = (v_concepto->>'fecha_lectura_inicial')::DATE,
          lectura_actual        = (v_concepto->>'lectura_inicial')::DECIMAL(12,3),
          fecha_lectura_actual  = (v_concepto->>'fecha_lectura_inicial')::DATE,
          updated_at            = NOW()
        WHERE id = v_cc_id;

        -- Registrar detalle para el historial
        v_conceptos_log := v_conceptos_log || jsonb_build_object(
          'concepto_id',       v_concepto->>'concepto_id',
          'concepto_codigo',   v_concepto->>'concepto_codigo',
          'concepto_nombre',   v_concepto->>'concepto_nombre',
          'lectura_anterior',  v_lectura_ant,
          'fecha_anterior',    v_fecha_lec_ant,
          'lectura_nueva',     (v_concepto->>'lectura_inicial')::DECIMAL(12,3),
          'fecha_nueva',       v_concepto->>'fecha_lectura_inicial'
        );
      END IF;
    END LOOP;
  END IF;

  -- Insertar en historial
  INSERT INTO contadores_cambios_historial (
    contador_id,
    numero_serie_anterior,
    marca_anterior,
    modelo_anterior,
    fecha_instalacion_anterior,
    numero_serie_nuevo,
    marca_nueva,
    modelo_nueva,
    fecha_instalacion_nueva,
    tipo_cambio,
    conserva_lecturas,
    motivo,
    conceptos_reseteados,
    usuario_id
  ) VALUES (
    p_contador_id,
    v_serie_anterior,
    v_marca_anterior,
    v_modelo_anterior,
    v_fecha_ant,
    p_numero_serie_nuevo,
    COALESCE(p_marca,            v_marca_anterior),
    COALESCE(p_modelo,           v_modelo_anterior),
    COALESCE(p_fecha_instalacion, v_fecha_ant),
    p_tipo_cambio,
    p_conserva_lecturas,
    p_motivo,
    CASE WHEN jsonb_array_length(v_conceptos_log) > 0 THEN v_conceptos_log ELSE NULL END,
    auth.uid()
  ) RETURNING id INTO v_historial_id;

  RETURN json_build_object(
    'success',          true,
    'historial_id',     v_historial_id,
    'tipo_cambio',      p_tipo_cambio,
    'serie_anterior',   v_serie_anterior,
    'serie_nueva',      p_numero_serie_nuevo,
    'conceptos_reset',  jsonb_array_length(v_conceptos_log)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION cambiar_numero_serie_contador
  IS 'Cambia el número de serie de un contador con auditoría. Permite corrección de serie o sustitución de equipo con reseteo opcional de lecturas.';

-- =====================================================
-- Vista: v_contadores_cambios_historial
-- =====================================================
CREATE OR REPLACE VIEW v_contadores_cambios_historial AS
SELECT
  h.id,
  h.contador_id,
  h.numero_serie_anterior,
  h.marca_anterior,
  h.modelo_anterior,
  h.fecha_instalacion_anterior,
  h.numero_serie_nuevo,
  h.marca_nueva,
  h.modelo_nueva,
  h.fecha_instalacion_nueva,
  h.tipo_cambio,
  h.conserva_lecturas,
  h.motivo,
  h.conceptos_reseteados,
  h.created_at,

  -- Información del usuario
  u.id          AS usuario_id,
  u.email       AS usuario_email,
  u.raw_user_meta_data->>'nombre' AS usuario_nombre,

  -- Número de serie actual del contador (puede diferir si hubo más cambios)
  c.numero_serie AS numero_serie_actual

FROM contadores_cambios_historial h
LEFT JOIN auth.users u     ON h.usuario_id = u.id
LEFT JOIN contadores   c   ON h.contador_id = c.id
ORDER BY h.created_at DESC;

COMMENT ON VIEW v_contadores_cambios_historial
  IS 'Vista enriquecida del historial de cambios de número de serie de contadores';

-- =====================================================
-- Grants
-- =====================================================
GRANT EXECUTE ON FUNCTION cambiar_numero_serie_contador TO authenticated;
GRANT SELECT ON v_contadores_cambios_historial TO authenticated;
