/**
 * Utilitaires pour la gestion des NOTAMs
 */

/**
 * Parse les coordonnées NOTAM format "4724N00111W" vers decimal degrees
 * @param {string} coordinates - Format: DDMM[N|S]DDDMM[E|W]
 * @returns {object|null} - { lat, lon } ou null si invalide
 */
export function parseCoordinates(coordinates) {
  if (!coordinates || typeof coordinates !== 'string') {
    return null
  }

  // Format attendu: DDMM[N|S]DDDMM[E|W] ex: "4724N00111W"
  const regex = /^(\d{4})([NS])(\d{5})([EW])$/
  const match = coordinates.match(regex)

  if (!match) {
    return null
  }

  const [, latStr, latDir, lonStr, lonDir] = match

  // Parse latitude: DDMM
  const latDeg = parseInt(latStr.substring(0, 2), 10)
  const latMin = parseInt(latStr.substring(2, 4), 10)
  let lat = latDeg + latMin / 60

  // Négatif si Sud
  if (latDir === 'S') {
    lat = -lat
  }

  // Parse longitude: DDDMM
  const lonDeg = parseInt(lonStr.substring(0, 3), 10)
  const lonMin = parseInt(lonStr.substring(3, 5), 10)
  let lon = lonDeg + lonMin / 60

  // Négatif si Ouest
  if (lonDir === 'W') {
    lon = -lon
  }

  return { lat, lon }
}

/**
 * Convertit un rayon en nautical miles vers mètres
 * @param {number} radiusNM - Rayon en nautical miles
 * @returns {number} - Rayon en mètres
 */
export function radiusToMeters(radiusNM) {
  // 1 NM = 1852 mètres
  return radiusNM * 1852
}

/**
 * Formate le nom d'une catégorie (snake_case vers français)
 * @param {string} categoryKey - Clé de la catégorie
 * @returns {string} - Libellé français
 */
export function formatCategoryName(categoryKey) {
  const categoryNames = {
    // Catégories AD
    aerodromes_services: 'Services aérodrome',
    aire_mouvement: 'Aire de mouvement',
    aire_trafic: 'Aire de trafic',
    balisage: 'Balisage',
    aides_atter_instal_radionav_GNSS: "Aides à l'atterrissage et radionavigation",
    procedures: 'Procédures',
    organisation_espace_services_circulation: "Organisation de l'espace et services de circulation",
    meteorologie_equipements: 'Météorologie et équipements',
    reglementation_espace_aerien: 'Réglementation espace aérien',
    avertissements_navigation: 'Avertissements de navigation',
    obstacles: 'Obstacles',
    autres_info: 'Autres informations',

    // Catégories FIR
    organisation_espace_procedures: "Organisation de l'espace et procédures",
    services_circulation_aerienne_VOLMET: 'Services de circulation aérienne et VOLMET',
    installations_com_surveillance: 'Installations de communication et surveillance',
    GNSS_installations_radionav: 'GNSS et installations de radionavigation',
  }

  return categoryNames[categoryKey] || categoryKey
}

/**
 * Détermine l'état de validité d'un NOTAM
 * @param {object} notam - Objet NOTAM
 * @returns {string} - 'current', 'future', 'expired', ou 'unknown'
 */
export function getValidityState(notam) {
  if (!notam || !notam.startValidity) {
    return 'unknown'
  }

  const now = new Date()
  const start = new Date(notam.startValidity)

  // Gestion PERM et endValidity
  let end
  if (notam.endValidity === 'PERM' || !notam.endValidity) {
    end = new Date('2099-12-31T23:59:59Z') // Date très lointaine
  } else {
    end = new Date(notam.endValidity)
  }

  if (end < now) {
    return 'expired'
  } else if (start <= now && end >= now) {
    return 'current'
  } else if (start > now) {
    return 'future'
  }

  return 'unknown'
}

/**
 * Vérifie si un NOTAM correspond au filtre de validité.
 * @param {object} notam - Objet NOTAM
 * @param {string} filter - 'all' | 'current' | 'future'
 * @returns {boolean}
 */
export function matchesValidityFilter(notam, filter) {
  if (filter === 'all') return true
  return getValidityState(notam) === filter
}

/**
 * Vérifie si un NOTAM correspond au filtre de trafic (VFR/IFR).
 * Le champ qLine.traffic vaut 'I', 'V' ou 'IV' ; un NOTAM sans Q-Line
 * est toujours conservé (on ne masque pas faute d'information).
 * @param {object} notam - Objet NOTAM
 * @param {string} filter - 'all' | 'vfr' | 'ifr'
 * @returns {boolean}
 */
