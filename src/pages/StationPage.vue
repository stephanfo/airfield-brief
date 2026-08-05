<template>
  <q-page class="q-pa-md">
    <div class="q-mt-lg q-mb-xl text-center">
      <div class="text-h3 text-white text-weight-bold">Station Locale</div>
      <UpdateStatusIndicator
        :timestamp="generatedAt"
        :is-refreshing="isRefreshing"
        :stale-threshold="getEndpointConfig('stationWindCurrent').staleThreshold"
        text-class="text-subtitle2 text-white q-mt-xs flex items-center justify-center"
      />
    </div>

    <DataLoadError
      :error="loadError"
      title="Erreur de chargement de la station locale"
      :on-retry="refreshStationData"
    />

    <StaleDataBanner
      :timestamp="generatedAt"
      :stale-threshold="getEndpointConfig('stationWindCurrent').staleThreshold"
      data-label="Données de la station"
    />

    <!-- Résumé conditions actuelles -->
    <q-card v-if="hasCurrentData" flat bordered class="q-pa-md q-mb-lg">
      <div class="text-h5 q-mb-md flex items-center text-primary text-weight-bold">
        <q-icon name="sensors" size="md" class="q-mr-sm" />
        Conditions Actuelles
      </div>
      <div class="row q-col-gutter-md">
        <!-- Vent -->
        <div class="col-6 col-sm-4 col-md-2">
          <q-card flat bordered class="q-pa-sm bg-grey-2 text-center" style="min-height: 70px">
            <div class="text-h6">{{ currentWind }}</div>
            <div class="text-caption text-grey-7">Vent</div>
          </q-card>
        </div>
        <!-- Direction -->
        <div class="col-6 col-sm-4 col-md-2">
          <q-card flat bordered class="q-pa-sm bg-grey-2 text-center" style="min-height: 70px">
            <div class="text-h6">{{ currentDirection }}</div>
            <div class="text-caption text-grey-7">Direction</div>
          </q-card>
        </div>
        <!-- Température -->
        <div class="col-6 col-sm-4 col-md-2">
          <q-card flat bordered class="q-pa-sm bg-grey-2 text-center" style="min-height: 70px">
            <div class="text-h6">{{ currentTemp }}</div>
            <div class="text-caption text-grey-7">Température</div>
          </q-card>
        </div>
        <!-- Point de rosée -->
        <div class="col-6 col-sm-4 col-md-2">
          <q-card flat bordered class="q-pa-sm bg-grey-2 text-center" style="min-height: 70px">
            <div class="text-h6">{{ currentDewPoint }}</div>
            <div class="text-caption text-grey-7">Point de rosée</div>
          </q-card>
        </div>
        <!-- Humidité -->
        <div class="col-6 col-sm-4 col-md-2">
          <q-card flat bordered class="q-pa-sm bg-grey-2 text-center" style="min-height: 70px">
            <div class="text-h6">{{ currentHumidity }}</div>
            <div class="text-caption text-grey-7">Humidité</div>
          </q-card>
        </div>
        <!-- QNH -->
        <div class="col-6 col-sm-4 col-md-2">
          <q-card flat bordered class="q-pa-sm bg-grey-2 text-center" style="min-height: 70px">
            <div class="text-h6">{{ currentQNH }}</div>
            <div class="text-caption text-grey-7">QNH</div>
          </q-card>
        </div>
      </div>
    </q-card>

    <!-- Rose des vents -->
    <WindRose :wind-rose="windRose" :wind-history24h="windHistory24h" />

    <!-- Historique vent 24h -->
    <WindHistory :data="windHistory24h" />

    <!-- Température & Humidité 24h -->
    <TempHumidityChart :data="atmosphereHistory" />

    <!-- Pression 24h -->
    <PressureChart :data="atmosphereHistory" />
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useStationWindHistoryStore } from '../stores/stationWindHistoryStore'
import { useStationAtmosphereStore } from '../stores/stationAtmosphereStore'
import { useStationWindCurrentStore } from '../stores/stationWindCurrentStore'
import { useVisibilityRefresh } from '../composables/useVisibilityRefresh'
import { getEndpointConfig } from '../config/app.config'
import { calculateDewPoint, calculateQNH } from '../utils/stationHelpers'
import UpdateStatusIndicator from '../components/common/UpdateStatusIndicator.vue'
import DataLoadError from '../components/common/DataLoadError.vue'
import StaleDataBanner from '../components/common/StaleDataBanner.vue'
import WindRose from '../components/weather/WindRose.vue'
import WindHistory from '../components/weather/WindHistory.vue'
import TempHumidityChart from '../components/weather/TempHumidityChart.vue'
import PressureChart from '../components/weather/PressureChart.vue'

