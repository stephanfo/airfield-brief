/**
 * Parseur des fichiers `.aircraft` (format XML SkyDemon) — source de vérité avion.
 *
 * Les fichiers `.aircraft` sont maintenus dans un logiciel externe et déposés tels
 * quels dans `public/data/aircrafts/`. Ils contiennent masse & centrage, points de
 * chargement, enveloppe, conso carburant, tarif horaire et check-lists complètes.
 * Ce module les convertit en un objet normalisé exploité par les stores/UI.
 *
 * Conventions d'unités conservées telles quelles depuis le XML :
 *  - bras de levier (`arm`) : **millimètres** (LeverArm, EmptyArmLon, Envelope)
 *  - masses (`weight`/`mass`) : **kilogrammes**
 *  - carburant : **litres** (volume) ; la masse se déduit via la densité
 *
 * Ce qui MANQUE dans le `.aircraft` (tables de performances décollage/atterrissage,
 * densité carburant explicite) est complété côté `aircrafts.json` puis fusionné par
 * le store, pas ici.
 */

/** Densité (kg/L) par type de carburant, fallback si non fourni par le complément. */
export const FUEL_DENSITY_DEFAULTS = {
  AvGas100LL: 0.72,
  Mogas: 0.74,
  JetA1: 0.8,
}

const DEFAULT_FUEL_DENSITY = 0.72

