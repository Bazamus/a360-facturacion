/**
 * Normaliza un string para búsqueda: minúsculas y sin acentos.
 * Permite comparaciones insensibles a mayúsculas/minúsculas y diacríticos.
 * @param {string} str - Texto a normalizar
 * @returns {string} - Texto en minúsculas sin acentos (vacío si str no es string)
 */
export function normalizeForSearch(str) {
  if (str == null || typeof str !== 'string') return ''
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/**
 * Indica si el texto completo incluye el indicio de búsqueda (normalizado).
 * @param {string} fullText - Texto donde buscar (ej. codigo + ' ' + nombre)
 * @param {string} searchTerm - Indicio de búsqueda
 * @returns {boolean}
 */
export function matchesSearch(fullText, searchTerm) {
  if (!searchTerm || !searchTerm.trim()) return true
  const normalizedFull = normalizeForSearch(fullText)
  const normalizedSearch = normalizeForSearch(searchTerm)
  return normalizedFull.includes(normalizedSearch)
}