defineOptions({ name: 'StationPage' })

const windHistoryStore = useStationWindHistoryStore()
const atmosphereStore = useStationAtmosphereStore()
const windCurrentStore = useStationWindCurrentStore()

const {
  windHistory24h,
  windRose,
  generatedAt: windHistoryGeneratedAt,
  isRefreshing: windHistoryRefreshing,
  error: windHistoryError,
} = storeToRefs(windHistoryStore)
const {
  atmosphereHistory,
  latestAtmosphere,
  generatedAt: atmosphereGeneratedAt,
  isRefreshing: atmosphereRefreshing,
  error: atmosphereError,
} = storeToRefs(atmosphereStore)
const {
  windCurrent,
  generatedAt: windCurrentGeneratedAt,
  isRefreshing: windCurrentRefreshing,
  error: windCurrentError,
} = storeToRefs(windCurrentStore)

const generatedAt = computed(() => {
  return (
    windCurrentGeneratedAt.value ||
    windHistoryGeneratedAt.value ||
    atmosphereGeneratedAt.value ||
    null
  )
})

const isRefreshing = computed(() => {
  return windHistoryRefreshing.value || atmosphereRefreshing.value || windCurrentRefreshing.value
})

/**
 * Erreur de chargement consolidée : n'affiche la bannière que si AUCUNE
 * des trois sources n'a fourni de données (sinon la page reste exploitable).
 */
const loadError = computed(() => {
  const anyError = windHistoryError.value || atmosphereError.value || windCurrentError.value
  if (!anyError) return null
  const hasAnyData =
    windHistory24h.value.length > 0 || atmosphereHistory.value.length > 0 || windCurrent.value
  return hasAnyData ? null : anyError
})

const loadStationData = async () => {
  await Promise.all([
    windHistoryStore.loadWindHistory(),
    atmosphereStore.loadAtmosphere(),
    windCurrentStore.loadWindCurrent(),
  ])
}

const refreshStationData = async () => {
  await Promise.all([
    windHistoryStore.forceRefresh(),
    atmosphereStore.forceRefresh(),
    windCurrentStore.forceRefresh(),
  ])
}

useVisibilityRefresh(() => {
  if (windHistory24h.value.length > 0) {
    return refreshStationData()
  }
  return loadStationData()
})

/** Vérifie si on a des données actuelles à afficher */
const hasCurrentData = computed(() => windCurrent.value || latestAtmosphere.value)

/** Vent actuel formaté (depuis wind_current.json) */
const currentWind = computed(() => {
  const w = windCurrent.value
  if (!w) return '—'
  if (w.wind_avg === 0 && w.dir === 0) return 'Calme'
  return `${w.wind_avg.toFixed(1)} kt`
})

/** Direction actuelle formatée (depuis wind_current.json) */
const currentDirection = computed(() => {
  const w = windCurrent.value
  if (!w) return '—'
  if (w.wind_avg === 0 && w.dir === 0) return 'Calme'
  const varStr = w.dir_sigma ? ` ±${w.dir_sigma}°` : ''
  return `${w.dir}°${varStr}`
})

/** Température actuelle formatée (depuis atmosphere.json) */
const currentTemp = computed(() => {
  const a = latestAtmosphere.value
  if (!a?.temperature_c) return '—'
  return `${a.temperature_c.toFixed(1)}°C`
})

/** Humidité actuelle formatée (depuis atmosphere.json) */
const currentHumidity = computed(() => {
  const a = latestAtmosphere.value
  if (!a?.humidity_percent) return '—'
  return `${a.humidity_percent.toFixed(0)}%`
})

/** Point de rosée actuel (calculé depuis atmosphere.json) */
const currentDewPoint = computed(() => {
  const a = latestAtmosphere.value
  if (!a) return '—'
  const dewPoint = calculateDewPoint(a.temperature_c, a.humidity_percent)
  if (dewPoint === null) return '—'
  return `${dewPoint.toFixed(1)}°C`
})

/** QNH actuel (calculé depuis atmosphere.json) */
const currentQNH = computed(() => {
  const a = latestAtmosphere.value
  if (!a) return '—'
  const qnh = calculateQNH(a.pressure_hpa)
  if (qnh === null) return '—'
  return `${qnh.toFixed(0)} hPa`
})
</script>
