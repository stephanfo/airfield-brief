<template>
  <q-page class="q-pa-md">
    <div class="q-mt-lg q-mb-xl text-center">
      <div class="text-h3 text-white text-weight-bold">Synthèse Aéronautique</div>
      <UpdateStatusIndicator
        :timestamp="weatherUpdatedAt"
        :is-refreshing="weatherRefreshing"
        :stale-threshold="getEndpointConfig('weather').staleThreshold"
        text-class="text-subtitle2 text-white q-mt-xs flex items-center justify-center"
      />
    </div>

    <DataLoadError
      :error="dashboardError"
      title="Erreur de chargement de la synthèse"
      :on-retry="refreshAll"
    />

    <StaleDataBanner
      :timestamp="weatherUpdatedAt"
      :stale-threshold="getEndpointConfig('weather').staleThreshold"
      data-label="Données météo de la synthèse"
    />

    <ThermalStressIndicator
      v-if="isFeatureEnabled('thermal')"
      :temperature="atmoTemp"
      :humidity="atmoHumidity"
    />

    <RunwayHeader :weather-data="weatherData" />

    <WeatherCurrentConditions :weather-data="weatherData" to="/weather" />

    <SunTimes :ephemeris="ephemeris" to="/ephemerides" />

    <AzbaStatusCards
      :azba-data="azbaData"
      :generated-at="azbaGeneratedAt"
      :error="azbaError"
      :stale-threshold="getEndpointConfig('azba').staleThreshold"
      to="/azba"
    />

    <!-- Résumé des NOTAMs -->
    <NotamSummary :notam-data="notamData" to="/notam" />

    <WebcamCard v-if="isFeatureEnabled('webcam')" to="/webcam" />
  </q-page>
</template>

<script setup>
import RunwayHeader from '../components/weather/RunwayDisplay.vue'
import WeatherCurrentConditions from '../components/weather/WeatherCurrentConditions.vue'
import WebcamCard from '../components/common/WebcamCard.vue'
import AzbaStatusCards from '../components/AzbaStatusCards.vue'
import NotamSummary from '../components/NotamSummary.vue'
import SunTimes from '../components/common/SunTimes.vue'
import ThermalStressIndicator from '../components/common/ThermalStressIndicator.vue'
import { useVisibilityRefresh } from '../composables/useVisibilityRefresh'
import UpdateStatusIndicator from '../components/common/UpdateStatusIndicator.vue'
import DataLoadError from '../components/common/DataLoadError.vue'
import StaleDataBanner from '../components/common/StaleDataBanner.vue'
import { getEndpointConfig } from '../config/app.config'
import { isFeatureEnabled } from '../config/features'
import { computed } from 'vue'
import { useWeatherStore } from '../stores/weatherStore'
import { useAzbaStore } from '../stores/azbaStore'
import { useNotamStore } from '../stores/notamStore'
import { useEphemerisStore } from '../stores/ephemerisStore'
import { useThermalForecastStore } from '../stores/thermalForecastStore'
import { todayPeakFromForecast } from '../utils/thermalStressHelpers'
import { storeToRefs } from 'pinia'

const weatherStore = useWeatherStore()
const azbaStore = useAzbaStore()
const notamStore = useNotamStore()
const ephemerisStore = useEphemerisStore()
const forecastStore = useThermalForecastStore()

const {
  rawData: weatherData,
  generatedAt: weatherUpdatedAt,
  isRefreshing: weatherRefreshing,
  error: weatherError,
} = storeToRefs(weatherStore)
const { rawData: azbaData, generatedAt: azbaGeneratedAt, error: azbaError } = storeToRefs(azbaStore)
const { rawData: notamData } = storeToRefs(notamStore)
const { ephemeris } = storeToRefs(ephemerisStore)
const { days: forecastDays } = storeToRefs(forecastStore)

/**
 * Bannière d'accueil : risque au pic de chaleur du jour (forecast), pas l'instant
 * présent. Source = thermal_forecast.json (plus de station locale).
 */
const todayPeak = computed(() => todayPeakFromForecast(forecastDays.value))
const atmoTemp = computed(() =>
  typeof todayPeak.value?.temperature === 'number' ? todayPeak.value.temperature : null,
)
const atmoHumidity = computed(() =>
  typeof todayPeak.value?.humidity === 'number' ? todayPeak.value.humidity : null,
)

/**
 * Erreur affichée sur la synthèse : uniquement si la météo (contenu principal
 * du tableau de bord) est en erreur et qu'aucune donnée météo n'est disponible.
 * Les échecs des autres feeds sont signalés par un toast global (useDataFetcher).
 */
const dashboardError = computed(() => (weatherData.value ? null : weatherError.value))

const refreshAll = () =>
  Promise.allSettled([
    weatherStore.forceRefresh(),
    azbaStore.forceRefresh(),
    notamStore.forceRefresh(),
    ephemerisStore.forceRefresh(),
    // Le forecast thermique n'est chargé que si le module est actif (ADR-030)
    ...(isFeatureEnabled('thermal') ? [forecastStore.forceRefresh()] : []),
  ])

useVisibilityRefresh(() => {
  return Promise.allSettled([
    weatherStore.loadWeather(),
    azbaStore.loadAzba(),
    notamStore.loadNotams(),
    ephemerisStore.loadEphemeris(),
    ...(isFeatureEnabled('thermal') ? [forecastStore.loadForecast()] : []),
  ])
})
</script>
