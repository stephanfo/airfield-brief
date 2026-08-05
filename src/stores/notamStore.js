import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useDataFetcher } from '../composables/useDataFetcher'
import { getEndpointConfig } from '../config/app.config'
import { resolveUpdateTimestamp } from '../utils/dateHelpers'

const notamConfig = getEndpointConfig('notam')

export const useNotamStore = defineStore('notam', () => {
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
  } = useDataFetcher(notamConfig.url, {
    ttl: notamConfig.refreshInterval,
    staleWhileRevalidate: true,
    deduplicate: true,
    persist: true,
    errorLabel: 'NOTAM',
  })

  const generatedAt = computed(() => resolveUpdateTimestamp(rawData.value))
  const notamList = computed(() => rawData.value?.notamList || null)

  const loadNotams = () => fetchData()

  const forceRefresh = () => refetch()

  return {
    rawData,
    notamList,
    generatedAt,
    loading,
    error,
    isRefreshing,
    lastFetchedAt,
    nextRefreshAt,
    loadNotams,
    forceRefresh,
    invalidate,
  }
})
