-- Migración 072: Eliminar triggers de auto-creación de citas
-- Los triggers auto-creaban una cita para el siguiente día laborable al asignar técnico,
-- lo que producía fechas confusas para el usuario. Se sustituye por un modal opcional
-- en el flujo de creación/edición de intervenciones.

DROP TRIGGER IF EXISTS trg_auto_crear_cita_intervencion ON intervenciones;
DROP TRIGGER IF EXISTS trg_auto_crear_cita_on_insert ON intervenciones;

DROP FUNCTION IF EXISTS trigger_auto_crear_cita_intervencion();
DROP FUNCTION IF EXISTS trigger_auto_crear_cita_on_insert();
