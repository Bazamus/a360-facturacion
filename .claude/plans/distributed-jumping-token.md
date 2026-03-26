# Plan: Paginación Tabs Comunidad + Exportación Excel Completa

## Contexto

El usuario reporta dos problemas relacionados:

1. **Detalle Comunidad — Tabs con datos truncados**: Las pestañas Clientes, Contadores y Facturas en la página de detalle de comunidad solo muestran los primeros 50 registros (o 500 para facturas). Los contadores de la cabecera de cada tab (`numClientes`, `numContadores`, `numFacturas`) usan `data.length` que refleja solo los datos cargados, no el total real. La pestaña Viviendas (Ubicaciones) no muestra ningún count en el tab header.

2. **Exportación Excel incompleta**: Las páginas Clientes y Facturas exportan solo los datos de la página visible (50 registros). Contadores funciona correctamente (usa `exportarEntidad` que fetchea todo). Se necesita opción "Exportar todo" que descargue TODOS los registros.

---

## Tarea 1: Tabs Comunidad — Mostrar todos los registros + counts reales

### Problema actual

En `src/pages/Comunidades.jsx` (ComunidadDetail, líneas 359-508):

```js
// Línea 365-368: Hooks sin pageSize → default 50
const { data: clientesResult } = useClientes({ comunidadId: id })        // default pageSize=50
const { data: contadoresResult } = useContadores({ comunidadId: id })    // default pageSize=50
const { data: facturasComunidad } = useFacturas({ comunidadId: id, limit: 500 })

// Línea 375-377: Counts basados en .length (max 50/500)
const numClientes = clientesComunidad?.length || 0
const numContadores = contadoresComunidad?.length || 0
const numFacturas = Array.isArray(facturasComunidad) ? facturasComunidad.length : 0
```

Los tabs ya implementan paginación LOCAL con PAGE_SIZE=50, pero solo sobre los 50 registros recibidos.

### Solución

**Enfoque: Subir `pageSize` a 5000 en las llamadas de los tabs + usar `count` del hook para headers.**

Las comunidades normalmente tienen cientos de clientes/contadores, no decenas de miles. Pasar `pageSize: 5000` es suficiente y evita complejidad de paginación server-side en los tabs embebidos. Los tabs internos ya tienen paginación local funcional.

**Alternativa descartada:** Paginación server-side en cada tab — añade complejidad innecesaria cuando los datasets por comunidad son manejables (<5000).

### Cambios

#### 1.1 `src/pages/Comunidades.jsx` — ComunidadDetail (líneas 365-377)

Pasar `pageSize: 5000` a los hooks de clientes y contadores. Usar `count` del hook para los tab headers en lugar de `.length`:

```js
// ANTES
const { data: clientesResult } = useClientes({ comunidadId: id })
const clientesComunidad = clientesResult?.data || []
const { data: contadoresResult } = useContadores({ comunidadId: id })
const contadoresComunidad = contadoresResult?.data || []
const { data: facturasComunidad } = useFacturas({ comunidadId: id, limit: 500 })

const numClientes = clientesComunidad?.length || 0
const numContadores = contadoresComunidad?.length || 0
const numFacturas = Array.isArray(facturasComunidad) ? facturasComunidad.length : 0

// DESPUÉS
const { data: clientesResult } = useClientes({ comunidadId: id, pageSize: 5000 })
const clientesComunidad = clientesResult?.data || []
const { data: contadoresResult } = useContadores({ comunidadId: id, pageSize: 5000 })
const contadoresComunidad = contadoresResult?.data || []
const { data: facturasComunidad } = useFacturas({ comunidadId: id, limit: 5000, withCount: true })

const numClientes = clientesResult?.count ?? clientesComunidad?.length ?? 0
const numContadores = contadoresResult?.count ?? contadoresComunidad?.length ?? 0
const numFacturas = facturasComunidad?.total ?? (Array.isArray(facturasComunidad) ? facturasComunidad.length : facturasComunidad?.data?.length ?? 0)
```

#### 1.2 Pestaña Viviendas — Añadir count al tab header

El hook `useUbicacionesByComunidad` (`src/hooks/useComunidades.js:221`) retorna un array sin count. Añadir count al tab header usando `ubicacionesComunidad.length` (ya fetcheado en línea 372):

