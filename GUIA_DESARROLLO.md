# Guía de Desarrollo - Sistema de Facturación A360

> Documento de referencia para continuación del desarrollo por agente IA

## 📋 Resumen del Proyecto

**Sistema de Facturación A360** - Aplicación web para gestión de facturación de comunidades de propietarios, con funcionalidades de:
- Gestión de comunidades, clientes y contadores
- Importación de lecturas desde Excel
- Generación de facturas
- Envío de facturas por email
- Gestión de remesas bancarias (SEPA)
- Reportes y estadísticas

**Stack Tecnológico:**
- Frontend: React 18 + Vite
- UI: Tailwind CSS + componentes propios
- Base de datos: Supabase (PostgreSQL)
- Estado: React Query (TanStack Query)
- Autenticación: Supabase Auth
- Deploy: Vercel

---

## 🗂️ Estructura del Proyecto

```
src/
├── components/
│   ├── layout/          # Header, Sidebar, MainLayout
│   └── ui/              # Componentes reutilizables (Button, Card, Modal, etc.)
├── features/
│   ├── auth/            # Contexto y protección de rutas
│   ├── clientes/        # Formulario de clientes
│   ├── comunidades/     # Tabs: Agrupaciones, Ubicaciones, Precios
│   ├── contadores/      # Formulario y conceptos de contadores
│   ├── envios/          # Componentes de envío de facturas
│   ├── facturacion/     # Generación de facturas y PDF
│   ├── importacion/     # ⭐ Sistema de importación/exportación masiva
│   ├── lecturas/        # ⭐ Importación de lecturas desde Excel
│   ├── remesas/         # Gestión de remesas SEPA
│   └── reportes/        # Gráficos y métricas
├── hooks/               # Hooks globales (useClientes, useComunidades, etc.)
├── lib/                 # Utilidades, validaciones, supabase client
└── pages/               # Páginas de la aplicación
```

---

## ⭐ Funcionalidades Clave Implementadas

### 1. Importación de Lecturas (Multi-concepto)
**Ruta:** `/lecturas/importar`

**Formato de plantilla:**
```
Fecha | Nº Contador | Portal | Vivienda | ACS | CAL | CLI | TF ...
```

- Columnas de conceptos dinámicas según BD
- Detección automática de columnas
- Validación antes de procesar
- Alertas de consumo alto (comparación con histórico)
- Corrección manual de lecturas individuales

**Archivos principales:**
- `src/pages/ImportarLecturas.jsx`
- `src/features/lecturas/utils/excelParser.js`
- `src/features/lecturas/utils/lecturaProcessor.js`
- `src/features/lecturas/utils/alertDetector.js`

### 2. Importación/Exportación de Datos Maestros
**Ruta:** `/configuracion/importar-exportar`

**Entidades soportadas:**
- Comunidades
- Clientes  
- Contadores (con columnas de conceptos dinámicas)
- **Comunidad Completa** (multi-hoja)

**Archivos principales:**
- `src/features/importacion/components/ImportExportPanel.jsx`
- `src/features/importacion/utils/excelGenerator.js`
- `src/features/importacion/utils/importProcessor.js`
- `src/features/importacion/hooks/useImportExport.js`

### 3. Comunidad Completa (Multi-Hoja) - RECIÉN IMPLEMENTADO
**Plantilla Excel con 4 hojas:**
1. **Datos Generales** - Info básica de la comunidad
2. **Portales** - Agrupaciones/bloques
3. **Viviendas** - Ubicaciones dentro de portales
4. **Precios** - Precios por concepto

**Funciones implementadas:**
- `generarPlantillaComunidadCompleta()` - Genera plantilla vacía
- `leerExcelMultiHoja()` - Lee archivo multi-hoja
- `procesarPortales()` - Procesa agrupaciones
- `procesarViviendas()` - Procesa ubicaciones
- `procesarPrecios()` - Procesa precios
- `procesarComunidadCompleta()` - Orquesta todo el proceso
- `exportarComunidadCompleta()` - Exporta comunidad existente

