/**
 * Helper de búsqueda para Supabase/PostgREST.
 * Aplica filtros `ilike` sobre múltiples columnas con tokenización por espacios:
 * - OR entre columnas para cada token
 * - AND entre tokens (encadenando .or)
 *
 * Se mantiene este helper para compatibilidad con imports existentes.
 */
export function applySearchFilters(query, search, columns = []) {
  if (!search || !String(search).trim() || !columns?.length) return query

  const tokens = String(search)
    .trim()
    .split(/\s+/)
    .map((t) => String(t).replace(/[%_,]/g, ' ').trim())
    .filter(Boolean)

  let q = query
  for (const token of tokens) {
    const pattern = `%${token}%`
    const clause = columns.map((col) => `${col}.ilike.${pattern}`).join(',')
    q = q.or(clause)
  }
  return q
}

