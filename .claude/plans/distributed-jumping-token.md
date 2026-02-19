# Plan: Dashboard de Comunicaciones — Funcionalidad Plena

## Contexto

El módulo de Comunicaciones (CRM Fase 1) está implementado con componentes React que muestran datos de Supabase pero carecen de interactividad. El Dashboard tiene KPIs estáticos (siempre últimos 30 días), un gráfico de barras sin filtro temporal, y una lista de mensajes sin búsqueda, paginación ni acciones de click. El objetivo es elevar el Dashboard a nivel producción siguiendo el orden de `SESION_SIGUIENTE.md`.

---

## Estado actual de los archivos clave

| Archivo | Líneas | Limitación actual |
|---------|--------|-------------------|
| `src/features/comunicaciones/ComunicacionesDashboard.jsx` | 208 | Sin filtro fechas, sin gráfico temporal, sin indicador refresh |
| `src/features/comunicaciones/UltimosMensajes.jsx` | 164 | Sin búsqueda, sin paginación, sin click actions |
| `src/hooks/useComunicaciones.js` | 155 | `useComunicaciones()` sin paginación/search. `useComunicacionesStats()` acepta fechas pero no se usan |

---

## Alcance de este plan

**Solo el Dashboard de Comunicaciones** (punto 1 de 3 en SESION_SIGUIENTE.md):
- Filtro de rango de fechas en KPIs y gráficos
- Gráfico temporal de tendencia (mensajes por día)
- Búsqueda de mensajes (contenido, nombre, teléfono)
- Paginación en lista de mensajes
- Deep link a conversación en Chatwoot al hacer click en mensaje
- Navegación a ficha de cliente al hacer click en nombre/teléfono
- Indicador visual de auto-refresh

**No se toca en este plan:** PlantillasList, CanalesConfig (se abordan en pasos siguientes).

---

## Archivos a modificar

```
src/hooks/useComunicaciones.js          ← Extender hooks existentes
src/features/comunicaciones/ComunicacionesDashboard.jsx  ← Añadir filtros y gráfico temporal
src/features/comunicaciones/UltimosMensajes.jsx          ← Añadir búsqueda, paginación y clicks
```

**No se crean archivos nuevos** — todo se resuelve extendiendo los existentes.

---

## Cambios detallados

### 1. `src/hooks/useComunicaciones.js`

**Extender `useComunicaciones()`** — añadir soporte a `search`, `page`, `pageSize` y retornar `count`:
```js
// Firma nueva:
useComunicaciones({ canal, estado, clienteId, search, page = 0, pageSize = 10 } = {})
// Retorna: { data, count, isLoading, isFetching, ... }

// Implementación:
// - Usar supabase.select('*', { count: 'exact' })
// - Usar .range(page * pageSize, (page + 1) * pageSize - 1) para paginación
// - Usar .or('contenido.ilike.%s%,remitente_nombre.ilike.%s%,remitente_telefono.ilike.%s%') para search
// - Añadir search, page, pageSize al queryKey
```

**Añadir `useComunicacionesTrend(fechaInicio, fechaFin)`** — nuevo hook para el gráfico temporal:
```js
// Consulta la tabla 'comunicaciones' (no la vista) con solo created_at y canal
// Agregación por día client-side con useMemo
// queryKey: ['comunicaciones-trend', fechaInicio, fechaFin]
// Retorna: [{ fecha: '2026-01-15', total: 5, entrantes: 3, salientes: 2 }, ...]
```

**Añadir `useDeletePlantilla()`** — soft delete para uso en PlantillasList (preparar ya):
```js
// update({ activa: false }) en plantillas_mensaje
// Invalida ['plantillas-mensaje']
```

---

### 2. `src/features/comunicaciones/ComunicacionesDashboard.jsx`

#### 2a. Estado del componente (nuevo)
```js
// Presets de fecha
const PRESETS = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '3 meses', days: 90 },
]
const [preset, setPreset] = useState(30)           // preset activo (días)
const [chartMode, setChartMode] = useState('trend') // 'trend' | 'canal'

// Fechas derivadas del preset (no estado separado — evitar desincronización)
const fechaFin = format(new Date(), 'yyyy-MM-dd')
const fechaInicio = format(subDays(new Date(), preset), 'yyyy-MM-dd')
```

