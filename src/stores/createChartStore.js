/**
 * Factory pour créer des stores Pinia de cartes aéronautiques (TEMSI, WINTEM)
 *
 * Élimine la duplication entre temsiStore et wintemStore qui partagent
 * exactement la même structure (chargement, cache, liste).
 */

import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useDataFetcher } from '../composables/useDataFetcher'
import { getEndpointConfig } from '../config/app.config'
import { resolveUpdateTimestamp } from '../utils/dateHelpers'

/**
 * @param {string} name - Nom du store Pinia (ex: 'temsi', 'wintem')
 * @param {string} endpointName - Clé de l'endpoint dans API_CONFIG.endpoints
 * @param {string} listField - Nom du champ contenant la liste dans la réponse JSON
 * @param {Object} aliases - Noms des propriétés exposées { list, load }
 * @param {string} [errorLabel] - Libellé humain pour le toast d'erreur de chargement
 * @returns {Function} Store Pinia défini via defineStore
 */
export function createChartStore(name, endpointName, listField, aliases, errorLabel = null) {
  const epConfig = getEndpointConfig(endpointName)

  return defineStore(name, () => {
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
    } = useDataFetcher(epConfig.url, {
      ttl: epConfig.refreshInterval,
      staleWhileRevalidate: true,
      deduplicate: true,
      persist: true,
      errorLabel,
    })

    const generatedAt = computed(() => resolveUpdateTimestamp(rawData.value))

    const chartList = computed(() => {
      return rawData.value?.[listField] || []
    })

    const loadData = () => fetchData()
    const forceRefresh = () => refetch()

    return {
      rawData,
      generatedAt,
      loading,
      error,
      isRefreshing,
      lastFetchedAt,
      nextRefreshAt,

      // Propriétés aliasées pour compatibilité avec le code existant
      [aliases.list]: chartList,

      // Actions
      [aliases.load]: loadData,
      forceRefresh,
      invalidate,
    }
  })
}
