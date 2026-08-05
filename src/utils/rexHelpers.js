/**
 * Utilitaires pour la gestion des REX FFA (retours d'expérience)
 */
import { CLUB_CONFIG } from '../config/club.config'

/**
 * Détermine la couleur Quasar (positive/warning/negative) d'un niveau de risque
 * (matrice sévérité × probabilité, chacune 1-5, cf. template REX FFA).
 * @param {{severity: number, probability: number}|null|undefined} risk
 * @returns {'positive'|'warning'|'negative'|'grey'}
 */
export function riskColor(risk) {
  if (!risk || !risk.severity || !risk.probability) return 'grey'

  const score = risk.severity * risk.probability

  if (score >= 15) return 'negative'
  if (score >= 6) return 'warning'
  return 'positive'
}

/**
 * Libellé court d'un niveau de risque pour affichage en badge.
 * @param {{severity: number, probability: number}|null|undefined} risk
 * @returns {string}
 */
export function riskLabel(risk) {
  if (!risk || !risk.severity || !risk.probability) return 'Non évalué'

  const color = riskColor(risk)
  if (color === 'negative') return 'Risque élevé'
  if (color === 'warning') return 'Risque modéré'
  return 'Risque faible'
}

/**
 * Couleur Quasar associée au type de REX.
 * @param {string} type - 'Anomalie' | 'Bonne pratique'
 * @returns {'negative'|'positive'|'grey'}
 */
export function typeColor(type) {
  if (type === 'Anomalie') return 'negative'
  if (type === 'Bonne pratique') return 'positive'
  return 'grey'
}

/**
 * Vrai si une cause est la cause principale de l'évènement (par opposition à un
 * simple facteur contributif). Le backend fournit `cause.type` ('Cause Principale'
 * | 'Facteur contributif').
 * @param {{type?: string}} cause
 * @returns {boolean}
 */
export function isMainCause(cause) {
  return (cause?.type || '').trim().toLowerCase() === 'cause principale'
}

/**
 * Retourne les causes triées avec la/les cause(s) principale(s) en premier, pour
 * les mettre en avant à l'affichage. Ne modifie pas le tableau source.
 * @param {Array<{type?: string}>} causes
 * @returns {Array<{type?: string}>}
 */
export function sortCausesMainFirst(causes) {
  return [...(causes || [])].sort((a, b) => Number(isMainCause(b)) - Number(isMainCause(a)))
}

/**
 * Vérifie si un REX correspond au filtre de type.
 * @param {object} rex
 * @param {string} filter - 'all' ou une valeur de rex.type
 * @returns {boolean}
 */
export function matchesTypeFilter(rex, filter) {
  if (!filter || filter === 'all') return true
  return rex.type === filter
}

/**
 * Vérifie si un REX correspond au filtre d'objet (subject).
 * @param {object} rex
 * @param {string} filter - 'all' ou une valeur de rex.subject
 * @returns {boolean}
 */
export function matchesSubjectFilter(rex, filter) {
  if (!filter || filter === 'all') return true
  return rex.subject === filter
}

/**
 * Vérifie si un REX correspond au filtre de régime de vol.
 * @param {object} rex
 * @param {string} filter - 'all' ou une valeur de rex.flightRegime
 * @returns {boolean}
 */
export function matchesRegimeFilter(rex, filter) {
  if (!filter || filter === 'all') return true
  return rex.flightRegime === filter
}

/**
 * Vérifie si un REX correspond au filtre de nature de vol (flightKind).
 * @param {object} rex
 * @param {string} filter - 'all' ou une valeur de rex.flightKind
 * @returns {boolean}
 */
export function matchesFlightKindFilter(rex, filter) {
  if (!filter || filter === 'all') return true
  return rex.flightKind === filter
}

/**
 * Vérifie si un REX correspond au filtre de classe d'évènement (eventKind).
 * @param {object} rex
 * @param {string} filter - 'all' ou une valeur de rex.eventKind
 * @returns {boolean}
 */
export function matchesEventKindFilter(rex, filter) {
  if (!filter || filter === 'all') return true
  return rex.eventKind === filter
}

/**
 * Vérifie si un REX a eu lieu sur le terrain de rattachement du club.
 * @param {object} rex
 * @returns {boolean}
 */
export function isAtClubField(rex) {
  return (rex.place || '').trim().toUpperCase() === CLUB_CONFIG.airfield.icao.toUpperCase()
}

/**
 * Normalise le champ `place` (lieu de l'évènement, saisi en texte libre par le
 * déclarant côté FFA) : espaces superflus retirés, tout en majuscules. Ne
 * valide ni ne rejette aucun format — un lieu hors code OACI (aérodrome
 * étranger, altisurface, texte libre type "Baie de Somme") reste affiché tel
 * quel, seulement mis en majuscules.
 * @param {string|null|undefined} place
 * @returns {string}
 */
export function normalizePlace(place) {
  return (place || '').trim().toUpperCase()
}

