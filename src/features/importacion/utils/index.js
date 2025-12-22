/**
 * Utilidades de Importación/Exportación
 * Sistema de Facturación A360
 */

export {
  generarPlantillaVacia,
  exportarDatos,
  leerExcel,
  getColumnConfig,
  generarConfigContadores,
  COLUMN_CONFIG
} from './excelGenerator'

export {
  limpiarCache,
  resolverComunidad,
  buscarAgrupacion,
  buscarOCrearAgrupacion,
  buscarUbicacion,
  buscarOCrearUbicacion,
  resolverUbicacionCompleta,
  buscarClientePorNif,
  buscarComunidadPorCodigo,
  buscarContadorPorSerie,
  buscarConceptoPorCodigo,
  obtenerConceptosActivos
} from './fieldResolvers'

export {
  procesarComunidades,
  procesarClientes,
  procesarContadores,
  validarFilas
} from './importProcessor'
