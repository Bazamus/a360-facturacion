# PRD Fase 2: Sistema de Importación y Validación de Lecturas

## Sistema de Facturación de Gestión Energética A360

| Campo | Valor |
|-------|-------|
| **Cliente** | A360 Servicios Energéticos S.L. |
| **Proyecto** | Sistema de Facturación Energética |
| **Versión** | 1.0 |
| **Fecha** | Diciembre 2025 |
| **Fase** | 2 de 5 |
| **Dependencia** | Requiere Fase 1 completada |

---

## 1. Objetivo de esta Fase

Esta fase implementa el sistema de importación de lecturas desde archivos Excel y la pantalla de validación donde el usuario puede revisar, corregir y confirmar las lecturas antes de procesarlas para facturación. El sistema detectará automáticamente alertas como consumos anómalos, lecturas negativas o contadores no encontrados.

### Entregables principales

- Importador de archivos Excel con mapeo flexible de columnas
- Sistema de detección automática de contadores por número de serie
- Cálculo automático de consumos (lectura actual - lectura anterior)
- Pantalla de validación con alertas visuales
- Sistema de alertas configurable
- Confirmación masiva o selectiva de lecturas
- Histórico de importaciones realizadas
- Tabla de lecturas validadas lista para facturación

---

## 2. Flujo de Trabajo

### 2.1 Diagrama del Proceso

```
┌─────────────────┐
│  Técnico toma   │
│    lecturas     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Genera Excel   │
│  con lecturas   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Usuario sube  │
│   Excel al      │
│   sistema       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Sistema parsea │
│  y mapea        │
│  columnas       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Matching por   │
│  Nº contador    │
│  con BD         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Cálculo de     │
│  consumos y     │
│  detección de   │
│  alertas        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Pantalla de    │
│  validación     │
│  con alertas    │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│Corregir│ │Confirmar│
│lectura │ │lecturas │
└───────┘ └────┬────┘
               │
               ▼
        ┌─────────────┐
        │  Lecturas   │
        │  guardadas  │
        │  en BD      │
        └─────────────┘
```

### 2.2 Caso de Uso Principal

1. El técnico visita la comunidad "Troya 40" y toma lecturas de todos los contadores
2. Genera un Excel con las columnas: Portal, Vivienda, Nº Contador, Concepto, Lectura, Fecha
3. El administrativo accede a la plataforma y sube el Excel
4. El sistema detecta automáticamente las columnas y muestra una previsualización
5. El usuario confirma el mapeo de columnas
6. El sistema procesa cada fila:
   - Busca el contador por número de serie
   - Obtiene la lectura anterior de ese contador/concepto
   - Calcula el consumo (lectura actual - lectura anterior)
   - Detecta alertas si aplica
7. Se muestra la pantalla de validación con todas las lecturas y alertas
8. El usuario revisa, corrige si es necesario, y confirma
9. Las lecturas confirmadas se guardan y quedan listas para facturar

---

## 3. Formato del Excel de Entrada

### 3.1 Columnas Esperadas

| Columna | Obligatoria | Descripción | Ejemplo |
|---------|-------------|-------------|---------|
| Nº Contador | ✅ Sí | Número de serie del contador | 22804168 |
| Concepto | ✅ Sí | Código o nombre del concepto | ACS, CAL, Calefacción |
| Lectura | ✅ Sí | Valor de la lectura actual | 21.2080 |
| Fecha Lectura | ✅ Sí | Fecha de la lectura | 23/11/2025 |
| Portal | ❌ No | Referencia visual (no se usa para matching) | 2 |
| Vivienda | ❌ No | Referencia visual (no se usa para matching) | 5ºH |

### 3.2 Variantes de Nombres de Columna Aceptadas

El sistema debe reconocer variantes comunes:

```javascript
const COLUMN_MAPPINGS = {
  numero_contador: [
    'nº contador', 'n contador', 'numero contador', 'num contador',
    'contador', 'serie', 'nº serie', 'numero serie', 'id contador'
  ],
  concepto: [
    'concepto', 'tipo', 'servicio', 'tipo consumo', 'tipo lectura'
  ],
  lectura: [
    'lectura', 'lectura actual', 'valor', 'medicion', 'lectura m3',
    'lectura kcal', 'lectura frig'
  ],
  fecha_lectura: [
    'fecha', 'fecha lectura', 'fecha de lectura', 'f. lectura', 'dia'
  ],
  portal: [
    'portal', 'bloque', 'escalera', 'edificio'
  ],
  vivienda: [
    'vivienda', 'piso', 'puerta', 'local', 'unidad'
  ]
};
```

### 3.3 Formatos de Fecha Aceptados

