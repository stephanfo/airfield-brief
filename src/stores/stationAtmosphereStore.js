import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useStationFetcher } from '../composables/useStationFetcher'

export const useStationAtmosphereStore = defineStore('stationAtmosphere', () => {
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
  } = useStationFetcher('stationAtmosphere', 'station (atmosphère)')

  const atmosphereHistory = computed(() => rawData.value?.atmosphere || [])

  const latestAtmosphere = computed(() => {
    const history = atmosphereHistory.value
    return history.length > 0 ? history[history.length - 1] : null
  })

  const loadAtmosphere = () => fetchData()
  const forceRefresh = () => refetch()

  return {
    rawData,
    atmosphereHistory,
    latestAtmosphere,
    generatedAt,
    loading,
    error,
    isRefreshing,
    lastFetchedAt,
    nextRefreshAt,
    loadAtmosphere,
    forceRefresh,
    invalidate,
  }
})
