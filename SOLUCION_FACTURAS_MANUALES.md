# Solución: Error al Guardar Facturas Manuales

## 📋 Problema Identificado

**Error:** `null value in column "contador_id" of relation "facturas" violates not-null constraint`

**Causa Raíz:**
El campo `contador_id` en la tabla `facturas` está definido como `NOT NULL`, pero las facturas manuales no están asociadas a un contador específico, por lo que intentan guardar `NULL` en este campo.

## 🔍 Análisis del Sistema

### Estado Actual (ANTES)

```sql
CREATE TABLE facturas (
  ...
  contador_id UUID NOT NULL REFERENCES contadores(id),  -- ❌ No permite NULL
  ubicacion_id UUID NOT NULL REFERENCES ubicaciones(id), -- ❌ No permite NULL
  ...
);
```

### Facturas Normales vs Facturas Manuales

| Característica | Facturas Normales | Facturas Manuales |
|---------------|-------------------|-------------------|
| Origen | Lecturas de contadores | Entrada manual |
| contador_id | Requerido (ID del contador) | NULL (sin contador) |
| ubicacion_id | Requerido (ubicación del contador) | Opcional |
| Lecturas | Incluye datos de lecturas | Sin datos de lecturas |
| Uso | Facturación automática | Ajustes, cargos especiales |

## ✅ Solución Implementada

### 1. Migración de Base de Datos

**Archivo:** `supabase/migrations/010_permitir_facturas_manuales.sql`

**Cambios:**
- ✅ `contador_id` ahora es **nullable** (permite NULL)
- ✅ `ubicacion_id` ahora es **nullable** (permite NULL)
- ✅ Vista `v_facturas_resumen` actualizada con LEFT JOIN
- ✅ Índice parcial creado para optimizar búsquedas

```sql
-- Hacer campos nullable
ALTER TABLE facturas 
  ALTER COLUMN contador_id DROP NOT NULL;

ALTER TABLE facturas 
  ALTER COLUMN ubicacion_id DROP NOT NULL;

-- Actualizar vista para soportar NULL
DROP VIEW IF EXISTS v_facturas_resumen;
CREATE VIEW v_facturas_resumen AS
SELECT ...
FROM facturas f
JOIN comunidades com ON com.id = f.comunidad_id
LEFT JOIN contadores cont ON cont.id = f.contador_id;  -- ✅ LEFT JOIN
```

### 2. Ajustes en el Código Frontend

**Archivo:** `src/pages/FacturaDetalle.jsx`

**Cambio:** Verificar que `contador_numero_serie` existe antes de mostrarlo

```jsx
// ANTES ❌
{!linea.es_termino_fijo && (
  <span className="font-mono">{linea.contador_numero_serie}</span>
)}

// DESPUÉS ✅
{!linea.es_termino_fijo && linea.contador_numero_serie && (
  <span className="font-mono">{linea.contador_numero_serie}</span>
)}
```

**Archivo:** `src/features/facturacion/pdf/generarPDF.js`

**Estado:** ✅ Ya verificaba correctamente (sin cambios necesarios)

```javascript
if (!linea.es_termino_fijo && linea.contador_numero_serie) {
  concepto += `\nContador: ${linea.contador_numero_serie}`
}
```

## 🚀 Cómo Aplicar la Solución

### Opción 1: Script Automático (Recomendado)

**Windows (PowerShell):**
```powershell
.\aplicar-migracion-facturas-manuales.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x aplicar-migracion-facturas-manuales.sh
./aplicar-migracion-facturas-manuales.sh
```

### Opción 2: Manualmente con Supabase CLI

```bash
# Aplicar todas las migraciones pendientes
npx supabase migration up

# O resetear la base de datos (⚠️ borra datos)
npx supabase db reset
```

### Opción 3: Desde Supabase Studio

