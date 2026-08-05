import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useStationFetcher } from '../composables/useStationFetcher'

export const useStationWindHistoryStore = defineStore('stationWindHistory', () => {
  const {
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
  } = useStationFetcher('stationWindHistory', 'station (historique vent)')

  const windHistory24h = computed(() => rawData.value?.['24h_history'] || [])
  const windRose = computed(() => rawData.value?.wind_rose || [])

  const loadWindHistory = () => fetchData()
  const forceRefresh = () => refetch()

  return {
    rawData,
    windHistory24h,
    windRose,
    generatedAt,
    loading,
    error,
    isRefreshing,
    lastFetchedAt,
    nextRefreshAt,
    loadWindHistory,
    forceRefresh,
    invalidate,
  }
})
