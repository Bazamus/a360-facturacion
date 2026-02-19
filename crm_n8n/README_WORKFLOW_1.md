# Workflow 1: Evolution API → Supabase Mensajes

## Descripcion

Este workflow captura cada mensaje de WhatsApp (entrante y saliente) que pasa por Evolution API y lo registra en la tabla `comunicaciones` de Supabase. Tambien actualiza el estado de los mensajes (entregado, leido).

## Flujo visual

```
Webhook        Extraer        No       Tipo        Buscar          INSERT
Evolution  →   Datos     →   Skip?  →  Evento  →   Cliente    →   Comunicacion
(POST)         Mensaje        |         |           por Tel
                              |         |
                              |         └─→ UPDATE Estado Mensaje
                              |
                              └─→ (descartado)
```

## Requisitos previos

1. n8n operativo en EasyPanel
2. Evolution API operativa con WhatsApp conectado
3. Migracion `037_crm_comunicaciones.sql` ejecutada en Supabase
4. Tener a mano:
   - `SUPABASE_SERVICE_KEY` (Supabase > Settings > API > service_role)
   - URL de tu n8n en EasyPanel

---

## Paso 1: Configurar variable de entorno en n8n

Antes de importar el workflow, configura la variable de entorno `SUPABASE_SERVICE_KEY` en n8n:

1. Accede a tu n8n en EasyPanel
2. Ve a **Settings > Environment Variables** (o configura en las variables de entorno del servicio en EasyPanel)
3. Anade:

```
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...TU_SERVICE_ROLE_KEY
```

4. Reinicia n8n para que tome la variable

**Alternativa sin variable de entorno:** Si no puedes configurar variables de entorno, tras importar el workflow puedes reemplazar `{{$env.SUPABASE_SERVICE_KEY}}` directamente por tu key en los 3 nodos HTTP Request. Es menos seguro pero funcional.

---

## Paso 2: Importar el workflow en n8n

1. Abre n8n en tu navegador
2. Click en **+ Add workflow** (esquina superior)
3. Click en los **3 puntos** del menu (arriba derecha) > **Import from file**
4. Selecciona el archivo `workflow_1_evolution_supabase_mensajes.json`
5. El workflow aparecera con 7 nodos conectados

---

## Paso 3: Verificar la URL del webhook

Tras importar, haz click en el nodo **"Webhook Evolution"**:

1. Veras dos URLs:
   - **Test URL**: para pruebas (solo funciona cuando el workflow esta en modo test)
   - **Production URL**: la definitiva (funciona cuando el workflow esta activo)
2. **Copia la Production URL**, tendra este formato:
   ```
   https://TU_N8N_URL/webhook/evolution-messages
   ```
3. Guarda esta URL, la necesitaras en el Paso 4

---

## Paso 4: Configurar webhook en Evolution API

Necesitas decirle a Evolution API que envie eventos a tu n8n. Tienes dos opciones:

### Opcion A: Desde el Manager de Evolution API (interfaz web)

1. Abre el Manager de Evolution API en tu navegador
2. Selecciona tu instancia (ej: `A360_Chat`)
3. Ve a la seccion **Webhook**
4. Configura:
   - **Enabled**: ON
   - **URL**: la Production URL del Paso 3
   - **Webhook By Events**: ON
   - Activa estos eventos:
     - `MESSAGES_UPSERT` (mensajes recibidos/enviados)
     - `MESSAGES_UPDATE` (cambios de estado)
     - `SEND_MESSAGE` (mensajes enviados desde Chatwoot)
5. Click **Save**

### Opcion B: Via API (curl)

```bash
curl -X PUT "https://TU_EVOLUTION_API_URL/webhook/set/A360_Chat" \
  -H "apikey: TU_EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://TU_N8N_URL/webhook/evolution-messages",
      "webhookByEvents": true,
      "events": [
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "SEND_MESSAGE"
      ]
    }
  }'
```

Reemplaza:
- `TU_EVOLUTION_API_URL` por la URL de tu Evolution API en EasyPanel
- `TU_EVOLUTION_API_KEY` por tu API key de Evolution
- `TU_N8N_URL` por la URL de tu n8n en EasyPanel

---

## Paso 5: Activar el workflow

1. En n8n, abre el workflow importado
2. En la esquina superior derecha, cambia el toggle de **Inactive** a **Active**
3. El workflow ahora esta escuchando eventos

---

## Paso 6: Probar

1. Envia un mensaje de WhatsApp al numero conectado a Evolution API
2. En n8n, ve a **Executions** (icono de reloj) para ver si el workflow se ejecuto
3. En Supabase, comprueba la tabla `comunicaciones`:
   ```sql
   SELECT * FROM comunicaciones ORDER BY created_at DESC LIMIT 5;
   ```
4. Deberia aparecer el mensaje con:
   - `canal`: whatsapp
   - `direccion`: entrante
   - `contenido`: el texto del mensaje
   - `remitente_telefono`: el numero del remitente
   - `cliente_id`: vinculado si el telefono coincide con un cliente existente

---

## Nodos del workflow

| # | Nodo | Tipo | Funcion |
|---|------|------|---------|
| 1 | Webhook Evolution | Webhook | Recibe POST de Evolution API |
| 2 | Extraer Datos Mensaje | Code (JS) | Parsea el evento, extrae telefono, contenido, tipo, direccion |
| 3 | No Skip? | If | Filtra eventos no relevantes (grupos, eventos desconocidos) |
| 4 | Tipo Evento | Switch | Separa "mensaje nuevo" de "actualizacion de estado" |
| 5 | Buscar Cliente por Tel | HTTP Request | Llama a `buscar_cliente_por_telefono()` en Supabase |
| 6 | INSERT Comunicacion | HTTP Request | Inserta el mensaje en tabla `comunicaciones` |
| 7 | UPDATE Estado Mensaje | HTTP Request | Actualiza estado (entregado/leido) de mensajes existentes |

## Notas de configuracion importantes

- El nodo **Buscar Cliente por Tel** debe tener **Always Output Data = ON** en Settings. Si Supabase no encuentra cliente, el flujo continua con `cliente_id: null`.
- El nodo **Extraer Datos Mensaje** usa modo **Run Once for All Items** (compatible con n8n v2.0.3+).
- Si Evolution API y n8n estan en **proyectos separados de EasyPanel**, puede haber problemas de resolucion DNS. Reiniciar el servicio de Evolution API suele resolver el cache DNS.

## Troubleshooting

**El webhook no recibe datos:**
- Verifica que la URL del webhook es correcta (Production URL, no Test URL)
- Verifica que el workflow esta en estado **Active**
- Comprueba los logs de Evolution API para ver si envia webhooks

**Error 401 en Supabase:**
- La variable `SUPABASE_SERVICE_KEY` no esta configurada o es incorrecta
- Asegurate de usar la key `service_role`, no la `anon` key

**Los mensajes de grupo se registran:**
- El nodo Code ya los filtra, pero si llegan, verifica que `remoteJid` contiene `@g.us`

**No se vincula el cliente:**
- Verifica que el telefono del cliente en Supabase coincide con el del mensaje
- La funcion normaliza quitando espacios, guiones y prefijo +34
