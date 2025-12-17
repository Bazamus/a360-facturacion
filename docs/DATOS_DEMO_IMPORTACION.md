# Datos de Demostración - Sistema de Facturación A360

## Instrucciones de Carga de Datos

### Paso 1: Ejecutar la migración de Fase 2 (si no lo has hecho)

En Supabase SQL Editor, ejecuta el contenido de:
```
supabase/migrations/003_lecturas_schema.sql
```

### Paso 2: Cargar datos de demostración

En Supabase SQL Editor, ejecuta el contenido de:
```
supabase/seeds/001_datos_demo.sql
```

Este script crea:

| Entidad | Cantidad | Descripción |
|---------|----------|-------------|
| Comunidades | 2 | Troya 40 y Hermes 12 |
| Agrupaciones | 3 | 2 Portales + 1 Escalera |
| Ubicaciones | 12 | 8 viviendas + 4 apartamentos |
| Clientes | 12 | Con datos completos (NIF, email, IBAN) |
| Contadores | 12 | Con números de serie únicos |
| Conceptos asignados | 24 | ACS, CAL, CLI según comunidad |
| Precios | 6 | Precios vigentes por comunidad/concepto |

---

## Datos de las Comunidades

### 🏢 Residencial Troya 40 (TRO40)
- **Dirección:** Calle Troya 40, 28001 Madrid
- **CIF:** H12345678
- **Estructura:** 2 Portales, 4 viviendas cada uno
- **Servicios:** ACS (6.45 €/m³) + Calefacción (0.085 €/kWh) + Término Fijo (25€/mes)

| Portal | Vivienda | Cliente | NIF | Contador |
|--------|----------|---------|-----|----------|
| 1 | 1ºA | María García López | 12345678A | 22804101 |
| 1 | 1ºB | Juan Martínez Ruiz | 23456789B | 22804102 |
| 1 | 2ºA | Ana Sánchez Pérez | 34567890C | 22804103 |
| 1 | 2ºB | Carlos López Hernández | 45678901D | 22804104 |
| 2 | 1ºA | Laura Fernández Gil | 56789012E | 22804105 |
| 2 | 1ºB | Pedro Díaz Torres | 67890123F | 22804106 |
| 2 | 2ºA | Elena Moreno Castro | 78901234G | 22804107 |
| 2 | 2ºB | Miguel Jiménez Vega | 89012345H | 22804108 |

### 🏢 Edificio Hermes 12 (HER12)
- **Dirección:** Avenida Hermes 12, 28002 Madrid
- **CIF:** H87654321
- **Estructura:** 1 Escalera, 4 apartamentos
- **Servicios:** ACS (7.20 €/m³) + Climatización (0.095 €/kWh) + Término Fijo (30€/mes)

| Escalera | Apartamento | Cliente | NIF | Contador |
|----------|-------------|---------|-----|----------|
| A | Bajo A | Sofía Ruiz Martín | 90123456I | 33901201 |
| A | Bajo B | David Navarro Blanco | 01234567J | 33901202 |
| A | 1º A | Carmen Iglesias Ramos | 11234567K | 33901203 |
| A | 1º B | Roberto Herrera Santos | 21234567L | 33901204 |

---

## Archivo Excel de Ejemplo para Importación

Crea un archivo Excel llamado `lecturas_noviembre_2025.xlsx` con estas columnas:

| Portal | Vivienda | Nº Contador | Concepto | Lectura | Fecha Lectura |
|--------|----------|-------------|----------|---------|---------------|
| 1 | 1ºA | 22804101 | ACS | 47.850 | 30/11/2025 |
| 1 | 1ºA | 22804101 | CAL | 1580.200 | 30/11/2025 |
| 1 | 1ºB | 22804102 | ACS | 54.120 | 30/11/2025 |
| 1 | 1ºB | 22804102 | CAL | 1425.800 | 30/11/2025 |
| 1 | 2ºA | 22804103 | ACS | 40.350 | 30/11/2025 |
| 1 | 2ºA | 22804103 | CAL | 1712.500 | 30/11/2025 |
| 1 | 2ºB | 22804104 | ACS | 63.780 | 30/11/2025 |
| 1 | 2ºB | 22804104 | CAL | 1485.300 | 30/11/2025 |
| 2 | 1ºA | 22804105 | ACS | 44.250 | 30/11/2025 |
| 2 | 1ºA | 22804105 | CAL | 1345.800 | 30/11/2025 |
| 2 | 1ºB | 22804106 | ACS | 37.890 | 30/11/2025 |
| 2 | 1ºB | 22804106 | CAL | 1235.200 | 30/11/2025 |
| 2 | 2ºA | 22804107 | ACS | 61.450 | 30/11/2025 |
| 2 | 2ºA | 22804107 | CAL | 1612.800 | 30/11/2025 |
| 2 | 2ºB | 22804108 | ACS | 47.120 | 30/11/2025 |
| 2 | 2ºB | 22804108 | CAL | 1378.900 | 30/11/2025 |

### Lecturas anteriores (Octubre 2025) ya están en el sistema:
Los contadores tienen lecturas actuales al 31/10/2025 que servirán como referencia.

---

## Flujo de Prueba Completo

### 1. Cargar datos de demo
```sql
-- Ejecutar en Supabase SQL Editor
-- Copiar contenido de supabase/seeds/001_datos_demo.sql
```

### 2. Verificar datos cargados
- Ir a **Comunidades** → Ver Troya 40 y Hermes 12
- Ir a **Clientes** → Ver los 12 clientes
- Ir a **Contadores** → Ver los 12 contadores con conceptos asignados

### 3. Crear Excel de prueba
Crea el archivo con los datos de la tabla anterior en Excel.

### 4. Importar lecturas
1. Ir a **Lecturas → Importar**
2. Seleccionar comunidad **"Residencial Troya 40"**
3. Subir el archivo Excel
4. Verificar el mapeo de columnas
5. Clic en **"Procesar archivo"**

### 5. Validar lecturas
- Revisar las lecturas procesadas
- Ver los consumos calculados (lectura actual - anterior)
- Verificar que no hay alertas (o corregir si las hay)
- Seleccionar las lecturas válidas
- Clic en **"Confirmar"**

### 6. Verificar en historial
- Ir a **Lecturas → Historial**
- Ver la importación confirmada

---

## Datos de Acceso

### Usuario Demo
- **Email:** demo@a360se.com
- **Contraseña:** Demo2025!

---

## Notas

- Los números de contador son ficticios pero realistas
- Los NIFs son ficticios (no válidos para verificación real)
- Los IBANs siguen el formato español pero son ficticios
- Los precios son aproximados a tarifas reales de 2025

