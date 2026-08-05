<template>
  <q-page class="q-pa-md">
    <div class="q-mt-lg q-mb-xl text-center">
      <div class="text-h3 text-white text-weight-bold">Météo</div>
      <UpdateStatusIndicator
        :timestamp="generatedAt"
        :is-refreshing="isRefreshing"
        :stale-threshold="getEndpointConfig('weather').staleThreshold"
        text-class="text-subtitle2 text-white q-mt-xs flex items-center justify-center"
      />
    </div>

    <DataLoadError
      :error="error"
      title="Erreur de chargement de la météo"
      :on-retry="forceRefresh"
    />

    <StaleDataBanner
      :timestamp="generatedAt"
      :stale-threshold="getEndpointConfig('weather').staleThreshold"
      data-label="Données météo"
    />

    <WeatherCurrentConditions :weather-data="weatherData" />
    <WeatherForecast :weather-data="weatherData" :timeframe="6" />
    <WeatherForecast :weather-data="weatherData" :timeframe="24" />

    <GoNoGoIndicator
      v-if="goNoGoStatus"
      :go-no-go="goNoGoStatus"
      :timestamp="weatherGeneratedAt"
      :is-stale="isWeatherStale"
    />

    <AerodromesList :weather-data="weatherData" />
  </q-page>
</template>

<script setup>
import WeatherCurrentConditions from '../components/weather/WeatherCurrentConditions.vue'
import WeatherForecast from '../components/weather/WeatherForecast.vue'
import AerodromesList from '../components/weather/AerodromesList.vue'
import GoNoGoIndicator from '../components/weather/GoNoGoIndicator.vue'
import { useVisibilityRefresh } from '../composables/useVisibilityRefresh'
import UpdateStatusIndicator from '../components/common/UpdateStatusIndicator.vue'
import DataLoadError from '../components/common/DataLoadError.vue'
import StaleDataBanner from '../components/common/StaleDataBanner.vue'
import { getEndpointConfig } from '../config/app.config'
import { useWeatherStore } from '../stores/weatherStore'
import { storeToRefs } from 'pinia'

const weatherStore = useWeatherStore()
const {
  rawData: weatherData,
  generatedAt,
  isRefreshing,
  error,
  goNoGoStatus,
  weatherGeneratedAt,
  isWeatherStale,
} = storeToRefs(weatherStore)

const forceRefresh = () => weatherStore.forceRefresh()

useVisibilityRefresh(() => weatherStore.loadWeather())
</script>
