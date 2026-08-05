/**
 * Identité du club / de l'aérodrome — LE fichier à éditer pour forker le projet
 * vers un autre terrain (TECH-008, ADR-030).
 *
 * ⚠️ Module ESM **pur** : aucun import (ni Vue, ni Quasar, ni autre module du projet),
 * uniquement des valeurs littérales. C'est ce qui permet de l'importer depuis les trois
 * mondes du projet :
 *   - `quasar.config.js` (Node, au build) → nom du produit, manifest PWA, meta HTML ;
 *   - `src/**` (runtime navigateur) → constantes terrain, textes UI, feature flags ;
 *   - le service worker, via les variables injectées dans `build.env`.
 *
 * Répartition des responsabilités (voir ADR-030) :
 *   - **ce fichier** : toute l'identité du fork, y compris les caractéristiques du
 *     terrain — c'est LA source de vérité, versionnée ;
 *   - `.env` : uniquement ce qui varie par déploiement ou est privé (`PUBLIC_PATH`,
 *     `APP_URL`, clés Firebase, `REX_SUBMIT_*`). L'identité ne va **pas** dans `.env`.
 *
 * Limite connue : modèle **mono-piste** (les QFU sont dérivés de `runwayHeading`).
 */
export const CLUB_CONFIG = {
  /** Identité produit (titre header, manifest PWA, titre des notifications). */
  app: {
    name: 'LFFI Brief',
    shortName: 'LFFI',
    description:
      "Portail météo, NOTAM et informations aéronautiques pour l'aérodrome d'Ancenis (LFFI). Accédez aux METAR, TAF, cartes TEMSI/WINTEM et statut AZBA en temps réel.",
  },

  /** Terrain de rattachement — source de vérité des caractéristiques de piste. */
  airfield: {
    icao: 'LFFI',
    name: 'Ancenis',
    lat: 47.408,
    lon: -1.177,
    /** Altitude terrain — les deux unités sont utilisées (performances en ft, QNH station en m). */
    elevationFt: 111,
    elevationM: 34,
    /** Cap magnétique de la piste de référence (°) — les QFU en sont dérivés. */
    runwayHeading: 250,
    runwayLengthM: 1200,
    /**
     * Longueur utilisable par QFU, quand elle diffère selon le sens (TODA/LDA
     * propres à chaque seuil). ⚠️ Clés sur DEUX chiffres, zéro initial compris
     * (« 07 » et non « 7 ») : ce sont les QFU tels que produits par
     * `getActiveRunway` à partir de `runwayHeading`. Laisser `{}` si la piste
     * est symétrique : `runwayLengthM` s'applique alors dans les deux sens.
     */
    runwayLengths: { '25': 1200, '07': 1200 },
    /** Voir `PERFORMANCE_CONFIG.surfaces` (app.config.js) pour les valeurs admises. */
    surface: 'paved',
  },

  /**
   * Webcam du terrain. `null` = pas de webcam (équivaut à `features.webcam: false`).
   * Les intervalles et paramètres de lecture restent dans `WEBCAM_CONFIG` (app.config.js).
   */
  webcam: {
    /** Base de la page webcam (sert à préfixer les `url` relatifs du JSON). */
    baseUrl: 'https://www.aeroclub-ancenis.fr/webcam/',
    /** Image stable de la dernière prise. */
    url: 'https://www.aeroclub-ancenis.fr/webcam/latest.jpg',
    /** Liste JSON des images de la dernière heure (source du timelapse). CORS requis côté serveur. */
    imagesUrl: 'https://www.aeroclub-ancenis.fr/webcam/images.php',
  },

  /** Zones AZBA remontées en priorité (les plus proches du terrain). */
  azba: {
    priorityZones: ['R149E', 'R57', 'R149D', 'R147'],
  },

  /**
   * Topics de notification push.
   *
   * Les `id` sont volontairement **génériques** (`notam-ad`, `azba-zone`) : une instance
   * ne dessert qu'un seul terrain, inutile d'y répéter son code OACI. Le libellé et la
   * description, eux, nomment explicitement l'aérodrome et la zone concernés.
   *
   * ⚠️ Ces `id` sont **couplés à l'émetteur** (workflow N8N + Cloud Function `validTopics`)
   * et aux abonnements FCM déjà actifs : les modifier suppose de changer les trois côtés
   * **en même temps**, et impose aux abonnés de se réabonner (l'ancien topic ne reçoit plus
   * rien, sans aucun signe visible côté utilisateur).
   */
  notificationTopics: [
    {
      id: 'notam-ad',
      label: 'NOTAMs LFFI',
      description: "NOTAMs de l'aérodrome d'Ancenis (LFFI)",
    },
    { id: 'notam-fir', label: 'NOTAMs FIR', description: 'NOTAMs de la région (hors aérodrome)' },
    { id: 'azba-zone', label: 'AZBA R149E', description: 'Activation de la zone R149E' },
    { id: 'vac', label: 'Cartes VAC', description: 'Nouvelles cartes VAC disponibles' },
  ],

  /**
   * Modules activables. Un fork qui n'a pas le service correspondant met le flag à
   * `false` : la route, l'entrée de menu et le store associés disparaissent (pas de
   * page cassée ni de store en erreur).
   */
  features: {
    /** Webcam du terrain (nécessite `webcam` ci-dessus). */
    webcam: true,
    /** Station météo locale (nécessite un pipeline wind/atmosphere). */
    station: true,
    /** Stress thermique (nécessite `thermal_forecast.json` — indépendant de la station). */
    thermal: true,
    /** REX FFA + soumission de REX. */
    rex: true,
    /** Fiches avion, masse & centrage, performances. */
    aircraft: true,
    /** Notifications push (nécessite les clés Firebase dans `.env`). */
    notifications: true,
  },

  /** Préfixe des clés `localStorage` (préférences UI uniquement). */
  storagePrefix: 'brief',
}
