-- Permite al técnico leer intervenciones vinculadas a sus tickets asignados.
-- Sin esta política, el embed intervenciones en useTicket filtraba la fila padre
-- (el join de PostgREST aplicaba el RLS de intervenciones con inner-join semántics,
-- devolviendo 0 filas → 406 Not Acceptable con .single()).

CREATE POLICY "Tecnico ve intervenciones de sus tickets"
  ON intervenciones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'tecnico'
    )
    AND EXISTS (
      SELECT 1 FROM tickets_sat
      WHERE tickets_sat.intervencion_id = intervenciones.id
        AND tickets_sat.asignado_a = auth.uid()
    )
  );
