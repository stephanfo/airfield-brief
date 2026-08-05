<template>
  <div class="q-mb-lg">
    <q-card flat bordered class="q-pa-md">
      <div class="text-h5 q-mb-md flex items-center justify-between">
        <div class="flex items-center text-weight-bold text-primary">
          <q-icon :name="iconName" size="md" class="q-mr-sm" />
          Prévisions à {{ timeframe }}h (IA)
        </div>
        <q-chip
          v-if="forecast?.confidence && showDetails"
          :color="confidenceColor(forecast.confidence)"
          text-color="white"
          :label="`${forecast.confidence}%`"
          class="text-weight-bold"
        />
      </div>

      <!-- Détails pour 6h uniquement -->
      <div v-if="showDetails" class="row q-col-gutter-md">
        <!-- Vent -->
        <div class="col-6 col-md-3">
          <q-card
            flat
            bordered
            class="q-pa-sm text-center"
            :class="windBgClass"
            style="min-height: 70px"
          >
            <div class="text-h6">
              {{ forecast?.wind_direction }}° {{ forecast?.wind_speed }}kts
              <span v-if="forecast?.wind_gust">G{{ forecast.wind_gust }}</span>
            </div>
            <div class="text-caption text-grey-7">Vent</div>
            <div :class="['text-caption text-weight-bold', windTextColor]">{{ windLabel }}</div>
          </q-card>
        </div>
        <!-- Visibilité -->
        <div class="col-6 col-md-3">
          <q-card
            flat
            bordered
            class="q-pa-sm text-center"
            :class="visibilityBgClass"
            style="min-height: 70px"
          >
            <div class="text-h6">{{ visibilityDisplay }}</div>
            <div class="text-caption text-grey-7">Visibilité</div>
            <div :class="['text-caption text-weight-bold', visibilityTextColor]">
              {{ visibilityLabel }}
            </div>
          </q-card>
        </div>
        <!-- Plafond -->
        <div class="col-6 col-md-3">
          <q-card
            flat
            bordered
            class="q-pa-sm text-center"
            :class="ceiling.bgClass"
            style="min-height: 70px"
          >
            <div class="text-h6">{{ ceiling.display }}</div>
            <div class="text-caption text-grey-7">Plafond</div>
            <div
              v-if="ceiling.hasStatus"
              :class="['text-caption text-weight-bold', ceiling.textColor]"
            >
              {{ ceiling.label }}
            </div>
          </q-card>
        </div>
        <!-- Phénomènes météo -->
        <div class="col-6 col-md-3">
          <q-card
            flat
            bordered
            class="q-pa-sm text-center"
            :class="phenomenaBgClass"
            style="min-height: 70px"
          >
            <div class="text-h6">
              <q-icon :name="phenomenaIcon" size="xs" class="q-mr-xs" />
              {{ phenomenaDisplay }}
            </div>
            <div class="text-caption text-grey-7">Phénomènes</div>
            <div
              v-if="phenomenaLabel"
              :class="['text-caption text-weight-bold', phenomenaTextColor]"
            >
              {{ phenomenaLabel }}
            </div>
          </q-card>
        </div>
      </div>

      <!-- Scénarios alternatifs -->
      <div v-if="forecast?.alt_scn" :class="showDetails ? 'q-mt-md' : ''">
        <div v-for="(scenario, index) in forecast.alt_scn" :key="index" class="q-mb-sm">
          <q-card flat bordered class="q-pa-sm bg-blue-1">
            <div class="flex items-center justify-between">
              <div class="text-body2 text-blue-9">{{ scenario.summary }}</div>
              <q-chip
                dense
                :color="confidenceColor(scenario.confidence)"
                text-color="white"
                :label="`${scenario.confidence}%`"
              />
            </div>
          </q-card>
        </div>
      </div>
    </q-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useVfrThresholds } from '../../composables/useVfrThresholds'
import { translateWeatherPhenomenon } from '../../services/metarTranslations'
import { confidenceColor } from '../../utils/confidenceHelpers'
import {
  formatVisibilityText,
  getCeilingStatus,
  getVfrBgClass,
  getVfrLabel,
  getVfrTextColor,
} from '../../utils/vfrCriticality'

