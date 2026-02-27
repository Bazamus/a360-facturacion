# Workflow 2: Sync Clientes Supabase → Chatwoot

## Descripcion

Este workflow sincroniza automaticamente los clientes activos de Supabase con los contactos de Chatwoot cada 6 horas. Si el contacto ya existe en Chatwoot lo actualiza, si no existe lo crea.

## Flujo visual

```
Cada 6       GET Clientes     Loop        Buscar en       Preparar       Existe en
Horas    →   Supabase     →   Clientes →  Chatwoot    →   Contacto   →   Chatwoot?
(Schedule)                     ↑                                          |
                               |                                     SI  |  NO
                               |                                     ↓      ↓
                               ←──── UPDATE Contacto    CREATE Contacto
```

## Datos sincronizados

| Campo Supabase | Campo Chatwoot | Tipo atributo |
|----------------|----------------|---------------|
| nombre + apellidos | name | standard |
| email | email | standard |
| telefono (+34 prefix auto) | phone_number | standard |
| id (UUID) | identifier | standard |
| ciudad_correspondencia | additional_attributes.city | additional |
| provincia_correspondencia | additional_attributes.state | additional |
| (fijo) Spain / ES | additional_attributes.country/country_code | additional |
| nif | custom_attributes.nif | custom |
| codigo_cliente | custom_attributes.codigo_cliente | custom |
| telefono_secundario | custom_attributes.telefono_secundario | custom |
| direccion_correspondencia | custom_attributes.direccion | custom |
| cp_correspondencia | custom_attributes.codigo_postal | custom |
| tipo | custom_attributes.tipo_cliente | custom |
| comunidades.nombre (via ubicaciones) | custom_attributes.comunidad | custom |
| ubicaciones.nombre (via ubicaciones) | custom_attributes.ubicacion_vivienda | custom |

### Custom Attributes requeridos en Chatwoot

Estos atributos deben existir en Chatwoot > Settings > Custom Attributes > **Contacto**:

| Key | Display Name | Type |
|-----|-------------|------|
| codigo_cliente | Codigo Cliente | Text |
| nif | NIF/CIF | Text |
| direccion | Direccion | Text |
| codigo_postal | Codigo Postal | Text |
| tipo_cliente | Tipo Cliente | Text |
| comunidad | Comunidad | Text |
| ubicacion_vivienda | Ubicacion (Vivienda) | Text |
| telefono_secundario | Telefono Secundario | Text |

## Requisitos previos

1. Workflow 1 funcionando
2. Chatwoot operativo
3. Tener a mano: **Chatwoot API Token** (user access token)

## Paso 1: Obtener el Chatwoot API Token

1. Abre Chatwoot en tu navegador: `https://chat.a360se.com`
2. Inicia sesion con tu cuenta de administrador
3. Click en tu **avatar** (esquina inferior izquierda)
4. Click en **Profile Settings** (o Configuracion de perfil)
5. Baja hasta la seccion **Access Token**
6. Copia el token que aparece ahi

## Paso 2: Importar el workflow en n8n

1. En n8n, crea un nuevo workflow
2. **Import from file** > selecciona `workflow_2_sync_clientes_chatwoot.json`
3. En los nodos que tienen `REEMPLAZAR_CON_TU_CHATWOOT_API_TOKEN`, sustituye por tu token real:
   - **Buscar en Chatwoot** (header `api_access_token`)
   - **UPDATE Contacto** (header `api_access_token`)
   - **CREATE Contacto** (header `api_access_token`)

## Paso 3: Activar

1. Cambia el toggle de **Inactive** a **Active**
2. El workflow se ejecutara automaticamente cada 6 horas
3. Para probarlo inmediatamente, click en **Test workflow**

## Paso 4: Verificar

Tras ejecutar, abre Chatwoot > Contacts y comprueba que los clientes de Supabase aparecen como contactos.

## Notas importantes

- Sincroniza todos los clientes de la tabla `clientes`
- Incluye datos de ubicaciones/comunidades via relaciones anidadas
- El campo `identifier` en Chatwoot guarda el UUID del cliente en Supabase (vinculo unico)
- Los telefonos espanoles de 9 digitos se formatean automaticamente con prefijo `+34`
- El nodo "Buscar en Chatwoot" tiene **Always Output Data = ON** y **Never Error = ON**
- La frecuencia de 6 horas se puede ajustar en el nodo "Cada 6 Horas"

## Troubleshooting

**Error 401 en Chatwoot:**
- El API Token es incorrecto o ha expirado
- Regenera el token en Chatwoot > Profile > Access Token

**No se crean contactos:**
- Verifica que la URL de Chatwoot es correcta
- Verifica que el account_id es 1 (si es distinto, ajusta las URLs)

**Contactos duplicados:**
- La busqueda se hace por telefono/email. Si un cliente no tiene ni telefono ni email, la busqueda sera vacia y se creara cada vez
