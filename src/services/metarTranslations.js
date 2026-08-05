// Dictionnaire de traduction pour les termes météorologiques aéronautiques

export const metarTranslations = {
  // Couverture nuageuse
  cloudCover: {
    SKC: 'Ciel clair',
    CLR: 'Ciel dégagé',
    NSC: 'Pas de nuages significatifs',
    FEW: 'Peu nuageux (1-2 octas)',
    SCT: 'Éclaircies (3-4 octas)',
    BKN: 'Très nuageux (5-7 octas)',
    OVC: 'Couvert (8 octas)',
    CAVOK: 'Visibilité excellente, pas de nuages significatifs',
    VV: 'Ciel invisible',
  },

  // Types de nuages
  cloudTypes: {
    CB: 'Cumulonimbus (orage)',
    TCU: 'Cumulus bourgeonnant',
    CU: 'Cumulus',
    CI: 'Cirrus',
    CC: 'Cirrocumulus',
    CS: 'Cirrostratus',
    AC: 'Altocumulus',
    AS: 'Altostratus',
    NS: 'Nimbostratus',
    SC: 'Stratocumulus',
    ST: 'Stratus',
  },

  // Phénomènes météo
  weatherPhenomena: {
    // Intensité
    '-': 'Faible',
    '': 'Modéré',
    '+': 'Fort',
    VC: 'Au voisinage',

    // Descripteurs
    MI: 'Mince',
    BC: 'Bancs',
    PR: 'Partiel',
    DR: 'Chasse basse',
    BL: 'Chasse haute',
    SH: 'Averse',
    TS: 'Orage',
    FZ: 'Givrant',

    // Précipitations
    DZ: 'Bruine',
    RA: 'Pluie',
    SN: 'Neige',
    SG: 'Neige en grains',
    IC: 'Cristaux de glace',
    PL: 'Granules de glace',
    GR: 'Grêle',
    GS: 'Grésil',
    UP: 'Précipitations inconnues',

    // Obscurcissement
    BR: 'Brume',
    FG: 'Brouillard',
    FU: 'Fumée',
    VA: 'Cendres volcaniques',
    DU: 'Poussière',
    SA: 'Sable',
    HZ: 'Brume sèche',
    PY: 'Embruns',

    // Autres
    PO: 'Tourbillons de poussière',
    SQ: 'Grain',
    FC: 'Tornade/Trombe',
    SS: 'Tempête de sable',
    DS: 'Tempête de poussière',
  },

  // Catégories de vol
  flightCategory: {
    VFR: 'VFR (Vol à vue)',
    MVFR: 'VFR marginal',
    IFR: 'IFR (Vol aux instruments)',
    LIFR: 'IFR bas',
  },

  // Couleurs par catégorie
  flightCategoryColor: {
    VFR: 'positive',
    MVFR: 'info',
    IFR: 'warning',
    LIFR: 'negative',
  },

  // Classes de fond par catégorie de vol (pour colorisation des blocs)
  flightCategoryBgClass: {
    VFR: 'bg-green-1',
    MVFR: 'bg-cyan-1',
    IFR: 'bg-orange-1',
    LIFR: 'bg-red-1',
  },

  // Tendances
  trends: {
    NOSIG: 'Pas de changement significatif',
    BECMG: 'Changement progressif',
    TEMPO: 'Fluctuations temporaires',
    PROB30: 'Probabilité 30%',
    PROB40: 'Probabilité 40%',
  },
}

// Fonction pour traduire la couverture nuageuse
export function translateCloudCover(cover) {
  return metarTranslations.cloudCover[cover] || cover
}

// Fonction pour traduire un phénomène météo
export function translateWeatherPhenomenon(wx) {
  if (!wx) return ''

  let translation = ''
  const intensity = wx.match(/^[-+]/) ? wx[0] : ''
  const phenomenon = wx.replace(/^[-+]/, '')

  if (intensity) {
    translation += metarTranslations.weatherPhenomena[intensity] + ' '
  }

  // Découper en groupes de 2 caractères
  const parts = phenomenon.match(/.{1,2}/g) || []
  const translated = parts.map((part) => metarTranslations.weatherPhenomena[part] || part).join(' ')

  return (translation + translated).trim()
}

// Fonction pour formater la visibilité
export function formatVisibility(visib) {
  if (visib === '6+') return 'Plus de 10 km'
  if (typeof visib === 'number') {
    // Convertir en mètres
    const metersRaw = visib * 1000 * 1.60934

    // Si < 1000m : arrondir à la centaine, sinon à 500m
    const meters =
      metersRaw < 1000 ? Math.round(metersRaw / 100) * 100 : Math.round(metersRaw / 500) * 500

    return `${meters} m`
  }
  return visib
}

// Fonction pour formater l'altitude des nuages
export function formatCloudBase(base) {
  if (!base) return ''
  return `${base} ft`
}

// Fonction pour obtenir la direction cardinale
export function getCardinalDirection(degrees) {
  if (degrees === null || degrees === undefined) return ''

  const directions = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ]
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}

// Fonction pour formater une période de temps TAF
export function formatTafTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  return (
    date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }) + ' UTC'
  )
}

// Fonction pour obtenir le type de changement TAF
export function getChangeType(fcstChange) {
  return metarTranslations.trends[fcstChange] || 'Prévision de base'
}

// Fonctions centralisées pour les catégories de vol (évite la duplication dans les composants)
export function translateFlightCategory(fltCat) {
  return metarTranslations.flightCategory[fltCat] || fltCat
}

export function getFlightCategoryColor(fltCat) {
  return metarTranslations.flightCategoryColor[fltCat] || 'grey'
}

export function getFlightCategoryBgClass(fltCat) {
  return metarTranslations.flightCategoryBgClass[fltCat] || 'bg-grey-2'
}