const props = defineProps({
  weatherData: {
    type: Object,
    required: false,
    default: null,
  },
  timeframe: {
    type: Number,
    required: true,
    validator: (value) => [6, 24].includes(value),
  },
})

const { thresholds } = useVfrThresholds()

const forecast = computed(() => {
  return props.timeframe === 6 ? props.weatherData?.forecast_6h : props.weatherData?.forecast_24h
})

const showDetails = computed(() => props.timeframe === 6)

const iconName = computed(() => {
  return props.timeframe === 6 ? 'cloud_upload' : 'event'
})

// --- Vent ---
const effectiveWind = computed(() => {
  const speed = forecast.value?.wind_speed
  const gust = forecast.value?.wind_gust
  return gust ? Math.max(speed || 0, gust) : speed
})
const windBgClass = computed(() => getVfrBgClass(effectiveWind.value, 'wind', thresholds))
const windLabel = computed(() => getVfrLabel(effectiveWind.value, 'wind', thresholds))
const windTextColor = computed(() => getVfrTextColor(effectiveWind.value, 'wind', thresholds))

// --- Visibilité ---
const visibilityValue = computed(() => {
  const v = forecast.value?.visibility
  return typeof v === 'string' ? parseInt(v) : v
})
const visibilityDisplay = computed(() => formatVisibilityText(visibilityValue.value))
const visibilityBgClass = computed(() =>
  getVfrBgClass(visibilityValue.value, 'visibility', thresholds),
)
const visibilityLabel = computed(() => getVfrLabel(visibilityValue.value, 'visibility', thresholds))
const visibilityTextColor = computed(() =>
  getVfrTextColor(visibilityValue.value, 'visibility', thresholds),
)

// --- Plafond ---
// CAVOK / ciel clair = vert « VFR », absence d'info = gris : logique centralisée
// dans getCeilingStatus (cohérent avec la carte Conditions Estimées).
const ceiling = computed(() => getCeilingStatus(forecast.value?.ceiling, thresholds))

// --- Phénomènes météo ---
const hasCB = computed(() => {
  const ceiling = forecast.value?.ceiling || ''
  return ceiling.toUpperCase().includes('CB')
})

const hasTS = computed(() => {
  const precip = forecast.value?.precip || ''
  return precip.toUpperCase().includes('TS')
})

const phenomenaSeverity = computed(() => {
  // Niveau de sévérité : 'danger' (TS/CB), 'warning' (précipitations), 'ok' (rien)
  if (hasTS.value || hasCB.value) return 'danger'
  if (forecast.value?.precip) return 'warning'
  return 'ok'
})

const phenomenaDisplay = computed(() => {
  const parts = []
  const precip = forecast.value?.precip
  if (precip) {
    parts.push(translateWeatherPhenomenon(precip))
  }
  // Ajouter CB si détecté dans le plafond mais pas déjà dans le precip
  if (hasCB.value && !hasTS.value && !(precip || '').toUpperCase().includes('CB')) {
    parts.push('CB')
  }
  return parts.length > 0 ? parts.join(', ') : 'Aucun'
})

const phenomenaBgClass = computed(() => {
  const s = phenomenaSeverity.value
  if (s === 'danger') return 'bg-red-1'
  if (s === 'warning') return 'bg-orange-1'
  return 'bg-green-1'
})

const phenomenaIcon = computed(() => {
  const s = phenomenaSeverity.value
  if (s === 'danger') return 'thunderstorm'
  if (s === 'warning') return 'water_drop'
  return 'wb_sunny'
})

const phenomenaLabel = computed(() => {
  const s = phenomenaSeverity.value
  if (s === 'danger') return 'Dangereux'
  if (s === 'warning') return 'Vigilance'
  return 'Favorable'
})

const phenomenaTextColor = computed(() => {
  const s = phenomenaSeverity.value
  if (s === 'danger') return 'text-red-8'
  if (s === 'warning') return 'text-orange-8'
  return 'text-green-8'
})
</script>
