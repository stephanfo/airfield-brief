import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useDataFetcher } from '../composables/useDataFetcher'
import { getEndpointConfig } from '../config/app.config'
import { resolveUpdateTimestamp } from '../utils/dateHelpers'
import { parseEphemeris, findTodayIndex } from '../utils/ephemerisHelpers'

const ephemerisConfig = getEndpointConfig('ephemeris')

/**
 * Store des éphémérides (lever/coucher du soleil, crépuscules civils).
 * Les heures sont pré-calculées par N8N (IMCCE) et servies en JSON statique ;
 * ce store ne fait que charger et normaliser les données (cf. ADR-021).
 *
 * Les états dépendant de l'heure courante (compte à rebours, jour/nuit) sont
 * délibérément calculés dans le composant (via useNow), pas ici : le store reste
 * pur (données + fraîcheur) et n'a pas besoin d'un timer.
 */
export const useEphemerisStore = defineStore('ephemeris', () => {
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
  } = useDataFetcher(ephemerisConfig.url, {
    ttl: ephemerisConfig.refreshInterval,
    staleWhileRevalidate: true,
    deduplicate: true,
    persist: true,
    errorLabel: 'éphémérides',
  })

  const generatedAt = computed(() =>
    resolveUpdateTimestamp(rawData.value, ['generatedAt', 'isoNow']),
  )

  const isEphemerisStale = computed(() => {
    const ts = generatedAt.value
    if (!ts) return false
    return Date.now() - new Date(ts).getTime() > ephemerisConfig.staleThreshold
  })

  /**
   * Éphémérides du JOUR COURANT (objet ISO) ou null si données absentes.
   * Utilisé par les widgets (Accueil/Météo) qui n'affichent qu'aujourd'hui.
   * La page dédiée lit `rawData` et gère son propre index de jour (slider).
   */
  const ephemeris = computed(() =>
    parseEphemeris(rawData.value, findTodayIndex(rawData.value, Date.now())),
  )

  const loadEphemeris = () => fetchData()

  const forceRefresh = () => refetch()

  return {
    rawData,
    ephemeris,
    generatedAt,
    isEphemerisStale,
    loading,
    error,
    isRefreshing,
    lastFetchedAt,
    nextRefreshAt,
    loadEphemeris,
    forceRefresh,
    invalidate,
  }
})