// Code OACI français isolé dans du texte libre : "LF" + exactement 2 lettres,
// en tant que "mot" (frontières = non-lettre ou début/fin de chaîne).
// Insensible à la casse. Un code altisurface à 6 caractères (ex. LF3832) n'est
// jamais concerné : après "LF" + 2 lettres, un chiffre casse le lookahead
// négatif de toute façon puisque LF3832 n'a que 2 lettres suivies de chiffres.
const AERODROME_CODE_REGEX = /(?<![A-Za-z])LF[A-Za-z]{2}(?![A-Za-z])/gi

/**
 * Met en majuscule les codes aérodrome (ex. "lfeh" → "LFEH") trouvés au milieu
 * d'un texte narratif libre (titre, description, enseignement...), sans
 * toucher au reste de la casse du texte — un titre TOUT-MAJUSCULE ou une
 * description tout en minuscule restent inchangés par ailleurs.
 * @param {string|null|undefined} text
 * @returns {string}
 */
export function normalizeAerodromeCodesInText(text) {
  if (!text) return text || ''
  return text.replace(AERODROME_CODE_REGEX, (match) => match.toUpperCase())
}

/**
 * Vérifie si un REX a été DÉCLARÉ par le club (champ backend `fromClub`), même si
 * l'évènement s'est produit ailleurs (ex. panne au retour d'une navigation).
 * @param {object} rex
 * @returns {boolean}
 */
export function isDeclaredByClub(rex) {
  return rex.fromClub === true
}

/**
 * Vérifie si un REX est pertinent pour le club : déclaré par le club OU survenu
 * sur le terrain de rattachement. Couvre le cas d'un REX du club dont le lieu
 * (place) est ailleurs.
 * @param {object} rex
 * @returns {boolean}
 */
export function isClubRelevant(rex) {
  return isDeclaredByClub(rex) || isAtClubField(rex)
}

/**
 * Recherche plein texte insensible à la casse sur les champs narratifs du REX,
 * y compris les causes, actions correctrices et l'enseignement.
 * @param {object} rex
 * @param {string} query
 * @returns {boolean}
 */
export function matchesSearchQuery(rex, query) {
  if (!query || !query.trim()) return true

  const needle = query.trim().toLowerCase()
  const haystack = [
    rex.title,
    rex.description,
    rex.eventSummary,
    rex.aircraftType,
    rex.eventType,
    rex.place,
    rex.safetyEducation,
    ...(rex.causes || []).flatMap((cause) => [cause.title, cause.description]),
    ...(rex.actions || []).map((action) => action.description),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(needle)
}

/**
 * Applique l'ensemble des filtres REX à un REX donné.
 * @param {object} rex
 * @param {object} filters
 * @param {string} filters.type
 * @param {string} filters.subject
 * @param {string} filters.regime
 * @param {string} filters.flightKind
 * @param {string} filters.eventKind
 * @param {string} filters.search
 * @param {boolean} filters.clubOnly
 * @returns {boolean}
 */
export function matchesAllFilters(rex, filters) {
  return (
    matchesTypeFilter(rex, filters.type) &&
    matchesSubjectFilter(rex, filters.subject) &&
    matchesRegimeFilter(rex, filters.regime) &&
    matchesFlightKindFilter(rex, filters.flightKind) &&
    matchesEventKindFilter(rex, filters.eventKind) &&
    matchesSearchQuery(rex, filters.search) &&
    (!filters.clubOnly || isClubRelevant(rex))
  )
}

/**
 * Extrait la liste triée (valeurs uniques, non vides) d'un champ sur une liste de REX,
 * pour peupler les options d'un filtre.
 * @param {object[]} rexList
 * @param {string} field
 * @returns {string[]}
 */
export function distinctValues(rexList, field) {
  const values = new Set()
  for (const rex of rexList || []) {
    const value = rex[field]
    if (value) values.add(value)
  }
  return [...values].sort((a, b) => a.localeCompare(b, 'fr'))
}

/**
 * Découpe le texte markdown léger de la synthèse LLM en segments affichables,
 * en isolant les citations `{id}` du reste du texte. Évite `v-html` : le
 * template consomme ces segments pour rendre des `<router-link>`/texte sûrs.
 * Supporte : titres `##`/`###`, gras `**texte**`, séparateurs `---`, listes `- `.
 * @param {string} text
 * @returns {Array<{type: 'heading'|'text'|'hr'|'listItem', level?: number, parts?: Array<{type:'text'|'bold'|'citation', value:string}>}>}
 */
export function parseSummaryMarkdown(text) {
  if (!text) return []

  const lines = text.split('\n')
  const blocks = []

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) continue

    if (/^-{3,}$/.test(line)) {
      blocks.push({ type: 'hr' })
      continue
    }

    const headingMatch = line.match(/^(#{2,3})\s+(.*)$/)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        parts: parseInlineSegments(headingMatch[2]),
      })
      continue
    }

    const listMatch = line.match(/^[-*]\s+(.*)$/)
    if (listMatch) {
      blocks.push({ type: 'listItem', parts: parseInlineSegments(listMatch[1]) })
      continue
    }

    blocks.push({ type: 'text', parts: parseInlineSegments(line) })
  }

  return blocks
}