1. Abrir http://localhost:54323
2. Ir a **SQL Editor**
3. Copiar el contenido de `supabase/migrations/010_permitir_facturas_manuales.sql`
4. Ejecutar

## 🧪 Verificación

Después de aplicar la migración, verificar:

### 1. Verificar en Base de Datos

```sql
-- Los campos deben ser nullable
SELECT 
  column_name, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'facturas' 
  AND column_name IN ('contador_id', 'ubicacion_id');

-- Resultado esperado:
-- contador_id  | YES
-- ubicacion_id | YES
```

### 2. Probar Creación de Factura Manual

1. Ir a `/facturacion/facturas/nueva`
2. Seleccionar comunidad y cliente
3. Definir periodo de facturación
4. Agregar líneas de factura
5. Clic en **"Guardar Borrador"**
6. ✅ Debe guardar sin errores

### 3. Verificar en Vista de Facturas

```sql
-- Debe retornar facturas manuales con contador_id NULL
SELECT 
  id,
  numero_completo,
  contador_id,
  contador_numero_serie,
  total
FROM v_facturas_resumen
WHERE contador_id IS NULL;
```

## 📊 Impacto de los Cambios

### Base de Datos
- ✅ Compatible con datos existentes (facturas con contador siguen funcionando)
- ✅ Permite nuevas facturas sin contador
- ✅ Sin pérdida de datos
- ✅ Reversible (con rollback)

### Aplicación Frontend
- ✅ Facturas normales funcionan igual
- ✅ Facturas manuales se guardan correctamente
- ✅ Visualización correcta en listados y detalles
- ✅ PDFs se generan correctamente (con o sin contador)

### Performance
- ✅ Índice parcial optimiza búsquedas de facturas con contador
- ✅ Sin impacto negativo en queries existentes

## 🔄 Rollback (Si es necesario)

**⚠️ Solo ejecutar si NO hay facturas manuales creadas**

```bash
psql -h localhost -p 54322 -U postgres -d postgres \
  -f supabase/migrations/010_permitir_facturas_manuales_rollback.sql
```

## 📝 Notas Adicionales

### Identificar Facturas Manuales

```sql
-- Facturas manuales
SELECT * FROM facturas WHERE contador_id IS NULL;

-- Facturas normales (con contador)
SELECT * FROM facturas WHERE contador_id IS NOT NULL;
```

### Casos de Uso de Facturas Manuales

1. **Ajustes y correcciones**: Cargos adicionales no asociados a lecturas
2. **Servicios especiales**: Mantenimientos, reparaciones
3. **Cargos fijos especiales**: Penalizaciones, bonificaciones
4. **Facturación sin contador**: Ubicaciones temporales sin medidor

## ✅ Checklist de Aplicación

- [ ] Hacer backup de la base de datos (opcional pero recomendado)
- [ ] Verificar que Supabase está corriendo
- [ ] Aplicar migración 010
- [ ] Verificar campos nullable en base de datos
- [ ] Probar crear factura manual en desarrollo
- [ ] Verificar que facturas existentes siguen funcionando
- [ ] Verificar generación de PDFs
- [ ] Guardar cambios en Git
- [ ] Aplicar en producción (cuando esté listo)

## 🐛 Troubleshooting

### Error: "migration already applied"
```bash
# La migración ya está aplicada, verificar con:
npx supabase migration list
```

### Error: "cannot connect to database"
```bash
# Reiniciar Supabase
npx supabase stop
npx supabase start
```

### Error al crear factura manual persiste
1. Verificar que la migración se aplicó correctamente
2. Revisar logs del navegador (Console)
3. Verificar que el código de `FacturaNueva.jsx` está actualizado
4. Verificar conexión con base de datos

## 📞 Soporte

Si encuentras algún problema:
1. Revisar logs de Supabase: `npx supabase logs`
2. Verificar estado: `npx supabase status`
3. Consultar archivo: `supabase/migrations/APLICAR_MIGRACION_010.md`
