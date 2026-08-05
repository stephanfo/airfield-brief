/**
 * Configuration technique de l'application (endpoints, TTL de cache, seuils métier).
 *
 * ⚠️ Tout ce qui relève de l'**identité du club/aérodrome** (nom, terrain, URLs webcam,
 * topics de notification, zones AZBA prioritaires) vit dans `club.config.js` — voir
 * ADR-030. Ce fichier ne fait que **composer** ces valeurs avec les paramètres
 * techniques, pour que les consommateurs existants n'aient pas à changer d'import.
 */
import { CLUB_CONFIG } from './club.config'

/**
 * Intervalles par défaut (fallback si non défini par endpoint)
 */
const DEFAULT_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes — TTL cache client
const DEFAULT_STALE_THRESHOLD = 2 * 60 * 60 * 1000 // 2 heures — seuil alerte visuelle

export const API_CONFIG = {
  baseUrl: './data',
  /** @deprecated Utiliser getEndpointConfig(name).refreshInterval à la place */
  refreshInterval: DEFAULT_REFRESH_INTERVAL,
  endpoints: {
    weather: {
      url: './data/weather.json',
      refreshInterval: 5 * 60 * 1000, // 5 min — JSON généré toutes les heures
      staleThreshold: 90 * 60 * 1000, // 90 min — alerte si > 1.5× le cycle horaire
    },
    notam: {
      url: './data/notam.json',
      refreshInterval: 5 * 60 * 1000,
      staleThreshold: 90 * 60 * 1000,
    },
    azba: {
      url: './data/azba.json',
      refreshInterval: 5 * 60 * 1000,
      staleThreshold: 90 * 60 * 1000,
    },
    temsi: {
      url: './data/temsi.json',
      refreshInterval: 5 * 60 * 1000,
      staleThreshold: 90 * 60 * 1000,
    },
    wintem: {
      url: './data/wintem.json',
      refreshInterval: 5 * 60 * 1000,
      staleThreshold: 90 * 60 * 1000,
    },
    vac: {
      url: './data/vac.json',
      refreshInterval: 60 * 60 * 1000, // 1h — JSON généré 1×/jour à 9h UTC
      staleThreshold: 26 * 60 * 60 * 1000, // 26h — alerte si pas mis à jour depuis > 1 jour + marge
    },
    station: {
      url: './data/wind.json',
      refreshInterval: 5 * 60 * 1000, // 5 min — données station météo locale
      staleThreshold: 90 * 60 * 1000, // 90 min — alerte si données trop anciennes
    },
    // Nouveaux endpoints pour migration station (wind_history, atmosphere, wind_current)
    stationWindHistory: {
      url: './data/wind_history.json',
      refreshInterval: 5 * 60 * 1000, // 5 min — vérification client (JSON généré toutes les heures)
      staleThreshold: 90 * 60 * 1000, // 90 min — alerte si > 1.5× le cycle horaire
    },
    stationAtmosphere: {
      url: './data/atmosphere.json',
      refreshInterval: 5 * 60 * 1000, // 5 min — vérification client (JSON généré toutes les heures)
      staleThreshold: 90 * 60 * 1000, // 90 min — alerte si > 1.5× le cycle horaire
    },
    stationWindCurrent: {
      url: './data/wind_current.json',
      refreshInterval: 2 * 60 * 1000, // 2 min — vérification client (JSON généré toutes les 10 minutes)
      staleThreshold: 20 * 60 * 1000, // 20 min — alerte si > 2× le cycle de 10 min
    },
    thermalForecast: {
      url: './data/thermal_forecast.json',
      refreshInterval: 60 * 60 * 1000, // 1h — forecast Open-Meteo régénéré ~1×/h (script PHP cron)
      staleThreshold: 26 * 60 * 60 * 1000, // 26h — alerte si pas régénéré depuis > 1 jour
    },
    ephemeris: {
      url: './data/ephemeris.json',
      refreshInterval: 60 * 60 * 1000, // 1h — éphémérides générées 1×/jour par N8N (IMCCE)
      staleThreshold: 26 * 60 * 60 * 1000, // 26h — alerte si le fichier du jour n'a pas été régénéré
    },
    aircrafts: {
      url: './data/aircrafts.json',
      refreshInterval: 60 * 60 * 1000, // 1h — index quasi-statique (déposé manuellement avec les .aircraft)
      staleThreshold: 7 * 24 * 60 * 60 * 1000, // 7 jours — données de référence, changent rarement
    },
    rexFfa: {
      url: './data/rex.json',
      refreshInterval: 60 * 60 * 1000, // 1h — vérification client (JSON régénéré ~1×/mois par cron)
      staleThreshold: 40 * 24 * 60 * 60 * 1000, // 40 jours — alerte si le cron mensuel a sauté un cycle
    },
  },
}

