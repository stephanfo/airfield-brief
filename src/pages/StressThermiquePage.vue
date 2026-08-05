<template>
  <q-page class="q-pa-md">
    <div class="q-mt-lg q-mb-xl text-center">
      <div class="text-h3 text-white text-weight-bold">Stress Thermique</div>
      <UpdateStatusIndicator
        :timestamp="generatedAt"
        :is-refreshing="isRefreshing"
        :stale-threshold="getEndpointConfig('thermalForecast').staleThreshold"
        text-class="text-subtitle2 text-white q-mt-xs flex items-center justify-center"
      />
    </div>

    <DataLoadError
      :error="loadError"
      title="Erreur de chargement des prévisions"
      :on-retry="forceRefresh"
    />

    <StaleDataBanner
      :timestamp="generatedAt"
      :stale-threshold="getEndpointConfig('thermalForecast').staleThreshold"
      data-label="Prévisions stress thermique"
    />

    <div class="q-mb-lg">
      <ThermalForecastStrip :forecast-days="forecastDays" />
    </div>

    <ThermalStressCard :temperature="currentTemp" :humidity="currentHumidity" />

    <div class="q-mt-lg">
      <ThermalForecastCard :forecast-days="forecastDays" />
    </div>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useThermalForecastStore } from '../stores/thermalForecastStore'
import { useVisibilityRefresh } from '../composables/useVisibilityRefresh'
import { getEndpointConfig } from '../config/app.config'
import { currentFromForecast } from '../utils/thermalStressHelpers'
import UpdateStatusIndicator from '../components/common/UpdateStatusIndicator.vue'
import DataLoadError from '../components/common/DataLoadError.vue'
import StaleDataBanner from '../components/common/StaleDataBanner.vue'
import ThermalStressCard from '../components/weather/ThermalStressCard.vue'
import ThermalForecastCard from '../components/weather/ThermalForecastCard.vue'
import ThermalForecastStrip from '../components/weather/ThermalForecastStrip.vue'

defineOptions({ name: 'StressThermiquePage' })

const forecastStore = useThermalForecastStore()
const { days: forecastDays, generatedAt, isRefreshing, error } = storeToRefs(forecastStore)

const forceRefresh = () => forecastStore.forceRefresh()

useVisibilityRefresh(() =>
  forecastDays.value ? forecastStore.forceRefresh() : forecastStore.loadForecast(),
)

/**
 * N'affiche la bannière d'erreur que si aucune prévision n'est disponible
 * (sinon les cartes restent exploitables avec les dernières données).
 */
const loadError = computed(() => {
  if (!error.value) return null
  return forecastDays.value ? null : error.value
})

/**
 * Valeurs « présent » dérivées du forecast : créneau horaire le plus proche de
 * maintenant (FEAT-031c — plus de dépendance à atmosphere.json).
 */
const current = computed(() => currentFromForecast(forecastDays.value))
const currentTemp = computed(() =>
  typeof current.value?.temperature === 'number' ? current.value.temperature : null,
)
const currentHumidity = computed(() =>
  typeof current.value?.humidity === 'number' ? current.value.humidity : null,
)
</script>
