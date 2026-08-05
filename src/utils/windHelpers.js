/**
 * Utilitaires de calcul des composantes vent (vent traversier, vent de face)
 * Source unique de vérité pour RUNWAY_HEADING — importé par RunwayDisplay,
 * WindRose et goNoGoHelpers.
 */
import { CLUB_CONFIG } from '../config/club.config'

/**
 * Cap magnétique de la piste de référence du terrain (°), défini par le club
 * (ADR-030). Modèle mono-piste : les QFU sont dérivés de ce cap.
 */
export const RUNWAY_HEADING = CLUB_CONFIG.airfield.runwayHeading

/**
 * Calcule les composantes de vent par rapport à un axe de piste.
 *
 * @param {number|null} windDirection - Direction du vent en degrés
 * @param {number|null} windSpeed - Vitesse du vent en nœuds
 * @param {number} [runwayHeading=RUNWAY_HEADING] - Cap magnétique de la piste active
 * @returns {{ headwind: number, crosswind: number, crosswindSide: number }}
 *   headwind > 0 → vent de face ; crosswindSide > 0 → droite, < 0 → gauche
 */
export function calculateWindComponents(windDirection, windSpeed, runwayHeading = RUNWAY_HEADING) {
  if (windDirection == null || windSpeed == null) {
    return { headwind: 0, crosswind: 0, crosswindSide: 0 }
  }

  let angleDiff = windDirection - runwayHeading
  while (angleDiff > 180) angleDiff -= 360
  while (angleDiff < -180) angleDiff += 360

  const rad = (angleDiff * Math.PI) / 180
  const headwind = Math.round(windSpeed * Math.cos(rad))
  const crosswind = Math.round(Math.abs(windSpeed * Math.sin(rad)))
  const crosswindSide = Math.sin(rad) >= 0 ? 1 : -1

  return { headwind, crosswind, crosswindSide }
}

/**
 * Retourne le QFU actif selon le signe du headwind.
 *
 * @param {number} headwind - Composante vent de face (peut être négatif)
 * @param {number} [runwayHeading=RUNWAY_HEADING] - Cap de la piste "positive"
 * @returns {string} QFU actif ('25'/'07' pour un cap de 250°), dérivé du cap de piste
 */
export function getActiveRunway(headwind, runwayHeading = RUNWAY_HEADING) {
  // Piste dans le sens du heading (25) si vent de face ; inverse (07) sinon
  const r25 = String(Math.round(runwayHeading / 10)).padStart(2, '0')
  const r07 = String(Math.round(((runwayHeading + 180) % 360) / 10)).padStart(2, '0')
  return headwind > 0 ? r25 : r07
}

/**
 * Calcule le pire vent traversier entre le vent moyen et les rafales.
 * Utilisé pour la coloration et l'évaluation Go/No-Go.
 *
 * @param {number|null} windDirection - Direction du vent en degrés
 * @param {number|null} windSpeed - Vitesse du vent moyen en nœuds
 * @param {number|null} windGust - Vitesse des rafales en nœuds (peut être null)
 * @param {number} [runwayHeading=RUNWAY_HEADING] - Cap magnétique de la piste
 * @returns {number} Crosswind le plus défavorable en nœuds
 */
export function worstCrosswind(windDirection, windSpeed, windGust, runwayHeading = RUNWAY_HEADING) {
  const { crosswind: cwMean } = calculateWindComponents(windDirection, windSpeed, runwayHeading)
  if (!windGust) return cwMean
  const { crosswind: cwGust } = calculateWindComponents(windDirection, windGust, runwayHeading)
  return Math.max(cwMean, cwGust)
}
