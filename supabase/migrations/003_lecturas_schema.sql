-- =====================================================
-- Migración 003: Sistema de Importación y Validación de Lecturas
-- Sistema de Facturación de Gestión Energética A360
-- Fase 2: Importación de Lecturas
-- Fecha: Diciembre 2025
-- =====================================================

-- =====================================================
-- TIPOS ENUM
-- =====================================================

CREATE TYPE estado_importacion AS ENUM (
  'pendiente',      -- Subido pero no procesado
  'procesando',     -- En proceso de validación
  'validado',       -- Listo para confirmar
  'confirmado',     -- Lecturas guardadas
  'cancelado'       -- Importación cancelada
);

CREATE TYPE estado_fila AS ENUM (
  'pendiente',      -- Sin procesar
  'valido',         -- Validado sin alertas
  'alerta',         -- Validado con alertas
  'error',          -- Error (contador no encontrado, etc.)
  'confirmado',     -- Lectura guardada
  'descartado'      -- Descartada por el usuario
);

CREATE TYPE tipo_alerta AS ENUM (
  'lectura_negativa',       -- Lectura actual < anterior
  'consumo_alto',           -- Consumo muy superior a la media
  'consumo_cero',           -- Consumo = 0 (posible error)
  'contador_no_encontrado', -- Nº serie no existe en BD
  'concepto_no_asignado',   -- Contador no tiene ese concepto
  'cliente_bloqueado',      -- Cliente está bloqueado
  'fecha_futura',           -- Fecha de lectura en el futuro
  'fecha_anterior',         -- Fecha anterior a última lectura
  'lectura_duplicada',      -- Ya existe lectura en esa fecha
  'formato_invalido'        -- Error de formato en los datos
);

CREATE TYPE severidad_alerta AS ENUM ('info', 'warning', 'error');

-- =====================================================
-- Tabla: importaciones
-- Registra cada proceso de importación realizado
-- =====================================================

CREATE TABLE importaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencia
  comunidad_id UUID REFERENCES comunidades(id),
  nombre_archivo TEXT NOT NULL,
  
  -- Estadísticas
  total_filas INTEGER NOT NULL DEFAULT 0,
  filas_validas INTEGER NOT NULL DEFAULT 0,
  filas_con_alertas INTEGER NOT NULL DEFAULT 0,
  filas_error INTEGER NOT NULL DEFAULT 0,
  
  -- Estado
  estado estado_importacion NOT NULL DEFAULT 'pendiente',
  
  -- Usuario que realizó la importación
  usuario_id UUID REFERENCES auth.users(id),
  
  -- Fechas
  fecha_subida TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_procesado TIMESTAMPTZ,
  fecha_confirmado TIMESTAMPTZ,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_importaciones_comunidad ON importaciones(comunidad_id);
CREATE INDEX idx_importaciones_estado ON importaciones(estado);
CREATE INDEX idx_importaciones_fecha ON importaciones(fecha_subida DESC);

CREATE TRIGGER importaciones_updated_at
  BEFORE UPDATE ON importaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Tabla: importaciones_detalle
-- Almacena cada fila del Excel con su estado de validación
-- =====================================================

CREATE TABLE importaciones_detalle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importacion_id UUID NOT NULL REFERENCES importaciones(id) ON DELETE CASCADE,
  
  -- Datos originales del Excel
  fila_numero INTEGER NOT NULL,
  datos_originales JSONB NOT NULL,
  
  -- Datos parseados
  numero_contador TEXT,
  concepto_codigo TEXT,
  lectura_valor DECIMAL(12,4),
  fecha_lectura DATE,
  
  -- Referencias encontradas (matching)
  contador_id UUID REFERENCES contadores(id),
  concepto_id UUID REFERENCES conceptos(id),
  ubicacion_id UUID REFERENCES ubicaciones(id),
  cliente_id UUID REFERENCES clientes(id),
  comunidad_id UUID REFERENCES comunidades(id),
  
  -- Cálculos
  lectura_anterior DECIMAL(12,4),
  fecha_lectura_anterior DATE,
  consumo_calculado DECIMAL(12,4),
  
  -- Precio aplicable (para referencia)
  precio_unitario DECIMAL(10,4),
  importe_estimado DECIMAL(10,2),
  
  -- Validación
  estado estado_fila NOT NULL DEFAULT 'pendiente',
  alertas JSONB DEFAULT '[]',
  error_mensaje TEXT,
  
  -- Correcciones manuales
  lectura_corregida DECIMAL(12,4),
  corregido_por UUID REFERENCES auth.users(id),
  fecha_correccion TIMESTAMPTZ,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_importaciones_detalle_importacion ON importaciones_detalle(importacion_id);
