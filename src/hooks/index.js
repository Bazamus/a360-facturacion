// Comunidades, Agrupaciones, Ubicaciones, Precios
export {
  useComunidades,
  useComunidad,
  useCreateComunidad,
  useUpdateComunidad,
  useDeleteComunidad,
  useAgrupaciones,
  useCreateAgrupacion,
  useUpdateAgrupacion,
  useDeleteAgrupacion,
  useUbicaciones,
  useUbicacionesByComunidad,
  useCreateUbicacion,
  useUpdateUbicacion,
  useDeleteUbicacion,
  usePrecios,
  usePreciosVigentes,
  useCreatePrecio
} from './useComunidades'

// Clientes
export {
  useClientes,
  useClientesSimple,
  useCliente,
  useCreateCliente,
  useUpdateCliente,
  useAsignarClienteUbicacion,
  useFinalizarOcupacion
} from './useClientes'

// Contadores
export {
  useContadores,
  useContadoresSimple,
  useContador,
  useCreateContador,
  useUpdateContador,
  useDeleteContador,
  useVerificarContadorEliminable,
  useEliminarContadorPermanente,
  useAsignarConcepto,
  useDesasignarConcepto
} from './useContadores'

// Contador Conceptos (edición, corrección y historial)
export {
  useValidarEdicionLecturaInicial,
  useEditarLecturaInicial,
  useValidarCorreccionLecturaActual,
  useCorregirLecturaActual,
  useHistorialContadorConcepto
} from './useContadorConceptos'

// Conceptos
export {
  useConceptos,
  useConcepto,
  useCreateConcepto,
  useUpdateConcepto
} from './useConceptos'

// Estados de Cliente
export {
  useEstadosCliente,
  useEstadoCliente,
  useCreateEstadoCliente,
  useUpdateEstadoCliente
} from './useEstadosCliente'

// Configuración General
export {
  useConfiguracion,
  useActualizarSecuenciaFacturas
} from './useConfiguracion'

// Usuarios
export {
  useUsuarios,
  useCrearUsuario,
  useActualizarUsuario,
  useResetearPassword,
  useEliminarUsuario
} from './useUsuarios'

// Mantenimiento del Sistema
export {
  useResetSistema
} from './useMantenimiento'

// Lecturas e Importaciones
export {
  useImportaciones,
  useImportacion,
  useCreateImportacion,
  useUpdateImportacion,
  useImportacionDetalle,
  useCreateImportacionDetalle,
  useUpdateImportacionDetalle,
  useDescartarFilas,
  useConfirmarImportacion,
  useLecturas,
  useLecturasPendientes,
  useAlertasConfiguracion,
  useUpdateAlertaConfig,
  useContadorByNumeroSerie,
  useUltimaLectura,
  useMediaConsumo
} from './useLecturas'

// Facturas y Facturación
export {
  useFacturas,
  useFactura,
  useFacturaLineas,
  useFacturaHistoricoConsumo,
  useCreateFactura,
  useUpdateFactura,
  useDeleteFactura,
  useEliminarFacturas,
  useCreateFacturaLineas,
  useCreateFacturaHistorico,
  useEmitirFactura,
  useEmitirFacturasMasivo,
  useAnularFactura,
  useMarcarPagada,
  useLecturasPendientesFacturar,
  useHistoricoConsumo,
  useEstadisticasFacturacion
} from './useFacturas'

// Envíos de Email
export {
  useFacturasPendientesEnvio,
  useHistorialEnvios,
  useEnvio,
  useEnviosStats,
  useEnviosRecientes,
  useRebotesPendientes,
  useEmailConfig,
  useEnviarFactura,
  useEnviarFacturasMasivo,
  useReintentarEnvio,
  useUpdateEmailConfig,
  useCancelarEnvio
} from './useEnvios'

// Remesas SEPA y Mandatos
export {
  useRemesas,
  useRemesa,
  useFacturasParaRemesa,
  useConfiguracionSEPA,
  useMandatos,
  useMandatoActivo,
  useCrearRemesa,
  useGenerarXML,
  useActualizarEstadoRemesa,
  useEliminarRemesa,
  useCrearMandato,
  useActualizarMandato,
  useCancelarMandato,
  useUpdateConfiguracionSEPA
} from './useRemesas'

