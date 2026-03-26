import { normalizeForSearch } from './normalizeSearch'

/**
 * Escapa caracteres especiales de SQL LIKE (% y _).
 */
function escapeLikePattern(word) {
  return word.replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/**
 * Aplica filtros de busqueda multi-palabra a un query de Supabase.
 *
 * Divide el termino de busqueda en palabras y aplica un .or() por cada palabra
 * sobre todas las columnas indicadas. Como Supabase encadena .or() con AND,
 * el resultado es: cada palabra debe aparecer en al menos una columna.
 *
 * Ejemplo: applySearchFilters(query, "jose alarcon", ['nombre', 'apellidos'])
 *   → (nombre ILIKE '%jose%' OR apellidos ILIKE '%jose%')
 *     AND (nombre ILIKE '%alarcon%' OR apellidos ILIKE '%alarcon%')
 *
 * @param {Object} query - Supabase query builder
 * @param {string} searchTerm - Texto de busqueda del usuario
 * @param {string[]} columns - Columnas de la BD donde buscar
 * @returns {Object} Query modificado con los filtros aplicados
 */
export function applySearchFilters(query, searchTerm, columns) {
  if (!searchTerm || !searchTerm.trim() || !columns.length) return query

  const normalized = normalizeForSearch(searchTerm)
  const words = normalized.split(/\s+/).filter(w => w.length > 0)

  for (const word of words) {
    const escaped = escapeLikePattern(word)
    const orFilter = columns.map(col => `${col}.ilike.%${escaped}%`).join(',')
    query = query.or(orFilter)
  }

  return query
}
