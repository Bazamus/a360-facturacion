# Plantillas de Mensaje — Análisis y Propuesta

## Contexto

La página `/comunicaciones/plantillas` (PlantillasList.jsx) permite crear, editar y copiar plantillas de mensaje con variables `{{nombre}}`, `{{importe}}`, etc. Sin embargo, **es código muerto funcional**: las plantillas no tienen ninguna integración con Chatwoot, Evolution API ni ningún mecanismo de envío. El único uso posible es copiar manualmente el texto al portapapeles y pegarlo en Chatwoot.

**Problema**: La página no aporta valor real al usuario. No se puede enviar un mensaje desde ella, no se integra con el Dashboard de Comunicaciones, y el workflow manual (copiar → cambiar a Chatwoot → pegar → reemplazar variables a mano) es poco práctico.

---

## Propuesta: Reconvertir en "Respuestas Rápidas" integradas en el Dashboard

En lugar de una página aislada, las plantillas se convierten en una herramienta de **respuesta rápida** accesible desde las conversaciones del Dashboard. Se mantiene la gestión CRUD en su página actual pero se añade utilidad real al integrar las plantillas donde se necesitan: junto a cada conversación.

### Cambio 1 — Botón "Responder con plantilla" en ConversacionesList

Añadir un botón en cada tarjeta de conversación (junto a "Abrir Chatwoot", "Ver ficha", "Archivar"):

```
[📋 Plantilla]  →  abre selector de plantillas
```

### Cambio 2 — Modal "Usar Plantilla"

Al pulsar el botón se abre un modal con:

1. **Selector de plantilla** — Lista filtrable de plantillas activas (filtro por canal de la conversación)
2. **Vista previa** — Muestra el contenido de la plantilla seleccionada
3. **Formulario de variables** — Campos auto-generados para cada `{{variable}}` detectada
   - Variables como `{{nombre}}`, `{{telefono}}` se auto-rellenan con datos del cliente vinculado (si existe)
   - El usuario puede editar/completar las que falten
4. **Texto resultante** — Preview en tiempo real con variables sustituidas
5. **Acciones**:
   - **"Copiar y abrir Chatwoot"** — Copia el texto procesado al portapapeles y abre la conversación en Chatwoot en nueva pestaña
   - **"Solo copiar"** — Copia al portapapeles sin navegar

### Cambio 3 — Auto-relleno de variables con datos del cliente

Mapeo automático de variables a campos del cliente vinculado a la conversación:

| Variable plantilla | Campo cliente (Supabase) |
|---|---|
| `{{nombre}}` | `nombre` + `apellidos` |
| `{{telefono}}` | `telefono` |
| `{{email}}` | `email` |
| `{{direccion}}` | `direccion` |
| `{{localidad}}` | `localidad` |
| `{{comunidad}}` | `comunidad_nombre` (de ubicaciones) |
| `{{numero_factura}}` | Se deja vacío (usuario completa) |
| `{{importe}}` | Se deja vacío (usuario completa) |
| `{{fecha}}` | Fecha actual formateada |
| `{{hora}}` | Se deja vacío |
| `{{tecnico}}` | Se deja vacío |

### Cambio 4 — Mejorar página PlantillasList

Mejoras menores a la página existente para darle más contexto:
- Cambiar subtítulo a: "Gestiona las plantillas de respuesta rápida. Úsalas desde el Dashboard de Comunicaciones."
- Añadir enlace "Ir al Dashboard" junto al botón "Nueva plantilla"
- Sin otros cambios estructurales — el CRUD existente funciona bien

---

## Archivos a modificar

| Archivo | Acción | Descripción |
|---|---|---|
| `src/features/comunicaciones/ConversacionesList.jsx` | **MODIFICAR** | Añadir botón "Plantilla" + importar modal |
| `src/features/comunicaciones/UsarPlantillaModal.jsx` | **CREAR** | Modal: selector plantilla → variables → preview → copiar |
| `src/features/comunicaciones/PlantillasList.jsx` | **MODIFICAR** | Actualizar subtítulo y añadir enlace al Dashboard |
| `src/hooks/useComunicaciones.js` | SIN CAMBIOS | Ya tiene `usePlantillas()` que reutilizamos |

---

## Plan de implementación

1. **UsarPlantillaModal.jsx** — Crear modal con selector, formulario de variables, preview y botón copiar+abrir Chatwoot
2. **ConversacionesList.jsx** — Añadir botón "Plantilla" en acciones de cada tarjeta, importar y usar el modal
3. **PlantillasList.jsx** — Actualizar textos descriptivos
4. **Verificación** — Build + test completo del flujo

---

## Verificación

1. En Dashboard → conversación con cliente vinculado → botón "Plantilla" abre modal
2. Modal muestra lista de plantillas filtradas por canal de la conversación
3. Al seleccionar plantilla "Factura disponible", campos `{{nombre}}` se auto-rellena con nombre del cliente
4. Campos sin mapeo (`{{numero_factura}}`, `{{importe}}`) aparecen vacíos para completar
5. Preview muestra texto final con variables sustituidas
6. "Copiar y abrir Chatwoot" copia al portapapeles y abre conversación en nueva pestaña
7. En conversación sin cliente vinculado, variables quedan vacías pero editables
8. `npm run build` compila sin errores