const CITATION_REGEX = /\{([0-9]+(?:\s*,\s*[0-9]+)*)\}/g

/**
 * Découpe le contenu d'un `**gras**` en segments bold / citation : le LLM met parfois
 * une citation en gras (ex. `**{3074}**`), auquel cas elle doit rester cliquable —
 * seul le texte non-citation autour reste un simple segment `bold`.
 * @param {string} boldContent
 * @returns {Array<{type:'bold'|'citation', value:string}>}
 */
function splitBoldContent(boldContent) {
  const segments = []
  let lastIndex = 0
  let match

  CITATION_REGEX.lastIndex = 0
  while ((match = CITATION_REGEX.exec(boldContent)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'bold', value: boldContent.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'citation', value: match[1] })
    lastIndex = CITATION_REGEX.lastIndex
  }

  if (lastIndex < boldContent.length) {
    segments.push({ type: 'bold', value: boldContent.slice(lastIndex) })
  }

  return segments.length ? segments : [{ type: 'bold', value: boldContent }]
}

/**
 * Découpe une ligne en segments texte / gras / citation `{id}`.
 * @param {string} line
 * @returns {Array<{type:'text'|'bold'|'citation', value:string}>}
 */
function parseInlineSegments(line) {
  const segments = []
  // Capture soit **gras**, soit {id[, id...]} (une ou plusieurs citations groupées)
  const tokenRegex = /\*\*(.+?)\*\*|\{([0-9]+(?:\s*,\s*[0-9]+)*)\}/g

  let lastIndex = 0
  let match

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: line.slice(lastIndex, match.index) })
    }

    if (match[1] !== undefined) {
      // Le LLM peut mettre une citation en gras (ex. **{3074}**) : on la ressort
      // comme citation cliquable plutôt que de l'enterrer dans un segment 'bold'.
      segments.push(...splitBoldContent(match[1]))
    } else {
      segments.push({ type: 'citation', value: match[2] })
    }

    lastIndex = tokenRegex.lastIndex
  }

  if (lastIndex < line.length) {
    segments.push({ type: 'text', value: line.slice(lastIndex) })
  }

  return segments
}

/**
 * Extrait la liste des IDs de REX cités entre `{}` dans un segment de citation
 * groupée (ex: "3074, 3065" → ['3074', '3065']).
 * @param {string} value
 * @returns {string[]}
 */
export function splitCitationIds(value) {
  return value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

/**
 * Rend les segments inline (texte/gras/citation) en texte brut, sans aucun
 * symbole markdown : le gras est déplié, une citation {id[, id...]} devient
 * "(REX #id)" — lisible tel quel une fois collé dans un email ou WhatsApp.
 * @param {Array<{type:'text'|'bold'|'citation', value:string}>} parts
 * @returns {string}
 */
function renderPartsAsPlainText(parts) {
  return (parts || [])
    .map((part) => {
      if (part.type === 'citation') {
        const ids = splitCitationIds(part.value)
        return `(REX ${ids.map((id) => `#${id}`).join(', ')})`
      }
      return part.value
    })
    .join('')
}

/**
 * Convertit la synthèse markdown léger de la synthèse LLM en texte brut
 * partageable (copié-collé dans un email ou WhatsApp) : aucun symbole
 * markdown, citations `{id}` explicitées en "(REX #id)".
 * @param {string} text
 * @returns {string}
 */
export function formatSummaryForSharing(text) {
  const blocks = parseSummaryMarkdown(text)
  const lines = []

  for (const block of blocks) {
    if (block.type === 'hr') {
      lines.push('───────────────────────')
      continue
    }

    const content = renderPartsAsPlainText(block.parts)

    if (block.type === 'heading') {
      lines.push('')
      lines.push(block.level === 2 ? content.toUpperCase() : content)
      continue
    }

    if (block.type === 'listItem') {
      lines.push(`- ${content}`)
      continue
    }

    lines.push(content)
  }

  return lines.join('\n').trim()
}

/**
 * Formate une période 'YYYY-MM' en libellé français ('juin 2026').
 *
 * La période est une information métier essentielle : début juillet, la synthèse
 * porte sur juin — sans elle, on croirait lire le mois en cours. Partagé entre le
 * titre de la carte de synthèse et le sélecteur d'archives, pour que les deux
 * affichent exactement le même libellé.
 *
 * @param {string} period Période 'YYYY-MM'.
 * @returns {string} Libellé ('juin 2026'), ou '' si la période est absente/invalide.
 */
export function formatSummaryPeriod(period) {
  if (typeof period !== 'string') return ''
  const match = period.match(/^(\d{4})-(\d{2})$/)
  if (!match) return ''
  const [, year, month] = match
  const monthIndex = Number(month) - 1
  if (monthIndex < 0 || monthIndex > 11) return ''
  return new Date(Number(year), monthIndex, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
}