---

## 🗄️ Modelo de Datos (Supabase)

### Tablas principales:
```sql
comunidades (id, codigo, nombre, cif, direccion, ...)
agrupaciones (id, comunidad_id, nombre, descripcion, orden, activa)
ubicaciones (id, agrupacion_id, nombre, descripcion, referencia_catastral, orden, activa)
clientes (id, nif, nombre, apellidos, tipo, email, iban, ...)
ubicaciones_clientes (id, ubicacion_id, cliente_id, fecha_inicio, fecha_fin, es_actual)
contadores (id, ubicacion_id, numero_serie, marca, modelo, ...)
conceptos (id, codigo, nombre, unidad_medida, activo)
contadores_conceptos (id, contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, ...)
precios (id, comunidad_id, concepto_id, precio_unitario, fecha_inicio, fecha_fin, activo)
lecturas (id, importacion_id, contador_id, concepto_id, valor, fecha_lectura, ...)
importaciones (id, comunidad_id, archivo, fecha, estado, ...)
facturas (id, cliente_id, numero, fecha, total, ...)
```

### Relaciones clave:
- Comunidad → Agrupaciones → Ubicaciones
- Ubicación → Contadores → Contadores_Conceptos → Conceptos
- Ubicación → Ubicaciones_Clientes → Clientes
- Comunidad → Precios → Conceptos

---

## 🔧 Patrones y Convenciones

### Resolución de entidades relacionadas
En `fieldResolvers.js`:
- **Usar `.maybeSingle()`** en lugar de `.single()` para evitar error 406
- **Búsqueda flexible:** Primero exacta, luego parcial con `ilike`

```javascript
// Ejemplo correcto
const { data } = await supabase
  .from('comunidades')
  .select('id, nombre, codigo')
  .eq('codigo', codigoNorm)
  .maybeSingle() // NO usar .single()
```

### Manejo de fechas Excel
En `importProcessor.js`, función `parseFecha()`:
- Excel guarda fechas como números seriales
- Usar `raw: true` en `sheet_to_json` para obtener números
- Convertir serial a fecha: `new Date(1899, 11, 30 + serial)`

```javascript
function parseFecha(valor) {
  if (typeof valor === 'number' && valor > 0) {
    const excelEpoch = new Date(1899, 11, 30)
    const date = new Date(excelEpoch.getTime() + valor * 24 * 60 * 60 * 1000)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  // ... otros formatos
}
```

### Conversión segura a string
Usar `toStr()` para valores que pueden venir como número de Excel:

```javascript
function toStr(valor) {
  if (valor === null || valor === undefined) return ''
  return String(valor).trim()
}
```

### Componentes UI
Importar desde `@/components/ui`:
- Button, Card, Badge, Modal, Tabs, Input, Select, etc.

---

## ⚠️ Errores Conocidos y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| `406 (Not Acceptable)` | Uso de `.single()` cuando no hay resultados | Usar `.maybeSingle()` |
| `h.codigo_postal.trim is not a function` | Campo numérico de Excel | Usar `toStr(valor)` |
| React error #31 `[object Date]` | `cellDates: true` crea objetos Date | Quitar `cellDates: true` de `XLSX.read()` |
| Fechas inválidas en import | `raw: false` en `sheet_to_json` | Usar `raw: true` |
| `readExcel` not exported | Nombre de función diferente | Crear alias en exports |
| **Conceptos no se asignan a contadores** | `.single()` en verificación de asignación (línea 471) | **Cambiar a `.maybeSingle()`** |
| **Lectura inicial 0 no se graba** | `row[colIndex] \|\| null` trata `0` como falsy | Usar `row[colIndex] !== undefined ? row[colIndex] : null` |

---

## ✅ Mejoras Implementadas (23 Diciembre 2024)