```js
// Línea 458-460: Añadir count
<TabsTrigger value="ubicaciones">
  {comunidad.nombre_ubicacion}s{ubicacionesComunidad?.length > 0 ? ` (${ubicacionesComunidad.length})` : ''}
</TabsTrigger>
```

#### 1.3 `src/features/comunidades/ComunidadClientesTab.jsx`

Cambiar hook call para recibir todos los registros (el padre ya los tiene, pero el tab hace su propia call):

```js
// Línea 14: Añadir pageSize
const { data: clientesResult, isLoading } = useClientes({ comunidadId: comunidad.id, pageSize: 5000 })
```

#### 1.4 `src/features/comunidades/ComunidadContadoresTab.jsx`

Mismo cambio:

```js
// Línea 13: Añadir pageSize
const { data: contadoresResult, isLoading } = useContadores({ comunidadId: comunidad.id, pageSize: 5000 })
```

#### 1.5 `src/features/facturacion/components/FacturasEmbedded.jsx`

Subir limit de 500 a 5000:

```js
// Línea 142: Cambiar limit
limit: 5000
```

---

## Tarea 2: Exportación Excel — Opción "Exportar Todo"

### Problema actual

| Página | Estado actual | Problema |
|--------|--------------|----------|
| **Contadores** (`Contadores.jsx:96`) | `exportarEntidad('contadores')` → `getContadoresParaExport()` | OK — fetchea todo |
| **Clientes** (`Clientes.jsx:114`) | `exportar.mutateAsync({ clientes: clientes })` | BUG — `clientes` = solo página actual (50) |
| **Facturas** (`Facturas.jsx:300`) | `exportar.mutateAsync({ facturas })` | BUG — `facturas` = solo página actual (50) |

### Solución

Para **Clientes** y **Facturas**: crear funciones `fetchAllClientes()` y `fetchAllFacturas()` que obtienen todos los registros en lotes de 1000 (patrón `fetchAllPendienteIds` de `useEnvios.js:80-108`), y añadir opción "Exportar todo" en los modales de exportación.

### Cambios

#### 2.1 `src/hooks/useClientes.js` — Nueva función `fetchAllClientes`

Función async (no hook) que fetchea todos los clientes con los mismos filtros aplicados, en lotes de 1000:

```js
export async function fetchAllClientes(filters = {}) {
  const { search, tipo, estadoId, comunidadId } = filters
  const all = []
  let from = 0
  const batchSize = 1000

  // Pre-filtrar por comunidad (mismo patrón que useClientes)
  let clienteIdsFiltro = null
  if (comunidadId) {
    // ... same community filter logic as useClientes ...
  }

  while (true) {
    let query = supabase
      .from('clientes')
      .select(`*, estado:estados_cliente(*), ubicaciones_clientes(...)`)
      .order('apellidos').order('nombre')
      .range(from, from + batchSize - 1)

    if (search) query = query.or(...)
    if (tipo) query = query.eq('tipo', tipo)
    if (estadoId) query = query.eq('estado_id', estadoId)
    if (clienteIdsFiltro) query = query.in('id', clienteIdsFiltro)

    const { data, error } = await query
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < batchSize) break
    from += batchSize
  }
  return all
}
```

#### 2.2 `src/hooks/useFacturas.js` — Nueva función `fetchAllFacturas`

Misma idea, para facturas:

```js
export async function fetchAllFacturas(filters = {}) {
  const { comunidadId, estado, clienteId, search, fechaDesde, fechaHasta, sortBy, sortDirection } = filters
  const all = []
  let from = 0
  const batchSize = 1000

  while (true) {
    let query = supabase
      .from('v_facturas_resumen')
      .select('*')
      .order(sortBy || 'fecha_factura', { ascending: sortDirection === 'asc' })
      .range(from, from + batchSize - 1)

    // Apply same filters as useFacturas
    if (comunidadId) query = query.eq('comunidad_id', comunidadId)
    if (estado) query = query.eq('estado', estado)
    if (clienteId) query = query.eq('cliente_id', clienteId)
    if (search) query = query.or(...)
    if (fechaDesde) query = query.gte('fecha_factura', fechaDesde)
    if (fechaHasta) query = query.lte('fecha_factura', fechaHasta)

    const { data, error } = await query
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < batchSize) break
    from += batchSize
  }
  return all
}
```

