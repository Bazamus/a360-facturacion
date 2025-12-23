# 🧪 Guía de Testing - Sistema de Importación/Exportación

## 📦 Generación de Archivos de Prueba

### Paso 1: Ejecutar el script generador

```bash
node scripts/generarDatosPrueba.js
```

Este comando generará 6 archivos Excel de prueba en el directorio raíz del proyecto.

---

## 📋 Archivos Generados

| # | Archivo | Propósito | Resultado Esperado |
|---|---------|-----------|-------------------|
| 1 | `TEST_01_Comunidad_Completa_EXITOSA.xlsx` | Comunidad completa válida | ✅ Importación sin errores:<br>- 1 comunidad creada<br>- 3 portales creados<br>- 8 viviendas creadas<br>- 3 precios creados |
| 2 | `TEST_02_Comunidad_Completa_CON_DUPLICADOS.xlsx` | Detectar filas duplicadas | ⚠️ Importación parcial con errores:<br>- 1 comunidad creada<br>- 3 portales (1 duplicado detectado)<br>- 4 viviendas (1 duplicado detectado)<br>- 2 precios creados<br>**Total: 2 errores** |
| 3 | `TEST_03_Comunidad_Completa_CON_ERRORES.xlsx` | Validación de errores | ❌ Importación con múltiples errores:<br>- Comunidad: 1 error (CP obligatorio)<br>- Portales: 2 errores<br>- Viviendas: 3 errores<br>- Precios: 3 errores<br>**Total: ~8-9 errores** |
| 4 | `TEST_04_Clientes_EXITOSOS.xlsx` | Importación de clientes | ✅ 5 clientes creados (vinculados a TEST01) |
| 5 | `TEST_05_Contadores_EXITOSOS.xlsx` | Contadores con conceptos | ✅ 5 contadores creados con conceptos asignados |
| 6 | `TEST_06_Actualizacion_TEST01.xlsx` | Actualizar comunidad existente | 🔄 Actualización de TEST01:<br>- 1 comunidad actualizada<br>- 1 portal nuevo (B)<br>- 2 viviendas nuevas<br>- 1 precio nuevo (anterior queda histórico) |

---

## 🎯 Plan de Pruebas Recomendado

### **Fase 1: Importaciones Exitosas** (crear datos base)

#### Test 1.1 - Comunidad Completa Nueva
**Archivo:** `TEST_01_Comunidad_Completa_EXITOSA.xlsx`

1. Ir a `/configuracion/importar-exportar`
2. Tab "Comunidad Completa"
3. Subir `TEST_01_Comunidad_Completa_EXITOSA.xlsx`
4. Verificar resumen:
   - Datos Generales: 1 fila
   - Portales: 3 filas
   - Viviendas: 8 filas
   - Precios: 3 filas
5. Click "Importar comunidad"
6. **Verificar resultado:**
   - ✅ "Comunidad: 1 creados"
   - ✅ "Portales: 3 creados"
   - ✅ "Viviendas: 8 creadas"
   - ✅ "Precios: 3 creados"
   - ✅ Sin errores

7. **Verificar en Supabase:**
   ```sql
   -- Verificar comunidad
   SELECT * FROM comunidades WHERE codigo = 'TEST01';

   -- Verificar portales
   SELECT nombre FROM agrupaciones
   WHERE comunidad_id = (SELECT id FROM comunidades WHERE codigo = 'TEST01')
   ORDER BY orden;
   -- Debe mostrar: 1, 2, A

   -- Verificar viviendas
   SELECT a.nombre as portal, u.nombre as vivienda
   FROM ubicaciones u
   JOIN agrupaciones a ON u.agrupacion_id = a.id
   WHERE a.comunidad_id = (SELECT id FROM comunidades WHERE codigo = 'TEST01')
   ORDER BY a.orden, u.orden;
   -- Debe mostrar 8 viviendas

   -- Verificar precios
   SELECT c.codigo, p.precio_unitario
   FROM precios p
   JOIN conceptos c ON p.concepto_id = c.id
   WHERE p.comunidad_id = (SELECT id FROM comunidades WHERE codigo = 'TEST01')
   AND p.activo = true;
   -- Debe mostrar: ACS (6.45), CAL (0.085), TF (25.00)
   ```

