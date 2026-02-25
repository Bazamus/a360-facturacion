# Plan de Desarrollo — Gestión de Precios

## Contexto

El cliente solicita una página centralizada para gestionar las actualizaciones periódicas de precios en las comunidades. Actualmente los precios se gestionan individualmente desde la pestaña "Precios" de cada comunidad. El nuevo desarrollo debe permitir:

1. **Actualización por Factor de Conversión** (conceptos energéticos CAL/CLI): Basado en índices P6 NATURGY o MIBGAS publicados mensualmente
2. **Actualización por IPC** (conceptos fijos TF/ACS): Porcentaje anual del gobierno
3. **Descuentos puntuales**: Con fecha de expiración, reflejados en factura PDF
4. **Aplicación masiva**: A una, varias o todas las comunidades
5. **Retroactividad**: Opción de recalcular facturas en borrador/emitidas no enviadas

**Riesgo:** MEDIO — Crea objetos nuevos en DB y añade integración con generación de facturas existente. La página nueva es independiente (bajo riesgo) pero la integración con descuentos en facturación requiere cuidado.

---

## Estado actual del sistema

- **Tabla `precios`**: precio_unitario DECIMAL(10,4), vigencia con fecha_inicio/fecha_fin, activo flag
- **Tabla `facturas_lineas`**: YA tiene `descuento_porcentaje` DECIMAL(5,2) y `descuento_importe` DECIMAL(10,2) — pero nunca se populan (siempre 0)
- **`calcularSubtotal()`** en `calculos.js`: YA acepta `descuentoPorcentaje` como 3er parámetro — pero siempre se llama con 0
- **PDF factura** (`generarPDF.js`): 5 columnas (Concepto, Lecturas, Consumo, Precio, Importe) — NO muestra descuento
- **Hook `useCreatePrecio()`**: Cierra precio anterior y crea nuevo (por comunidad+concepto individual)
- **Tabla `comunidades`**: NO tiene campo para indicar referencia energética (P6/MIBGAS)
- **Última migración**: 046

---

## Fase 1 — Migración 047 (Base de datos)

**Archivo:** `supabase/migrations/047_gestion_precios.sql`

### 1.1 Nueva columna en `comunidades`
```sql
ALTER TABLE comunidades
  ADD COLUMN referencia_energia TEXT DEFAULT NULL
    CHECK (referencia_energia IN ('P6_NATURGY', 'MIBGAS'));
```

### 1.2 Tabla `precios_referencias_mercado`
Almacena valores mensuales de P6 NATURGY y MIBGAS introducidos por el usuario.
```sql
CREATE TABLE precios_referencias_mercado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('P6_NATURGY', 'MIBGAS')),
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  valor DECIMAL(12,6) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tipo, anio, mes)
);
```

### 1.3 Tabla `descuentos`
Descuentos puntuales por concepto+comunidad con fecha de expiración.
```sql
CREATE TABLE descuentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comunidad_id UUID NOT NULL REFERENCES comunidades(id) ON DELETE CASCADE,
  concepto_id UUID NOT NULL REFERENCES conceptos(id) ON DELETE CASCADE,
  porcentaje DECIMAL(5,2) NOT NULL CHECK (porcentaje > 0 AND porcentaje <= 100),
  motivo TEXT,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  aplicado BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 1.4 Tabla `historial_ajustes_precios`
Log de auditoría de todas las operaciones de ajuste masivo.
```sql
CREATE TABLE historial_ajustes_precios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_ajuste TEXT NOT NULL CHECK (tipo_ajuste IN ('factor_conversion', 'ipc', 'manual', 'descuento')),
  referencia TEXT,
  valor_anterior DECIMAL(12,6),
  valor_actual DECIMAL(12,6),
  factor DECIMAL(12,8),
  porcentaje_ipc DECIMAL(5,2),
  conceptos_aplicados TEXT[],
  comunidades_aplicadas UUID[],
  total_precios_actualizados INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 1.5 RPC `aplicar_factor_precios`
Aplica factor de conversión/IPC de forma atómica a múltiples comunidades+conceptos:
- Cierra precios actuales (fecha_fin + activo=false)
- Inserta nuevos precios con precio_unitario * factor
- Registra en historial_ajustes_precios
- Retorna JSON `{ precios_actualizados: N }`

### 1.6 RPC `get_preview_actualizacion_precios`
Preview antes de confirmar: muestra tabla comunidad→concepto→precio_actual→precio_nuevo + count de facturas afectadas.

### 1.7 RPC `recalcular_facturas_con_nuevos_precios`
Actualiza líneas de facturas en estado borrador/emitida NO enviadas:
- **Nota**: "No enviada" se determina con `NOT EXISTS (SELECT 1 FROM envios_email ee WHERE ee.factura_id = f.id AND ee.estado = 'enviado')` — no hay campo directo en tabla `facturas`
- Reemplaza precio_unitario con precio vigente actual
- Recalcula subtotal respetando descuento_porcentaje
- Recalcula totales de factura (base + IVA + total)
- Marca pdf_generado=false para forzar regeneración