CREATE INDEX idx_importaciones_detalle_contador ON importaciones_detalle(contador_id);
CREATE INDEX idx_importaciones_detalle_estado ON importaciones_detalle(estado);

CREATE TRIGGER importaciones_detalle_updated_at
  BEFORE UPDATE ON importaciones_detalle
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Tabla: lecturas
-- Almacena las lecturas confirmadas (histórico oficial)
-- =====================================================

CREATE TABLE lecturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencias
  contador_id UUID NOT NULL REFERENCES contadores(id),
  concepto_id UUID NOT NULL REFERENCES conceptos(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  importacion_detalle_id UUID REFERENCES importaciones_detalle(id),
  
  -- Lectura
  lectura_valor DECIMAL(12,4) NOT NULL,
  fecha_lectura DATE NOT NULL,
  
  -- Lectura anterior (para cálculo de consumo)
  lectura_anterior DECIMAL(12,4),
  fecha_lectura_anterior DATE,
  
  -- Consumo calculado
  consumo DECIMAL(12,4) NOT NULL,
  
  -- Estado de facturación
  facturada BOOLEAN NOT NULL DEFAULT false,
  factura_id UUID,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lecturas_contador ON lecturas(contador_id);
CREATE INDEX idx_lecturas_concepto ON lecturas(concepto_id);
CREATE INDEX idx_lecturas_cliente ON lecturas(cliente_id);
CREATE INDEX idx_lecturas_fecha ON lecturas(fecha_lectura DESC);
CREATE INDEX idx_lecturas_facturada ON lecturas(facturada) WHERE facturada = false;

-- Evitar duplicados de lectura
CREATE UNIQUE INDEX idx_lecturas_unique 
  ON lecturas(contador_id, concepto_id, fecha_lectura);

CREATE TRIGGER lecturas_updated_at
  BEFORE UPDATE ON lecturas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Tabla: alertas_configuracion
-- Define los tipos de alertas y sus umbrales
-- =====================================================

CREATE TABLE alertas_configuracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  tipo tipo_alerta NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  severidad severidad_alerta NOT NULL DEFAULT 'warning',
  
  -- Configuración específica por tipo
  parametros JSONB DEFAULT '{}',
  
  -- Estado
  activa BOOLEAN NOT NULL DEFAULT true,
  bloquea_confirmacion BOOLEAN NOT NULL DEFAULT false,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER alertas_configuracion_updated_at
  BEFORE UPDATE ON alertas_configuracion
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insertar configuración por defecto
INSERT INTO alertas_configuracion (tipo, nombre, descripcion, severidad, bloquea_confirmacion, parametros) VALUES
  ('lectura_negativa', 'Lectura negativa', 'La lectura actual es menor que la anterior', 'error', true, '{}'),
  ('consumo_alto', 'Consumo anormalmente alto', 'El consumo supera significativamente la media histórica', 'warning', false, '{"factor_umbral": 3}'),
  ('consumo_cero', 'Consumo cero', 'No se ha registrado consumo en el periodo', 'info', false, '{}'),
  ('contador_no_encontrado', 'Contador no encontrado', 'El número de serie no existe en el sistema', 'error', true, '{}'),
  ('concepto_no_asignado', 'Concepto no asignado', 'El contador no tiene asignado este concepto', 'error', true, '{}'),
  ('cliente_bloqueado', 'Cliente bloqueado', 'El cliente asociado está bloqueado', 'warning', false, '{}'),
  ('fecha_futura', 'Fecha futura', 'La fecha de lectura es posterior a hoy', 'error', true, '{}'),
  ('fecha_anterior', 'Fecha anterior a última lectura', 'La fecha es anterior a la última lectura registrada', 'error', true, '{}'),
  ('lectura_duplicada', 'Lectura duplicada', 'Ya existe una lectura para esta fecha', 'warning', false, '{}'),
  ('formato_invalido', 'Formato inválido', 'El formato de los datos no es válido', 'error', true, '{}');

-- =====================================================
-- Políticas RLS
-- =====================================================

ALTER TABLE importaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE importaciones_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_configuracion ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura
CREATE POLICY "Usuarios autenticados pueden leer importaciones" ON importaciones
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer importaciones_detalle" ON importaciones_detalle
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer lecturas" ON lecturas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer alertas_configuracion" ON alertas_configuracion
  FOR SELECT TO authenticated USING (true);

-- Políticas de escritura
CREATE POLICY "Usuarios autenticados pueden modificar importaciones" ON importaciones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar importaciones_detalle" ON importaciones_detalle
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar lecturas" ON lecturas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar alertas_configuracion" ON alertas_configuracion
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- Funciones de Base de Datos
-- =====================================================

-- Función para obtener la última lectura de un contador/concepto
CREATE OR REPLACE FUNCTION get_ultima_lectura(
  p_contador_id UUID,
  p_concepto_id UUID
)
RETURNS TABLE (
  lectura_valor DECIMAL(12,4),
  fecha_lectura DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT l.lectura_valor, l.fecha_lectura
  FROM lecturas l
  WHERE l.contador_id = p_contador_id
    AND l.concepto_id = p_concepto_id
  ORDER BY l.fecha_lectura DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para calcular media de consumo histórico
CREATE OR REPLACE FUNCTION get_media_consumo(
  p_contador_id UUID,
  p_concepto_id UUID,
  p_meses INTEGER DEFAULT 12
)
RETURNS DECIMAL(12,4) AS $$
DECLARE
  v_media DECIMAL(12,4);
BEGIN
  SELECT AVG(consumo) INTO v_media
  FROM lecturas
  WHERE contador_id = p_contador_id
    AND concepto_id = p_concepto_id
    AND fecha_lectura >= CURRENT_DATE - (p_meses || ' months')::INTERVAL;
  
  RETURN COALESCE(v_media, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para confirmar lecturas de una importación
CREATE OR REPLACE FUNCTION confirmar_importacion(
  p_importacion_id UUID,
  p_usuario_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_detalle RECORD;
BEGIN
  -- Procesar cada fila válida o con alertas no bloqueantes
  FOR v_detalle IN
    SELECT id.*
    FROM importaciones_detalle id
    WHERE id.importacion_id = p_importacion_id
      AND id.estado IN ('valido', 'alerta')
      AND id.contador_id IS NOT NULL
      AND id.cliente_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(id.alertas) AS alerta
        WHERE (alerta->>'bloquea')::boolean = true
      )
  LOOP
    -- Insertar lectura
    INSERT INTO lecturas (
      contador_id, concepto_id, cliente_id, importacion_detalle_id,
      lectura_valor, fecha_lectura,
      lectura_anterior, fecha_lectura_anterior,
      consumo
    ) VALUES (
      v_detalle.contador_id,
      v_detalle.concepto_id,
      v_detalle.cliente_id,
      v_detalle.id,
      COALESCE(v_detalle.lectura_corregida, v_detalle.lectura_valor),
      v_detalle.fecha_lectura,
      v_detalle.lectura_anterior,
      v_detalle.fecha_lectura_anterior,
      COALESCE(v_detalle.lectura_corregida, v_detalle.lectura_valor) - COALESCE(v_detalle.lectura_anterior, 0)
    )
    ON CONFLICT (contador_id, concepto_id, fecha_lectura) DO NOTHING;
    
    -- Actualizar estado del detalle
    UPDATE importaciones_detalle
    SET estado = 'confirmado'
    WHERE id = v_detalle.id;
    
    -- Actualizar lectura actual en contadores_conceptos
    UPDATE contadores_conceptos
    SET lectura_actual = COALESCE(v_detalle.lectura_corregida, v_detalle.lectura_valor),
        fecha_lectura_actual = v_detalle.fecha_lectura
    WHERE contador_id = v_detalle.contador_id
      AND concepto_id = v_detalle.concepto_id;
    
    v_count := v_count + 1;
  END LOOP;
  
  -- Actualizar estado de la importación
  UPDATE importaciones
  SET estado = 'confirmado',
      fecha_confirmado = now()
  WHERE id = p_importacion_id;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Vista: Resumen de importaciones con datos de comunidad
-- =====================================================

CREATE VIEW v_importaciones_resumen AS
SELECT 
  i.id,
  i.nombre_archivo,
  i.total_filas,
  i.filas_validas,
  i.filas_con_alertas,
  i.filas_error,
  i.estado,
  i.fecha_subida,
  i.fecha_procesado,
  i.fecha_confirmado,
  c.id AS comunidad_id,
  c.nombre AS comunidad_nombre,
  c.codigo AS comunidad_codigo,
  p.nombre_completo AS usuario_nombre
FROM importaciones i
LEFT JOIN comunidades c ON i.comunidad_id = c.id
LEFT JOIN profiles p ON i.usuario_id = p.id
ORDER BY i.fecha_subida DESC;

-- =====================================================
-- Comentarios de tablas
-- =====================================================

COMMENT ON TABLE importaciones IS 'Registro de importaciones de lecturas desde Excel';
COMMENT ON TABLE importaciones_detalle IS 'Detalle de cada fila importada con validación';
COMMENT ON TABLE lecturas IS 'Lecturas confirmadas (histórico oficial)';
COMMENT ON TABLE alertas_configuracion IS 'Configuración de tipos de alertas y umbrales';