#### Test 1.2 - Clientes
**Archivo:** `TEST_04_Clientes_EXITOSOS.xlsx`

**Prerrequisito:** TEST01 debe existir (Test 1.1 completado)

1. Tab "Clientes"
2. Subir `TEST_04_Clientes_EXITOSOS.xlsx`
3. Verificar preview (5 filas válidas)
4. Click "Importar 5 registros"
5. **Verificar resultado:**
   - ✅ "5 creados" o "5 actualizados" (si ya existían)
   - ✅ "5 ubicaciones asignadas"

6. **Verificar en UI:**
   - Ir a `/clientes`
   - Buscar "María García López" → debe aparecer con vivienda "1ºA"

#### Test 1.3 - Contadores
**Archivo:** `TEST_05_Contadores_EXITOSOS.xlsx`

**Prerrequisito:** TEST01 debe existir (Test 1.1 completado)

1. Tab "Contadores"
2. Subir `TEST_05_Contadores_EXITOSOS.xlsx`
3. Verificar preview (5 filas válidas)
4. Click "Importar 5 registros"
5. **Verificar resultado:**
   - ✅ "5 creados"
   - ✅ "Conceptos asignados: 12" (CNT0001: 3, CNT0002: 2, CNT0003: 3, CNT0004: 2, CNT0005: 3)

6. **Verificar en Supabase:**
   ```sql
   -- Verificar contadores
   SELECT numero_serie, marca FROM contadores
   WHERE numero_serie LIKE 'CNT000%'
   ORDER BY numero_serie;
   -- Debe mostrar 5 contadores

   -- Verificar conceptos asignados
   SELECT c.numero_serie, co.codigo, cc.lectura_inicial
   FROM contadores_conceptos cc
   JOIN contadores c ON cc.contador_id = c.id
   JOIN conceptos co ON cc.concepto_id = co.id
   WHERE c.numero_serie LIKE 'CNT000%'
   ORDER BY c.numero_serie, co.codigo;
   -- Debe mostrar 12 asignaciones
   ```

---

### **Fase 2: Validación de Duplicados**

#### Test 2.1 - Detección de Duplicados
**Archivo:** `TEST_02_Comunidad_Completa_CON_DUPLICADOS.xlsx`

1. Tab "Comunidad Completa"
2. Subir `TEST_02_Comunidad_Completa_CON_DUPLICADOS.xlsx`
3. Click "Importar comunidad"
4. **Verificar resultado:**
   - ✅ "Comunidad: 1 creados"
   - ⚠️ "Portales: 3 creados, **1 errores**"
     - Click en "1 errores" para expandir
     - Debe mostrar: "Fila 4: Portal "1" ya fue procesado en este archivo (fila duplicada)"
   - ⚠️ "Viviendas: 4 creadas, **1 errores**"
     - Click en "1 errores" para expandir
     - Debe mostrar: "Fila 4: Vivienda "1ºA" en portal "1" ya fue procesada en este archivo (fila duplicada)"
   - ✅ "Precios: 2 creados"

5. **Verificar que NO se duplicaron en BD:**
   ```sql
   -- Debe haber solo UN portal "1"
   SELECT COUNT(*) FROM agrupaciones
   WHERE comunidad_id = (SELECT id FROM comunidades WHERE codigo = 'TEST02')
   AND nombre = '1';
   -- Resultado esperado: 1

   -- Debe haber solo UNA vivienda "1ºA" en portal "1"
   SELECT COUNT(*) FROM ubicaciones u
   JOIN agrupaciones a ON u.agrupacion_id = a.id
   WHERE a.comunidad_id = (SELECT id FROM comunidades WHERE codigo = 'TEST02')
   AND a.nombre = '1' AND u.nombre = '1ºA';
   -- Resultado esperado: 1
   ```

---

### **Fase 3: Validación de Errores**

#### Test 3.1 - Múltiples Tipos de Errores
**Archivo:** `TEST_03_Comunidad_Completa_CON_ERRORES.xlsx`

