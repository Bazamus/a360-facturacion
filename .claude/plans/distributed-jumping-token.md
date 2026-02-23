# Configuración de Canales — Análisis y Propuesta

## Contexto

La página `/comunicaciones/configuracion` (CanalesConfig.jsx) permite activar/desactivar canales y guardar parámetros de configuración (URLs, tokens, IDs) en la tabla `canales_configuracion`. Sin embargo, **es código muerto funcional**: los valores se guardan en DB pero ningún otro componente los lee.

**Evidencia del problema:**
- `ComunicacionesDashboard.jsx:60` → `const CHATWOOT_URL = 'https://crm-chatwoot-a360.vcheqs.easypanel.host'` (hardcoded)
- `src/lib/resend.js:13-23` → `EMPRESA_CONFIG` con `from_email` hardcoded
- `UsarPlantillaModal.jsx:59` → `const CHATWOOT_ACCOUNT_ID = 1` (hardcoded)
- Quick links (Chatwoot, Evolution API Manager, n8n) → URLs hardcoded en el propio componente
- Campos como `evolution_instance`, `chatwoot_inbox_id`, `chatwoot_website_token` → nunca consumidos

**Conclusión**: La página almacena datos que nadie lee. Los valores que realmente se usan están hardcoded en otros archivos.

---

## Propuesta: Convertir en fuente centralizada de configuración real

Mantener la página pero darle utilidad real: que los valores guardados aquí sean **la fuente única de verdad** para las URLs y parámetros que actualmente están hardcoded en el código.

### Cambio 1 — Simplificar campos de configuración

Reducir los campos a solo los que el frontend realmente consume:

| Canal | Campos útiles | Justificación |
|---|---|---|
| **WhatsApp** | `chatwoot_url`, `chatwoot_account_id` | Usados en Dashboard, ConversacionesList, UsarPlantillaModal |
| **Email** | `from_email`, `from_name` | Usados en resend.js (actualmente hardcoded) |
| **Chat** | *(sin campos propios)* | Usa misma URL de Chatwoot |
| **Teléfono** | *(sin campos propios)* | Canal manual |
| **SMS** | *(eliminar)* | No existe integración ni planes concretos |

Eliminar campos que pertenecen a la infraestructura del servidor (no al frontend):
- ~~`evolution_api_url`~~ → configuración de servidor, no del SPA
- ~~`evolution_instance`~~ → ídem
- ~~`chatwoot_inbox_id`~~ → pertenece a Chatwoot, no a nuestro frontend
- ~~`chatwoot_website_token`~~ → ídem

### Cambio 2 — Añadir sección de "Enlaces externos"

Convertir los quick links hardcoded en campos configurables dentro del canal WhatsApp:

```
Enlaces a herramientas externas:
  - URL Chatwoot:           https://crm-chatwoot-a360.vcheqs.easypanel.host
  - Evolution API Manager:  https://api-wa.a360se.com/manager
  - n8n Workflows:          https://n8n.a360se.com
```

Estos se guardan en un campo JSON `enlaces_externos` dentro de la configuración general (no por canal). Los quick links actuales se renderizan dinámicamente desde este campo.

### Cambio 3 — Hook `useComunicacionesConfig()` centralizado

Crear un hook que lee la configuración y la expone de forma tipada:

```js
// Nuevo en useComunicaciones.js
export function useComunicacionesConfig() {
  const { data: canales } = useCanalesConfig()

  return useMemo(() => {
    const whatsapp = canales?.find(c => c.canal === 'whatsapp')
    const email = canales?.find(c => c.canal === 'email')

    return {
      chatwootUrl: whatsapp?.configuracion?.chatwoot_url || 'https://crm-chatwoot-a360.vcheqs.easypanel.host',
      chatwootAccountId: whatsapp?.configuracion?.chatwoot_account_id || 1,
      fromEmail: email?.configuracion?.from_email || 'facturacion@a360se.com',
      fromName: email?.configuracion?.from_name || 'A360 Servicios Energéticos',
      enlaces: whatsapp?.configuracion?.enlaces_externos || {},
    }
  }, [canales])
}
```

**Fallback**: Cada valor tiene un default hardcoded → si la tabla está vacía o la query falla, todo sigue funcionando igual que ahora.

### Cambio 4 — Reemplazar valores hardcoded en consumidores

| Archivo | Antes | Después |
|---|---|---|
| `ComunicacionesDashboard.jsx` | `const CHATWOOT_URL = '...'` (L60) | `const { chatwootUrl } = useComunicacionesConfig()` |
| `UsarPlantillaModal.jsx` | `const CHATWOOT_ACCOUNT_ID = 1` (L59) | Recibir `chatwootAccountId` como prop desde el padre |
| `CanalesConfig.jsx` | Quick links hardcoded (L91-117) | Renderizar desde config guardada |

**Nota**: `resend.js` NO se modifica porque es código de servidor que no puede hacer queries asíncronas a Supabase en tiempo de importación. Mantener `EMPRESA_CONFIG` hardcoded es correcto para ese caso.

### Cambio 5 — Mejorar UX de la página de configuración

- Eliminar canal SMS (no implementado)
- Reorganizar la UI: primero WhatsApp (canal principal), luego Email, luego Chat y Teléfono
- Mostrar aviso visual cuando un valor difiere del default → indica que se ha personalizado
- Añadir botón "Volver al Dashboard" (consistente con PlantillasList)

---

## Archivos a modificar

| Archivo | Acción | Descripción |
|---|---|---|
| `src/features/comunicaciones/CanalesConfig.jsx` | **MODIFICAR** | Simplificar campos, eliminar SMS, quick links dinámicos, botón volver |
| `src/hooks/useComunicaciones.js` | **MODIFICAR** | Añadir `useComunicacionesConfig()` hook |
| `src/features/comunicaciones/ComunicacionesDashboard.jsx` | **MODIFICAR** | Reemplazar `CHATWOOT_URL` hardcoded por hook |
| `src/features/comunicaciones/UsarPlantillaModal.jsx` | **MODIFICAR** | Recibir `chatwootAccountId` como prop |
| `src/features/comunicaciones/ConversacionesList.jsx` | **MODIFICAR** | Pasar `chatwootAccountId` al UsarPlantillaModal |

---

## Plan de implementación

1. **`useComunicaciones.js`** — Añadir hook `useComunicacionesConfig()` con fallbacks
2. **`ComunicacionesDashboard.jsx`** — Usar hook en vez de constante hardcoded, pasar `chatwootAccountId` a ConversacionesList
3. **`ConversacionesList.jsx`** — Recibir y propagar `chatwootAccountId` al UsarPlantillaModal
4. **`UsarPlantillaModal.jsx`** — Usar prop `chatwootAccountId` en vez de constante local
5. **`CanalesConfig.jsx`** — Simplificar campos, eliminar SMS, quick links desde config, botón volver
6. **Verificación** — Build limpio + verificar que Dashboard sigue funcionando con y sin datos en `canales_configuracion`

---

## Verificación

1. Sin datos en `canales_configuracion` → Dashboard usa fallbacks hardcoded → todo funciona igual que antes
2. Con `chatwoot_url` configurado en canal WhatsApp → Dashboard usa esa URL
3. Quick links en CanalesConfig se renderizan desde configuración guardada
4. Canal SMS eliminado de la UI
5. Botón "Plantilla" en conversaciones sigue usando la URL correcta de Chatwoot
6. `npm run build` compila sin errores
