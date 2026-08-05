/**
 * Helpers pour la représentation visuelle de la confiance (probabilité IA).
 * Utilisé par les chips de confiance des conditions estimées, prévisions 6h
 * et scénarios alternatifs.
 */

/**
 * Mappe un pourcentage de confiance vers une couleur Quasar.
 * Seuils : ≥80 favorable, 50-79 marginal, <50 défavorable.
 * @param {number|null|undefined} pct - Pourcentage de confiance (0-100)
 * @returns {'positive'|'warning'|'negative'|'grey'}
 */
export function confidenceColor(pct) {
  if (pct == null) return 'grey'
  if (pct >= 80) return 'positive'
  if (pct >= 50) return 'warning'
  return 'negative'
}