#### 2.3 `src/pages/Clientes.jsx` — Exportar con todos los datos

Modificar `handleExportar` para fetchear todos los clientes antes de exportar:

```js
import { fetchAllClientes } from '@/hooks/useClientes'

const handleExportar = async (config) => {
  try {
    setIsExporting(true)
    // Fetchear TODOS los clientes con filtros actuales
    const todosClientes = await fetchAllClientes({ search, tipo, estadoId, comunidadId })

    const result = await exportar.mutateAsync({
      clientes: todosClientes,
      config
    })
    // ...
  }
}
```

Actualizar texto del botón para indicar que exporta todo:
```js
// En el botón/modal — mostrar totalCount del hook
`Exportar ${totalCount} clientes`
```

#### 2.4 `src/pages/Facturas.jsx` — Exportar con todos los datos

Mismo patrón:

```js
import { fetchAllFacturas } from '@/hooks/useFacturas'

const handleExportarExcel = async (config) => {
  try {
    setModalExport(false)
    setProgresoExportacion({ current: 0, total: 100, message: 'Obteniendo facturas...' })

    // Fetchear TODAS las facturas con filtros actuales
    const todasFacturas = await fetchAllFacturas({
      comunidadId: filters.comunidadId,
      estado: filters.estado,
      clienteId: filters.clienteId,
      search: filters.search,
      fechaDesde: filters.fechaDesde,
      fechaHasta: filters.fechaHasta,
      sortBy, sortDirection
    })

    await exportar.mutateAsync({
      facturas: todasFacturas,
      config,
      onProgress: (progreso) => setProgresoExportacion(progreso)
    })
    // ...
  }
}
```

#### 2.5 Modales de exportación — Mostrar count total

En `ModalExportarClientes` y `ModalExportarFacturas`: mostrar el número total de registros que se van a exportar en el botón de confirmación.

Pasar prop `totalCount` al modal desde la página padre (viene del hook con `count: 'exact'`).

---

## Archivos a modificar

| # | Archivo | Cambios |
|---|---------|---------|
| 1 | `src/pages/Comunidades.jsx` | pageSize:5000 en hooks, counts reales en tab headers, count viviendas |
| 2 | `src/features/comunidades/ComunidadClientesTab.jsx` | pageSize:5000 en useClientes |
| 3 | `src/features/comunidades/ComunidadContadoresTab.jsx` | pageSize:5000 en useContadores |
| 4 | `src/features/facturacion/components/FacturasEmbedded.jsx` | limit:5000 |
| 5 | `src/hooks/useClientes.js` | Nueva función `fetchAllClientes()` |
| 6 | `src/hooks/useFacturas.js` | Nueva función `fetchAllFacturas()` |
| 7 | `src/pages/Clientes.jsx` | Usar `fetchAllClientes` en export handler |
| 8 | `src/pages/Facturas.jsx` | Usar `fetchAllFacturas` en export handler |

---

## Orden de implementación

| # | Tarea |
|---|-------|
| 1 | Comunidades.jsx — pageSize + counts reales en tab headers |
| 2 | ComunidadClientesTab — pageSize:5000 |
| 3 | ComunidadContadoresTab — pageSize:5000 |
| 4 | FacturasEmbedded — limit:5000 |
| 5 | useClientes.js — fetchAllClientes() |
| 6 | useFacturas.js — fetchAllFacturas() |
| 7 | Clientes.jsx — export con fetchAllClientes |
| 8 | Facturas.jsx — export con fetchAllFacturas |
| 9 | Build + verificación |

---

## Verificación

1. **Tab Clientes**: Ir a detalle comunidad con >50 clientes → tab header muestra count real (ej: "Clientes (234)"), tabla muestra todos paginados localmente
2. **Tab Contadores**: Igual → "Contadores (156)", todos visibles con paginación local
3. **Tab Facturas**: Igual → "Facturas (1200)", todas visibles
4. **Tab Viviendas**: Muestra count en header → "Viviendas (89)"
5. **Export Clientes**: Ir a /clientes → Exportar Excel → archivo contiene TODOS los clientes (no solo 50)
6. **Export Facturas**: Ir a /facturacion/facturas → Exportar Excel → archivo contiene TODAS las facturas
7. **Export Contadores**: Verificar sigue funcionando (ya exporta todo)
8. **Build**: `npm run build` sin errores
