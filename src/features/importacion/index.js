/**
 * Feature: Importación/Exportación de Datos
 * Sistema de Facturación A360
 */

// Componentes
export {
  ImportDropzone,
  ImportPreview,
  ImportProgress,
  ImportErrors,
  ExportButton,
  ImportExportPanel
} from './components'

// Hooks
export { useImportExport } from './hooks'

// Utils
export {
  generarPlantillaVacia,
  exportarDatos,
  leerExcel,
  getColumnConfig,
  procesarComunidades,
  procesarClientes,
  procesarContadores,
  validarFilas
} from './utils'

// Services
export {
  getComunidadesParaExport,
  getClientesParaExport,
  getContadoresParaExport,
  contarRegistros
} from './services'