#### 2b. Selector de fechas (componente inline)
- 3 botones pill-style: "7 días", "30 días", "3 meses"
- Estilos: activo = `bg-primary-600 text-white`, inactivo = `bg-gray-100 text-gray-600`
- Usar clases `rounded-full px-3 py-1 text-xs font-medium transition-colors`

#### 2c. KPIs — pasar fechas al hook
```js
// Antes:
const { data: stats } = useComunicacionesStats()
// Después:
const { data: stats, isFetching: fetchingStats } = useComunicacionesStats(fechaInicio, fechaFin)
```

#### 2d. Gráfico temporal (nuevo, reemplaza al de barras como vista principal)
```js
const { data: trend } = useComunicacionesTrend(fechaInicio, fechaFin)
// Usar AreaChart de Recharts con:
// - Area "entrantes" color azul, opacidad 0.3
// - Area "salientes" color verde, opacidad 0.3
// - XAxis con fechas formateadas (dd/MM)
// - Toggle entre vista 'trend' (AreaChart) y 'canal' (BarChart existente)
```

Toggle buttons encima del gráfico:
```jsx
<div className="flex gap-1">
  <button onClick={() => setChartMode('trend')}>Por día</button>
  <button onClick={() => setChartMode('canal')}>Por canal</button>
</div>
```

#### 2e. Indicador de auto-refresh
```jsx
// En el header, junto al botón "Abrir Chatwoot":
{isFetching && (
  <span className="flex items-center gap-1 text-xs text-gray-400">
    <RefreshCw className="h-3 w-3 animate-spin" />
    Actualizando...
  </span>
)}
// También un punto verde pulsante cuando hay datos frescos
```

#### 2f. URL de Chatwoot para deep links
```js
const CHATWOOT_URL = 'https://crm-chatwoot-a360.vcheqs.easypanel.host'
const CHATWOOT_ACCOUNT_ID = 1
// Se pasa a UltimosMensajes como prop chatwootUrl
```

---

### 3. `src/features/comunicaciones/UltimosMensajes.jsx`

#### 3a. El componente pasa a gestionar su propio estado de búsqueda y paginación

El Dashboard pasa props mínimas (`chatwootUrl`). `UltimosMensajes` gestiona internamente `search`, `page`.

```js
// Props:
// chatwootUrl: string (para construir deep links)
// (El resto de estado es interno al componente)

// State interno:
const [search, setSearch] = useState('')
const [page, setPage] = useState(0)
const PAGE_SIZE = 10

// Hook con paginación y búsqueda:
const { data: resultado, isFetching } = useComunicaciones({
  estado: 'recibido',
  search: debouncedSearch,
  page,
  pageSize: PAGE_SIZE,
})
const mensajes = resultado?.data ?? []
const totalCount = resultado?.count ?? 0
```

#### 3b. Debounce de búsqueda (sin librería extra)
```js
// Patrón simple con useEffect + setTimeout:
const [debouncedSearch, setDebouncedSearch] = useState('')
useEffect(() => {
  const t = setTimeout(() => {
    setDebouncedSearch(search)
    setPage(0) // Reset página al buscar
  }, 300)
  return () => clearTimeout(t)
}, [search])
```
Patrón alineado con `react-best-practices` (narrow effect dependencies, stable subscriptions).

#### 3c. SearchInput en el header de la card
```jsx
// Usar componente existente: import { SearchInput } from '@/components/ui'
<div className="flex items-center justify-between mb-4">
  <h3>Mensajes pendientes...</h3>
  <div className="flex items-center gap-2">
    {isFetching && <RefreshCw className="h-3 w-3 animate-spin text-gray-400" />}
    <Badge variant="warning">{totalCount}</Badge>
  </div>
</div>
<SearchInput
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  placeholder="Buscar por nombre, teléfono o contenido..."
  className="mb-4"
/>
```

