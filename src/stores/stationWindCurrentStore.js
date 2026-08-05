import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useStationFetcher } from '../composables/useStationFetcher'

export const useStationWindCurrentStore = defineStore('stationWindCurrent', () => {
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
  } = useStationFetcher('stationWindCurrent', 'station (vent actuel)')

  const windCurrent = computed(() => rawData.value || null)

  const loadWindCurrent = () => fetchData()
  const forceRefresh = () => refetch()

  return {
    rawData,
    windCurrent,
    generatedAt,
    loading,
    error,
    isRefreshing,
    lastFetchedAt,
    nextRefreshAt,
    loadWindCurrent,
    forceRefresh,
    invalidate,
  }
})