/** Supprime les diacritiques (combinings U+0300–U+036F) d'une chaîne. */
function stripDiacritics(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Convertit un libellé en identifiant stable (kebab-case ASCII). */
export function slugify(label) {
  return stripDiacritics(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Lit un attribut numérique, renvoie `fallback` si absent/illisible. */
function numAttr(el, name, fallback = null) {
  if (!el) return fallback
  const raw = el.getAttribute(name)
  if (raw == null || raw === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

/**
 * Traductions FR des noms de postes par défaut du logiciel (anglais SkyDemon).
 * Clé = nom normalisé (minuscule, sans accent). Si absent → nom du XML conservé.
 */
const STATION_LABELS_FR = {
  pilot: 'Pilote',
  'co-pilot': 'Copilote',
  copilot: 'Copilote',
  'front passenger': 'Passager avant',
  'front passengers': 'Passagers avant',
  passenger: 'Passager',
  passengers: 'Passagers',
  'rear passenger': 'Passager arrière',
  'rear passenger 1': 'Passager arrière 1',
  'rear passenger 2': 'Passager arrière 2',
  'rear passengers': 'Passagers arrière',
  baggage: 'Bagages',
  luggage: 'Bagages',
  'main tank': 'Réservoir principal',
  'main fuel tank': 'Réservoir principal',
  'fuel tank': 'Réservoir',
  'left tank': 'Réservoir gauche',
  'right tank': 'Réservoir droit',
  'aux tank': 'Réservoir auxiliaire',
  fuel: 'Carburant',
}

/** Renvoie le libellé FR d'un poste si connu, sinon le nom d'origine. */
function localizeStationLabel(name) {
  const key = stripDiacritics(name).toLowerCase().trim()
  return STATION_LABELS_FR[key] ?? name
}

/** Déduit le type de poste de chargement à partir de la balise et du nom. */
function stationType(tagName, name) {
  if (tagName === 'FuelLoadingPoint') return 'fuel'
  if (/bagg|bagage|coffre|luggage|soute/i.test(name)) return 'baggage'
  return 'person'
}

/**
 * Rang d'affichage d'un poste : pilote, passager avant, passagers arrière,
 * bagages, puis carburant (principal avant auxiliaire/secondaire). Sert à
 * réordonner les postes indépendamment de l'ordre du XML d'origine.
 */
function stationRank(type, name) {
  const n = stripDiacritics(name).toLowerCase()
  if (type === 'fuel') return /aux|secondaire|secondary|right|droit|left|gauche/.test(n) ? 51 : 50
  if (type === 'baggage') return 40
  // person
  if (/pilot|pilote|commandant|cdb/.test(n) && !/co-?pilot|copilot|copilote/.test(n)) return 0
  if (/co-?pilot|copilot|copilote|front|avant/.test(n)) return 10
  if (/rear|arriere/.test(n)) return 20
  return 30 // autre personne, après les sièges nommés, avant bagages
}

/**
 * Parse l'attribut `Envelope` ("arm,weight,arm,weight,…") en liste de sommets.
 * @returns {Array<{ arm: number, weight: number }>}
 */
export function parseEnvelope(raw) {
  if (!raw) return []
  const nums = String(raw)
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isFinite(n))
  const points = []
  for (let i = 0; i + 1 < nums.length; i += 2) {
    points.push({ arm: nums[i], weight: nums[i + 1] })
  }
  return points
}

/** Extrait les check-lists (phases → sections → items). */
function parseChecklists(root) {
  const bundle = root.querySelector('ChecklistBundle')
  if (!bundle) return []
  return Array.from(bundle.querySelectorAll('Checklist')).map((cl) => ({
    id: slugify(cl.getAttribute('Name')),
    name: cl.getAttribute('Name') ?? '',
    phase: cl.getAttribute('FlightPhase') ?? '',
    sections: Array.from(cl.querySelectorAll('Section')).map((sec) => ({
      id: slugify(sec.getAttribute('Name')),
      name: sec.getAttribute('Name') ?? '',
      header: sec.getAttribute('Header') ?? '',
      autoReset: sec.getAttribute('AutoReset') === 'True',
      items: Array.from(sec.querySelectorAll('CheckItem')).map((it) => ({
        challenge: it.getAttribute('Challenge') ?? '',
        response: it.getAttribute('Response') ?? '',
      })),
    })),
  }))
}

/** Extrait les postes de chargement (carburant + masses). */
function parseStations(root, density) {
  const container = root.querySelector('LoadingPoints')
  if (!container) return []
  const stations = []
  for (const el of Array.from(container.children)) {
    const name = el.getAttribute('Name') ?? ''
    const type = stationType(el.tagName, name)
    const arm = numAttr(el, 'LeverArm', 0)
    const label = localizeStationLabel(name)
    const rank = stationRank(type, name)
    if (type === 'fuel') {
      const maxVolume = numAttr(el, 'Capacity', numAttr(el, 'MaxFuel', 0))
      const unusable = numAttr(el, 'Unusable', 0)
      stations.push({
        id: slugify(name) || 'fuel',
        label,
        type,
        arm,
        rank,
        maxVolume,
        unusable,
        density,
        default: numAttr(el, 'DefaultValue', 0), // litres
      })
    } else {
      stations.push({
        id: slugify(name),
        label,
        type,
        arm,
        rank,
        maxWeight: numAttr(el, 'MaxWeight', null), // souvent absent du XML → complété au besoin
        default: numAttr(el, 'DefaultValue', 0), // kg
      })
    }
  }
  // Ordre métier : pilote → passager avant → passagers arrière → bagages → carburant.
  // Tri stable (index d'origine en départage) pour préserver l'ordre XML à rang égal.
  return stations
    .map((s, i) => ({ s, i }))
    .sort((a, b) => a.s.rank - b.s.rank || a.i - b.i)
    .map(({ s }) => s)
}

/**
 * Parse un fichier `.aircraft` (chaîne XML) en objet avion normalisé.
 * @param {string} xmlString
 * @param {{ density?: number }} [opts] - densité carburant fournie par le complément
 * @returns {object} avion normalisé
 * @throws {Error} si le XML est invalide / non reconnu
 */
export function parseAircraftXml(xmlString, opts = {}) {
  if (typeof xmlString !== 'string' || !xmlString.trim()) {
    throw new Error('Fichier .aircraft vide ou illisible')
  }
  const doc = new DOMParser().parseFromString(xmlString, 'application/xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('XML .aircraft malformé')
  }
  const root = doc.querySelector('Aircraft')
  if (!root) {
    throw new Error('Élément <Aircraft> introuvable')
  }

  const fuelType = root.getAttribute('FuelType') ?? 'AvGas100LL'
  const density = opts.density ?? FUEL_DENSITY_DEFAULTS[fuelType] ?? DEFAULT_FUEL_DENSITY

  const climb = root.querySelector('ClimbProfile')
  const descent = root.querySelector('DescentProfile')
  const cruise = root.querySelector('CruiseProfiles > CruiseProfile, CruiseProfile')

  return {
    registration: root.getAttribute('Registration') ?? '',
    model: root.getAttribute('Name') ?? '',
    type: root.getAttribute('Type') ?? '',
    emptyWeight: numAttr(root, 'EmptyWeight', 0),
    emptyArm: numAttr(root, 'EmptyArmLon', 0),
    maxTakeoffWeight: numAttr(root, 'MaximumWeight', 0),
    minRunwayM: numAttr(root, 'MinimumRunwayLengthMetres', null),
    fuel: {
      type: fuelType,
      density,
      maxVolume: numAttr(root, 'MaxFuel', 0),
      taxiFuel: numAttr(root, 'TaxiFuel', 0),
      landingFuel: numAttr(root, 'LandingFuel', 0),
      finalReserveMinutes: numAttr(root, 'FinalReserveMinutes', 30),
      contingency: numAttr(root, 'FuelContingency', 0),
      holdingMinutes: numAttr(root, 'HoldingMinutes', 0),
      burn: {
        climb: numAttr(climb, 'FuelBurnSL', null),
        cruise: numAttr(cruise, 'FuelBurn', null),
        descent: numAttr(descent, 'FuelBurn', null),
      },
    },
    pricing: {
      hourlyRate: numAttr(root, 'HourlyCost', null),
      currency: 'EUR',
      includesFuel: root.getAttribute('HourlyCostIncludesFuel') === 'True',
    },
    stations: parseStations(root, density),
    envelope: parseEnvelope(root.getAttribute('Envelope')),
    envelopeType: root.getAttribute('EnvelopeType') ?? '',
    checklists: parseChecklists(root),
  }
}

/**
 * Construit un avion normalisé complet : parse le XML puis fusionne le
 * complément issu de l'index `aircrafts.json` (immatriculation de référence,
 * tables de performances, densité carburant).
 * Fonction pure (pas de fetch) — l'orchestration réseau reste dans le store.
 *
 * @param {string} xml - contenu du fichier `.aircraft`
 * @param {{ registration?: string, performance?: object }} [entry] - entrée de l'index
 * @param {{ densities?: object, defaultPerformance?: object }} [opts]
 * @returns {object} avion normalisé
 * @throws {Error} si le XML est invalide / non reconnu
 */
export function buildAircraftFromXml(xml, entry = {}, opts = {}) {
  const { densities = FUEL_DENSITY_DEFAULTS, defaultPerformance = null } = opts
  const fuelType = (xml.match(/FuelType="([^"]+)"/) || [])[1]
  const parsed = parseAircraftXml(xml, { density: densities[fuelType] })
  return {
    ...parsed,
    // L'index fait foi pour l'immatriculation (clé), au cas où le XML diffère.
    registration: entry.registration || parsed.registration,
    performance: entry.performance ?? defaultPerformance,
  }
}
