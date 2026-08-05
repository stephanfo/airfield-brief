/**
 * Registre unique des clés `localStorage` (ADR-030).
 *
 * Toutes les clés sont préfixées par `CLUB_CONFIG.storagePrefix` : deux forks
 * servis depuis la même origine (ou un sous-chemin de celle-ci) ne se marchent
 * pas dessus, et le nom du club ne fuite plus dans le stockage.
 *
 * Rappel de la règle projet : `localStorage` ne contient que des **préférences
 * UI** et des états d'affichage (NOTAMs masqués/vus, brouillon de saisie, cache
 * de données volatile) — jamais de donnée métier/aviation faisant autorité.
 *
 * ⚠️ Renommer une clé fait perdre la préférence correspondante côté utilisateur.
 */
import { CLUB_CONFIG } from './club.config'

const PREFIX = CLUB_CONFIG.storagePrefix

/**
 * Préfixe un nom de clé. Utile pour les clés dynamiques (ex. cache par endpoint).
 * @param {string} name - Nom logique de la clé, sans préfixe
 * @returns {string} Clé complète telle que stockée
 */
export function storageKey(name) {
  return `${PREFIX}-${name}`
}

/** Clés statiques de l'application. */
export const STORAGE_KEYS = {
  // NOTAM (composables useHiddenNotams / useSeenNotams)
  HIDDEN_NOTAMS: storageKey('hidden-notams'),
  SEEN_NOTAMS: storageKey('seen-notams'),
  // Réglages personnels
  VFR_THRESHOLDS: storageKey('vfr-thresholds'),
  THERMAL_STRESS: storageKey('thermal-stress'),
  // Menu et personnalisation
  MENU_CUSTOMIZATION: storageKey('menu-customization'),
  MENU_SHOW_LABELS: storageKey('menu-show-labels'),
  // Préparation du vol
  CHECKLIST_STATE: storageKey('checklist-state'),
  CHECKLIST_TEXT_SCALE: storageKey('checklist-textscale'),
  SELECTED_AIRCRAFT: storageKey('selected-aircraft'),
  WB_LOADOUT: storageKey('wb-loadout'),
  PRICING_PREFS: storageKey('pricing-prefs'),
  // REX
  REX_DRAFT: storageKey('rex-draft'),
  // Webcam (lecture du timelapse)
  WEBCAM_SPEED: storageKey('webcam-timelapse-speed'),
  WEBCAM_LOOP: storageKey('webcam-timelapse-loop'),
  // Notifications push (FCM)
  FCM_TOKEN: storageKey('fcm-token'),
  SUBSCRIBED_TOPICS: storageKey('subscribed-topics'),
}

/** Préfixe des entrées de cache de données (`useDataFetcher`), une par endpoint. */
export const DATA_CACHE_PREFIX = storageKey('data-cache:')
