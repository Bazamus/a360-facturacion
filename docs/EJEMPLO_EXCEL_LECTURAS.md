# Ejemplo de Excel para Importación de Lecturas

## Estructura del archivo Excel

El sistema acepta archivos `.xlsx` o `.xls` con las siguientes columnas:

| Columna | Obligatoria | Descripción |
|---------|-------------|-------------|
| **Nº Contador** | ✅ Sí | Número de serie del contador (8 dígitos) |
| **Concepto** | ✅ Sí | Código del concepto: ACS, CAL, CLI |
| **Lectura** | ✅ Sí | Valor de la lectura actual |
| **Fecha** | ✅ Sí | Fecha de la lectura (DD/MM/YYYY) |
| Portal | No | Referencia visual del portal |
| Vivienda | No | Referencia visual de la vivienda |

---

## Excel de Prueba para Diciembre 2024

Crea un archivo Excel con estos datos para probar la importación:

| Portal | Vivienda | Nº Contador | Concepto | Lectura | Fecha |
|--------|----------|-------------|----------|---------|-------|
| 1 | 1ºA | 22804101 | ACS | 108,50 | 17/12/2024 |
| 1 | 1ºA | 22804101 | CAL | 5600,00 | 17/12/2024 |
| 1 | 1ºB | 22804102 | ACS | 94,25 | 17/12/2024 |
| 1 | 1ºB | 22804102 | CAL | 4980,00 | 17/12/2024 |
| 1 | 2ºA | 22804103 | ACS | 127,90 | 17/12/2024 |
| 1 | 2ºA | 22804103 | CAL | 5850,00 | 17/12/2024 |
| 1 | 2ºB | 22804104 | ACS | 103,80 | 17/12/2024 |
| 1 | 2ºB | 22804104 | CAL | 5400,00 | 17/12/2024 |

---

## Números de Serie de los Contadores Demo

Los datos de demostración incluyen estos contadores:

### Portal 1
| Vivienda | Nº Contador | Cliente |
|----------|-------------|---------|
| 1ºA | **22804101** | María García López |
| 1ºB | **22804102** | Juan Martínez Ruiz |
| 2ºA | **22804103** | Ana López Fernández |
| 2ºB | **22804104** | Pedro Sánchez García |

### Portal 2
| Vivienda | Nº Contador | Cliente |
|----------|-------------|---------|
| 1ºA | **22804201** | Laura Fernández Díaz |
| 1ºB | **22804202** | Carlos Díaz Moreno |
| 2ºA | **22804203** | Elena Moreno Castro |
| 2ºB | **22804204** | Miguel Castro Navarro |

---

## Conceptos Disponibles

| Código | Nombre | Unidad | Precio |
|--------|--------|--------|--------|
| **ACS** | Agua Caliente Sanitaria | m³ | 6,45 €/m³ |
| **CAL** | Calefacción | kWh | 0,085 €/kWh |
| **CLI** | Climatización | kWh | - |
| **TF** | Término Fijo | €/mes | 15,00 €/mes |

---

## Formato de Fechas Aceptados

- `17/12/2024` (DD/MM/YYYY) ✅ Recomendado
- `17-12-2024` (DD-MM-YYYY)
- `2024-12-17` (YYYY-MM-DD)

## Formato de Números Aceptados

- `108,50` (formato español con coma) ✅ Recomendado
- `108.50` (formato internacional con punto)

---

## Casos de Prueba de Alertas

Para probar el sistema de alertas, puedes incluir estas variantes:

| Caso | Nº Contador | Concepto | Lectura | Resultado Esperado |
|------|-------------|----------|---------|-------------------|
| Consumo alto | 22804101 | ACS | 150,00 | ⚠️ Alerta: consumo muy superior a la media |
| Lectura negativa | 22804102 | ACS | 80,00 | ❌ Error: lectura < anterior (91.00) |
| Consumo cero | 22804103 | CAL | 5600,00 | ℹ️ Info: sin consumo en el periodo |
| Contador inexistente | 99999999 | ACS | 100,00 | ❌ Error: contador no encontrado |

---

## Pasos para Probar

1. **Ejecutar el seed de datos demo** en Supabase SQL Editor
2. **Crear el archivo Excel** con los datos de arriba
3. **Ir a Lecturas → Importar** en la aplicación
4. **Seleccionar comunidad** "Residencial Troya 40"
5. **Subir el archivo Excel**
6. **Verificar mapeo de columnas**
7. **Procesar y revisar alertas**
8. **Confirmar lecturas válidas**

