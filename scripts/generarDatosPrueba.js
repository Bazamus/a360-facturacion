/**
 * Script para generar archivos Excel de prueba
 * Sistema de Facturación A360
 *
 * Genera varios archivos de prueba para validar:
 * - Importación exitosa
 * - Detección de duplicados
 * - Validación de errores
 * - Comunidad completa multi-hoja
 */

import XLSX from 'xlsx'

// ============================================================
// CASO 1: Comunidad Completa - CASO EXITOSO
// ============================================================

function generarComunidadCompletaExitosa() {
  const wb = XLSX.utils.book_new()

  // HOJA 1: Datos Generales
  const datosGenerales = [
    ['Código', 'Nombre', 'CIF', 'Dirección', 'Código Postal', 'Ciudad', 'Provincia', 'Email', 'Teléfono', 'Persona Contacto', 'Tipo Agrupación', 'Tipo Ubicación'],
    ['TEST01', 'Comunidad Test Plaza Mayor', 'H88888888', 'Plaza Mayor, 1', '28001', 'Madrid', 'Madrid', 'admin@test01.com', '912345678', 'Juan Pérez', 'Portal', 'Vivienda']
  ]
  const wsDatos = XLSX.utils.aoa_to_sheet(datosGenerales)
  XLSX.utils.book_append_sheet(wb, wsDatos, 'Datos Generales')

  // HOJA 2: Portales (3 portales)
  const portales = [
    ['Código Comunidad', 'Nombre Portal', 'Descripción', 'Orden'],
    ['TEST01', '1', 'Portal principal', 1],
    ['TEST01', '2', 'Portal trasero', 2],
    ['TEST01', 'A', 'Escalera A', 3]
  ]
  const wsPortales = XLSX.utils.aoa_to_sheet(portales)
  XLSX.utils.book_append_sheet(wb, wsPortales, 'Portales')

  // HOJA 3: Viviendas (8 viviendas distribuidas en los portales)
  const viviendas = [
    ['Código Comunidad', 'Portal', 'Nombre Vivienda', 'Descripción', 'Ref. Catastral', 'Orden'],
    ['TEST01', '1', '1ºA', '', '1234567AB01', 1],
    ['TEST01', '1', '1ºB', '', '1234567AB02', 2],
    ['TEST01', '1', '2ºA', '', '1234567AB03', 3],
    ['TEST01', '2', 'Bajo A', 'Local comercial', '1234567AB04', 1],
    ['TEST01', '2', '1ºA', '', '1234567AB05', 2],
    ['TEST01', 'A', 'Bajo', '', '1234567AB06', 1],
    ['TEST01', 'A', '1º', '', '1234567AB07', 2],
    ['TEST01', 'A', '2º', 'Ático', '1234567AB08', 3]
  ]
  const wsViviendas = XLSX.utils.aoa_to_sheet(viviendas)
  XLSX.utils.book_append_sheet(wb, wsViviendas, 'Viviendas')

  // HOJA 4: Precios (3 conceptos)
  const precios = [
    ['Código Comunidad', 'Código Concepto', 'Precio Unitario', 'Fecha Inicio'],
    ['TEST01', 'ACS', '6.45', '01/01/2024'],
    ['TEST01', 'CAL', '0.085', '01/01/2024'],
    ['TEST01', 'TF', '25.00', '01/01/2024']
  ]
  const wsPrecios = XLSX.utils.aoa_to_sheet(precios)
  XLSX.utils.book_append_sheet(wb, wsPrecios, 'Precios')

  // Guardar archivo
  XLSX.writeFile(wb, 'TEST_01_Comunidad_Completa_EXITOSA.xlsx')
  console.log('✅ Generado: TEST_01_Comunidad_Completa_EXITOSA.xlsx')
}

// ============================================================
// CASO 2: Comunidad Completa - CON DUPLICADOS
// ============================================================