1. Tab "Comunidad Completa"
2. Subir `TEST_03_Comunidad_Completa_CON_ERRORES.xlsx`
3. Click "Importar comunidad"
4. **Verificar detección de errores:**

   **Comunidad (1 error):**
   - ❌ Fila 2: "Código Postal es obligatorio"

   **Portales (2 errores):**
   - ❌ Fila 3: "Nombre Portal es obligatorio"
   - ❌ Fila 4: "Comunidad "TEST_NOEXISTE" no encontrada"

   **Viviendas (3 errores):**
   - ❌ Fila 3: "Nombre Vivienda es obligatorio"
   - ❌ Fila 4: "Portal "PORTALINEXISTENTE" no encontrado"
   - ❌ Fila 5: "Código Comunidad es obligatorio"

   **Precios (2-3 errores):**
   - ❌ Fila 3: "Concepto "CONCEPTOINVALIDO" no encontrado"
   - ❌ Fila 4: "Precio Unitario debe ser un número positivo"
   - ❌ Fila 5: "Fecha Inicio es obligatoria"

5. **Expandir cada sección** y verificar que los mensajes son claros y específicos

---

### **Fase 4: Actualización de Datos Existentes**

#### Test 4.1 - Actualizar Comunidad TEST01
**Archivo:** `TEST_06_Actualizacion_TEST01.xlsx`

**Prerrequisito:** TEST01 debe existir (Test 1.1 completado)

1. Tab "Comunidad Completa"
2. Subir `TEST_06_Actualizacion_TEST01.xlsx`
3. Click "Importar comunidad"
4. **Verificar resultado:**
   - ✅ "Comunidad: 1 actualizado"
   - ✅ "Portales: 1 creados" (portal B)
   - ✅ "Viviendas: 2 creadas" (Bajo y 1º en portal B)
   - ✅ "Precios: 1 creados"

5. **Verificar actualización en Supabase:**
   ```sql
   -- Verificar que el teléfono cambió
   SELECT telefono, persona_contacto
   FROM comunidades WHERE codigo = 'TEST01';
   -- Debe mostrar: 918888888, "Pedro Gómez (NUEVO)"

   -- Verificar que existe el portal B
   SELECT nombre FROM agrupaciones
   WHERE comunidad_id = (SELECT id FROM comunidades WHERE codigo = 'TEST01')
   AND nombre = 'B';
   -- Debe existir

   -- Verificar que el precio anterior de ACS quedó histórico
   SELECT precio_unitario, fecha_inicio, fecha_fin, activo
   FROM precios p
   JOIN conceptos c ON p.concepto_id = c.id
   WHERE p.comunidad_id = (SELECT id FROM comunidades WHERE codigo = 'TEST01')
   AND c.codigo = 'ACS'
   ORDER BY fecha_inicio DESC;
   -- Debe mostrar 2 filas:
   -- 1. 7.00, 01/02/2024, NULL, true (nuevo)
   -- 2. 6.45, 01/01/2024, 01/02/2024, false (histórico)
   ```

---

### **Fase 5: Exportación y Re-importación**

#### Test 5.1 - Exportar TEST01 y Re-importar
1. Tab "Comunidad Completa" → Panel de exportación
2. Seleccionar "TEST01 - Comunidad Test Plaza Mayor"
3. Click "Exportar comunidad seleccionada"
4. Abrir el archivo descargado y verificar:
   - ✅ Hoja "Datos Generales" con info de TEST01
   - ✅ Hoja "Portales" con 4 portales (1, 2, A, B)
   - ✅ Hoja "Viviendas" con 10 viviendas
   - ✅ Hoja "Precios" con precios vigentes

5. Modificar algo en el Excel (ej: cambiar descripción de portal "1")
6. Re-importar el archivo modificado
7. Verificar que se actualizó correctamente

---

## ✅ Checklist de Validación

Marca cada ítem al completarlo:

### Funcionalidad Básica
- [ ] Importación exitosa de comunidad completa (Test 1.1)
- [ ] Importación exitosa de clientes (Test 1.2)
- [ ] Importación exitosa de contadores con conceptos (Test 1.3)
- [ ] Exportación de comunidad completa (Test 5.1)

### Validaciones
- [ ] Detección de portal duplicado (Test 2.1)
- [ ] Detección de vivienda duplicada (Test 2.1)
- [ ] Validación de campos obligatorios (Test 3.1)
- [ ] Validación de entidades relacionadas inexistentes (Test 3.1)
- [ ] Validación de formatos (Test 3.1)

### UI y UX
- [ ] Errores se muestran expandibles por hoja
- [ ] Mensajes de error son claros y específicos con número de fila
- [ ] Progreso se muestra durante importación
- [ ] Resumen final muestra contadores correctos
- [ ] Errores globales se muestran separados

