/**
 * Utilitaires pour la station météo locale du terrain
 * Calculs point de rosée, QNH, et constantes terrain
 */
import { CLUB_CONFIG } from '../config/club.config'

/** Altitude de l'aérodrome en mètres (utilisée pour la conversion QFE → QNH). */
export const FIELD_ALTITUDE_M = CLUB_CONFIG.airfield.elevationM

// Source unique : windHelpers.js — ré-exporté ici pour compatibilité des importeurs existants
export { RUNWAY_HEADING } from './windHelpers'

/**
 * Calcule le point de rosée à partir de la température et de l'humidité relative
 * Formule de Magnus (approximation Alduchov 1996)
 *
 * @param {number} tempC - Température en °C
 * @param {number} humidityPct - Humidité relative en %
 * @returns {number} Point de rosée en °C (arrondi à 1 décimale)
 */
export function calculateDewPoint(tempC, humidityPct) {
  if (humidityPct <= 0 || humidityPct > 100 || tempC == null || humidityPct == null) {
    return null
  }

  const a = 17.27
  const b = 237.7

  const alpha = (a * tempC) / (b + tempC) + Math.log(humidityPct / 100)
  const dewPoint = (b * alpha) / (a - alpha)

  return Math.round(dewPoint * 10) / 10
}

/**
 * Calcule le QNH (pression ramenée au niveau de la mer) à partir du QFE (pression station)
 * Formule barométrique ISA standard
 *
 * @param {number} qfeHpa - Pression station (QFE) en hPa
 * @param {number} [altitudeM=FIELD_ALTITUDE_M] - Altitude de la station en mètres
 * @returns {number} QNH en hPa (arrondi à 1 décimale)
 */
export function calculateQNH(qfeHpa, altitudeM = FIELD_ALTITUDE_M) {
  if (qfeHpa == null || qfeHpa <= 0) {
    return null
  }

  // Atmosphère standard ISA : T0 = 288.15 K, gradient = 0.0065 K/m
  const T0 = 288.15
  const exponent = 5.2561

  const qnh = qfeHpa * Math.pow(1 + (0.0065 * altitudeM) / T0, exponent)

  return Math.round(qnh * 10) / 10
}

/**
 * Calcule la tendance barométrique
 * Compare la pression actuelle avec celle d'il y a ~3h
 *
 * @param {Array} data - Tableau de points de données avec pressure_hpa et time_slot
 * @returns {{ trend: 'rising' | 'falling' | 'stable', delta: number }} Tendance et delta en hPa
 */
export function calculatePressureTrend(data) {
  if (!data || data.length < 4) {
    return { trend: 'stable', delta: 0 }
  }

  const latest = data[data.length - 1]
  // Chercher le point le plus proche de 3h avant le dernier
  const latestTime = new Date(latest.time_slot).getTime()
  const targetTime = latestTime - 3 * 60 * 60 * 1000

  let closest = data[0]
  let closestDiff = Math.abs(new Date(data[0].time_slot).getTime() - targetTime)

  for (const point of data) {
    const diff = Math.abs(new Date(point.time_slot).getTime() - targetTime)
    if (diff < closestDiff) {
      closest = point
      closestDiff = diff
    }
  }

  const delta = Math.round((latest.pressure_hpa - closest.pressure_hpa) * 10) / 10

  if (delta > 1) return { trend: 'rising', delta }
  if (delta < -1) return { trend: 'falling', delta }
  return { trend: 'stable', delta }
}

/**
 * Labels des 8 secteurs de la rose des vents
 */
export const WIND_SECTORS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

/**
 * Noms complets des directions cardinales (8 directions)
 */
export const CARDINAL_NAMES = {
  N: 'Nord',
  NE: 'Nord-Est',
  E: 'Est',
  SE: 'Sud-Est',
  S: 'Sud',
  SW: 'Sud-Ouest',
  W: 'Ouest',
  NW: 'Nord-Ouest',
}

/**
 * Convertit une direction en degrés vers une direction cardinale (8 secteurs)
 * @param {number} degrees - Direction en degrés (0-360)
 * @param {boolean} fullName - Si true, retourne le nom complet (ex: "Nord"), sinon l'abréviation (ex: "N")
 * @returns {string} Direction cardinale
 */
export function degreesToCardinal(degrees, fullName = true) {
  if (degrees == null || degrees < 0 || degrees > 360) return '—'

  // Normaliser : ajouter 22.5° pour centrer les secteurs, puis diviser par 45°
  const normalized = (degrees + 22.5) % 360
  const sectorIndex = Math.floor(normalized / 45)

  const abbr = WIND_SECTORS[sectorIndex]
  return fullName ? CARDINAL_NAMES[abbr] : abbr
}

/**
 * Labels des 16 secteurs de la rose des vents (granularité 22.5°)
 * Utilisé pour wind_rose pré-agrégée
 */
export const WIND_SECTORS_16 = [
  { label: 'N', angle: 0, abbr: '↓' },
  { label: 'NNE', angle: 22.5, abbr: '↓↙' },
  { label: 'NE', angle: 45, abbr: '↙' },
  { label: 'ENE', angle: 67.5, abbr: '↙←' },
  { label: 'E', angle: 90, abbr: '←' },
  { label: 'ESE', angle: 112.5, abbr: '←↖' },
  { label: 'SE', angle: 135, abbr: '↖' },
  { label: 'SSE', angle: 157.5, abbr: '↖↑' },
  { label: 'S', angle: 180, abbr: '↑' },
  { label: 'SSW', angle: 202.5, abbr: '↑↗' },
  { label: 'SW', angle: 225, abbr: '↗' },
  { label: 'WSW', angle: 247.5, abbr: '↗→' },
  { label: 'W', angle: 270, abbr: '→' },
  { label: 'WNW', angle: 292.5, abbr: '→↘' },
  { label: 'NW', angle: 315, abbr: '↘' },
  { label: 'NNW', angle: 337.5, abbr: '↘↓' },
]

