/**
 * Utilidades para búsquedas insensibles a mayúsculas en Supabase/PostgREST.
 * - Cada palabra (token) debe aparecer en al menos uno de los campos (OR entre campos).
 * - Todas las palabras deben cumplirse (AND entre tokens).
 * Así "jose alberto alarcon" encuentra nombre="JOSE ALBERTO" + apellidos="ALARCON LAMA".
 */

/**
 * Quita caracteres que actúan como comodines en ILIKE (% _) y comas (rompen el .or() de PostgREST).
 */
export function sanitizeIlikeToken(token) {
  if (token == null || typeof token !== 'string') return ''
  return token.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Parte el texto de búsqueda en tokens por espacios.
 */
export function searchTokens(search) {
  if (search == null || String(search).trim() === '') return []
  return String(search)
    .trim()
    .split(/\s+/)
    .map(sanitizeIlikeToken)
    .filter(Boolean)
}

/**
 * Aplica a un query builder de Supabase filtros ilike por tokens.
 * @param {import('@supabase/supabase-js').PostgrestFilterBuilder} query
 * @param {string} search - Texto del usuario
 * @param {string[]} columns - Nombres de columna (sin comillas)
 * @returns {typeof query}
 */
export function applyTokenizedIlikeOr(query, search, columns) {
  const tokens = searchTokens(search)
  if (tokens.length === 0 || !columns?.length) return query

  let q = query
  for (const token of tokens) {
    const pattern = `%${token}%`
    const clause = columns.map((col) => `${col}.ilike.${pattern}`).join(',')
    q = q.or(clause)
  }
  return q
}