### 1. Validación de unicidad en importaciones
**Problema resuelto:** Archivos Excel con filas duplicadas causaban intentos de inserción duplicada en BD.

**Solución implementada:**
- ✅ Añadido `Set` en `procesarPortales()` para trackear portales ya procesados en la misma importación
- ✅ Añadido `Set` en `procesarViviendas()` para trackear viviendas ya procesadas en la misma importación
- ✅ Validación antes de insert/update: si un portal/vivienda ya fue procesado en el archivo, se salta con error descriptivo
- ✅ Mensajes de error específicos: "Portal/Vivienda ya fue procesado en este archivo (fila duplicada)"

**Archivos modificados:**
- `src/features/importacion/utils/importProcessor.js` (líneas 596-821)

### 2. Mejora de UI para errores por hoja
**Problema resuelto:** Los errores de importación multi-hoja se mostraban como un número, sin detalle de qué falló.

**Solución implementada:**
- ✅ Componente `ResultadoSeccion` refactorizado con estado expandible
- ✅ Click en "X errores" expande/colapsa el detalle de errores con número de fila
- ✅ Muestra hasta 10 errores detallados, con indicador si hay más
- ✅ Errores globales se muestran separados con icono de alerta
- ✅ Mejor organización visual: bordes, colores diferenciados por tipo (éxito/error)

**Archivos modificados:**
- `src/features/importacion/components/ImportExportPanel.jsx` (líneas 370-426, 520-568)

### 3. Logging y feedback mejorado
- ✅ Mensajes de progreso específicos por etapa (comunidad, portales, viviendas, precios)
- ✅ Diferenciación clara entre errores de validación y errores de BD
- ✅ Scroll automático en lista de errores cuando hay más de 10

---

## 🚀 Próximas Tareas Sugeridas

### Alta prioridad:
1. **Testing de Comunidad Completa** - Probar importación/exportación con datos reales
2. ~~**Validación de unicidad**~~ ✅ **COMPLETADO** (23/12/2024)
3. ~~**Manejo de errores mejorado**~~ ✅ **COMPLETADO** (23/12/2024)

### Media prioridad:
4. **Importación incremental** - Permitir importar solo algunas hojas
5. **Preview de datos** - Mostrar vista previa de cada hoja antes de importar
6. **Exportación selectiva** - Elegir qué hojas exportar

### Mejoras futuras:
7. **Validación de precios** - Verificar que no haya gaps en fechas
8. **Histórico de importaciones** - Registrar cada importación multi-hoja
9. **Rollback/Transacciones** - Implementar rollback automático si alguna hoja falla completamente

---

## 📁 Archivos Pendientes de Commit

Los siguientes archivos tienen cambios no commiteados (cambios de sesiones anteriores):

```
src/features/lecturas/...     # Refactorización de importación de lecturas
src/pages/ImportarLecturas.jsx
src/pages/ValidarLecturas.jsx
src/lib/utils.js
package.json, package-lock.json
```

---

## 🔐 Variables de Entorno

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

---

## 📌 Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Lint
npm run lint

