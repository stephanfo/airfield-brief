import { computed } from 'vue'
import { useDataFetcher } from './useDataFetcher'
import { getEndpointConfig } from '../config/app.config'
import { resolveUpdateTimestamp } from '../utils/dateHelpers'

/**
 * Pipeline de données commun aux sous-stores de la station météo
 * (vent actuel, historique vent, atmosphère) : useDataFetcher configuré
 * depuis app.config (stale-while-revalidate + persistance) et computed
 * `generatedAt`.
 *
 * Chaque store reste un defineStore explicite : il étale ce bundle et
 * ajoute ses computed métier sous leur vrai nom (pas d'alias dynamiques,
 * contrairement à createChartStore — voir l'audit 2026-06).
 *
 * @param {string} endpointName - Nom de l'endpoint dans app.config.js
 * @param {string} errorLabel - Libellé humain pour le toast d'erreur
 */
export function useStationFetcher(endpointName, errorLabel) {
  const config = getEndpointConfig(endpointName)

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
  } = useDataFetcher(config.url, {
    ttl: config.refreshInterval,
    staleWhileRevalidate: true,
    deduplicate: true,
    persist: true,
    errorLabel,
  })

  const generatedAt = computed(() => resolveUpdateTimestamp(rawData.value))

  return {
    rawData,
    generatedAt,
    loading,
    error,
    isRefreshing,
    lastFetchedAt,
    nextRefreshAt,
    fetchData,
    refetch,
    invalidate,
  }
}
