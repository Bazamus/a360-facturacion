# Plan: Mejora de Busquedas Multi-Palabra en Toda la Aplicacion

## Contexto

Las busquedas en la aplicacion fallan cuando el usuario escribe terminos que abarcan multiples columnas de la base de datos. Ejemplo: buscar "jose alberto alarcon" no encuentra al cliente porque `nombre="JOSE ALBERTO"` y `apellidos="ALARCON LAMA"` son columnas separadas, y el filtro `ilike.%jose alberto alarcon%` busca esa cadena exacta en cada campo individualmente.

**Problema raiz:** Se usa `.or()` con `.ilike()` tratando todo el texto de busqueda como una sola cadena. Esto afecta a **9 puntos de busqueda** en 6 hooks.

## Solucion: Word-Split + AND-of-OR (Sin migracion de BD)

**Idea clave:** Supabase encadena `.or()` con logica AND. Si dividimos la busqueda en palabras y aplicamos un `.or()` por palabra, obtenemos exactamente el comportamiento deseado:

```
Busqueda: "jose alarcon"
→ query.or('nombre.ilike.%jose%,apellidos.ilike.%jose%,...')  // palabra 1
       .or('nombre.ilike.%alarcon%,apellidos.ilike.%alarcon%,...')  // palabra 2

SQL resultante:
(nombre ILIKE '%jose%' OR apellidos ILIKE '%jose%' OR ...)
AND
(nombre ILIKE '%alarcon%' OR apellidos ILIKE '%alarcon%' OR ...)
```

Ademas, se normaliza el input del usuario (quitar acentos, minusculas) usando `normalizeForSearch()` que ya existe.

## Cambios a Realizar

### 1. Crear `src/utils/buildSearchFilter.js` (archivo nuevo)

Funcion `applySearchFilters(query, searchTerm, columns)` que:
- Normaliza el termino (sin acentos, minusculas) via `normalizeForSearch`
- Divide en palabras por espacios
- Escapa caracteres especiales SQL (`%`, `_`)
- Por cada palabra, aplica `.or()` con todas las columnas
- Retorna el query modificado

### 2. Actualizar 6 hooks (9 puntos de cambio)

Reemplazar cada `.or(\`campo1.ilike.%${search}%,...\`)` por `applySearchFilters(query, search, [campos])`:

| Hook | Lineas | Columnas |
|------|--------|----------|
| `src/hooks/useClientes.js` | 71-73, 138-139, 357-358 | nombre, apellidos, nif, codigo_cliente, email |
| `src/hooks/useFacturas.js` | 38, 118 | numero_completo, cliente_nombre, cliente_nif |
| `src/hooks/useContadores.js` | ~56 | numero_serie, ubicacion_nombre, comunidad_nombre, agrupacion_nombre, cliente_nombre, concepto_codigo |
| `src/hooks/useEnvios.js` | ~143 | email_destino, numero_completo, cliente_nombre |
| `src/hooks/useComentarios.js` | ~77 | contenido, entidad_nombre |
| `src/hooks/useComunidades.js` | ~25 | nombre, codigo |

### 3. Sin cambios en BD

Los datos se almacenan en mayusculas sin acentos ("ALARCON", no "ALARCÓN"), por lo que `ilike` + normalizacion client-side es suficiente. No se necesita `unaccent` en PostgreSQL.

## Ejemplos de Comportamiento Mejorado

| Busqueda | Antes | Despues |
|----------|-------|---------|
| "jose alberto alarcon" | No encuentra (cadena completa no existe en ningun campo) | Encuentra (jose+alberto en nombre, alarcon en apellidos) |
| "alarcon jose" | No encuentra | Encuentra (orden no importa) |
| "alarcón" (con acento) | No encuentra | Encuentra (acento eliminado client-side) |
| "77658014D" | Encuentra | Encuentra (sin cambio, busqueda de 1 palabra) |

## Verificacion

1. Buscar en Clientes: "jose alberto alarcon" → debe mostrar JOSE ALBERTO ALARCON LAMA
2. Buscar en Clientes: "alarcon jose" → mismo resultado
3. Buscar en Facturas con nombre parcial multi-palabra
4. Buscar con acentos en el input
5. Buscar con una sola palabra → comportamiento identico al actual
6. Campo vacio → sin filtro (igual que ahora)