### 1.8 RLS + GRANTs
Policies estándar del proyecto para las 3 nuevas tablas + GRANT EXECUTE en las 3 RPCs.

---

## Fase 2 — Hooks (Capa de datos)

**Archivo nuevo:** `src/hooks/useGestionPrecios.js`

| Hook | Tipo | Descripción |
|------|------|-------------|
| `useReferenciasEnergia(tipo, anio)` | Query | Valores mensuales P6/MIBGAS |
| `useDescuentosVigentes(comunidadId?)` | Query | Descuentos activos no expirados |
| `useHistorialAjustes(options)` | Query | Log de ajustes con paginación |
| `useRegistrarReferencia()` | Mutation | Upsert valor mensual en referencias |
| `useAplicarFactorPrecios()` | Mutation | Llama RPC aplicar_factor_precios |
| `usePreviewActualizacion()` | Mutation | Llama RPC get_preview |
| `useRecalcularFacturas()` | Mutation | Llama RPC recalcular_facturas |
| `useCrearDescuento()` | Mutation | INSERT en descuentos |
| `useEliminarDescuento()` | Mutation | DELETE descuento (solo si aplicado=false) |

**Exportar desde** `src/hooks/index.js`

---

## Fase 3 — Página y Componentes

### 3.1 Página principal: `src/pages/GestionPrecios.jsx`

Layout con **4 pestañas**:

```
[Factor Energético]  [IPC Conceptos Fijos]  [Descuentos]  [Historial]
```

### Tab 1 — Factor Energético (CAL, CLI)
- Dos tarjetas lado a lado: **P6 NATURGY** y **MIBGAS**
- Cada tarjeta: inputs "Precio mes anterior" / "Precio mes actual"
- Factor auto-calculado mostrado en grande: `actual / anterior`
- Nota contextual: P6 = "mes en curso", MIBGAS = "promedio mes anterior"
- Selector multi-comunidad (con filtro por referencia_energia)
- Checkboxes de conceptos: CAL, CLI
- Botón "Vista previa" → modal con tabla old→new
- Toggle: "Aplicar también a facturas borrador/emitidas no enviadas"
- Botón "Aplicar" (habilitado solo tras preview)

### Tab 2 — IPC Conceptos Fijos (TF, ACS)
- Input porcentaje IPC (ej: 3%)
- Factor auto-calculado: `1 + IPC/100`
- Mismo selector multi-comunidad
- Checkboxes: TF, ACS
- Mismo flujo preview → confirmar

### Tab 3 — Descuentos
- Tabla de descuentos activos (DataTable con filtros)
- Botón "Nuevo Descuento" → modal:
  - Selector comunidad(es)
  - Selector concepto
  - Porcentaje descuento
  - Fecha expiración
  - Motivo (texto libre)
- Acciones: eliminar descuento pendiente

### Tab 4 — Historial
- DataTable con historial_ajustes_precios
- Columnas: Fecha, Tipo, Factor/IPC, Conceptos, Nº Comunidades, Precios actualizados

### 3.2 Componentes nuevos

```
src/features/precios/
  components/
    FactorEnergeticoTab.jsx
    IPCFijosTab.jsx
    DescuentosTab.jsx
    HistorialAjustesTab.jsx
    ComunidadMultiSelector.jsx    -- Multi-select con búsqueda y "Seleccionar todas"
    PreviewPreciosModal.jsx       -- Modal confirmación con tabla old→new
    DescuentoForm.jsx             -- Modal formulario nuevo descuento
    FactorCalculator.jsx          -- Tarjeta calculadora P6/MIBGAS
```

---

## Fase 4 — Router y Sidebar

### 4.1 `src/App.jsx`
```jsx
<Route path="gestion-precios" element={<GestionPreciosPage />} />
```

### 4.2 `src/components/layout/Sidebar.jsx`
Añadir en sección OPERACIONES, después de Facturación:
```javascript
{ name: 'Gestión Precios', href: '/gestion-precios', icon: TrendingUp }
```

---

## Fase 5 — PDF Factura (columna Dto)

**Archivo:** `src/features/facturacion/pdf/generarPDF.js`

**Estrategia**: Condicional — solo mostrar columna Dto si alguna línea tiene descuento > 0.

```javascript
const hasDescuentos = lineasOrdenadas.some(l => (l.descuento_porcentaje || 0) > 0)

if (hasDescuentos) {
  // 6 columnas: Concepto(42) | Lecturas(40) | Consumo(30) | Precio(26) | Dto(16) | Importe(26) = 180mm
  // Dto muestra: "25%" o vacío
} else {
  // 5 columnas actuales sin cambios (zero-risk para facturas existentes)
}
```

