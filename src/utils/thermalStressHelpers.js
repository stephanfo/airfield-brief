/**
 * Utilitaires de stress thermique du pilote (FEAT-031)
 *
 * Détermine la zone d'agression thermique (faible / moyenne / significative /
 * élevée) à partir de la température de l'air et de l'humidité relative, selon
 * la grille FFA (voir THERMAL_STRESS_ZONES dans app.config.js).
 *
 * Sur le modèle de `vfrCriticality.js` : un mapper pur `getThermalStressLevel`
 * + des helpers de présentation (`thermalStressMeta`) et le texte des
 * recommandations FFA (`thermalStressRecommendations`).
 */

import { THERMAL_STRESS_ZONES, THERMAL_STRESS_AGE_SHIFT } from '../config/app.config'

/** Niveaux ordonnés du moins au plus sévère. */
export const THERMAL_STRESS_LEVELS = ['faible', 'moyenne', 'significative', 'elevee']

const HUMIDITY_COLUMNS = [10, 20, 30, 40, 50, 60, 70, 80, 90]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/**
 * Arrondit l'humidité à la colonne de 10 % la plus proche, bornée à [10, 90]
 * (comme un pilote lit la grille plastifiée).
 *
 * @param {number} humidity - Humidité relative en %
 * @returns {number} Colonne d'humidité (10, 20, … 90)
 */
export function nearestHumidityColumn(humidity) {
  const rounded = Math.round(humidity / 10) * 10
  return clamp(rounded, HUMIDITY_COLUMNS[0], HUMIDITY_COLUMNS[HUMIDITY_COLUMNS.length - 1])
}

/**
 * Retourne la zone de stress thermique de base (sans décalage personnel).
 *
 * @param {number|null} temperature - Température de l'air en °C
 * @param {number|null} humidity - Humidité relative en %
 * @returns {'faible'|'moyenne'|'significative'|'elevee'|null} Niveau, ou null si données absentes
 */
export function getThermalStressLevel(temperature, humidity) {
  if (
    temperature === null ||
    temperature === undefined ||
    humidity === null ||
    humidity === undefined ||
    Number.isNaN(temperature) ||
    Number.isNaN(humidity)
  ) {
    return null
  }

  const temp = Math.round(temperature)
  const column = THERMAL_STRESS_ZONES[nearestHumidityColumn(humidity)]
  if (!column) return null

  if (temp >= column.elevee) return 'elevee'
  if (temp >= column.significative) return 'significative'
  if (temp >= column.moyenne) return 'moyenne'
  return 'faible'
}

/**
 * Décale un niveau de `shiftCount` crans vers le plus sévère, borné à 'elevee'.
 * Implémente le nota FFA (« décaler d'une cellule vers le haut » par tranche
 * d'âge / pathologie).
 *
 * @param {string|null} level - Niveau de base
 * @param {number} shiftCount - Nombre de crans de décalage (>= 0)
 * @returns {string|null} Niveau décalé, ou null si level null
 */
export function applyPersonalShift(level, shiftCount) {
  if (!level) return null
  const idx = THERMAL_STRESS_LEVELS.indexOf(level)
  if (idx === -1) return level
  const shift = Math.max(0, Math.round(shiftCount || 0))
  const newIdx = Math.min(THERMAL_STRESS_LEVELS.length - 1, idx + shift)
  return THERMAL_STRESS_LEVELS[newIdx]
}

/**
 * Calcule le nombre de crans de décalage à partir des réglages personnels.
 *
 * @param {{ ageBracket?: string, pathologie?: boolean }} settings
 * @returns {number} Crans de décalage cumulés (âge + pathologie)
 */
export function getThermalStressShift(settings) {
  if (!settings) return 0
  const ageShift = THERMAL_STRESS_AGE_SHIFT[settings.ageBracket] ?? 0
  const pathoShift = settings.pathologie ? 1 : 0
  return ageShift + pathoShift
}

/**
 * Extrait la température / humidité « du moment » depuis les prévisions horaires.
 *
 * Parcourt tous les créneaux `hourly` des jours fournis et retourne celui dont
 * l'horodatage est le plus proche de `now`. Sert de source « présent » pour la
 * carte stress thermique depuis le seul flux forecast (plus de station locale).
 *
 * @param {Array<{ hourly?: Array<{ time: string, temp: number, humidity: number }> }>|null} days
 * @param {Date} [now] - Instant de référence (défaut : maintenant)
 * @returns {{ temperature: number, humidity: number, time: string }|null}
 */