#### 3d. Click en mensaje → Deep link Chatwoot
```jsx
<div
  key={msg.id}
  className="... cursor-pointer"
  onClick={() => {
    if (msg.chatwoot_conversation_id) {
      window.open(
        `${chatwootUrl}/app/accounts/1/conversations/${msg.chatwoot_conversation_id}`,
        '_blank'
      )
    } else {
      window.open(chatwootUrl, '_blank')
    }
  }}
>
```
Indicador visual: añadir `ExternalLink` icon pequeño en la esquina superior derecha del item.

#### 3e. Click en cliente → navegar a ficha
```jsx
import { useNavigate } from 'react-router-dom'
const navigate = useNavigate()

// En el área del nombre de cliente:
{msg.cliente_id && (
  <button
    className="text-[10px] text-primary-600 hover:underline flex items-center gap-1"
    onClick={(e) => {
      e.stopPropagation() // No abrir Chatwoot
      navigate(`/clientes/${msg.cliente_id}`)
    }}
  >
    <User className="h-3 w-3" />
    {msg.cliente_nombre}
  </button>
)}
```

#### 3f. Paginación
```jsx
// Usar componente existente: import { Pagination } from '@/components/ui'
// Añadir al final de la card:
{totalCount > PAGE_SIZE && (
  <div className="mt-4 pt-4 border-t border-gray-100">
    <Pagination
      currentPage={page + 1}  // Pagination es 1-based
      totalPages={Math.ceil(totalCount / PAGE_SIZE)}
      onPageChange={(p) => setPage(p - 1)}
    />
  </div>
)}
```

---

## Patrón visual (frontend-design)

Consistente con el design system existente:
- **Colores**: palette primary/gray/amber ya establecida, no introducir nuevos
- **Preset buttons**: pill-style compacto `rounded-full` — diferenciado del Button estándar
- **AreaChart**: `strokeWidth={2}`, `fillOpacity={0.15}` — sutil y limpio
- **Hover messages**: `cursor-pointer` + `hover:bg-primary-50` (en lugar del gris actual) para comunicar clicabilidad
- **Refresh indicator**: `animate-spin` en `RefreshCw` — usa `isFetching` (no `isLoading`) para mostrar solo en refetches en background, no en la carga inicial

---

## Flujo de datos resultante

```
ComunicacionesDashboard
  ├── state: preset (7|30|90 días) → fechaInicio/fechaFin derivados
  ├── state: chartMode ('trend' | 'canal')
  ├── useComunicacionesStats(fechaInicio, fechaFin)  → KPIs con rango
  ├── useComunicacionesTrend(fechaInicio, fechaFin)  → datos gráfico temporal
  ├── DatePresetSelector (inline, sin fichero propio)
  ├── AreaChart / BarChart (toggle)
  └── UltimosMensajes(chatwootUrl)
        ├── state: search, debouncedSearch, page (internos)
        ├── useComunicaciones({estado, search, page, pageSize})
        ├── SearchInput
        ├── Lista items (click → Chatwoot, cliente → navigate)
        └── Pagination
```

---

## Verificación

1. `npm run dev` — app arranca sin errores
2. Dashboard carga con preset "30 días" por defecto
3. Click en "7 días" → KPIs y gráfico se actualizan
4. Gráfico toggle "Por día" muestra AreaChart temporal
5. Escribir en búsqueda → lista filtra con debounce (300ms)
6. Click en mensaje con `chatwoot_conversation_id` → abre Chatwoot en nueva pestaña en la conversación correcta
7. Click en nombre de cliente → navega a `/clientes/{id}`
8. Paginación funciona (siguiente/anterior página)
9. `isFetching = true` → spinner visible en header
10. `npm run build` — compila sin errores ni warnings

---

## Orden de implementación recomendado

1. `useComunicaciones.js` — extender hooks (base de todo lo demás)
2. `UltimosMensajes.jsx` — búsqueda + paginación + clicks (más independiente)
3. `ComunicacionesDashboard.jsx` — filtro fechas + gráfico temporal + indicador refresh