/**
 * Trouve l'index du secteur (0-15) pour une direction donnée
 * @param {number} degrees - Direction en degrés (0-360)
 * @returns {number} Index du secteur 0-15
 */
function getSectorIndex16(degrees) {
  // Normaliser : 0° = N, 90° = E, 180° = S, 270° = W
  // Chaque secteur = 22.5°, centré sur son angle
  // Exemple : secteur N (0°) couvre 348.75° - 11.25°
  const normalized = (degrees + 11.25 + 360) % 360
  return Math.floor(normalized / 22.5)
}

/**
 * Agrège les données wind_rose en 16 secteurs pour la rose des vents
 * Exploite les données pré-agrégées (dir, speed_bin, count) du backend
 *
 * @param {Array} windRoseData - Tableau complet wind_rose de wind_history.json
 *   Format: [{dir, speed_bin, time_slot, count}]
 * @param {number|Object} periodOrRange - Soit le nombre d'heures (2, 6, 12, 24),
 *   soit un objet {startTime: Date|string, endTime: Date|string} pour une plage custom
 * @returns {Array<{ sector: string, angle: number, bin0: number, bin5: number, bin10: number,
 *                    bin15: number, bin20: number, bin25: number, total: number, frequency: number,
 *                    freq0: number, freq5: number, freq10: number, freq15: number, freq20: number, freq25: number }>}
 */
export function aggregateWindRose(windRoseData, periodOrRange) {
  if (!windRoseData || !Array.isArray(windRoseData) || windRoseData.length === 0) {
    return []
  }

  // 1. Filtrer par période ou plage de temps
  let filtered
  if (typeof periodOrRange === 'number') {
    // Mode classique : dernières N heures
    const cutoffTime = Date.now() - periodOrRange * 60 * 60 * 1000
    filtered = windRoseData.filter((d) => new Date(d.time_slot).getTime() >= cutoffTime)
  } else if (periodOrRange && periodOrRange.startTime && periodOrRange.endTime) {
    // Mode custom : plage de temps spécifique
    const startTs = new Date(periodOrRange.startTime).getTime()
    const endTs = new Date(periodOrRange.endTime).getTime()
    filtered = windRoseData.filter((d) => {
      const ts = new Date(d.time_slot).getTime()
      return ts >= startTs && ts <= endTs
    })
  } else {
    // Pas de filtre, utiliser toutes les données
    filtered = windRoseData
  }

  if (filtered.length === 0) {
    return WIND_SECTORS_16.map((s) => ({
      sector: s.label,
      angle: s.angle,
      bin0: 0,
      bin5: 0,
      bin10: 0,
      bin15: 0,
      bin20: 0,
      bin25: 0,
      total: 0,
      frequency: 0,
      freq0: 0,
      freq5: 0,
      freq10: 0,
      freq15: 0,
      freq20: 0,
      freq25: 0,
    }))
  }

  // 2. Initialiser 16 secteurs
  const sectors = WIND_SECTORS_16.map((s) => ({
    sector: s.label,
    angle: s.angle,
    bin0: 0, // Count 0-5 kt
    bin5: 0, // Count 5-10 kt
    bin10: 0, // Count 10-15 kt
    bin15: 0, // Count 15-20 kt
    bin20: 0, // Count 20-25 kt
    bin25: 0, // Count >25 kt
    total: 0, // Count total pour ce secteur
  }))

  // 3. Grouper par secteur et speed_bin
  filtered.forEach((point) => {
    const sectorIdx = getSectorIndex16(point.dir) // dir → index secteur 0-15
    const sector = sectors[sectorIdx]

    // Agréger les counts par speed_bin
    if (point.speed_bin === 0) sector.bin0 += point.count
    else if (point.speed_bin === 5) sector.bin5 += point.count
    else if (point.speed_bin === 10) sector.bin10 += point.count
    else if (point.speed_bin === 15) sector.bin15 += point.count
    else if (point.speed_bin === 20) sector.bin20 += point.count
    else if (point.speed_bin === 25) sector.bin25 += point.count

    sector.total += point.count
  })

  // 4. Calculer les fréquences relatives (pourcentage du total)
  const grandTotal = sectors.reduce((sum, s) => sum + s.total, 0)

  return sectors.map((s) => ({
    sector: s.sector,
    angle: s.angle,
    bin0: s.bin0,
    bin5: s.bin5,
    bin10: s.bin10,
    bin15: s.bin15,
    bin20: s.bin20,
    bin25: s.bin25,
    total: s.total,
    // Fréquence totale du secteur (%)
    frequency: grandTotal > 0 ? Math.round((s.total / grandTotal) * 1000) / 10 : 0,
    // Fréquences par bin (pour les barres empilées) (%)
    freq0: grandTotal > 0 ? Math.round((s.bin0 / grandTotal) * 1000) / 10 : 0,
    freq5: grandTotal > 0 ? Math.round((s.bin5 / grandTotal) * 1000) / 10 : 0,
    freq10: grandTotal > 0 ? Math.round((s.bin10 / grandTotal) * 1000) / 10 : 0,
    freq15: grandTotal > 0 ? Math.round((s.bin15 / grandTotal) * 1000) / 10 : 0,
    freq20: grandTotal > 0 ? Math.round((s.bin20 / grandTotal) * 1000) / 10 : 0,
    freq25: grandTotal > 0 ? Math.round((s.bin25 / grandTotal) * 1000) / 10 : 0,
  }))
}
