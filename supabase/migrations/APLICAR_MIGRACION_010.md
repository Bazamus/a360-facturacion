# Cómo Aplicar la Migración 010: Permitir Facturas Manuales

## Descripción

Esta migración modifica el esquema de la tabla `facturas` para permitir la creación de facturas manuales sin un contador asociado.

### Cambios realizados:

1. **Campo `contador_id`**: Ahora es nullable (permite NULL)
2. **Campo `ubicacion_id`**: Ahora es nullable (permite NULL)
3. **Vista `v_facturas_resumen`**: Actualizada para usar LEFT JOIN con contadores
4. **Índice parcial**: Creado para facturas con contador

## Aplicar en Desarrollo Local

### Opción 1: Usando Supabase CLI

```bash
# Desde la raíz del proyecto
npx supabase migration up
```

### Opción 2: Usando SQL directo

```bash
# Conectarse a la base de datos local
npx supabase db reset

# O aplicar solo esta migración
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/migrations/010_permitir_facturas_manuales.sql
```

### Opción 3: Desde Supabase Studio

1. Abrir Supabase Studio en http://localhost:54323
2. Ir a SQL Editor
3. Copiar el contenido de `010_permitir_facturas_manuales.sql`
4. Ejecutar

## Aplicar en Producción

### Importante: Verificar primero

Antes de aplicar en producción, verificar que no hay facturas con `contador_id` NULL que rompan integridad referencial:

```sql
SELECT COUNT(*) FROM facturas WHERE contador_id IS NULL;
SELECT COUNT(*) FROM facturas WHERE ubicacion_id IS NULL;
```

### Aplicación en Producción

```bash
# Usando Supabase CLI
npx supabase db push

# O desde el Dashboard de Supabase:
# 1. Ir a SQL Editor
# 2. Copiar contenido de 010_permitir_facturas_manuales.sql
# 3. Ejecutar
```

## Verificación Post-Migración

Ejecutar estas queries para verificar que todo está correcto:

```sql
-- Verificar que los campos son nullable
SELECT 
  column_name, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'facturas' 
  AND column_name IN ('contador_id', 'ubicacion_id');

-- Debería retornar:
-- contador_id  | YES
-- ubicacion_id | YES

-- Verificar que la vista funciona con facturas sin contador
SELECT COUNT(*) FROM v_facturas_resumen;

-- Verificar el índice parcial
SELECT indexname FROM pg_indexes 
WHERE tablename = 'facturas' 
  AND indexname = 'idx_facturas_contador';
```

## Rollback

Si es necesario revertir los cambios (solo si no hay facturas manuales):

```bash
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/migrations/010_permitir_facturas_manuales_rollback.sql
```

## Impacto en el Código

Después de aplicar esta migración, la aplicación podrá:

- ✅ Crear facturas manuales sin contador asociado
- ✅ Crear facturas manuales sin ubicación específica
- ✅ Ver facturas manuales en la vista `v_facturas_resumen`
- ✅ Filtrar y buscar facturas manuales normalmente

## Notas Importantes

- Las facturas manuales tendrán `contador_id = NULL`
- El campo `contador_numero_serie` en la vista será NULL para facturas manuales
- Las facturas normales (con contador) seguirán funcionando igual
- Esta migración es **compatible hacia atrás** con el código existente
