const XLSX = require('xlsx');

// Leer Excel
const wb = XLSX.readFile('TEST_05_Contadores_EXITOSOS.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

const headers = jsonData[0];
const firstRow = jsonData[1];

console.log('=== HEADERS DEL EXCEL ===');
headers.forEach((h, i) => console.log(`[${i}] ${h}`));

console.log('\n=== PRIMERA FILA (valores crudos) ===');
firstRow.forEach((v, i) => console.log(`[${i}] ${headers[i]}: ${v} (type: ${typeof v})`));

// Config estática de contadores (sin conceptos)
const staticConfig = {
  headers: [
    'Nº Serie', 'Marca', 'Modelo', 'Fecha Instalación', 'Fecha Verificación',
    'Código Comunidad', 'Portal', 'Vivienda', 'Observaciones'
  ],
  fields: [
    'numero_serie', 'marca', 'modelo', 'fecha_instalacion', 'fecha_ultima_verificacion',
    'comunidad_codigo', 'agrupacion_nombre', 'ubicacion_nombre', 'observaciones'
  ]
};

console.log('\n=== SIMULANDO MAPEO DE leerExcel() ===');
const obj = { _rowIndex: 2 };

headers.forEach((header, colIndex) => {
  // Usar la misma lógica que excelGenerator.js línea 469-470
  const cellValue = firstRow[colIndex];
  const value = cellValue !== undefined && cellValue !== null ? cellValue : null;

  const fieldIndex = staticConfig.headers.indexOf(header);
  if (fieldIndex !== -1) {
    const field = staticConfig.fields[fieldIndex];
    obj[field] = value;
    console.log(`✅ Mapeado estático: '${header}' -> '${field}' = ${value} (cellValue: ${cellValue}, type: ${typeof cellValue})`);
  } else {
    const headerLower = header?.toLowerCase() || '';
    if (headerLower.endsWith('_lectura') || headerLower.endsWith('_fecha')) {
      obj[headerLower] = value;
      console.log(`🔵 Mapeado dinámico: '${header}' -> '${headerLower}' = ${value} (cellValue: ${cellValue}, type: ${typeof cellValue})`);
    } else {
      console.log(`❌ NO mapeado: '${header}'`);
    }
  }
});

console.log('\n=== OBJETO PARSEADO FINAL ===');
console.log(JSON.stringify(obj, null, 2));

console.log('\n=== KEYS QUE TERMINEN EN _lectura o _fecha ===');
const conceptKeys = Object.keys(obj).filter(key => key.endsWith('_lectura') || key.endsWith('_fecha'));
console.log(`Total encontradas: ${conceptKeys.length}`);
conceptKeys.forEach(key => {
  console.log(`  ${key}: ${obj[key]}`);
});

// Simular detectarConceptosEnFila()
console.log('\n=== SIMULANDO detectarConceptosEnFila() ===');
const codigosEncontrados = new Set();

Object.keys(obj).forEach(key => {
  const keyLower = key.toLowerCase();
  if (keyLower.endsWith('_lectura')) {
    const codigo = keyLower.replace('_lectura', '').toUpperCase();
    codigosEncontrados.add(codigo);
    console.log(`  Encontrado codigo: ${codigo} (via ${key})`);
  } else if (keyLower.endsWith('_fecha')) {
    const codigo = keyLower.replace('_fecha', '').toUpperCase();
    codigosEncontrados.add(codigo);
    console.log(`  Encontrado codigo: ${codigo} (via ${key})`);
  }
});

console.log(`\nCódigos únicos detectados: ${Array.from(codigosEncontrados).join(', ')}`);

// Verificar si pasarían la validación
console.log('\n=== VALIDACIÓN DE CONCEPTOS ===');
codigosEncontrados.forEach(codigo => {
  const lecturaKey = `${codigo.toLowerCase()}_lectura`;
  const fechaKey = `${codigo.toLowerCase()}_fecha`;

  const lecturaValue = obj[lecturaKey];
  const fechaValue = obj[fechaKey];

  console.log(`\n  Código: ${codigo}`);
  console.log(`    lecturaKey: '${lecturaKey}' -> value: ${lecturaValue} (type: ${typeof lecturaValue})`);
  console.log(`    fechaKey: '${fechaKey}' -> value: ${fechaValue} (type: ${typeof fechaValue})`);

  const validLectura = lecturaValue !== null && lecturaValue !== undefined && lecturaValue !== '';
  const validFecha = fechaValue !== null && fechaValue !== undefined && fechaValue !== '';

  console.log(`    validLectura: ${validLectura}`);
  console.log(`    validFecha: ${validFecha}`);
  console.log(`    ¿Pasa validación?: ${validLectura && validFecha ? '✅ SÍ' : '❌ NO'}`);
});
