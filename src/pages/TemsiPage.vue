<template>
  <q-page class="q-pa-md">
    <div class="q-mt-lg q-mb-xl text-center">
      <div class="text-h3 text-white text-weight-bold">Cartes TEMSI</div>
      <UpdateStatusIndicator
        :timestamp="generatedAt"
        :is-refreshing="isRefreshing"
        :stale-threshold="getEndpointConfig('temsi').staleThreshold"
        text-class="text-subtitle2 text-white q-mt-xs flex items-center justify-center"
      />
    </div>
    <DataLoadError
      :error="error"
      title="Erreur de chargement des cartes TEMSI"
      :on-retry="forceRefresh"
    />
    <StaleDataBanner
      :timestamp="generatedAt"
      :stale-threshold="getEndpointConfig('temsi').staleThreshold"
      data-label="Cartes TEMSI"
    />
    <ChartsList :chart-list="temsiList" chart-type="TEMSI" />
  </q-page>
</template>

<script setup>
import ChartsList from '../components/charts/ChartsList.vue'
import { useVisibilityRefresh } from '../composables/useVisibilityRefresh'
import { useTemsiStore } from '../stores/temsiStore'
import { storeToRefs } from 'pinia'
import UpdateStatusIndicator from '../components/common/UpdateStatusIndicator.vue'
import DataLoadError from '../components/common/DataLoadError.vue'
import StaleDataBanner from '../components/common/StaleDataBanner.vue'
import { getEndpointConfig } from '../config/app.config'

// Utilisation du store Pinia avec cache TTL et déduplication
const temsiStore = useTemsiStore()
const { temsiList, generatedAt, isRefreshing, error } = storeToRefs(temsiStore)

const forceRefresh = () => temsiStore.forceRefresh()

useVisibilityRefresh(() => temsiStore.loadTemsi())
</script>
