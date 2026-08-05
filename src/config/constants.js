/**
 * Constantes partagées de l'application
 *
 * Ce fichier centralise les constantes utilisées à plusieurs endroits
 * pour éviter la duplication et faciliter la maintenance.
 *
 * Note : les constantes inutilisées (TRAFFIC_TYPES, PURPOSE_CODES,
 * DEFAULT_FLIGHT_LEVELS, STATUS_COLORS, REFRESH_INTERVALS, ERROR_MESSAGES,
 * DATE_FORMATS, BREAKPOINTS, PAGINATION_LIMITS, REGEX_PATTERNS,
 * EXTERNAL_LINKS, NOTIFICATION_CONFIG, MAP_CONFIG, CATEGORY_LABELS,
 * NOTAM_VALIDITY_STATES) ont été retirées lors du nettoyage.
 * Elles sont disponibles dans l'historique git si besoin.
 */

/**
 * Catégories de NOTAMs disponibles
 * Utilisé pour les filtres et l'organisation des NOTAMs
 */
export const NOTAM_CATEGORIES = [
  'aerodromes_services',
  'aire_mouvement',
  'aire_trafic',
  'balisage',
  'aides_atter_instal_radionav_GNSS',
  'procedures',
  'organisation_espace_services_circulation',
  'meteorologie_equipements',
  'reglementation_espace_aerien',
  'avertissements_navigation',
  'obstacles',
  'autres_info',
]

// Clés de stockage localStorage — source unique : `storageKeys.js` (préfixées par
// le club, ADR-030). Ré-exportées ici pour les importeurs historiques.
export { STORAGE_KEYS } from './storageKeys'