/**
 * Retourne la configuration complète d'un endpoint avec fallback sur les valeurs par défaut
 * @param {string} name - Nom de l'endpoint (ex: 'vac', 'weather')
 * @returns {{ url: string, refreshInterval: number, staleThreshold: number }}
 */
export function getEndpointConfig(name) {
  const ep = API_CONFIG.endpoints[name]
  if (!ep) {
    throw new Error(
      `Endpoint inconnu : "${name}". Endpoints disponibles : ${Object.keys(API_CONFIG.endpoints).join(', ')}`,
    )
  }
  return {
    url: ep.url,
    refreshInterval: ep.refreshInterval ?? DEFAULT_REFRESH_INTERVAL,
    staleThreshold: ep.staleThreshold ?? DEFAULT_STALE_THRESHOLD,
  }
}

/** Zones AZBA remontées en priorité — définies par le club (`club.config.js`). */
export const AZBA_CONFIG = {
  priorityZones: CLUB_CONFIG.azba.priorityZones,
}

/**
 * Soumission de REX (FEAT-033) — endpoint POST du service web `rex-submit`
 * (Airfield-Portal-Scripts/rex-submit/). À la différence des flux de données
 * (fetch `./data/*.json` en GET), c'est un POST vers un serveur externe : URL
 * absolue renseignée via `.env` (REX_SUBMIT_URL / REX_SUBMIT_TOKEN), injectée au
 * build — le dépôt public ne contient donc aucun host d'infra. `token` (optionnel)
 * doit correspondre au `rexSubmit.submitToken` de config.php côté serveur.
 */
export const REX_SUBMIT = {
  url: process.env.REX_SUBMIT_URL || '',
  token: process.env.REX_SUBMIT_TOKEN || '',
}

/**
 * Paramètres du calcul de performances (FEAT-016).
 * Les valeurs terrain (altitude, longueur, revêtement) viennent de
 * `CLUB_CONFIG.airfield` (ADR-030) ; seule la liste des revêtements
 * sélectionnables est technique et reste ici.
 */
export const PERFORMANCE_CONFIG = {
  surfaces: [
    { value: 'paved', label: 'Revêtue / dure' },
    { value: 'grass', label: 'Herbe' },
    { value: 'wetGrass', label: 'Herbe mouillée' },
  ],
}

/**
 * Webcam du terrain : les **URLs** viennent du club (`club.config.js`, `null` si le
 * terrain n'a pas de webcam) ; les cadences et paramètres de lecture sont techniques
 * et restent ici.
 */
export const WEBCAM_CONFIG = {
  /** Base de la page webcam (sert à préfixer les `url` relatifs du JSON). */
  baseUrl: CLUB_CONFIG.webcam?.baseUrl ?? '',
  /** Image stable de la dernière prise. */
  url: CLUB_CONFIG.webcam?.url ?? '',
  /** Liste JSON des images de la dernière heure (source du timelapse). CORS requis côté serveur. */
  imagesUrl: CLUB_CONFIG.webcam?.imagesUrl ?? '',
  refreshInterval: 5 * 60 * 1000, // 5 minutes — refresh image live
  /** TTL cache client de la liste timelapse (images générées ~toutes les 30 s). */
  imagesRefreshInterval: 30 * 1000,
  /** Alerte « image périmée » si la dernière image date de plus de 5 min (caméra HS). */
  staleThreshold: 5 * 60 * 1000,
  /** Lecture timelapse : cadence de base et multiplicateurs de vitesse. */
  baseFps: 4,
  speeds: [1, 2, 4, 8],
  defaultSpeed: 2,
}