// Envíos Atascados
export {
  useDetectarEnviosAtascados,
  useLimpiarEnviosAtascados,
  useEnviosEnProceso,
  useCancelarEnvioAtascado
} from './useEnviosAtascados'

// Configuraciones de Reportes
export {
  useConfiguracionesUsuario,
  useConfiguracionesPorTipo,
  useConfiguracionReporte,
  useGuardarConfiguracion,
  useActualizarConfiguracion,
  useEliminarConfiguracion,
  useToggleFavorito,
  useDuplicarConfiguracion
} from './useReportesConfig'

// Comentarios Internos (Notas)
export {
  useComentarios,
  useAllComentarios,
  useNotasCount,
  useCreateComentario,
  useUpdateComentario,
  useDeleteComentario
} from './useComentarios'

// Permisos CRM
export {
  usePermisoCRM
} from './usePermisosCRM'

// Comunicaciones CRM
export {
  useComunicaciones,
  useComunicacionesStats,
  useRegistrarComunicacion,
  useArchivarComunicacion,
  useComunicacionesTrend,
  usePlantillas,
  useCreatePlantilla,
  useUpdatePlantilla,
  useDeletePlantilla,
  useCanalesConfig,
  useUpdateCanalConfig,
  useConversaciones,
  useMensajesConversacion,
  useArchivarConversacion
} from './useComunicaciones'

// SAT — Intervenciones
export {
  useIntervenciones,
  useIntervencion,
  useCrearIntervencion,
  useActualizarIntervencion,
  useCerrarIntervencion,
  useMaterialesIntervencion,
  useAnadirMaterialIntervencion,
  useEliminarMaterialIntervencion,
  useSATStats,
  useHistorialIntervencion,
  useEliminarIntervencion
} from './useIntervenciones'

// SAT — Citas
export {
  useCitas,
  useCita,
  useCrearCita,
  useActualizarCita,
  useCancelarCita,
  useAgendaTecnico
} from './useCitas'

// SAT — Contratos de Mantenimiento
export {
  useContratos,
  useContrato,
  useCrearContrato,
  useActualizarContrato
} from './useContratos'

// SAT — Materiales
export {
  useMateriales,
  useMaterial,
  useCrearMaterial,
  useActualizarMaterial
} from './useMateriales'

// SAT — Tickets
export {
  useTickets,
  useTicket,
  useCrearTicket,
  useActualizarTicket,
  useCrearIntervencionDesdeTicket,
  useTicketComentarios,
  useCrearComentario,
  useTicketsStats,
  useEliminarTicket
} from './useTickets'

// SAT — Equipos
export {
  useEquipos,
  useEquipo,
  useCrearEquipo,
  useActualizarEquipo
} from './useEquipos'

// Portal de Cliente
export {
  usePortalDatos,
  usePortalFacturas,
  usePortalTickets,
  usePortalCrearTicket,
  usePortalIntervenciones,
  usePortalContratos,
  usePortalEquipos,
  usePortalFacturaDetalle,
  usePortalHistorial
} from './usePortal'

// Gestión de Precios
export {
  useReferenciasEnergia,
  useUltimosValoresReferencia,
  useDescuentosVigentes,
  useHistorialAjustes,
  useRegistrarReferencia,
  useAplicarFactorPrecios,
  usePreviewActualizacion,
  useRecalcularFacturas,
  useCrearDescuento,
  useEliminarDescuento,
  useAplicarDescuentoFacturas,
  useAsignarReferenciaMasiva
} from './useGestionPrecios'

// Notificaciones in-app
export {
  useNotificaciones,
  useNotificacionesCount,
  useMarcarLeida,
  useMarcarTodasLeidas
} from './useNotificaciones'

// SAT — SLA
export {
  useSLADashboard,
  useSLAConfiguraciones,
  useCrearSLAConfig,
  useActualizarSLAConfig,
  useEliminarSLAConfig,
  useSLAIntervencion,
} from './useSLA'

// SAT — Parte de Trabajo PDF
export {
  useGenerarParteTrabajo,
  useDescargarParteTrabajo
} from './useParteTrabajo'

// Reportes y Dashboard
export {
  useDashboardMetricas,
  useEvolucionFacturacion,
  useReporteConsumos,
  useReporteFacturacion,
  useReporteMorosidad,
  useExportarExcel,
  useExportarCSV,
  calcularRangoFechas
} from './useReportes'