```javascript
const DATE_FORMATS = [
  'DD/MM/YYYY',    // 23/11/2025
  'DD-MM-YYYY',    // 23-11-2025
  'DD.MM.YYYY',    // 23.11.2025
  'YYYY-MM-DD',    // 2025-11-23 (ISO)
  'D/M/YYYY',      // 3/1/2025
  'DD/MM/YY',      // 23/11/25
];
```

### 3.4 Formatos Numéricos Aceptados

```javascript
// El sistema debe manejar ambos formatos
'21.2080'   // Formato internacional (punto decimal)
'21,2080'   // Formato español (coma decimal)
'1.234,56'  // Formato español con miles
```

---

## 4. Esquema de Base de Datos

### 4.1 Tabla: `importaciones`

Registra cada proceso de importación realizado.

```sql
CREATE TYPE estado_importacion AS ENUM (
  'pendiente',      -- Subido pero no procesado
  'procesando',     -- En proceso de validación
  'validado',       -- Listo para confirmar
  'confirmado',     -- Lecturas guardadas
  'cancelado'       -- Importación cancelada
);

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
```

### 4.2 Tabla: `importaciones_detalle`

Almacena cada fila del Excel importado con su estado de validación.

```sql
CREATE TYPE estado_fila AS ENUM (
  'pendiente',      -- Sin procesar
  'valido',         -- Validado sin alertas
  'alerta',         -- Validado con alertas
  'error',          -- Error (contador no encontrado, etc.)
  'confirmado',     -- Lectura guardada
  'descartado'      -- Descartada por el usuario
);

CREATE TABLE importaciones_detalle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importacion_id UUID NOT NULL REFERENCES importaciones(id) ON DELETE CASCADE,
  
  -- Datos originales del Excel
  fila_numero INTEGER NOT NULL,
  datos_originales JSONB NOT NULL, -- Toda la fila original
  
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
  alertas JSONB DEFAULT '[]', -- Array de alertas detectadas
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
```

### 4.3 Tabla: `lecturas`

Almacena las lecturas confirmadas (histórico oficial).

```sql
CREATE TABLE lecturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referencias
  contador_id UUID NOT NULL REFERENCES contadores(id),
  concepto_id UUID NOT NULL REFERENCES conceptos(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id), -- Cliente al momento de la lectura
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
  factura_id UUID, -- Se llenará en Fase 3
  
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
```

### 4.4 Tabla: `alertas_configuracion`

Define los tipos de alertas y sus umbrales.

```sql
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

CREATE TABLE alertas_configuracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  tipo tipo_alerta NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  severidad severidad_alerta NOT NULL DEFAULT 'warning',
  
  -- Configuración específica por tipo
  parametros JSONB DEFAULT '{}',
  -- Ej: {"umbral_consumo_alto": 3} = alerta si consumo > 3x media
  
  -- Estado
  activa BOOLEAN NOT NULL DEFAULT true,
  bloquea_confirmacion BOOLEAN NOT NULL DEFAULT false,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

CREATE TRIGGER alertas_configuracion_updated_at
  BEFORE UPDATE ON alertas_configuracion
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 4.5 Políticas RLS

```sql
-- Habilitar RLS
ALTER TABLE importaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE importaciones_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_configuracion ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura
CREATE POLICY "Usuarios autenticados pueden leer" ON importaciones
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer" ON importaciones_detalle
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer" ON lecturas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer" ON alertas_configuracion
  FOR SELECT TO authenticated USING (true);

