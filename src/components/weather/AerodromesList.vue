<template>
  <div class="q-mb-lg">
    <q-card flat bordered class="q-pa-md">
      <div class="text-h5 text-weight-bold q-mb-md flex items-center text-primary">
        <q-icon name="map" size="md" class="q-mr-sm" />
        Aérodromes à proximité
      </div>
      <div v-if="!weatherData?.metar?.length" class="text-center text-grey-6 q-pa-lg">
        <q-icon name="cloud_off" size="48px" class="q-mb-sm" />
        <div>Aucune donnée d'aérodrome disponible</div>
      </div>
      <div v-else class="row q-col-gutter-md">
        <div
          v-for="metar in weatherData?.metar"
          :key="metar.icaoId"
          class="col-12 col-sm-6 col-md-4 col-xl-3"
        >
          <q-card
            flat
            bordered
            class="q-pa-sm text-center cursor-pointer"
            :class="getAerodromeBgClass(metar)"
            style="min-height: 70px"
            @click="openAerodromeDetails(metar)"
          >
            <div class="flex items-center justify-center q-mb-xs" style="gap: 8px">
              <div class="text-h6 text-weight-bold">{{ metar.icaoId }}</div>
              <q-chip
                v-if="metar.fltCat"
                dense
                :color="getFlightCategoryColor(metar.fltCat)"
                text-color="white"
                :label="metar.fltCat"
                class="q-ma-none text-weight-bold"
              />
            </div>
            <div v-if="metar.name" class="text-caption text-grey-8 q-mb-xs">{{ metar.name }}</div>
            <div class="text-caption text-grey-7">
              {{ formatTime(metar.reportTime) }}
            </div>
            <div class="text-caption q-mt-xs">
              <q-icon name="air" size="xs" aria-label="Vent" />
              {{ metar.wdir }}° {{ metar.wspd }}kts<span v-if="metar.wgst"> G{{ metar.wgst }}</span
              ><br />
              <q-icon name="visibility" size="xs" aria-label="Visibilité" />
              {{ formatVisibMetre(metar.visibMetre) }}<br />
              <q-icon name="cloud" size="xs" aria-label="Couverture nuageuse" />
              {{ formatClouds(metar.clouds) }}<br />
              <q-icon name="compress" size="xs" aria-label="Pression" />
              QNH: {{ metar.altim }} hPa
            </div>
          </q-card>
        </div>
      </div>
      <q-separator class="q-my-lg" />
      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-6">
          <q-card
            flat
            bordered
            class="q-pa-md bg-teal-1"
            style="min-height: 150px; border: 1px solid var(--q-color-positive)"
          >
            <div class="text-subtitle2 text-weight-bold q-mb-sm flex items-center text-teal-9">
              <q-icon name="satellite_alt" size="sm" class="q-mr-xs" />
              Synthèse des METARs
            </div>
            <ul class="text-body2 text-teal-9">
              <li v-for="(point, index) in weatherData?.key_points?.metar" :key="index">
                {{ point }}
              </li>
            </ul>
          </q-card>
        </div>
        <div class="col-12 col-md-6">
          <q-card
            flat
            bordered
            class="q-pa-md bg-purple-1"
            style="min-height: 150px; border: 1px solid var(--q-color-warning)"
          >
            <div class="text-subtitle2 text-weight-bold q-mb-sm flex items-center text-purple-9">
              <q-icon name="trending_up" size="sm" class="q-mr-xs" />
              Synthèse des TAFs
            </div>
            <ul class="text-body2 text-purple-9">
              <li v-for="(point, index) in weatherData?.key_points?.taf" :key="index">
                {{ point }}
              </li>
            </ul>
          </q-card>
        </div>
      </div>
    </q-card>

    <AerodromeDetailsDialog
      :model-value="showAerodromeDialog"
      @update:model-value="showAerodromeDialog = $event"
      :selected-aerodrome="selectedAerodrome"
      :taf-data="weatherData?.taf || []"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AerodromeDetailsDialog from './AerodromeDetailsDialog.vue'
import { getFlightCategoryColor } from '../../services/metarTranslations'
import { useVfrThresholds } from '../../composables/useVfrThresholds'
import { formatVisibilityText, getOverallVfrStatus } from '../../utils/vfrCriticality'

defineProps({
  weatherData: {
    type: Object,
    required: false,
    default: null,
  },
})

const showAerodromeDialog = ref(false)
const selectedAerodrome = ref(null)

const openAerodromeDetails = (metar) => {
  selectedAerodrome.value = metar
  showAerodromeDialog.value = true
}

const formatTime = (isoString) => {
  if (!isoString) return '-'
  const date = new Date(isoString)
  return (
    date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) +
    ' UTC'
  )
}

const formatClouds = (clouds) => {
  if (!clouds || clouds.length === 0) return 'CAVOK'
  const significant = clouds.find((c) => c.cover === 'OVC' || c.cover === 'BKN')
  if (!significant) return 'NSC'
  return `${significant.cover} ${significant.base}ft`
}

const formatVisibMetre = (visibMetre) => {
  if (visibMetre === null || visibMetre === undefined) return '-'
  return formatVisibilityText(visibMetre)
}

const { thresholds } = useVfrThresholds()

/**
 * Calcule la classe de fond d'un aérodrome en utilisant les mêmes seuils VFR
 * que les cartes conditions estimées / prévisions 6h.
 */
const getAerodromeBgClass = (metar) => {
  const params = {}

  // Visibilité en mètres
  if (metar.visibMetre != null) {
    params.visibility = metar.visibMetre
  }

  // Plafond : chercher la couche BKN/OVC la plus basse
  if (metar.clouds?.length) {
    const significant = metar.clouds
      .filter((c) => c.cover === 'BKN' || c.cover === 'OVC')
      .sort((a, b) => (a.base || Infinity) - (b.base || Infinity))
    if (significant.length > 0 && significant[0].base != null) {
      params.ceiling = significant[0].base
    }
  }

  // Vent : prendre le max entre vitesse et rafales
  const windMax = Math.max(metar.wspd || 0, metar.wgst || 0)
  if (windMax > 0) {
    params.wind = windMax
  }

  const status = getOverallVfrStatus(params, thresholds)
  const bgMap = {
    good: 'bg-green-1',
    marginal: 'bg-orange-1',
    poor: 'bg-red-1',
  }
  return bgMap[status]
}
</script>
