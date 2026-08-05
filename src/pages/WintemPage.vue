<template>
  <q-page class="q-pa-md">
    <div class="q-mt-lg q-mb-xl text-center">
      <div class="text-h3 text-white text-weight-bold">Cartes WINTEM</div>
      <UpdateStatusIndicator
        :timestamp="generatedAt"
        :is-refreshing="isRefreshing"
        :stale-threshold="getEndpointConfig('wintem').staleThreshold"
        text-class="text-subtitle2 text-white q-mt-xs flex items-center justify-center"
      />
    </div>
    <DataLoadError
      :error="error"
      title="Erreur de chargement des cartes WINTEM"
      :on-retry="forceRefresh"
    />
    <StaleDataBanner
      :timestamp="generatedAt"
      :stale-threshold="getEndpointConfig('wintem').staleThreshold"
      data-label="Cartes WINTEM"
    />
    <ChartsList :chart-list="wintemList" chart-type="WINTEM" />
  </q-page>
</template>

<script setup>
import ChartsList from '../components/charts/ChartsList.vue'
import { useVisibilityRefresh } from '../composables/useVisibilityRefresh'
import { useWintemStore } from '../stores/wintemStore'
import { storeToRefs } from 'pinia'
import UpdateStatusIndicator from '../components/common/UpdateStatusIndicator.vue'
import DataLoadError from '../components/common/DataLoadError.vue'
import StaleDataBanner from '../components/common/StaleDataBanner.vue'
import { getEndpointConfig } from '../config/app.config'

// Utilisation du store Pinia avec cache TTL et déduplication
const wintemStore = useWintemStore()
const { wintemList, generatedAt, isRefreshing, error } = storeToRefs(wintemStore)

const forceRefresh = () => wintemStore.forceRefresh()

useVisibilityRefresh(() => wintemStore.loadWintem())
</script>
