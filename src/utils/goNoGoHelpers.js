/**
 * Helpers d'évaluation Go / No-Go VFR
 *
 * evaluateGoNoGo() est la seule fonction publique à appeler.
 * Elle est pure (pas d'effet de bord) et testable indépendamment (TECH-001).
 */

import { getVfrLevel, getOverallVfrStatus, parseCeiling } from './vfrCriticality'
import { worstCrosswind } from './windHelpers'

/**
 * Évalue le statut Go/No-Go à partir des conditions actuelles et des seuils VFR.
 *
 * @param {Object} conditions - Données issues de weather.json → current
 * @param {number|null} conditions.windDir - Direction vent (degrés)
 * @param {number|null} conditions.windSpeed - Vent établi (nœuds)
 * @param {number|null} conditions.windGust - Rafales (nœuds, peut être null)
 * @param {number|null} conditions.visibility - Visibilité (mètres)
 * @param {string|null} conditions.ceiling - Plafond brut METAR (ex: "BKN020", "CAVOK")
 * @param {number} [conditions.runwayHeading=250] - Cap piste pour le calcul traversier
 * @param {Object} thresholds - Seuils VFR (depuis useVfrThresholds)
 * @returns {{
 *   status: 'good'|'marginal'|'poor',
 *   criteria: Array<{key: string, label: string, value: number|null, level: 'good'|'marginal'|'poor', formatted: string}>
 * }}
 */
export function evaluateGoNoGo(conditions, thresholds) {
  const {
    windDir = null,
    windSpeed = null,
    windGust = null,
    visibility = null,
    ceiling: ceilingStr = null,
    runwayHeading = 250,
  } = conditions

  const ceilingFt = parseCeiling(ceilingStr)
  const crosswindKt = worstCrosswind(windDir, windSpeed, windGust, runwayHeading)

  const criteria = [
    {
      key: 'wind',
      label: 'Vent établi',
      value: windSpeed,
      level: getVfrLevel(windSpeed, 'wind', thresholds),
      formatted: windSpeed != null ? `${windSpeed} kt` : '—',
    },
    {
      key: 'gust',
      label: 'Rafales',
      value: windGust,
      level: getVfrLevel(windGust, 'gust', thresholds),
      formatted: windGust != null ? `${windGust} kt` : '—',
    },
    {
      key: 'crosswind',
      label: 'Vent traversier',
      value: crosswindKt,
      level: getVfrLevel(crosswindKt, 'crosswind', thresholds),
      formatted: `${crosswindKt} kt`,
    },
    {
      key: 'visibility',
      label: 'Visibilité',
      value: visibility,
      level: getVfrLevel(visibility, 'visibility', thresholds),
      formatted: _formatVisibility(visibility),
    },
    {
      key: 'ceiling',
      label: 'Plafond',
      value: ceilingFt,
      level: getVfrLevel(ceilingFt, 'ceiling', thresholds),
      formatted: ceilingFt != null ? `${ceilingFt} ft` : (ceilingStr ?? '—'),
    },
  ]

  // Exclure les critères sans valeur significative (rafales absentes, CAVOK…)
  const evaluableCriteria = criteria.filter((c) => c.value != null)

  const params = Object.fromEntries(evaluableCriteria.map((c) => [c.key, c.value]))
  const status = getOverallVfrStatus(params, thresholds)

  return { status, criteria }
}

/** @param {string} key - Clé de critère (wind, gust, crosswind, visibility, ceiling) */
export function criterionIcon(key) {
  return (
    {
      wind: 'air',
      gust: 'storm',
      crosswind: 'swap_horiz',
      visibility: 'visibility',
      ceiling: 'cloud',
    }[key] ?? 'circle'
  )
}

/** @param {'good'|'marginal'|'poor'} level */
export function criterionLevelColor(level) {
  return { good: 'positive', marginal: 'warning', poor: 'negative' }[level] ?? 'grey'
}

/** @param {'good'|'marginal'|'poor'} level */
export function criterionLevelLabel(level) {
  return { good: 'VFR', marginal: 'Marginal', poor: 'Défavorable' }[level] ?? ''
}

/**
 * Mappe le statut Go/No-Go vers un libellé pilote.
 * @param {'good'|'marginal'|'poor'} status
 * @returns {{ label: string, color: string, icon: string }}
 */
export function goNoGoMeta(status) {
  const map = {
    good: { label: 'GO', color: 'positive', icon: 'check_circle' },
    marginal: { label: 'CAUTION', color: 'warning', icon: 'warning' },
    poor: { label: 'NO-GO', color: 'negative', icon: 'cancel' },
  }
  return map[status] ?? map['marginal']
}

/** @param {number|null} m */
function _formatVisibility(m) {
  if (m == null) return '—'
  if (m >= 9999) return '> 10 km'
  if (m >= 1000) return `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)} km`
  return `${m} m`
}