export function currentFromForecast(days, now = new Date()) {
  if (!Array.isArray(days) || days.length === 0) return null
  const target = now.getTime()
  let best = null
  let bestDelta = Infinity
  for (const day of days) {
    for (const h of day?.hourly || []) {
      const t = new Date(h.time).getTime()
      if (Number.isNaN(t)) continue
      const delta = Math.abs(t - target)
      if (delta < bestDelta) {
        bestDelta = delta
        best = { temperature: h.temp, humidity: h.humidity, time: h.time }
      }
    }
  }
  return best
}

/**
 * Pic de chaleur (température max + humidité associée) du jour courant dans les
 * prévisions. Sert à la bannière d'accueil : indique le risque au plus chaud de
 * la journée, pas l'instant présent.
 *
 * @param {Array<{ date: string, peakTemp?: number, peakHumidity?: number }>|null} days
 * @param {Date} [now] - Instant de référence (défaut : maintenant)
 * @returns {{ temperature: number, humidity: number }|null}
 */
export function todayPeakFromForecast(days, now = new Date()) {
  if (!Array.isArray(days) || days.length === 0) return null
  const today = now.toISOString().slice(0, 10)
  const day = days.find((d) => d?.date === today) || days[0]
  if (!day || typeof day.peakTemp !== 'number' || typeof day.peakHumidity !== 'number') {
    return null
  }
  return { temperature: day.peakTemp, humidity: day.peakHumidity }
}

/**
 * Métadonnées de présentation d'un niveau (cohérent charte UI : bg-X-1 / text-X-9).
 *
 * @param {string|null} level
 * @returns {{ level: string, label: string, bgClass: string, textColor: string, color: string, icon: string }}
 */
export function thermalStressMeta(level) {
  const map = {
    faible: {
      label: 'Faible',
      bgClass: 'bg-green-1',
      textColor: 'text-green-9',
      color: 'positive',
      icon: 'check_circle',
    },
    moyenne: {
      label: 'Moyenne',
      bgClass: 'bg-yellow-1',
      textColor: 'text-yellow-9',
      color: 'warning',
      icon: 'thermostat',
    },
    significative: {
      label: 'Significative',
      bgClass: 'bg-orange-1',
      textColor: 'text-orange-9',
      color: 'orange',
      icon: 'warning',
    },
    elevee: {
      label: 'Élevée',
      bgClass: 'bg-red-1',
      textColor: 'text-red-9',
      color: 'negative',
      icon: 'local_fire_department',
    },
  }
  return map[level] || map.faible
}

/**
 * Recommandations FFA (« éléments d'attention particulière ») de la zone.
 * Texte verbatim du document Commission Prévention Sécurité FFA (2025_07_01).
 *
 * @param {string|null} level
 * @returns {string[]} Liste des recommandations
 */
export function thermalStressRecommendations(level) {
  const map = {
    faible: ['Aucune précaution particulière à prévoir.'],
    moyenne: [
      'Coup de chaleur possible mais exceptionnel (fonction de l’âge, de la morphologie, de la condition physique et d’éventuelles pathologies).',
      'Prévention du rayonnement sur l’aéronef en cas de stationnement extérieur.',
      'Ventilation cabine conseillée en cas d’attente.',
      'Plusieurs vols possibles par 24 h, si repos suffisant entre chaque vol.',
      'Activité physique préalable au vol possible si sensation d’être reposé avant le vol.',
      'Prévoir de quoi s’hydrater en quantité suffisante pendant le vol.',
    ],
    significative: [
      'Risque potentiel de coup de chaleur.',
      'Stationnement prolongé de l’avion sous abri.',
      'Réduire autant que possible l’attente au départ.',
      'Deux vols maxi par 24 h, avec repos obligatoire entre les 2.',
      'Activité physique modérée possible si repos de 4 h avant vol.',
      'Forte hydratation nécessaire avant, pendant et après le vol.',
    ],
    elevee: [
      'Risque très important de coup de chaleur.',
      'Avion obligatoirement sous abri (quand les infrastructures le permettent).',
      'Attente au départ limitée au strict nécessaire.',
      'Si fin d’un vol en zone rouge, aucun autre vol dans les 24 h.',
      'Absence totale d’activité physique avant un vol.',
      'Très forte hydratation nécessaire avant, pendant et après le vol.',
    ],
  }
  return map[level] || []
}
