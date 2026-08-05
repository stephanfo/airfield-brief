import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useDataFetcher } from '../composables/useDataFetcher'
import { getEndpointConfig } from '../config/app.config'
import { resolveUpdateTimestamp } from '../utils/dateHelpers'
import { buildAircraftFromXml, FUEL_DENSITY_DEFAULTS } from '../utils/aircraftXml'
import { logger } from '../utils/logger'
import { STORAGE_KEYS } from '../config/storageKeys'

const aircraftsConfig = getEndpointConfig('aircrafts')
const SELECTED_KEY = STORAGE_KEYS.SELECTED_AIRCRAFT

/**
 * Store avion : charge l'index `aircrafts.json`, puis récupère et parse les
 * fichiers `.aircraft` (XML, source de vérité) référencés. Fusionne le complément
 * (tables de performances, densité carburant) et expose la liste normalisée + la
 * sélection courante (partagée par tous les onglets de la page Préparation vol).
 *
 * Les `.aircraft` sont des fichiers statiques quasi-immuables : on les fetch une
 * fois (texte XML), à la différence du pipeline JSON classique (useDataFetcher).
 */
export const useAircraftStore = defineStore('aircraft', () => {
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
  } = useDataFetcher(aircraftsConfig.url, {
    ttl: aircraftsConfig.refreshInterval,
    staleWhileRevalidate: true,
    deduplicate: true,
    persist: true,
    errorLabel: 'avions',
  })

  /** Liste des avions normalisés (XML parsé + complément fusionné). */
  const aircraftList = ref([])
  /** Erreur spécifique au parsing XML (distincte de l'erreur réseau de l'index). */
  const parseError = ref(null)
  const building = ref(false)

  const generatedAt = computed(() => resolveUpdateTimestamp(rawData.value, ['generatedAt']))

  const isStale = computed(() => {
    const ts = generatedAt.value
    if (!ts) return false
    return Date.now() - new Date(ts).getTime() > aircraftsConfig.staleThreshold
  })

  // ===== Sélection (préférence UI, localStorage) =====
  const selectedRegistration = ref(
    (() => {
      try {
        return localStorage.getItem(SELECTED_KEY) || null
      } catch {
        return null
      }
    })(),
  )

  const selectedAircraft = computed(() => {
    const list = aircraftList.value
    if (!list.length) return null
    return list.find((a) => a.registration === selectedRegistration.value) ?? list[0]
  })

  // Garantit une sélection valide dès que la liste est chargée : au 1er accès
  // (rien en localStorage) ou si l'immat mémorisée n'existe plus, on retombe sur
  // le 1er avion. Sans ça, le sélecteur s'affiche vide alors que le reste de la
  // page utilise déjà list[0] via le fallback de `selectedAircraft`.
  watch(
    aircraftList,
    (list) => {
      if (!list.length) return
      const valid = list.some((a) => a.registration === selectedRegistration.value)
      if (!valid) selectedRegistration.value = list[0].registration
    },
    { immediate: true },
  )

  /** Change l'avion sélectionné et persiste le choix. */
  function setSelected(registration) {
    selectedRegistration.value = registration
    try {
      localStorage.setItem(SELECTED_KEY, registration)
    } catch (e) {
      logger.warn('Impossible de mémoriser l’avion sélectionné:', e)
    }
  }

  /**
   * Construit la liste normalisée à partir de l'index : fetch + parse de chaque XML.
   * Les erreurs par fichier sont isolées (un avion KO ne casse pas les autres).
   */
  async function buildAircraftList(index) {
    if (!index?.aircraft?.length) {
      aircraftList.value = []
      return
    }
    building.value = true
    parseError.value = null
    const densities = { ...FUEL_DENSITY_DEFAULTS, ...(index.fuelDensity ?? {}) }
    const defaultPerf = index.defaultPerformance ?? null

    const results = await Promise.allSettled(
      index.aircraft.map(async (entry) => {
        const res = await fetch(entry.source)
        if (!res.ok) throw new Error(`HTTP ${res.status} sur ${entry.source}`)
        const xml = await res.text()
        return buildAircraftFromXml(xml, entry, { densities, defaultPerformance: defaultPerf })
      }),
    )

    const ok = []
    for (const r of results) {
      if (r.status === 'fulfilled') ok.push(r.value)
      else logger.error('Échec parsing avion:', r.reason)
    }
    if (!ok.length && results.length) {
      parseError.value = 'Impossible de lire les fichiers avion (.aircraft)'
    }
    aircraftList.value = ok
  }

  // Reconstruit dès que l'index change.
  watch(rawData, (idx) => buildAircraftList(idx), { immediate: false })

  const loadAircrafts = async () => {
    const idx = await fetchData()
    if (idx && !aircraftList.value.length) await buildAircraftList(idx)
    return idx
  }

  const forceRefresh = async () => {
    const idx = await refetch()
    await buildAircraftList(idx)
    return idx
  }

  return {
    rawData,
    aircraftList,
    selectedRegistration,
    selectedAircraft,
    generatedAt,
    isStale,
    loading,
    building,
    error,
    parseError,
    isRefreshing,
    lastFetchedAt,
    nextRefreshAt,
    setSelected,
    loadAircrafts,
    forceRefresh,
    invalidate,
  }
})