export function matchesTrafficFilter(notam, filter) {
  if (filter === 'all') return true
  if (!notam.qLine || !notam.qLine.traffic) return true

  const traffic = notam.qLine.traffic.toUpperCase()

  if (filter === 'vfr') {
    return traffic.includes('V')
  } else if (filter === 'ifr') {
    return traffic.includes('I')
  }

  return true
}

/**
 * Vérifie si la tranche d'altitude d'un NOTAM chevauche la plage de
 * niveaux de vol sélectionnée. Un max à `unlimitedMax` est traité comme
 * « illimité » (pas de borne haute).
 * @param {object} notam - Objet NOTAM
 * @param {{ min: number, max: number }} range - Plage FL sélectionnée
 * @param {number} [unlimitedMax=100] - Valeur du slider signifiant « illimité »
 * @returns {boolean}
 */
export function matchesFlRange(notam, range, unlimitedMax = 100) {
  if (!notam.qLine) return true

  const notamLower = notam.qLine.lower ?? 0
  const notamUpper = notam.qLine.upper ?? 999

  const maxFL = range.max === unlimitedMax ? 999 : range.max

  // Le NOTAM est visible si sa tranche (lower-upper) touche la plage sélectionnée
  return !(notamUpper < range.min || notamLower > maxFL)
}

/**
 * Mapping des codes Q-Line vers libellés français
 * Basé sur FAA NOTAM Appendix B / OACI Doc 8400
 */

