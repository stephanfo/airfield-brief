<template>
  <SectionCard title="Conditions Estimées (IA)" icon="sunny" :to="to">
    <template #header-actions>
      <q-chip
        v-if="weatherData?.current?.confidence"
        :color="confidenceColor(weatherData.current.confidence)"
        text-color="white"
        :label="`${weatherData.current.confidence}%`"
        class="text-weight-bold"
      />
    </template>

    <!-- Résumé -->
    <div v-if="weatherData?.current?.summary" class="q-my-md">
      <q-card flat bordered class="q-pa-sm bg-blue-1">
        <div class="text-body2 text-blue-9"><b>Résumé</b> : {{ weatherData.current.summary }}</div>
      </q-card>
    </div>

    <div class="row q-col-gutter-md">
      <!-- Vent -->
      <div class="col-6 col-sm-4 col-md-2">
        <q-card
          flat
          bordered
          class="q-pa-sm text-center"
          :class="windBgClass"
          style="min-height: 70px"
        >
          <div class="text-h6">
            {{ weatherData?.current?.wind_direction }}° {{ weatherData?.current?.wind_speed }}kts
            <span v-if="weatherData?.current?.wind_gust">G{{ weatherData.current.wind_gust }}</span>
          </div>
          <div class="text-caption text-grey-7">Vent</div>
          <div :class="['text-caption text-weight-bold', windTextColor]">{{ windLabel }}</div>
        </q-card>
      </div>
      <!-- Visibilité -->
      <div class="col-6 col-sm-4 col-md-2">
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
      <div class="col-6 col-sm-4 col-md-2">
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
      <!-- QNH -->
      <div class="col-6 col-sm-4 col-md-2">
        <q-card flat bordered class="q-pa-sm bg-grey-2 text-center" style="min-height: 70px">
          <div class="text-h6">{{ weatherData?.current?.qnh }} hPa</div>
          <div class="text-caption text-grey-7">QNH</div>
        </q-card>
      </div>
      <!-- Température -->
      <div class="col-6 col-sm-4 col-md-2">
        <q-card flat bordered class="q-pa-sm bg-grey-2 text-center" style="min-height: 70px">
          <div class="text-h6">{{ weatherData?.current?.temp }}°C</div>
          <div class="text-caption text-grey-7">Température</div>
        </q-card>
      </div>
      <!-- Point de rosée -->
      <div class="col-6 col-sm-4 col-md-2">
        <q-card flat bordered class="q-pa-sm bg-grey-2 text-center" style="min-height: 70px">
          <div class="text-h6">{{ weatherData?.current?.dew_temp }}°C</div>
          <div class="text-caption text-grey-7">Point de rosée</div>
        </q-card>
      </div>
    </div>

    <!-- Givrage -->
    <div v-if="weatherData?.icing" class="q-mt-md">
      <q-card flat bordered class="q-pa-sm" :class="`bg-${weatherData.icing.color}-1`">
        <div :class="`text-body2 text-${weatherData.icing.color}-9`">
          <b>Givrage {{ weatherData.icing.overallText }}</b> :
          {{ weatherData.icing.notes }}
        </div>
      </q-card>
    </div>
  </SectionCard>
</template>

<script setup>
import { computed } from 'vue'
import SectionCard from '../common/SectionCard.vue'
import { useVfrThresholds } from '../../composables/useVfrThresholds'
import { confidenceColor } from '../../utils/confidenceHelpers'
import {
  formatVisibilityText,
  getCeilingStatus,
  getVfrLevel,
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
  /** Route de détail — rend le titre cliquable (Accueil uniquement) */
  to: {
    type: String,
    default: null,
  },
})

const { thresholds } = useVfrThresholds()

// --- Vent ---
// Évalue vent et rafales indépendamment avec leurs seuils respectifs,
// puis retient le pire niveau pour l'affichage du bloc — cohérent avec goNoGoHelpers.
const windSpeed = computed(() => props.weatherData?.current?.wind_speed ?? null)
const windGust = computed(() => props.weatherData?.current?.wind_gust ?? null)

function worstLevel(a, b) {
  const order = { poor: 2, marginal: 1, good: 0 }
  return order[a] >= order[b] ? a : b
}
const windLevel = computed(() => {
  const lvWind = getVfrLevel(windSpeed.value, 'wind', thresholds)
  const lvGust = getVfrLevel(windGust.value, 'gust', thresholds)
  return worstLevel(lvWind, lvGust)
})
const windBgClass = computed(
  () => ({ good: 'bg-green-1', marginal: 'bg-orange-1', poor: 'bg-red-1' })[windLevel.value],
)
const windLabel = computed(
  () => ({ good: 'VFR', marginal: 'Marginal', poor: 'Défavorable' })[windLevel.value],
)
const windTextColor = computed(
  () => ({ good: 'text-green-9', marginal: 'text-orange-9', poor: 'text-red-9' })[windLevel.value],
)

// --- Visibilité ---
const visibilityValue = computed(() => {
  const v = props.weatherData?.current?.visibility
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
// dans getCeilingStatus (cohérent avec la carte Prévisions).
const ceiling = computed(() => getCeilingStatus(props.weatherData?.current?.ceiling, thresholds))
</script>
