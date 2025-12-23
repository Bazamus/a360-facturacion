/**
 * Exportaciones de utilidades de lecturas
 * Sistema de Facturación A360
 */

// Parseo de fechas
export {
  parseDate,
  formatDate,
  formatDateISO,
  isSameDay,
  isFutureDate
} from './dateParsers'

// Parseo de números
export {
  parseNumber,
  parseNumberWithValidation,
  formatNumber,
  formatCurrency,
  round2,
  round4,
  isNumeric
} from './numberParsers'

// Parseo de Excel
export {
  readExcelFile,
  detectFixedColumns,
  detectConceptColumns,
  analyzeExcelStructure,
  extractRowData,
  parseString,
  getPreviewData,
  COLUMN_MAPPINGS
} from './excelParser'

// Procesamiento de lecturas
export {
  processRow,
  groupLecturasByContador,
  calculateStats
} from './lecturaProcessor'