function generarComunidadCompletaConDuplicados() {
  const wb = XLSX.utils.book_new()

  // HOJA 1: Datos Generales
  const datosGenerales = [
    ['Código', 'Nombre', 'CIF', 'Dirección', 'Código Postal', 'Ciudad', 'Provincia', 'Email', 'Teléfono', 'Persona Contacto', 'Tipo Agrupación', 'Tipo Ubicación'],
    ['TEST02', 'Comunidad Test Duplicados', 'H99999999', 'Calle Prueba, 2', '28002', 'Madrid', 'Madrid', 'admin@test02.com', '912345679', 'Ana García', 'Portal', 'Vivienda']
  ]
  const wsDatos = XLSX.utils.aoa_to_sheet(datosGenerales)
  XLSX.utils.book_append_sheet(wb, wsDatos, 'Datos Generales')

  // HOJA 2: Portales - CON PORTAL DUPLICADO (Portal "1" aparece 2 veces)
  const portales = [
    ['Código Comunidad', 'Nombre Portal', 'Descripción', 'Orden'],
    ['TEST02', '1', 'Portal principal', 1],
    ['TEST02', '2', 'Portal trasero', 2],
    ['TEST02', '1', 'DUPLICADO - Debe dar error', 3],  // ⚠️ DUPLICADO
    ['TEST02', '3', 'Portal lateral', 4]
  ]
  const wsPortales = XLSX.utils.aoa_to_sheet(portales)
  XLSX.utils.book_append_sheet(wb, wsPortales, 'Portales')

  // HOJA 3: Viviendas - CON VIVIENDA DUPLICADA (1ºA en portal 1 aparece 2 veces)
  const viviendas = [
    ['Código Comunidad', 'Portal', 'Nombre Vivienda', 'Descripción', 'Ref. Catastral', 'Orden'],
    ['TEST02', '1', '1ºA', '', '2234567AB01', 1],
    ['TEST02', '1', '1ºB', '', '2234567AB02', 2],
    ['TEST02', '1', '1ºA', 'DUPLICADO - Debe dar error', '2234567AB03', 3],  // ⚠️ DUPLICADO
    ['TEST02', '2', 'Bajo A', '', '2234567AB04', 1],
    ['TEST02', '2', '1ºA', '', '2234567AB05', 2]  // ✅ No es duplicado (diferente portal)
  ]
  const wsViviendas = XLSX.utils.aoa_to_sheet(viviendas)
  XLSX.utils.book_append_sheet(wb, wsViviendas, 'Viviendas')

  // HOJA 4: Precios
  const precios = [
    ['Código Comunidad', 'Código Concepto', 'Precio Unitario', 'Fecha Inicio'],
    ['TEST02', 'ACS', '7.20', '01/01/2024'],
    ['TEST02', 'CAL', '0.095', '01/01/2024']
  ]
  const wsPrecios = XLSX.utils.aoa_to_sheet(precios)
  XLSX.utils.book_append_sheet(wb, wsPrecios, 'Precios')

  XLSX.writeFile(wb, 'TEST_02_Comunidad_Completa_CON_DUPLICADOS.xlsx')
  console.log('⚠️  Generado: TEST_02_Comunidad_Completa_CON_DUPLICADOS.xlsx (debe detectar 2 duplicados)')
}

// ============================================================
// CASO 3: Comunidad Completa - CON ERRORES DE VALIDACIÓN
// ============================================================

