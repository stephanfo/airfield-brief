import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useStationFetcher } from '../composables/useStationFetcher'

/**
 * Prévisions de stress thermique (FEAT-031) : température + humidité par jour
 * sur les prochains jours, générées par le script PHP `thermal_forecast.php`
 * (Open-Meteo) déposé dans `public/data/thermal_forecast.json`.
 *
 * Le JSON ne porte que des mesures brutes ; le niveau FFA est calculé côté page
 * via `getThermalStressLevel` (mêmes helpers que le présent / station).
 *
 * Réutilise `useStationFetcher` (wrapper générique de useDataFetcher :
 * stale-while-revalidate + persistance + `generatedAt`).
 */
export const useThermalForecastStore = defineStore('thermalForecast', () => {
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
  } = useStationFetcher('thermalForecast', 'prévisions stress thermique')

  const days = computed(() => rawData.value?.days || null)

  const loadForecast = () => fetchData()
  const forceRefresh = () => refetch()

  return {
    rawData,
    days,
    generatedAt,
    loading,
    error,
    isRefreshing,
    lastFetchedAt,
    nextRefreshAt,
    loadForecast,
    forceRefresh,
    invalidate,
  }
})
