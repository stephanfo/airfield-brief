/**
 * Feature flags — modules optionnels du portail (ADR-030).
 *
 * Un fork qui n'a pas le service correspondant (pas de webcam, pas de station
 * météo locale, pas de REX FFA…) met le flag à `false` dans `club.config.js` :
 * la route, l'entrée de menu et la surveillance du store associés disparaissent,
 * plutôt que de laisser une page en erreur permanente.
 */
import { CLUB_CONFIG } from './club.config'

/**
 * Un module est actif si son flag est vrai. La webcam demande en plus une
 * configuration d'URLs : `webcam: null` suffit donc à la désactiver.
 * @param {string|undefined|null} feature - Nom du module, ou rien pour un élément toujours actif
 * @returns {boolean}
 */
export function isFeatureEnabled(feature) {
  if (!feature) return true
  if (feature === 'webcam') {
    return CLUB_CONFIG.features.webcam === true && CLUB_CONFIG.webcam != null
  }
  return CLUB_CONFIG.features[feature] === true
}