// Code 2-3 (Subject - Qu'est-ce qui est affecté)
// La 2ème lettre définit la catégorie (A=Espace aérien, C=Com, F=Facilités, I=ILS, L=Lumières, M=Mouvement, N=Nav, O=Autre, P=Procédure)
export const qLineCode23Map = {
  // --- AGA (Aérodromes & Installations au sol) ---
  FA: 'Aérodrome',
  MA: 'Aire de mouvement',
  MB: "Aire d'attente",
  MC: 'Clearway (Prolongement dégagé)',
  MD: 'Distance déclarée (TORA, TODA, ASDA, lDA)',
  MG: 'Guidage au sol (Taxiing)',
  MK: 'Aire de stationnement (Parking)',
  MN: 'Aire de trafic (Apron)',
  MO: "Barre d'arrêt (Stopbar)",
  MP: 'Poste de stationnement avion (Stand)',
  MR: 'Piste',
  MS: "Stopway (Prolongement d'arrêt)",
  MT: 'Seuil de piste',
  MU: 'Aire de retournement sur piste',
  MW: 'Bande de piste (Strip)',
  MX: 'Voie de circulation (Taxiway)',
  MY: 'Voie de circulation rapide',

  // --- Balisage Lumineux (Lights) ---
  LA: "Système de balisage d'approche",
  LB: "Phare d'aérodrome / d'identification",
  LC: "Feux de l'axe de piste",
  LD: "Indicateur de direction d'atterrissage (LDI)",
  LE: 'Feux de bord de piste',
  LF: 'Flasheur de seuil (Séquentiel)',
  LG: 'Feux de guidage pour le roulage',
  LH: 'Feux de seuil de piste',
  LI: "Feux d'identification de seuil de piste (REIL)",
  LK: "Feux d'axe de voie de circulation",
  LL: 'Feux de bord de voie de circulation',
  LM: "Balisage de l'aire d'atterrissage hélicoptère",
  LP: "Indicateur de pente d'approche (PAPI/VASIS)",
  LR: 'Balisage lumineux de piste (Tout type)',
  LS: "Barre d'arrêt (Lumineuse)",
  LW: "Balisage de l'aire de décollage hélicoptère",

  // --- Communications & Navigation (COM/NAV) ---
  CA: 'Installation de communication air/sol (Général)',
  CE: 'Radar de route',
  CG: "Radar de contrôle d'approche (GCA)",
  CL: 'Appel sélectif (SELCAL)',
  CM: 'Radar de surface (SMR)',
  CP: "Radar d'approche de précision (PAR)",
  CR: 'Élément de réception de surveillance',
  CS: 'Radar de surveillance secondaire',
  CT: 'Tour de contrôle (TWR)',
  IC: "ILS (Système d'atterrissage aux instruments)",
  IG: 'ILS Glide Path (Plan de descente)',
  II: "ILS Localizer (Radiophare d'alignement)",
  IM: 'ILS Middle Marker',
  IO: 'ILS Outer Marker',
  IS: 'ILS DME',
  IU: 'ILS Inner Marker',
  ND: 'DME (Mesure de distance)',
  NM: 'VOR/DME',
  NN: 'TACAN',
  NO: 'NDB (Radiophare non directionnel)',
  NT: 'VORTAC',
  NV: 'VOR',

  // --- Espace Aérien (Airspace) ---
  AA: "Altitude minimale d'aérodrome",
  AC: 'Zone de contrôle (CTR / Class D)',
  AD: "Zone d'identification de défense aérienne (ADIZ)",
  AE: "Région d'information de vol (FIR)",
  AF: "Service d'information de vol (FIS)",
  AH: 'Région supérieure de contrôle',
  AL: 'Altitude minimale de vol',
  AN: 'Routes de navigation de surface (RNAV)',
  AO: 'Région de contrôle océanique',
  AP: 'Point de compte rendu',
  AR: 'Route ATS',
  AT: 'Région de contrôle terminale (TMA)',
  AU: "Région supérieure d'information de vol (UIR)",
  AV: 'Région supérieure de conseil',
  AX: "Point d'intersection significatif",
  AZ: "Zone de circulation d'aérodrome (ATZ)",

  // --- Règles de l'air & Sécurité (Air Traffic & Hazards) ---
  OB: 'Obstacle',
  OE: 'Obstacle : Éoliennes',
  OL: "Obstacle : Lumières d'obstacle",
  OR: 'Opération de sauvetage (SAR)',
  PE: "Procédure d'arrivée standard (STAR)",
  PF: 'Procédure de débit de circulation',
  PH: "Procédure d'attente",
  PI: "Procédure d'approche aux instruments",
  PD: 'Procédure de départ standard (SID)',
  PK: 'Procédure VFR',
  PM: "Minimums opérationnels d'aérodrome",
  PO: 'Procédure de vol aux obstacles',
  PR: 'Zone réglementée radio',
  PT: 'Procédure de transition',
  PU: "Procédure d'approche interrompue",
  RA: "Réservation d'espace aérien",
  RD: 'Zone dangereuse (Zone D)',
  RO: 'Zone survolée (Overflying)',
  RP: 'Zone interdite (Zone P)',
  RR: 'Zone réglementée (Zone R)',
  RT: 'Zone réglementée temporaire (TRA)',
  SA: "Service automatique d'information terminale (ATIS)",
  SB: 'Bureau de piste (ATS Reporting Office)',
  SE: "Service d'information de vol (FIS)",
  SF: "Service d'information de vol d'aérodrome (AFIS)",
  SL: 'Régulation de débit (Flow Control)',
  SO: 'Information océanique',
  SP: "Service de contrôle d'approche",
  SS: "Station d'information de vol",
  ST: "Service de contrôle d'aérodrome",
  SU: 'Service consultatif de la circulation aérienne',
  SV: 'Service VOLMET',
  SY: 'Service information de route (Upper)',
  WA: 'Avertissement de navigation',
  WB: 'Acrobaties aériennes',
  WC: 'Ballon captif ou cerf-volant',
  WD: "Tirs de démolition d'explosifs",
  WE: 'Exercices militaires',
  WF: 'Ravitaillement en vol',
  WG: 'Vol plané (Planeurs)',
  WH: 'Sauts en parachute',
  WI: 'Vols en formation',
  WJ: 'Largage de banderoles/cibles',
  WL: 'Ascension de ballons libres',
  WM: 'Tirs de missiles / armement',
  WP: 'Exercice de parachutage / Progression Parachutistes',
  WS: 'Brûlage de gaz au sol (Flammes)',
  WT: 'Vols groupés de masse',
}