/**
 * Seuils VFR par défaut (standards OACI)
 * Utilisés pour la colorisation des paramètres météo.
 * L'utilisateur peut les personnaliser via la page Seuils VFR (/vfr-settings).
 *
 * Pour visibilité/plafond : au-dessus de `good` → vert, entre `marginal` et `good` → orange, sous `marginal` → rouge
 * Pour vent/rafales : sous `good` → vert, entre `good` et `marginal` → orange, au-dessus de `marginal` → rouge
 */
export const VFR_THRESHOLDS_DEFAULTS = {
  visibility: {
    good: 8000, // mètres — VFR sans restriction
    marginal: 5000, // mètres — MVFR
  },
  ceiling: {
    good: 1500, // pieds — VFR
    marginal: 500, // pieds — MVFR
  },
  wind: {
    good: 15, // nœuds
    marginal: 25, // nœuds
  },
  gust: {
    good: 20, // nœuds
    marginal: 30, // nœuds
  },
  crosswind: {
    good: 10, // nœuds — seuil attention vent traversier
    marginal: 15, // nœuds — seuil critique vent traversier
  },
}

/**
 * Grille de stress thermique du pilote (FEAT-031).
 *
 * Transcription fidèle du diagramme « Risques individuels liés à la chaleur »
 * de la Commission Prévention Sécurité FFA (2025_07_01), identique à celui de
 * l'AAE. Croise la température de l'air (°C) et l'humidité relative (%) pour
 * déterminer la zone d'agression thermique : faible / moyenne / significative / élevée.
 *
 * Encodage compact : pour chaque colonne d'humidité (10 % → 90 %, pas de 10),
 * les trois températures (°C) d'entrée dans chaque zone plus sévère.
 *   temp >= elevee        → élevée
 *   temp >= significative → significative
 *   temp >= moyenne       → moyenne
 *   sinon                 → faible
 *
 * Les valeurs ont été extraites pixel par pixel du PDF officiel puis vérifiées
 * contre le document plastifié. Modifier ici = modifier la grille de référence.
 */
export const THERMAL_STRESS_ZONES = {
  10: { moyenne: 33, significative: 38, elevee: 44 },
  20: { moyenne: 32, significative: 36, elevee: 41 },
  30: { moyenne: 31, significative: 35, elevee: 39 },
  40: { moyenne: 30, significative: 34, elevee: 36 },
  50: { moyenne: 30, significative: 33, elevee: 35 },
  60: { moyenne: 29, significative: 32, elevee: 34 },
  70: { moyenne: 28, significative: 31, elevee: 33 },
  80: { moyenne: 27, significative: 30, elevee: 32 },
  90: { moyenne: 26, significative: 29, elevee: 31 },
}

/**
 * Réglage personnel du stress thermique (préférence UI, persistée en localStorage).
 *
 * Nota FFA : « décaler le résultat obtenu d'une cellule vers le haut par tranche
 * de 5 ans au-delà de 65 ans ou par type de pathologie ». On modélise ce décalage
 * comme un nombre de crans de zone plus sévères :
 *   ageShift  : 0 (< 65 ans), +1 (65-69), +2 (70-74), +3 (75 ans et +)
 *   pathologie: +1 cran si activé
 */
export const THERMAL_STRESS_SETTINGS_DEFAULTS = {
  ageBracket: 'under65', // under65 | 65-69 | 70-74 | 75plus
  pathologie: false,
}

/** Décalage de zone (crans) par tranche d'âge — voir nota FFA. */
export const THERMAL_STRESS_AGE_SHIFT = {
  under65: 0,
  '65-69': 1,
  '70-74': 2,
  '75plus': 3,
}