# Deploy (automático en push a main)
git push origin main
```

---

## 📞 Notas Importantes

1. **Windows Shell:** No usar `&&` para encadenar comandos, usar `;` o comandos separados
2. **Git commits:** Usar múltiples `-m` para mensajes multilínea (no heredoc)
3. **Supabase:** Las políticas RLS están activas, verificar permisos si hay errores 403
4. **Vercel:** Deploy automático en push a `main`, revisar logs si falla

---

## ✅ Resultados de Pruebas (23 Diciembre 2024)

### Plan de Pruebas Ejecutado

Todos los tests definidos en `scripts/README_PRUEBAS.md` fueron ejecutados con éxito.

| Test | Archivo | Resultado | Notas |
|------|---------|-----------|-------|
| **TEST_01** | Comunidad Completa EXITOSA | ✅ PASS | 1 comunidad, 3 portales, 8 viviendas, 3 precios creados |
| **TEST_02** | Comunidad con DUPLICADOS | ✅ PASS | Detectó 2 duplicados correctamente (1 portal, 1 vivienda) |
| **TEST_03** | Comunidad con ERRORES | ✅ PASS | Detectó 12 errores en todas las hojas |
| **TEST_04** | Clientes EXITOSOS | ✅ PASS | 5 clientes creados con ubicaciones asignadas |
| **TEST_05** | Contadores EXITOSOS | ✅ PASS | 5 contadores creados, 12 conceptos asignados |
| **TEST_06** | Actualización TEST01 | ✅ PASS | Comunidad actualizada, portal B añadido, precio histórico |

### Verificación SQL en Supabase

```sql
-- Resultados del resumen general
SELECT entidad, total FROM (
  SELECT 'Comunidades' as entidad, COUNT(*) as total FROM comunidades WHERE codigo LIKE 'TEST%'
  UNION ALL
  SELECT 'Portales', COUNT(*) FROM agrupaciones a JOIN comunidades c ON a.comunidad_id = c.id WHERE c.codigo LIKE 'TEST%'
  UNION ALL
  SELECT 'Viviendas', COUNT(*) FROM ubicaciones u JOIN agrupaciones a ON u.agrupacion_id = a.id JOIN comunidades c ON a.comunidad_id = c.id WHERE c.codigo LIKE 'TEST%'
  UNION ALL
  SELECT 'Clientes', COUNT(*) FROM clientes WHERE nif IN ('12345678A','23456789B','34567890C','45678901D','56789012E')
  UNION ALL
  SELECT 'Contadores', COUNT(*) FROM contadores WHERE numero_serie LIKE 'CNT000%'
) t;
```

| Entidad | Cantidad |
|---------|----------|
| Comunidades | 2 (TEST01, TEST02) |
| Portales | 8 |
| Viviendas | 13 |
| Clientes | 5 |
| Contadores | 5 |

### Bugs Corregidos Durante Testing

| Bug | Archivo | Fix |
|-----|---------|-----|
| Lectura inicial `0` no se grababa | `excelGenerator.js` | Cambiar `\|\| null` por check explícito |
| Export `COLUMN_CONFIG` faltante | `excelGenerator.js` | Añadir export named |
| Validación se detenía en error de comunidad | `importProcessor.js` | Continuar validando todas las hojas |

### Checklist de Validación

#### Funcionalidad Básica
- [x] Importación exitosa de comunidad completa
- [x] Importación exitosa de clientes
- [x] Importación exitosa de contadores con conceptos
- [x] Exportación de comunidad completa

#### Validaciones
- [x] Detección de portal duplicado
- [x] Detección de vivienda duplicada
- [x] Validación de campos obligatorios
- [x] Validación de entidades relacionadas inexistentes
- [x] Validación de formatos (fechas, precios)

#### UI y UX
- [x] Errores se muestran expandibles por hoja
- [x] Mensajes de error son claros y específicos con número de fila
- [x] Progreso se muestra durante importación
- [x] Resumen final muestra contadores correctos
- [x] Errores globales se muestran separados

#### Actualización
- [x] Actualización de comunidad existente
- [x] Creación de nuevos portales en comunidad existente
- [x] Precios anteriores quedan históricos (fecha_fin se actualiza)

#### Integridad de Datos
- [x] No se crean duplicados en BD
- [x] Contadores de created/updated son correctos
- [x] Relaciones (comunidad→portal→vivienda) son correctas
- [x] Conceptos se asignan correctamente a contadores

### Datos de Prueba en BD

⚠️ **NOTA:** Los datos de prueba (TEST01, TEST02, CNT000*, clientes de prueba) permanecen en la BD para validación continua durante el desarrollo. Ejecutar script de limpieza en `scripts/README_PRUEBAS.md` antes de pasar a producción.

---

*Última actualización: 23 de Diciembre 2024*
*Estado: Testing completado - Sistema de importación/exportación validado*