function generarComunidadCompletaConErrores() {
  const wb = XLSX.utils.book_new()

  // HOJA 1: Datos Generales - FALTA CAMPO OBLIGATORIO
  const datosGenerales = [
    ['Código', 'Nombre', 'CIF', 'Dirección', 'Código Postal', 'Ciudad', 'Provincia', 'Email', 'Teléfono', 'Persona Contacto', 'Tipo Agrupación', 'Tipo Ubicación'],
    ['TEST03', 'Comunidad Test Errores', '', 'Calle Error, 3', '', 'Madrid', 'Madrid', '', '', '', 'Portal', 'Vivienda']
    // ⚠️ Faltan: CIF (opcional), CP (obligatorio)
  ]
  const wsDatos = XLSX.utils.aoa_to_sheet(datosGenerales)
  XLSX.utils.book_append_sheet(wb, wsDatos, 'Datos Generales')

  // HOJA 2: Portales - CON CÓDIGO COMUNIDAD INCORRECTO
  const portales = [
    ['Código Comunidad', 'Nombre Portal', 'Descripción', 'Orden'],
    ['TEST03', '1', 'Portal OK', 1],
    ['TEST03', '', 'Sin nombre - Error', 2],  // ⚠️ Falta nombre portal
    ['TEST_NOEXISTE', '2', 'Código comunidad inválido', 3]  // ⚠️ Comunidad no existe
  ]
  const wsPortales = XLSX.utils.aoa_to_sheet(portales)
  XLSX.utils.book_append_sheet(wb, wsPortales, 'Portales')

  // HOJA 3: Viviendas - CON PORTAL INEXISTENTE
  const viviendas = [
    ['Código Comunidad', 'Portal', 'Nombre Vivienda', 'Descripción', 'Ref. Catastral', 'Orden'],
    ['TEST03', '1', '1ºA', '', '3234567AB01', 1],
    ['TEST03', '1', '', 'Sin nombre - Error', '3234567AB02', 2],  // ⚠️ Falta nombre vivienda
    ['TEST03', 'PORTALINEXISTENTE', '1ºA', 'Portal no existe', '3234567AB03', 3],  // ⚠️ Portal no existe
    ['', '1', '2ºA', 'Sin código comunidad', '3234567AB04', 4]  // ⚠️ Falta código comunidad
  ]
  const wsViviendas = XLSX.utils.aoa_to_sheet(viviendas)
  XLSX.utils.book_append_sheet(wb, wsViviendas, 'Viviendas')

  // HOJA 4: Precios - CON CONCEPTO INEXISTENTE Y PRECIO INVÁLIDO
  const precios = [
    ['Código Comunidad', 'Código Concepto', 'Precio Unitario', 'Fecha Inicio'],
    ['TEST03', 'ACS', '6.50', '01/01/2024'],
    ['TEST03', 'CONCEPTOINVALIDO', '5.00', '01/01/2024'],  // ⚠️ Concepto no existe
    ['TEST03', 'CAL', 'TEXTO', '01/01/2024'],  // ⚠️ Precio no numérico
    ['TEST03', 'CLI', '3.50', 'FECHA_INVALIDA']  // ⚠️ Fecha inválida
  ]
  const wsPrecios = XLSX.utils.aoa_to_sheet(precios)
  XLSX.utils.book_append_sheet(wb, wsPrecios, 'Precios')

  XLSX.writeFile(wb, 'TEST_03_Comunidad_Completa_CON_ERRORES.xlsx')
  console.log('❌ Generado: TEST_03_Comunidad_Completa_CON_ERRORES.xlsx (debe detectar ~8 errores)')
}

// ============================================================
// CASO 4: Importación de Clientes - EXITOSA
// ============================================================