// Code 4-5 (Condition - Quel est le statut)
export const qLineCode45Map = {
  // --- Disponibilité (Availability) ---
  AC: 'Activé / Actif',
  AF: 'Vérification en vol requise',
  AG: 'Autorisé seulement aux opérations',
  AH: 'Horaires de service modifiés',
  AK: 'Reprise du fonctionnement normal',
  AL: 'Opérationnel (Sous réserve de conditions)',
  AM: 'Opérations militaires uniquement',
  AN: 'Disponible pour les vols de nuit',
  AO: 'Opérationnel',
  AP: 'Disponible (Appel préalable requis)',
  AR: 'Disponible sur demande',
  AS: 'Hors service (Unserviceable)',
  AU: 'Non disponible (Not available)',
  AW: 'complètement retiré / supprimé',
  AX: 'Annulé (Pour un NOTAM précédent)',

  // --- Changements (Changes) ---
  CA: 'Activé',
  CC: 'Terminé / Achevé',
  CD: 'Désactivé',
  CE: 'Érigé / Installé',
  CF: 'Fréquence de fonctionnement changée',
  CG: 'Déclassé (Downgraded)',
  CH: 'Changé / Modifié',
  CI: 'Identification changée',
  CL: 'Fermé (Closed)',
  CM: 'Décalé (Displaced) - souvent pour les seuils de piste',
  CN: 'Annulé (Cancelled)',
  CO: 'Opérationnel',
  CP: 'Fonctionne à puissance réduite',
  CR: 'Remplacé temporairement',
  CS: 'Installé',
  CT: 'En essai (On test), ne pas utiliser',

  // --- Limitations / Dangers (Hazard/Limitations) ---
  HA: 'Action de freinage (Braking action)',
  HB: 'Coefficient de frottement (Friction coefficient)',
  HC: 'Couvert de (Covered by)',
  HD: 'Sec ou humide (Dry or damp)',
  HE: 'Mouillé (Wet)',
  HF: "Flaques d'eau (Standing water)",
  HG: 'Herbe non coupée / haute',
  HH: 'Danger / Risque',
  HI: 'Recouvert de glace',
  HJ: 'Lancement prévu',
  HK: "Migration d'oiseaux",
  HL: 'Neige (Snow)',
  HM: 'Boue (Mud)',
  HN: 'Végétation',
  HO: 'Caché par',
  HP: 'Congères (Snowbanks)',
  HQ: 'Opération en cours',
  HR: 'Eau stagnante',
  HS: 'Sablage en cours / Sable',
  HT: 'Approche interrompue',
  HU: 'Lancement en cours',
  HV: 'Travaux en cours',
  HW: 'Travaux en cours (WIP)',
  HX: "Concentration d'oiseaux",
  HY: 'Congères élevées',
  HZ: 'Recouvert de gravier',

  // --- Limitations Spécifiques (Specific Limits) ---
  LA: 'Fonctionne sur alimentation auxiliaire',
  LB: 'Réservé aux aéronefs basés',
  LC: 'Fermé',
  LD: 'Zone dangereuse',
  LE: 'Fonctionne sans...',
  LF: 'Interférence',
  LG: 'Fonctionne avec...',
  LH: 'Haute tension',
  LI: 'Tardif / En retard',
  LK: 'Fonctionne comme feu fixe',
  LL: 'Abaissé (Lowered)',
  LM: 'Démantelé',
  LN: 'Ne tourne pas (Phare)',
  LO: 'Éteint / Obsurci',
  LP: 'Interdit (Prohibited)',
  LR: 'Périmé / Reçu tardivement',
  LS: 'Sujet à interruption',
  LT: 'Limité (Limited)',
  LV: 'Rétabli',
  LW: 'Sera effectif / Aura lieu',
  LX: 'Exercices opérationnels',

  // --- Autres (Miscellaneous) ---
  XX: 'Autre (Voir texte clair)',
}

// Traffic
export const qLineTrafficMap = {
  I: 'IFR',
  V: 'VFR',
  IV: 'IFR et VFR',
}

// Purpose
export const qLinePurposeMap = {
  NBO: 'Information uniquement',
  BO: 'Briefing obligatoire',
  M: 'Divers',
  K: 'Liste de contrôle',
}

// Scope
export const qLineScopeMap = {
  A: 'Aérodrome',
  E: 'En-route',
  W: 'Avertissement',
  AE: 'Aérodrome et en-route',
  K: 'Liste de contrôle',
}

/**
 * Formate les détails Q-Line en texte lisible
 * @param {object} qLine - Objet qLine du NOTAM
 * @returns {object} - Détails formatés
 */
export function formatQLineDetails(qLine) {
  if (!qLine) {
    return {}
  }

  return {
    subject: qLineCode23Map[qLine.code23] || qLine.code23,
    condition: qLineCode45Map[qLine.code45] || qLine.code45,
    traffic: qLineTrafficMap[qLine.traffic] || qLine.traffic,
    purpose: qLinePurposeMap[qLine.purpose] || qLine.purpose,
    scope: qLineScopeMap[qLine.scope] || qLine.scope,
    altitude: `${qLine.lower || 0} - ${qLine.upper || 999} FL`,
    fir: qLine.fir,
  }
}

/**
 * Détermine si un NOTAM a des coordonnées valides
 * @param {object} notam - Objet NOTAM
 * @returns {boolean}
 */
export function hasValidCoordinates(notam) {
  if (!notam || !notam.coordinates) {
    return false
  }
  return parseCoordinates(notam.coordinates) !== null
}

/**
 * Détermine si le rayon nécessite un zoom France (>200 NM)
 * @param {number} radiusNM - Rayon en nautical miles
 * @returns {boolean}
 */
export function needsFranceZoom(radiusNM) {
  return radiusNM > 200
}