### Actualización
- [ ] Actualización de comunidad existente (Test 4.1)
- [ ] Creación de nuevos portales en comunidad existente
- [ ] Precios anteriores quedan históricos (fecha_fin se actualiza)

### Integridad de Datos
- [ ] No se crean duplicados en BD
- [ ] Contadores de created/updated son correctos
- [ ] Relaciones (comunidad→portal→vivienda) son correctas
- [ ] Conceptos se asignan correctamente a contadores

---

## 🐛 Errores Conocidos a Verificar

Durante las pruebas, presta especial atención a:

1. **Fechas seriales de Excel**: Verificar que las fechas se convierten correctamente
2. **Campos numéricos como string**: Verificar que CP, teléfono funcionan (problema resuelto con `toStr()`)
3. **Validación .maybeSingle()**: No debe haber errores 406 en consola
4. **Errores expandibles**: El estado expandido debe funcionar para cada sección

---

## 📊 Métricas de Éxito

Al finalizar todas las pruebas, deberías tener:

| Base de Datos | Cantidad Esperada |
|---------------|-------------------|
| Comunidades | 3 (TEST01, TEST02, TEST03*) |
| Portales | ~10 (3+4+3) |
| Viviendas | ~22 (10+5+7*) |
| Clientes | 5 |
| Contadores | 5 |
| Conceptos asignados | 12 |
| Precios activos | ~8 |
| Precios históricos | 1 (ACS de TEST01) |

*Nota: TEST03 puede tener menos si los errores impiden la creación

---

## 🔍 Consultas SQL Útiles para Verificación

```sql
-- Resumen general
SELECT
  'Comunidades' as entidad, COUNT(*) as total FROM comunidades WHERE codigo LIKE 'TEST%'
UNION ALL
SELECT 'Portales', COUNT(*) FROM agrupaciones a
  JOIN comunidades c ON a.comunidad_id = c.id
  WHERE c.codigo LIKE 'TEST%'
UNION ALL
SELECT 'Viviendas', COUNT(*) FROM ubicaciones u
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  JOIN comunidades c ON a.comunidad_id = c.id
  WHERE c.codigo LIKE 'TEST%'
UNION ALL
SELECT 'Clientes', COUNT(*) FROM clientes WHERE nif IN ('12345678A','23456789B','34567890C','45678901D','56789012E')
UNION ALL
SELECT 'Contadores', COUNT(*) FROM contadores WHERE numero_serie LIKE 'CNT000%';

-- Limpiar datos de prueba (CUIDADO!)
DELETE FROM ubicaciones_clientes WHERE cliente_id IN (
  SELECT id FROM clientes WHERE nif IN ('12345678A','23456789B','34567890C','45678901D','56789012E')
);
DELETE FROM clientes WHERE nif IN ('12345678A','23456789B','34567890C','45678901D','56789012E');
DELETE FROM contadores_conceptos WHERE contador_id IN (SELECT id FROM contadores WHERE numero_serie LIKE 'CNT000%');
DELETE FROM contadores WHERE numero_serie LIKE 'CNT000%';
DELETE FROM precios WHERE comunidad_id IN (SELECT id FROM comunidades WHERE codigo LIKE 'TEST%');
DELETE FROM ubicaciones WHERE agrupacion_id IN (
  SELECT a.id FROM agrupaciones a JOIN comunidades c ON a.comunidad_id = c.id WHERE c.codigo LIKE 'TEST%'
);
DELETE FROM agrupaciones WHERE comunidad_id IN (SELECT id FROM comunidades WHERE codigo LIKE 'TEST%');
DELETE FROM comunidades WHERE codigo LIKE 'TEST%';
```

---

## 📝 Reporte de Resultados

Después de completar las pruebas, documenta:

1. **Casos exitosos**: ¿Todos los casos de éxito funcionaron correctamente?
2. **Errores detectados**: ¿Algún caso que debería haber funcionado falló?
3. **Validaciones**: ¿Las validaciones detectaron todos los errores esperados?
4. **UI/UX**: ¿La experiencia de usuario es clara e intuitiva?
5. **Performance**: ¿El tiempo de procesamiento es aceptable?

---

**¡Buena suerte con las pruebas! 🚀**