-- Políticas de escritura
CREATE POLICY "Usuarios autenticados pueden modificar" ON importaciones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar" ON importaciones_detalle
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar" ON lecturas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Solo admins pueden modificar alertas" ON alertas_configuracion
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );
```

### 4.6 Funciones de Base de Datos

```sql
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
$$ LANGUAGE plpgsql;

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
$$ LANGUAGE plpgsql;

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
    JOIN alertas_configuracion ac ON true
    WHERE id.importacion_id = p_importacion_id
      AND id.estado IN ('valido', 'alerta')
      AND id.contador_id IS NOT NULL
      AND NOT EXISTS (
        -- Excluir filas con alertas bloqueantes
        SELECT 1 FROM jsonb_array_elements(id.alertas) alerta
        JOIN alertas_configuracion ac2 ON ac2.tipo::text = alerta->>'tipo'
        WHERE ac2.bloquea_confirmacion = true
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
$$ LANGUAGE plpgsql;
```

---

## 5. Interfaces de Usuario

### 5.1 Pantalla: Importar Lecturas

**Ruta:** `/lecturas/importar`

**Paso 1: Selección de Comunidad y Archivo**

```
┌─────────────────────────────────────────────────────────────┐
│  📥 Importar Lecturas                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Comunidad: [Selector de comunidad        ▼]               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │     📄 Arrastra el archivo Excel aquí              │   │
│  │        o haz clic para seleccionar                 │   │
│  │                                                     │   │
│  │     Formatos aceptados: .xlsx, .xls                │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💡 El archivo debe contener las columnas:                  │
│     Nº Contador, Concepto, Lectura, Fecha Lectura          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Paso 2: Mapeo de Columnas**

```
┌─────────────────────────────────────────────────────────────┐
│  📥 Importar Lecturas - Mapeo de Columnas                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Archivo: lecturas_noviembre_2025.xlsx (45 filas)          │
│                                                             │
│  Columnas detectadas:            Mapear a:                  │
│  ┌────────────────────┐         ┌──────────────────────┐   │
│  │ A: Portal          │    →    │ Portal (opcional)  ▼ │   │
│  │ B: Vivienda        │    →    │ Vivienda (opcional)▼ │   │
│  │ C: Num_Contador    │    →    │ Nº Contador ✓      ▼ │   │
│  │ D: Tipo            │    →    │ Concepto ✓         ▼ │   │
│  │ E: Lectura_Actual  │    →    │ Lectura ✓          ▼ │   │
│  │ F: Fecha           │    →    │ Fecha Lectura ✓    ▼ │   │
│  └────────────────────┘         └──────────────────────┘   │
│                                                             │
│  Vista previa (primeras 5 filas):                          │
│  ┌──────┬─────────┬───────────┬──────┬─────────┬──────────┐│
│  │Portal│Vivienda │Num_Contador│Tipo │Lect_Act │Fecha     ││
│  ├──────┼─────────┼───────────┼──────┼─────────┼──────────┤│
│  │2     │5ºH      │22804168   │ACS   │21.2080  │23/11/2025││
│  │2     │5ºH      │22804168   │CAL   │1520.50  │23/11/2025││
│  │...   │...      │...        │...   │...      │...       ││
│  └──────┴─────────┴───────────┴──────┴─────────┴──────────┘│
│                                                             │
│              [Cancelar]              [Procesar Archivo →]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Pantalla: Validación de Lecturas

**Ruta:** `/lecturas/validar/:importacionId`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ✓ Validación de Lecturas                                    [❌ Cancelar]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Comunidad: Troya 40                    Archivo: lecturas_nov_2025.xlsx    │
│  Fecha: 23/11/2025                      Total: 45 lecturas                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✅ 38 Válidas    ⚠️ 5 Con alertas    ❌ 2 Errores                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Filtrar: [Todas ▼]  [Buscar por contador o cliente...]         [🔄]      │
│                                                                             │
│  ┌────┬─────────┬────────────┬────────┬─────────┬─────────┬───────┬──────┐ │
│  │ ☑️ │ Portal  │ Vivienda   │Cliente │Contador │Concepto │Consumo│Estado│ │
│  ├────┼─────────┼────────────┼────────┼─────────┼─────────┼───────┼──────┤ │
│  │ ☑️ │ 2       │ 5ºH        │O.Zurro │22804168 │ACS      │ 1.073 │ ✅   │ │
│  │ ☑️ │ 2       │ 5ºH        │O.Zurro │22804168 │CAL      │ 45.20 │ ✅   │ │
│  │ ☑️ │ 2       │ 3ºA        │M.López │22804201 │ACS      │ 2.150 │ ⚠️   │ │
│  │    │         │            │        │         │         │       │[!]   │ │
│  │ ☐ │ 3       │ 1ºB        │—       │99999999 │ACS      │ —     │ ❌   │ │
│  │    │         │            │        │         │         │       │[!]   │ │
│  │ ...│ ...     │ ...        │...     │...      │...      │ ...   │ ...  │ │
│  └────┴─────────┴────────────┴────────┴─────────┴─────────┴───────┴──────┘ │
│                                                                             │
│  ☑️ Seleccionar todas las válidas (38)                                     │
│                                                                             │
│  [Descartar selección]                    [Confirmar 38 lecturas →]        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Panel de Detalle de Fila

Al hacer clic en una fila o en el icono de alerta:

```
┌─────────────────────────────────────────────────────────────┐
│  Detalle de Lectura                                    [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📍 Ubicación                                               │
│  Comunidad: Troya 40                                        │
│  Portal: 2 | Vivienda: 3ºA                                 │
│                                                             │
│  👤 Cliente                                                 │
│  María López García                                         │
│  NIF: 12345678A | Email: mlopez@email.com                  │
│                                                             │
│  🔢 Contador: 22804201                                      │
│  Concepto: ACS (Agua Caliente Sanitaria)                   │
│                                                             │
│  📊 Lecturas                                                │
│  ┌─────────────────┬─────────────────┬─────────────────┐   │
│  │                 │ Anterior        │ Actual          │   │
│  ├─────────────────┼─────────────────┼─────────────────┤   │
│  │ Fecha           │ 21/10/2025      │ 23/11/2025      │   │
│  │ Lectura         │ 18.500          │ 20.650          │   │
│  │ Consumo         │ —               │ 2.150 m³        │   │
│  └─────────────────┴─────────────────┴─────────────────┘   │
│                                                             │
│  ⚠️ ALERTAS                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️ Consumo alto: El consumo (2.15 m³) es 2.5 veces  │   │
│  │    superior a la media histórica (0.86 m³)          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💰 Estimación                                              │
│  Precio unitario: 6.45 €/m³                                │
│  Importe estimado: 13.87 € (+ IVA)                         │
│                                                             │
│  ✏️ Corregir lectura                                        │
│  Nueva lectura: [20.650    ]                               │
│  Motivo: [Verificado con técnico     ]                     │
│                                                             │
│           [Descartar]    [Guardar corrección]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Pantalla: Historial de Importaciones

**Ruta:** `/lecturas/historial`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📋 Historial de Importaciones                      [+ Nueva Importación]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Filtrar: [Todas las comunidades ▼]  [Último mes ▼]  [Todos ▼]         │
│                                                                         │
│  ┌──────────┬────────────┬──────────────────┬──────┬───────┬─────────┐ │
│  │ Fecha    │ Comunidad  │ Archivo          │Filas │Estado │Acciones │ │
│  ├──────────┼────────────┼──────────────────┼──────┼───────┼─────────┤ │
│  │23/11/2025│ Troya 40   │ lecturas_nov.xlsx│  45  │✅ Conf│ 👁️ 📥   │ │
│  │15/11/2025│ Hermes 12  │ lect_nov_15.xlsx │  28  │✅ Conf│ 👁️ 📥   │ │
│  │01/11/2025│ Troya 40   │ lecturas_oct.xlsx│  44  │✅ Conf│ 👁️ 📥   │ │
│  │28/10/2025│ Apolo 8    │ octubre_2025.xlsx│  62  │⏳ Pend│ 👁️ ▶️   │ │
│  └──────────┴────────────┴──────────────────┴──────┴───────┴─────────┘ │
│                                                                         │
│  Estados: ✅ Confirmado  ⏳ Pendiente  ❌ Cancelado                      │
│  Acciones: 👁️ Ver detalle  📥 Descargar  ▶️ Continuar validación        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.5 Pantalla: Configuración de Alertas

**Ruta:** `/configuracion/alertas`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚠️ Configuración de Alertas                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────┬───────────┬──────────┬────────────┬─────────┐ │
│  │ Alerta              │ Severidad │ Activa   │ Bloquea    │ Config  │ │
│  ├─────────────────────┼───────────┼──────────┼────────────┼─────────┤ │
│  │ Lectura negativa    │ 🔴 Error  │ ✅ Sí    │ ✅ Sí      │ ⚙️      │ │
│  │ Consumo alto        │ 🟡 Aviso  │ ✅ Sí    │ ❌ No      │ ⚙️      │ │
│  │ Consumo cero        │ 🔵 Info   │ ✅ Sí    │ ❌ No      │ ⚙️      │ │
│  │ Contador no encontr.│ 🔴 Error  │ ✅ Sí    │ ✅ Sí      │ ⚙️      │ │
│  │ Cliente bloqueado   │ 🟡 Aviso  │ ✅ Sí    │ ❌ No      │ ⚙️      │ │
│  │ ...                 │ ...       │ ...      │ ...        │ ...     │ │
│  └─────────────────────┴───────────┴──────────┴────────────┴─────────┘ │
│                                                                         │
│  Configuración de "Consumo alto":                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Generar alerta cuando el consumo supere la media histórica en: │   │
│  │ [3   ] veces (factor multiplicador)                             │   │
│  │                                                                 │   │
│  │ Periodo para calcular media: [12] meses                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Lógica de Procesamiento

### 6.1 Algoritmo de Procesamiento de Excel

```javascript
async function procesarExcel(file, comunidadId, columnMapping) {
  // 1. Parsear Excel
  const workbook = XLSX.read(await file.arrayBuffer());
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // 2. Crear registro de importación
  const importacion = await createImportacion({
    comunidad_id: comunidadId,
    nombre_archivo: file.name,
    total_filas: rows.length - 1, // Excluir header
    estado: 'procesando'
  });
  
  // 3. Procesar cada fila
  const resultados = [];
  for (let i = 1; i < rows.length; i++) {
    const fila = rows[i];
    const resultado = await procesarFila(fila, i, columnMapping, comunidadId);
    resultados.push(resultado);
    
    // Guardar en importaciones_detalle
    await saveImportacionDetalle(importacion.id, resultado);
  }
  
  // 4. Actualizar estadísticas
  const stats = calcularEstadisticas(resultados);
  await updateImportacion(importacion.id, {
    estado: 'validado',
    filas_validas: stats.validas,
    filas_con_alertas: stats.conAlertas,
    filas_error: stats.errores,
    fecha_procesado: new Date()
  });
  
  return { importacion, resultados };
}
```

### 6.2 Algoritmo de Procesamiento de Fila

```javascript
async function procesarFila(fila, numeroFila, mapping, comunidadId) {
  const resultado = {
    fila_numero: numeroFila,
    datos_originales: fila,
    alertas: [],
    estado: 'pendiente'
  };
  
  try {
    // 1. Extraer y parsear datos
    const numeroContador = parseString(fila[mapping.numero_contador]);
    const conceptoCodigo = parseConcepto(fila[mapping.concepto]);
    const lecturaValor = parseNumber(fila[mapping.lectura]);
    const fechaLectura = parseDate(fila[mapping.fecha_lectura]);
    
    resultado.numero_contador = numeroContador;
    resultado.concepto_codigo = conceptoCodigo;
    resultado.lectura_valor = lecturaValor;
    resultado.fecha_lectura = fechaLectura;
    
    // 2. Validar formato
    if (!numeroContador || !conceptoCodigo || lecturaValor === null || !fechaLectura) {
      resultado.alertas.push({ tipo: 'formato_invalido', mensaje: 'Datos incompletos o inválidos' });
      resultado.estado = 'error';
      return resultado;
    }
    
    // 3. Buscar contador
    const contador = await findContadorByNumeroSerie(numeroContador);
    if (!contador) {
      resultado.alertas.push({ tipo: 'contador_no_encontrado', mensaje: `Contador ${numeroContador} no encontrado` });
      resultado.estado = 'error';
      return resultado;
    }
    resultado.contador_id = contador.id;
    resultado.ubicacion_id = contador.ubicacion_id;
    
    // 4. Verificar que pertenece a la comunidad
    const ubicacionInfo = await getUbicacionInfo(contador.ubicacion_id);
    if (ubicacionInfo.comunidad_id !== comunidadId) {
      resultado.alertas.push({ tipo: 'contador_otra_comunidad', mensaje: 'El contador pertenece a otra comunidad' });
      resultado.estado = 'error';
      return resultado;
    }
    resultado.comunidad_id = comunidadId;
    
    // 5. Buscar concepto
    const concepto = await findConceptoByCodigo(conceptoCodigo);
    if (!concepto) {
      resultado.alertas.push({ tipo: 'concepto_no_encontrado', mensaje: `Concepto ${conceptoCodigo} no encontrado` });
      resultado.estado = 'error';
      return resultado;
    }
    resultado.concepto_id = concepto.id;
    
    // 6. Verificar que el contador tiene asignado este concepto
    const contadorConcepto = await findContadorConcepto(contador.id, concepto.id);
    if (!contadorConcepto) {
      resultado.alertas.push({ tipo: 'concepto_no_asignado', mensaje: 'El contador no tiene asignado este concepto' });
      resultado.estado = 'error';
      return resultado;
    }
    
    // 7. Obtener cliente actual
    const cliente = await getClienteActualUbicacion(contador.ubicacion_id);
    resultado.cliente_id = cliente?.id;
    
    // 8. Obtener lectura anterior
    const lecturaAnterior = await getUltimaLectura(contador.id, concepto.id);
    resultado.lectura_anterior = lecturaAnterior?.lectura_valor || contadorConcepto.lectura_inicial;
    resultado.fecha_lectura_anterior = lecturaAnterior?.fecha_lectura || contadorConcepto.fecha_lectura_inicial;
    
    // 9. Calcular consumo
    resultado.consumo_calculado = lecturaValor - resultado.lectura_anterior;
    
    // 10. Obtener precio
    const precio = await getPrecioVigente(comunidadId, concepto.id);
    resultado.precio_unitario = precio?.precio_unitario;
    resultado.importe_estimado = resultado.consumo_calculado * (precio?.precio_unitario || 0);
    
    // 11. Detectar alertas
    resultado.alertas = await detectarAlertas(resultado, contador, cliente);
    
    // 12. Determinar estado
    if (resultado.alertas.some(a => a.severidad === 'error')) {
      resultado.estado = 'error';
    } else if (resultado.alertas.length > 0) {
      resultado.estado = 'alerta';
    } else {
      resultado.estado = 'valido';
    }
    
  } catch (error) {
    resultado.error_mensaje = error.message;
    resultado.estado = 'error';
  }
  
  return resultado;
}
```

### 6.3 Algoritmo de Detección de Alertas

```javascript
async function detectarAlertas(resultado, contador, cliente) {
  const alertas = [];
  const config = await getAlertasConfiguracion();
  
  // 1. Lectura negativa
  if (config.lectura_negativa.activa && resultado.consumo_calculado < 0) {
    alertas.push({
      tipo: 'lectura_negativa',
      severidad: config.lectura_negativa.severidad,
      mensaje: `La lectura actual (${resultado.lectura_valor}) es menor que la anterior (${resultado.lectura_anterior})`,
      bloquea: config.lectura_negativa.bloquea_confirmacion
    });
  }
  
  // 2. Consumo alto
  if (config.consumo_alto.activa && resultado.consumo_calculado > 0) {
    const media = await getMediaConsumo(resultado.contador_id, resultado.concepto_id);
    const umbral = config.consumo_alto.parametros.factor_umbral || 3;
    
    if (media > 0 && resultado.consumo_calculado > media * umbral) {
      alertas.push({
        tipo: 'consumo_alto',
        severidad: config.consumo_alto.severidad,
        mensaje: `El consumo (${resultado.consumo_calculado}) es ${(resultado.consumo_calculado / media).toFixed(1)} veces la media (${media.toFixed(2)})`,
        bloquea: config.consumo_alto.bloquea_confirmacion
      });
    }
  }
  
  // 3. Consumo cero
  if (config.consumo_cero.activa && resultado.consumo_calculado === 0) {
    alertas.push({
      tipo: 'consumo_cero',
      severidad: config.consumo_cero.severidad,
      mensaje: 'No se ha registrado consumo en el periodo',
      bloquea: config.consumo_cero.bloquea_confirmacion
    });
  }
  
  // 4. Cliente bloqueado
  if (config.cliente_bloqueado.activa && cliente?.bloqueado) {
    alertas.push({
      tipo: 'cliente_bloqueado',
      severidad: config.cliente_bloqueado.severidad,
      mensaje: `Cliente bloqueado: ${cliente.motivo_bloqueo || 'Sin motivo especificado'}`,
      bloquea: config.cliente_bloqueado.bloquea_confirmacion
    });
  }
  
  // 5. Fecha futura
  if (config.fecha_futura.activa && resultado.fecha_lectura > new Date()) {
    alertas.push({
      tipo: 'fecha_futura',
      severidad: config.fecha_futura.severidad,
      mensaje: 'La fecha de lectura es posterior a hoy',
      bloquea: config.fecha_futura.bloquea_confirmacion
    });
  }
  
  // 6. Fecha anterior a última lectura
  if (config.fecha_anterior.activa && 
      resultado.fecha_lectura_anterior && 
      resultado.fecha_lectura <= resultado.fecha_lectura_anterior) {
    alertas.push({
      tipo: 'fecha_anterior',
      severidad: config.fecha_anterior.severidad,
      mensaje: `La fecha es anterior o igual a la última lectura (${formatDate(resultado.fecha_lectura_anterior)})`,
      bloquea: config.fecha_anterior.bloquea_confirmacion
    });
  }
  
  // 7. Lectura duplicada
  if (config.lectura_duplicada.activa) {
    const existente = await checkLecturaDuplicada(
      resultado.contador_id, 
      resultado.concepto_id, 
      resultado.fecha_lectura
    );
    if (existente) {
      alertas.push({
        tipo: 'lectura_duplicada',
        severidad: config.lectura_duplicada.severidad,
        mensaje: 'Ya existe una lectura registrada para esta fecha',
        bloquea: config.lectura_duplicada.bloquea_confirmacion
      });
    }
  }
  
  return alertas;
}
```

---

## 7. Componentes

### 7.1 Componentes Específicos de Importación

| Componente | Descripción |
|------------|-------------|
| `FileDropzone` | Zona de arrastrar y soltar archivos |
| `ColumnMapper` | Interfaz para mapear columnas del Excel |
| `ExcelPreview` | Vista previa de datos del Excel |
| `ImportacionProgress` | Barra de progreso de procesamiento |

### 7.2 Componentes de Validación

| Componente | Descripción |
|------------|-------------|
| `ValidacionTable` | Tabla principal de validación |
| `ValidacionRow` | Fila de la tabla con estado y acciones |
| `ValidacionStats` | Resumen de estadísticas (válidas/alertas/errores) |
| `ValidacionFilters` | Filtros de estado y búsqueda |
| `DetallePanel` | Panel lateral con detalle de fila |
| `AlertaBadge` | Badge de alerta con color según severidad |
| `CorreccionForm` | Formulario para corregir lectura |

### 7.3 Componentes de Historial

| Componente | Descripción |
|------------|-------------|
| `HistorialTable` | Tabla de importaciones realizadas |
| `HistorialFilters` | Filtros de comunidad, fecha y estado |
| `ImportacionResumen` | Tarjeta resumen de una importación |

---

## 8. Hooks Personalizados

```javascript
// Importaciones
useImportaciones(filtros)              // Lista importaciones
useImportacion(id)                     // Detalle de importación
useCreateImportacion()                 // Crear importación
useProcessExcel()                      // Procesar archivo Excel
useConfirmarImportacion()              // Confirmar lecturas

// Validación
useImportacionDetalle(importacionId)   // Filas de una importación
useUpdateDetalle()                     // Actualizar/corregir fila
useDescartarFilas()                    // Descartar filas seleccionadas

// Lecturas
useLecturas(filtros)                   // Consultar lecturas
useLecturasContador(contadorId)        // Lecturas de un contador
useUltimaLectura(contadorId, conceptoId)

// Alertas
useAlertasConfiguracion()              // Configuración de alertas
useUpdateAlertaConfig()                // Actualizar configuración

// Utilidades
useExcelParser()                       // Parsear Excel
useColumnDetection()                   // Detectar columnas automáticamente
```

---

## 9. Tareas de Implementación

### 9.1 Base de Datos

- [ ] Crear archivo `supabase/migrations/003_lecturas_schema.sql`
- [ ] Crear tipos ENUM (estado_importacion, estado_fila, tipo_alerta, severidad_alerta)
- [ ] Crear tabla `importaciones`
- [ ] Crear tabla `importaciones_detalle`
- [ ] Crear tabla `lecturas`
- [ ] Crear tabla `alertas_configuracion`
- [ ] Insertar configuración de alertas por defecto
- [ ] Crear funciones de base de datos
- [ ] Crear políticas RLS
- [ ] Crear índices

### 9.2 Dependencias

- [ ] Instalar `xlsx` para parseo de Excel
- [ ] Instalar `react-dropzone` para drag & drop de archivos

```bash
npm install xlsx react-dropzone
```

### 9.3 Estructura de Carpetas

- [ ] Crear `src/features/lecturas/`
- [ ] Crear `src/features/lecturas/components/`
- [ ] Crear `src/features/lecturas/hooks/`
- [ ] Crear `src/features/lecturas/utils/`

### 9.4 Utilidades de Parseo

- [ ] Implementar `parseExcel.js` - Parseo de archivos Excel
- [ ] Implementar `columnDetector.js` - Detección automática de columnas
- [ ] Implementar `dateParsers.js` - Parseo de fechas en múltiples formatos
- [ ] Implementar `numberParsers.js` - Parseo de números (formato ES/EN)
- [ ] Implementar `conceptoMatcher.js` - Matching de códigos de concepto

### 9.5 Hooks

- [ ] Implementar `useImportaciones`
- [ ] Implementar `useImportacion`
- [ ] Implementar `useProcessExcel`
- [ ] Implementar `useImportacionDetalle`
- [ ] Implementar `useConfirmarImportacion`
- [ ] Implementar `useAlertasConfiguracion`
- [ ] Implementar `useLecturas`

### 9.6 Componentes de Importación

- [ ] Implementar `FileDropzone`
- [ ] Implementar `ColumnMapper`
- [ ] Implementar `ExcelPreview`
- [ ] Implementar `ImportacionProgress`
- [ ] Crear página `ImportarLecturasPage`

### 9.7 Componentes de Validación

- [ ] Implementar `ValidacionStats`
- [ ] Implementar `ValidacionFilters`
- [ ] Implementar `ValidacionTable`
- [ ] Implementar `ValidacionRow`
- [ ] Implementar `AlertaBadge`
- [ ] Implementar `DetallePanel`
- [ ] Implementar `CorreccionForm`
- [ ] Crear página `ValidarLecturasPage`

### 9.8 Componentes de Historial

- [ ] Implementar `HistorialTable`
- [ ] Implementar `HistorialFilters`
- [ ] Crear página `HistorialImportacionesPage`

### 9.9 Configuración de Alertas

- [ ] Crear página `AlertasConfigPage`
- [ ] Implementar formulario de configuración por tipo de alerta

### 9.10 Navegación

- [ ] Añadir sección "Lecturas" al Sidebar
- [ ] Añadir subopciones: Importar, Historial
- [ ] Añadir rutas a React Router
- [ ] Añadir "Alertas" a sección Configuración

### 9.11 Testing

- [ ] Probar importación de Excel con diferentes formatos
- [ ] Probar detección automática de columnas
- [ ] Probar matching de contadores
- [ ] Probar cálculo de consumos
- [ ] Probar detección de cada tipo de alerta
- [ ] Probar corrección manual de lecturas
- [ ] Probar confirmación masiva
- [ ] Probar confirmación selectiva
- [ ] Probar histórico de importaciones

### 9.12 Documentación

- [ ] Crear `docs/PRD/fase-2.md`
- [ ] Documentar formato de Excel esperado
- [ ] Documentar tipos de alertas
- [ ] Merge de `phase/2` a `develop`

---

## 10. Criterios de Aceptación

| # | Criterio | Verificación |
|---|----------|--------------|
| 1 | **Subida de Excel** | Se puede subir un archivo .xlsx/.xls arrastrando o seleccionando |
| 2 | **Mapeo de columnas** | El sistema detecta columnas automáticamente y permite ajuste manual |
| 3 | **Matching de contadores** | Los contadores se identifican correctamente por número de serie |
| 4 | **Cálculo de consumos** | El consumo se calcula como lectura actual - lectura anterior |
| 5 | **Detección de alertas** | Se detectan todos los tipos de alertas configurados |
| 6 | **Visualización de alertas** | Las alertas se muestran con colores según severidad |
| 7 | **Corrección manual** | Se puede corregir una lectura manualmente |
| 8 | **Confirmación selectiva** | Se pueden seleccionar qué lecturas confirmar |
| 9 | **Bloqueo por alertas** | Las alertas bloqueantes impiden confirmar la fila |
| 10 | **Histórico** | Se puede consultar el histórico de importaciones realizadas |
| 11 | **Lecturas guardadas** | Las lecturas confirmadas se guardan en la tabla `lecturas` |
| 12 | **Actualización contadores** | La lectura actual del contador se actualiza tras confirmar |

---

## 11. Dependencias

### 11.1 Requiere de Fase 1

- Tablas `comunidades`, `contadores`, `contadores_conceptos`, `clientes`
- Vista `v_contadores_completos`
- Contadores dados de alta con conceptos asignados
- Clientes asignados a ubicaciones

### 11.2 Bloquea Fase 3

La Fase 3 (Motor de Facturación) requiere:
- Tabla `lecturas` con lecturas confirmadas
- Lecturas marcadas como `facturada = false` pendientes de facturar

---

## 12. Notas para Agentes de IA

### Orden de Implementación Recomendado

1. **Primero:** Migraciones de base de datos
2. **Segundo:** Utilidades de parseo (Excel, fechas, números)
3. **Tercero:** Hooks de datos
4. **Cuarto:** Componentes de importación (flujo de subida)
5. **Quinto:** Componentes de validación
6. **Sexto:** Lógica de confirmación
7. **Séptimo:** Historial y configuración de alertas

### Consideraciones de UX

- Mostrar progreso durante el procesamiento de archivos grandes
- Permitir cancelar importación en cualquier momento
- Mantener el estado si el usuario navega a otra página
- Mostrar mensajes claros de error con sugerencias de solución
- Destacar visualmente las filas con problemas

### Manejo de Archivos Excel

```javascript
// Usar xlsx en modo browser
import * as XLSX from 'xlsx';

async function readExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Obtener rango de datos
  const range = XLSX.utils.decode_range(sheet['!ref']);
  
  // Leer como JSON con headers
  const data = XLSX.utils.sheet_to_json(sheet, { 
    header: 1,
    raw: false, // Convertir fechas a string
    defval: '' // Valor por defecto para celdas vacías
  });
  
  return {
    headers: data[0],
    rows: data.slice(1),
    totalRows: data.length - 1
  };
}
```

### Formato de Alertas en JSONB

```javascript
// Estructura de alertas en importaciones_detalle.alertas
[
  {
    "tipo": "consumo_alto",
    "severidad": "warning",
    "mensaje": "El consumo (5.2 m³) es 3.1 veces la media (1.68 m³)",
    "bloquea": false,
    "datos": {
      "consumo": 5.2,
      "media": 1.68,
      "factor": 3.1
    }
  },
  {
    "tipo": "cliente_bloqueado",
    "severidad": "warning",
    "mensaje": "Cliente bloqueado: Impago desde marzo 2025",
    "bloquea": false
  }
]
```

---

## Anexo: Ejemplo de Excel de Entrada

| Portal | Vivienda | Nº Contador | Concepto | Lectura Actual | Fecha Lectura |
|--------|----------|-------------|----------|----------------|---------------|
| 2 | 5ºH | 22804168 | ACS | 21,2080 | 23/11/2025 |
| 2 | 5ºH | 22804168 | CAL | 1520,50 | 23/11/2025 |
| 2 | 3ºA | 22804201 | ACS | 45,8900 | 23/11/2025 |
| 2 | 3ºA | 22804201 | CAL | 890,25 | 23/11/2025 |
| 3 | 1ºB | 22804215 | ACS | 12,3400 | 23/11/2025 |
| ... | ... | ... | ... | ... | ... |

---

*Fin del PRD Fase 2*