function generarClientesExitosos() {
  const wb = XLSX.utils.book_new()

  const clientes = [
    ['NIF', 'Nombre', 'Apellidos', 'Tipo', 'Email', 'Teléfono', 'Teléfono Secundario', 'IBAN', 'Titular Cuenta', 'Código Cliente', 'Dirección', 'Código Postal', 'Ciudad', 'Provincia', 'Código Comunidad', 'Portal', 'Vivienda'],
    ['12345678A', 'María', 'García López', 'propietario', 'maria@email.com', '600111111', '', 'ES1234567890123456789012', 'María García López', 'CLI001', '', '', '', '', 'TEST01', '1', '1ºA'],
    ['23456789B', 'Juan', 'Martínez Ruiz', 'propietario', 'juan@email.com', '600222222', '912222222', 'ES2345678901234567890123', 'Juan Martínez Ruiz', 'CLI002', '', '', '', '', 'TEST01', '1', '1ºB'],
    ['34567890C', 'Ana', 'Sánchez Pérez', 'inquilino', 'ana@email.com', '600333333', '', 'ES3456789012345678901234', 'Ana Sánchez Pérez', 'CLI003', 'C/ Ejemplo 10', '28010', 'Madrid', 'Madrid', 'TEST01', '1', '2ºA'],
    ['45678901D', 'Carlos', 'López Hernández', 'propietario', 'carlos@email.com', '600444444', '', '', '', 'CLI004', '', '', '', '', 'TEST01', '2', 'Bajo A'],
    ['56789012E', 'Laura', 'Fernández Gil', 'propietario', 'laura@email.com', '600555555', '', 'ES5678901234567890123456', 'Laura Fernández Gil', 'CLI005', '', '', '', '', 'TEST01', '2', '1ºA']
  ]

  const ws = XLSX.utils.aoa_to_sheet(clientes)
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')

  XLSX.writeFile(wb, 'TEST_04_Clientes_EXITOSOS.xlsx')
  console.log('✅ Generado: TEST_04_Clientes_EXITOSOS.xlsx')
}

// ============================================================
// CASO 5: Importación de Contadores con Conceptos - EXITOSA
// ============================================================

function generarContadoresExitosos() {
  const wb = XLSX.utils.book_new()

  // Contadores con columnas dinámicas de conceptos (ACS, CAL, TF)
  const contadores = [
    ['Nº Serie', 'Marca', 'Modelo', 'Fecha Instalación', 'Fecha Verificación', 'Código Comunidad', 'Portal', 'Vivienda', 'ACS_Lectura', 'ACS_Fecha', 'CAL_Lectura', 'CAL_Fecha', 'TF_Lectura', 'TF_Fecha', 'Observaciones'],
    ['CNT0001', 'Zenner', 'MTKD', '01/01/2023', '01/01/2024', 'TEST01', '1', '1ºA', 0, '01/01/2023', 0, '01/01/2023', 0, '01/01/2023', ''],
    ['CNT0002', 'Elster', 'BK-G4', '01/01/2023', '', 'TEST01', '1', '1ºB', 0, '01/01/2023', 0, '01/01/2023', '', '', 'Sin término fijo'],
    ['CNT0003', 'Zenner', 'MTKD', '01/01/2023', '01/01/2024', 'TEST01', '1', '2ºA', 0, '01/01/2023', 0, '01/01/2023', 0, '01/01/2023', ''],
    ['CNT0004', 'Sensus', '620M', '01/01/2023', '', 'TEST01', '2', 'Bajo A', 0, '01/01/2023', '', '', 0, '01/01/2023', 'Solo ACS y TF'],
    ['CNT0005', 'Zenner', 'MTKD', '01/01/2023', '01/01/2024', 'TEST01', '2', '1ºA', 0, '01/01/2023', 0, '01/01/2023', 0, '01/01/2023', '']
  ]

  const ws = XLSX.utils.aoa_to_sheet(contadores)
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')

  XLSX.writeFile(wb, 'TEST_05_Contadores_EXITOSOS.xlsx')
  console.log('✅ Generado: TEST_05_Contadores_EXITOSOS.xlsx')
}

// ============================================================
// CASO 6: Actualización de Comunidad Existente
// ============================================================

