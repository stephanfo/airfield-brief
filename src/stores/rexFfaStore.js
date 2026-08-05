/**
 * Store Pinia pour les REX FFA (retours d'expérience de sécurité)
 *
 * Gère le chargement et le cache de rex.json (synthèse LLM mensuelle + liste
 * des REX de la fenêtre servie) et l'index id → REX pour résoudre les
 * citations `{id}` de la synthèse.
 *
 * Les filtres (type, objet, régime, recherche…) sont un état d'UI local à
 * RexFfaPage.vue — même pattern que les NOTAMs (cf. NotamPage.vue) — et
 * s'appuient sur les prédicats purs de src/utils/rexHelpers.js.
 */

import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useDataFetcher } from '../composables/useDataFetcher'
import { getEndpointConfig } from '../config/app.config'
import { resolveUpdateTimestamp } from '../utils/dateHelpers'
import { normalizePlace, normalizeAerodromeCodesInText } from '../utils/rexHelpers'

const rexFfaConfig = getEndpointConfig('rexFfa')

// Champs narratifs en texte libre pouvant citer un code aérodrome en casse
// incohérente (saisie brute du déclarant côté FFA) — cf. normalizePlace pour
// le champ `place` lui-même, dédié et toujours mis en majuscules.
const NARRATIVE_FIELDS = ['title', 'description', 'eventSummary', 'safetyEducation']

// Tableau vide partagé : garde une identité stable quand le payload ne porte
// pas encore de REX/synthèses (cf. memoizeListNormalization).
const EMPTY_LIST = Object.freeze([])

/**
 * Normalise un REX brut du JSON servi : `place` toujours en majuscules, et les
 * codes aérodrome mentionnés dans les champs narratifs corrigés en casse,
 * sans toucher au reste du texte (cf. rexHelpers.js).
 * @param {object} rex
 * @returns {object}
 */
function normalizeRex(rex) {
  const normalized = { ...rex, place: normalizePlace(rex.place) }

  for (const field of NARRATIVE_FIELDS) {
    if (normalized[field]) normalized[field] = normalizeAerodromeCodesInText(normalized[field])
  }

  if (Array.isArray(normalized.causes)) {
    normalized.causes = normalized.causes.map((cause) =>
      cause?.description
        ? { ...cause, description: normalizeAerodromeCodesInText(cause.description) }
        : cause,
    )
  }

  if (Array.isArray(normalized.actions)) {
    normalized.actions = normalized.actions.map((action) =>
      action?.description
        ? { ...action, description: normalizeAerodromeCodesInText(action.description) }
        : action,
    )
  }

  return normalized
}

/**
 * Normalise la synthèse LLM (texte narratif pouvant lui aussi citer un code
 * aérodrome en casse incohérente) — cf. normalizeRex.
 * @param {{text?: string}|null} summaryEntry
 * @returns {{text?: string}|null}
 */
function normalizeSummaryEntry(summaryEntry) {
  return summaryEntry?.text
    ? { ...summaryEntry, text: normalizeAerodromeCodesInText(summaryEntry.text) }
    : summaryEntry
}

/**
 * Mémoïse la normalisation d'une liste sur la référence du tableau source.
 *
 * Sans ce cache, chaque revalidation (TTL 1 h) ou retour d'onglet recréerait
 * 724 objets REX : `rexById`, `filteredRexList` et `filterOptions` seraient
 * invalidés ensemble et toute la liste re-rendue, alors que le JSON servi est
 * le plus souvent identique d'un run mensuel à l'autre.
 *
 * @param {(item: object) => object} normalizeItem
 * @returns {(list: object[]) => object[]}
 */
function memoizeListNormalization(normalizeItem) {
  let lastSource = null
  let lastResult = EMPTY_LIST

  return (list) => {
    // `list` peut être absent (payload partiel) : on renvoie toujours LE MÊME
    // tableau vide, sinon la mémoïsation serait cassée par un littéral neuf.
    if (!Array.isArray(list) || list.length === 0) return EMPTY_LIST
    if (list === lastSource) return lastResult
    lastSource = list
    lastResult = list.map(normalizeItem)
    return lastResult
  }
}

export const useRexFfaStore = defineStore('rexFfa', () => {
  const {
    data: rawData,
    fetchData,
    refetch,
    invalidate,
    loading,
    error,
    isRefreshing,
    lastFetchedAt,
    nextRefreshAt,
  } = useDataFetcher(rexFfaConfig.url, {
    ttl: rexFfaConfig.refreshInterval,
    staleWhileRevalidate: true,
    deduplicate: true,
    persist: true,
    errorLabel: 'REX FFA',
  })

  // Caches propres à l'instance de store (et non au module) : deux Pinia
  // distincts — cas des tests — ne doivent pas partager leur mémoïsation.
  const normalizeRexList = memoizeListNormalization(normalizeRex)
  const normalizeSummaryList = memoizeListNormalization(normalizeSummaryEntry)

  const generatedAt = computed(() => resolveUpdateTimestamp(rawData.value))
  const window = computed(() => rawData.value?.window || null)
  const summary = computed(() => normalizeSummaryEntry(rawData.value?.summary || null))
  const rexList = computed(() => normalizeRexList(rawData.value?.rex))

  /**
   * Historique des synthèses mensuelles servi par rex.json (`summaries[]`, borné
   * à la fenêtre des REX servis), période décroissante — alimente le sélecteur de
   * mois de l'onglet Synthèse.
   *
   * La page ne lit QUE cette liste : toute synthèse absente d'ici est invisible.
   * On y réinjecte donc `summary` s'il n'y figure pas, ce qui couvre à la fois le
   * rex.json d'avant `summaries[]` (compat) et un payload désynchronisé où le
   * backend servirait une synthèse hors historique (fail-safe LLM).
   */
  const summaries = computed(() => {
    // Normalisé sur le tableau SOURCE (mémoïsable), puis filtré : filtrer
    // d'abord produirait un tableau neuf à chaque appel, jamais réutilisable.
    const merged = normalizeSummaryList(rawData.value?.summaries).filter((s) => s?.text)

    const served = summary.value
    if (served?.text && !merged.some((s) => s.period === served.period)) {
      merged.push(served)
      merged.sort((a, b) => String(b.period).localeCompare(String(a.period)))
    }

    return merged
  })

  /**
   * Synthèse d'une période donnée ; sans période (ou période inconnue), la plus
   * récente disponible — pour que l'onglet ait toujours quelque chose à afficher.
   */
  const findSummaryByPeriod = (period) =>
    summaries.value.find((s) => s.period === period) || summaries.value[0] || null

  /**
   * Index id → REX, pour résoudre les citations `{id}` de la synthèse.
   */
  const rexById = computed(() => {
    const map = new Map()
    for (const rex of rexList.value) {
      map.set(String(rex.id), rex)
    }
    return map
  })

  const findRexById = (id) => rexById.value.get(String(id)) || null

  // ============================================
  // Actions
  // ============================================

  const loadRexFfa = () => fetchData()

  const forceRefresh = () => refetch()

  return {
    // State
    rawData,
    generatedAt,
    window,
    summary,
    summaries,
    rexList,
    loading,
    error,
    isRefreshing,
    lastFetchedAt,
    nextRefreshAt,

    // Actions
    loadRexFfa,
    forceRefresh,
    invalidate,
    findRexById,
    findSummaryByPeriod,
  }
})
