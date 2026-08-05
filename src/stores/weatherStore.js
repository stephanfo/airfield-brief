import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useDataFetcher } from '../composables/useDataFetcher'
import { getEndpointConfig } from '../config/app.config'
import { resolveUpdateTimestamp } from '../utils/dateHelpers'
import { evaluateGoNoGo } from '../utils/goNoGoHelpers'
import { useVfrThresholds } from '../composables/useVfrThresholds'
import { RUNWAY_HEADING } from '../utils/windHelpers'

const weatherConfig = getEndpointConfig('weather')

export const useWeatherStore = defineStore('weather', () => {
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
  } = useDataFetcher(weatherConfig.url, {
    ttl: weatherConfig.refreshInterval,
    staleWhileRevalidate: true,
    deduplicate: true,
    persist: true,
    errorLabel: 'météo',
  })

  const { thresholds } = useVfrThresholds()

  const generatedAt = computed(() =>
    resolveUpdateTimestamp(rawData.value, ['isoNow', 'generatedAt']),
  )

  // current n'a pas de timestamp propre — on s'appuie sur isoNow, qui est l'heure de
  // génération du fichier (workflow N8N), pas l'heure d'observation du METAR. C'est donc
  // l'âge du fichier de données qui est mesuré, suffisant pour signaler une donnée obsolète.
  const weatherGeneratedAt = computed(() => generatedAt.value)

  const isWeatherStale = computed(() => {
    const ts = weatherGeneratedAt.value
    if (!ts) return false
    return Date.now() - new Date(ts).getTime() > weatherConfig.staleThreshold
  })

  /** Statut Go/No-Go calculé depuis le METAR courant et les seuils VFR configurables */
  const goNoGoStatus = computed(() => {
    const cur = rawData.value?.current
    if (!cur) return null
    return evaluateGoNoGo(
      {
        windDir: cur.wind_direction,
        windSpeed: cur.wind_speed,
        windGust: cur.wind_gust ?? null,
        visibility: cur.visibility,
        ceiling: cur.ceiling ?? null,
        runwayHeading: RUNWAY_HEADING,
      },
      thresholds,
    )
  })

  const loadWeather = () => fetchData()

  const forceRefresh = () => refetch()

  return {
    rawData,
    generatedAt,
    weatherGeneratedAt,
    isWeatherStale,
    goNoGoStatus,
    loading,
    error,
    isRefreshing,
    lastFetchedAt,
    nextRefreshAt,
    loadWeather,
    forceRefresh,
    invalidate,
  }
})