function generarActualizacionComunidad() {
  const wb = XLSX.utils.book_new()

  // Actualizar comunidad TEST01 (cambiar teléfono y añadir portales/viviendas)
  const datosGenerales = [
    ['Código', 'Nombre', 'CIF', 'Dirección', 'Código Postal', 'Ciudad', 'Provincia', 'Email', 'Teléfono', 'Persona Contacto', 'Tipo Agrupación', 'Tipo Ubicación'],
    ['TEST01', 'Comunidad Test Plaza Mayor (ACTUALIZADA)', 'H88888888', 'Plaza Mayor, 1', '28001', 'Madrid', 'Madrid', 'admin@test01.com', '918888888', 'Pedro Gómez (NUEVO)', 'Portal', 'Vivienda']
    // ⚠️ Cambios: Nombre, Teléfono, Persona Contacto
  ]
  const wsDatos = XLSX.utils.aoa_to_sheet(datosGenerales)
  XLSX.utils.book_append_sheet(wb, wsDatos, 'Datos Generales')

  // Añadir nuevo portal "B"
  const portales = [
    ['Código Comunidad', 'Nombre Portal', 'Descripción', 'Orden'],
    ['TEST01', 'B', 'Portal nuevo añadido', 4]  // ✅ NUEVO
  ]
  const wsPortales = XLSX.utils.aoa_to_sheet(portales)
  XLSX.utils.book_append_sheet(wb, wsPortales, 'Portales')

  // Añadir viviendas al portal B
  const viviendas = [
    ['Código Comunidad', 'Portal', 'Nombre Vivienda', 'Descripción', 'Ref. Catastral', 'Orden'],
    ['TEST01', 'B', 'Bajo', 'Vivienda nueva', '1234567AB09', 1],
    ['TEST01', 'B', '1º', 'Vivienda nueva', '1234567AB10', 2]
  ]
  const wsViviendas = XLSX.utils.aoa_to_sheet(viviendas)
  XLSX.utils.book_append_sheet(wb, wsViviendas, 'Viviendas')

  // Actualizar precio de ACS (aumentar a 7.00)
  const precios = [
    ['Código Comunidad', 'Código Concepto', 'Precio Unitario', 'Fecha Inicio'],
    ['TEST01', 'ACS', '7.00', '01/02/2024']  // ⚠️ Nuevo precio (anterior quedará histórico)
  ]
  const wsPrecios = XLSX.utils.aoa_to_sheet(precios)
  XLSX.utils.book_append_sheet(wb, wsPrecios, 'Precios')

  XLSX.writeFile(wb, 'TEST_06_Actualizacion_TEST01.xlsx')
  console.log('🔄 Generado: TEST_06_Actualizacion_TEST01.xlsx (actualiza comunidad existente)')
}

// ============================================================
// EJECUTAR GENERACIÓN DE TODOS LOS ARCHIVOS
// ============================================================

console.log('\n📦 Generando archivos Excel de prueba...\n')

generarComunidadCompletaExitosa()
generarComunidadCompletaConDuplicados()
generarComunidadCompletaConErrores()
generarClientesExitosos()
generarContadoresExitosos()
generarActualizacionComunidad()

console.log('\n✅ Todos los archivos de prueba generados correctamente\n')
console.log('📋 Resumen de archivos generados:')
console.log('   1. TEST_01_Comunidad_Completa_EXITOSA.xlsx       - ✅ Debe importarse sin errores')
console.log('   2. TEST_02_Comunidad_Completa_CON_DUPLICADOS.xlsx - ⚠️  Debe detectar 2 duplicados')
console.log('   3. TEST_03_Comunidad_Completa_CON_ERRORES.xlsx    - ❌ Debe detectar ~8 errores')
console.log('   4. TEST_04_Clientes_EXITOSOS.xlsx                 - ✅ Debe importar 5 clientes')
console.log('   5. TEST_05_Contadores_EXITOSOS.xlsx               - ✅ Debe importar 5 contadores')
console.log('   6. TEST_06_Actualizacion_TEST01.xlsx              - 🔄 Debe actualizar TEST01')
console.log('\n💡 Orden de prueba recomendado: 1 → 4 → 5 → 2 → 3 → 6\n')