---

## Fase 6 — Integración con Generación de Facturas

### 6.1 `src/pages/GenerarFacturas.jsx`
Al construir líneas de factura, buscar descuento vigente:
```javascript
const descuento = descuentosVigentes?.find(
  d => d.concepto_id === lectura.concepto_id && d.comunidad_id === comunidadId && !d.aplicado
)
// Pasar descuento.porcentaje a calcularSubtotal()
// Popular descuento_porcentaje y descuento_importe en facturas_lineas
// Marcar descuento como aplicado=true tras crear factura
```

### 6.2 `src/features/facturacion/utils/calculos.js`
`generarDatosFactura()` — añadir parámetro opcional `descuentos` para buscar descuentos aplicables al generar datos.

---

## Fase 7 — Mejoras en PreciosTab existente

**Archivo:** `src/features/comunidades/PreciosTab.jsx`

- Mostrar descuentos activos para esa comunidad (filas destacadas en amarillo)
- Añadir selector de `referencia_energia` (P6/MIBGAS/Sin configurar)
- Link "Ir a Gestión de Precios" para operaciones masivas

---

## Archivos a crear/modificar

| Archivo | Acción | Fase |
|---------|--------|------|
| `supabase/migrations/047_gestion_precios.sql` | CREAR | 1 |
| `src/hooks/useGestionPrecios.js` | CREAR | 2 |
| `src/hooks/index.js` | MODIFICAR — exports | 2 |
| `src/pages/GestionPrecios.jsx` | CREAR | 3 |
| `src/features/precios/components/*.jsx` | CREAR (8 archivos) | 3 |
| `src/App.jsx` | MODIFICAR — nueva ruta | 4 |
| `src/components/layout/Sidebar.jsx` | MODIFICAR — nuevo item menú | 4 |
| `src/features/facturacion/pdf/generarPDF.js` | MODIFICAR — columna Dto condicional | 5 |
| `src/pages/GenerarFacturas.jsx` | MODIFICAR — integrar descuentos | 6 |
| `src/features/facturacion/utils/calculos.js` | MODIFICAR — parámetro descuentos | 6 |
| `src/features/comunidades/PreciosTab.jsx` | MODIFICAR — descuentos + referencia | 7 |

---

## Orden de ejecución

```
Fase 1 → Migración 047 (deploy en Supabase)
   ↓
Fase 2 → Hooks useGestionPrecios.js
   ↓
Fase 3 → Página GestionPrecios + componentes (4 tabs)
   ↓
Fase 4 → Router + Sidebar
   ↓
Fase 5 → PDF columna Dto (condicional)
   ↓
Fase 6 → Integración descuentos en GenerarFacturas
   ↓
Fase 7 → Mejoras PreciosTab existente
   ↓
npm run build → verificar 0 errores → commit
```

---

## Casos borde y seguridad

1. **Comunidad sin referencia_energia**: Warning en selector, se puede seleccionar pero se sugiere configurarla primero
2. **Comunidad sin precio activo para un concepto**: Se omite silenciosamente, preview muestra "Sin precio" para esa combinación
3. **División por cero en factor**: Validación UI — precio_anterior debe ser > 0, botón Aplicar deshabilitado
4. **Descuento en concepto sin precio**: Form valida que exista precio activo antes de permitir crear descuento
5. **Doble aplicación**: RPCs atómicas en transacción, historial de auditoría
6. **Facturas ya enviadas**: RPC `recalcular_facturas` filtra por `email_enviado = false`
7. **Regeneración PDF**: Al recalcular, `pdf_generado = false` fuerza regeneración con nuevos importes
8. **Concurrencia**: SECURITY DEFINER + transacción PostgreSQL serializa actualizaciones

---

## Verificación

1. Navegar a `/gestion-precios` — página carga con 4 pestañas
2. Tab Factor: Introducir P6 enero=0.14185, febrero=0.14421 → Factor = 1.01663
3. Seleccionar comunidad + CAL → Preview muestra precios old→new correctos
4. Aplicar → Verificar en pestaña Precios de la comunidad que el precio se actualizó
5. Tab IPC: Introducir 3% → Factor = 1.03, aplicar a TF → Verificar nuevo precio
6. Tab Descuentos: Crear descuento 25% ACS en una comunidad → Verificar en tabla
7. Generar factura para comunidad con descuento → Línea muestra descuento_porcentaje=25
8. Descargar PDF → Columna "Dto" visible con "25%"
9. Factura sin descuento → PDF mantiene 5 columnas sin "Dto"
10. Historial: Verificar que todas las operaciones aparecen registradas
11. `npm run build` → 0 errores
