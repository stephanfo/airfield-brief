/**
 * Utilitaires de criticité VFR
 *
 * Détermine les couleurs de fond, labels et niveaux en fonction
 * des seuils VFR configurables (voir useVfrThresholds).
 */

/**
 * Parse une chaîne ceiling METAR en altitude en pieds.
 * Seuls BKN, OVC et VV sont significatifs pour le plafond.
 *
 * @param {string|null} ceilingStr - Ex: "BKN020", "OVC045", "BKN020CB", "SCT030"
 * @returns {number|null} Altitude en pieds, ou null si pas de plafond significatif
 */
// Codes "pas de nuage significatif" : ciel clair, équivalent VFR favorable.
const NO_SIGNIFICANT_CLOUD = ['SKC', 'CLR', 'NSC', 'CAVOK', 'NCD']

/**
 * Indique si la chaîne ceiling correspond à un ciel clair (pas de plafond
 * significatif) — CAVOK, SKC, CLR, NSC, NCD. C'est une condition VFR favorable,
 * à distinguer de l'absence d'information (null).
 *
 * @param {string|null} ceilingStr
 * @returns {boolean}
 */
export function isClearSky(ceilingStr) {
  if (!ceilingStr) return false
  return NO_SIGNIFICANT_CLOUD.includes(ceilingStr.toUpperCase())
}

export function parseCeiling(ceilingStr) {
  if (!ceilingStr) return null

  if (NO_SIGNIFICANT_CLOUD.includes(ceilingStr.toUpperCase())) return null

  // BKN, OVC, VV sont les seuls qui constituent un vrai "plafond"
  const match = ceilingStr.match(/(BKN|OVC|VV)(\d{3})/)
  if (match) return parseInt(match[2]) * 100

  return null
}

/**
 * Humanise une valeur de visibilité en mètres en texte lisible.
 *
 * @param {number|string|null} value - Visibilité en mètres (ex: 9999, 4000, 800)
 * @returns {string} Texte lisible (ex: "> 10 km", "4 km", "800 m")
 */
export function formatVisibilityText(value) {
  if (value === null || value === undefined) return '-'
  const num = typeof value === 'string' ? parseInt(value) : value
  if (isNaN(num)) return String(value)
  if (num >= 9999) return '> 10 km'
  if (num >= 1000) return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)} km`
  return `${num} m`
}

/**
 * Humanise une chaîne ceiling METAR en texte lisible.
 *
 * @param {string|null} ceilingStr - Ex: "BKN020", "BKN020CB", "OVC045"
 * @returns {string} Texte lisible (ex: "2000 ft", "2000 ft ⛈")
 */
export function formatCeilingText(ceilingStr) {
  if (!ceilingStr) return '-'

  if (NO_SIGNIFICANT_CLOUD.includes(ceilingStr.toUpperCase())) return ceilingStr

  const match = ceilingStr.match(/([A-Z]{2,3})(\d{3})(CB|TCU)?/)
  if (!match) return ceilingStr

  const altitude = parseInt(match[2]) * 100
  const type = match[3]
  let text = `${altitude} ft`
  if (type === 'CB') text += ' ⛈'
  if (type === 'TCU') text += ' ☁↑'
  return text
}

/**
 * Retourne le niveau de criticité VFR pour un paramètre donné.
 *
 * @param {number|null} value - Valeur du paramètre
 * @param {'visibility'|'ceiling'|'wind'|'gust'|'crosswind'} paramType
 * @param {Object} thresholds - Seuils VFR (depuis useVfrThresholds)
 * @returns {'good'|'marginal'|'poor'} Niveau de criticité
 */
export function getVfrLevel(value, paramType, thresholds) {
  if (value === null || value === undefined) return 'good'

  const t = thresholds[paramType]
  if (!t) return 'good'

  // Visibilité et plafond : plus c'est haut, mieux c'est
  if (paramType === 'visibility' || paramType === 'ceiling') {
    if (value >= t.good) return 'good'
    if (value >= t.marginal) return 'marginal'
    return 'poor'
  }

  // Vent, rafales, vent traversier : plus c'est bas, mieux c'est
  if (value <= t.good) return 'good'
  if (value <= t.marginal) return 'marginal'
  return 'poor'
}

/**
 * Retourne la classe CSS de fond Quasar pour un niveau VFR.
 * Cohérent avec les patterns existants (bg-green-1, bg-orange-1, bg-red-1).
 */
export function getVfrBgClass(value, paramType, thresholds) {
  const level = getVfrLevel(value, paramType, thresholds)
  const classMap = {
    good: 'bg-green-1',
    marginal: 'bg-orange-1',
    poor: 'bg-red-1',
  }
  return classMap[level]
}

/**
 * Retourne le label textuel de criticité pour l'accessibilité (daltoniens).
 */
export function getVfrLabel(value, paramType, thresholds) {
  const level = getVfrLevel(value, paramType, thresholds)
  const labelMap = {
    good: 'VFR',
    marginal: 'Marginal',
    poor: 'Défavorable',
  }
  return labelMap[level]
}

/**
 * Retourne la classe de couleur de texte associée au niveau VFR.
 */
export function getVfrTextColor(value, paramType, thresholds) {
  const level = getVfrLevel(value, paramType, thresholds)
  const colorMap = {
    good: 'text-green-9',
    marginal: 'text-orange-9',
    poor: 'text-red-9',
  }
  return colorMap[level]
}

/**
 * Statut VFR complet d'un plafond brut METAR, gérant le ciel clair (CAVOK…).
 *
 * Distingue trois cas : ciel clair (CAVOK/SKC/CLR/NSC/NCD → vert « VFR »),
 * plafond significatif (BKN/OVC/VV → seuils) et absence d'information (null → gris).
 * Centralise la logique partagée par les cartes Conditions Estimées et Prévisions.
 *
 * @param {string|null} ceilingStr - Plafond brut METAR (ex: "CAVOK", "BKN020", null)
 * @param {Object} thresholds - Seuils VFR (depuis useVfrThresholds)
 * @returns {{hasStatus: boolean, ft: number|null, display: string,
 *   bgClass: string, label: string, textColor: string}}
 */
export function getCeilingStatus(ceilingStr, thresholds) {
  const clear = isClearSky(ceilingStr)
  const ft = parseCeiling(ceilingStr)
  const hasStatus = clear || ft !== null
  const display = formatCeilingText(ceilingStr)

  if (clear) {
    return {
      hasStatus,
      ft,
      display,
      bgClass: 'bg-green-1',
      label: 'VFR',
      textColor: 'text-green-9',
    }
  }

  return {
    hasStatus,
    ft,
    display,
    bgClass: ft !== null ? getVfrBgClass(ft, 'ceiling', thresholds) : 'bg-grey-2',
    label: getVfrLabel(ft, 'ceiling', thresholds),
    textColor: getVfrTextColor(ft, 'ceiling', thresholds),
  }
}

/**
 * Évalue le pire niveau VFR parmi un ensemble de paramètres.
 *
 * @param {Object} params - Ex: { visibility: 9999, ceiling: 2000, wind: 10, gust: 20 }
 * @param {Object} thresholds - Seuils VFR
 * @returns {'good'|'marginal'|'poor'} Le pire niveau trouvé
 */
export function getOverallVfrStatus(params, thresholds) {
  const levels = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([type, value]) => getVfrLevel(value, type, thresholds))

  if (levels.includes('poor')) return 'poor'
  if (levels.includes('marginal')) return 'marginal'
  return 'good'
}
