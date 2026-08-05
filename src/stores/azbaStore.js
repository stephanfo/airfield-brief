/**
 * Store Pinia pour la gestion des données AZBA (zones aériennes)
 *
 * Gère :
 * - Chargement et cache des statuts AZBA
 * - Zones prioritaires
 * - Statuts en temps réel
 */

import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useDataFetcher } from '../composables/useDataFetcher'
import { getEndpointConfig, AZBA_CONFIG } from '../config/app.config'
import { resolveUpdateTimestamp } from '../utils/dateHelpers'

const azbaConfig = getEndpointConfig('azba')

export const useAzbaStore = defineStore('azba', () => {
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
  } = useDataFetcher(azbaConfig.url, {
    ttl: azbaConfig.refreshInterval,
    staleWhileRevalidate: true,
    deduplicate: true,
    persist: true,
    errorLabel: 'AZBA',
  })

  const generatedAt = computed(() => resolveUpdateTimestamp(rawData.value))

  // ============================================
  // Computed
  // ============================================

  /**
   * Liste de toutes les zones AZBA
   */
  const zones = computed(() => {
    return rawData.value?.zones || []
  })

  /**
   * Zones prioritaires (définies dans la config)
   */
  const priorityZones = computed(() => {
    return zones.value.filter((zone) => AZBA_CONFIG.priorityZones.includes(zone.name))
  })

  /**
   * Autres zones (non prioritaires)
   */
  const otherZones = computed(() => {
    return zones.value.filter((zone) => !AZBA_CONFIG.priorityZones.includes(zone.name))
  })

  /**
   * Récupère une zone spécifique par son nom
   */
  const getZone = (zoneName) => {
    return zones.value.find((zone) => zone.name === zoneName)
  }

  /**
   * Compte les zones actives
   */
  const activeZonesCount = computed(() => {
    return zones.value.filter((zone) => zone.status === 'active').length
  })

  // ============================================
  // Actions
  // ============================================

  /**
   * Charge les données AZBA depuis l'API
   */
  const loadAzba = () => fetchData()

  /**
   * Force le rechargement (ignore le cache)
   */
  const forceRefresh = () => refetch()

  return {
    // State
    rawData,
    generatedAt,
    loading,
    error,
    isRefreshing,
    lastFetchedAt,
    nextRefreshAt,

    // Computed
    zones,
    priorityZones,
    otherZones,
    activeZonesCount,

    // Actions
    loadAzba,
    forceRefresh,
    getZone,
    invalidate,
  }
})
