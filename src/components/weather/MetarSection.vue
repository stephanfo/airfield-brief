<template>
  <div class="q-gutter-md">
    <!-- METAR Brut -->
    <div>
      <div class="text-subtitle1 text-weight-bold q-mb-sm text-primary">
        <q-icon name="code" />
        METAR Brut
      </div>
      <q-card flat bordered class="q-pa-md bg-grey-2">
        <div class="text-body2" style="font-family: monospace; white-space: pre-wrap">
          {{ aerodrome?.rawOb || 'Aucun METAR disponible' }}
        </div>
      </q-card>
    </div>

    <!-- METAR Décodé -->
    <div>
      <div class="text-subtitle1 text-weight-bold q-mb-sm text-primary">
        <q-icon name="translate" />
        METAR Décodé
      </div>

      <div class="q-gutter-sm">
        <!-- Vue d'ensemble -->
        <div>
          <div class="text-caption text-grey-7 text-weight-bold q-mb-xs">Vue d'ensemble</div>
          <q-card flat bordered class="q-pa-sm bg-grey-1">
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <div class="text-caption text-grey-7">Catégorie de vol</div>
                <div class="text-body2">
                  {{ translateFlightCategory(aerodrome?.fltCat) }}
                </div>
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-7">Heure d'observation</div>
                <div class="text-body2">
                  {{ formatTime(aerodrome?.reportTime) }}
                </div>
              </div>
            </div>
          </q-card>
        </div>

        <!-- Vent -->
        <div>
          <div class="text-caption text-grey-7 text-weight-bold q-mb-xs">
            <q-icon name="air" size="sm" />
            Vent
          </div>
          <q-card flat bordered class="q-pa-sm bg-grey-1">
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-4">
                <div class="text-caption text-grey-7">Direction</div>
                <div class="text-body2">
                  {{ aerodrome?.wdir }}° ({{ getCardinalDirection(aerodrome?.wdir) }})
                </div>
              </div>
              <div class="col-12 col-sm-4">
                <div class="text-caption text-grey-7">Vitesse</div>
                <div class="text-body2">{{ aerodrome?.wspd }} kt</div>
              </div>
              <div class="col-12 col-sm-4" v-if="aerodrome?.wgst">
                <div class="text-caption text-grey-7">Rafales</div>
                <div class="text-body2">{{ aerodrome?.wgst }} kt</div>
              </div>
            </div>
          </q-card>
        </div>

        <!-- Visibilité -->
        <div>
          <div class="text-caption text-grey-7 text-weight-bold q-mb-xs">
            <q-icon name="wb_sunny" size="sm" />
            Visibilité
          </div>
          <q-card flat bordered class="q-pa-sm bg-grey-1">
            <div class="text-body2">
              {{ formatVisibility(aerodrome?.visib) }}
            </div>
          </q-card>
        </div>

        <!-- Nuages -->
        <div>
          <div class="text-caption text-grey-7 text-weight-bold q-mb-xs">
            <q-icon name="cloud" size="sm" />
            Nuages
          </div>
          <q-card flat bordered class="q-pa-sm bg-grey-1">
            <div v-if="aerodrome?.cover === 'CAVOK'" class="text-body2">
              {{ translateCloudCover('CAVOK') }}
            </div>
            <div
              v-else-if="!aerodrome?.clouds || aerodrome?.clouds.length === 0"
              class="text-body2"
            >
              {{ translateCloudCover(aerodrome?.cover) }}
            </div>
            <div v-else class="q-gutter-xs">
              <div v-for="(cloud, index) in sortedClouds" :key="index" class="text-body2">
                <q-chip dense size="sm" :color="getCloudColor(cloud.cover)" text-color="white">
                  {{ translateCloudCover(cloud.cover) }}
                  <span v-if="cloud.base"> - {{ formatCloudBase(cloud.base) }}</span>
                  <span v-if="cloud.type"> ({{ translateCloudType(cloud.type) }})</span>
                </q-chip>
              </div>
            </div>
          </q-card>
        </div>

        <!-- Température -->
        <div>
          <div class="text-caption text-grey-7 text-weight-bold q-mb-xs">
            <q-icon name="thermostat" size="sm" />
            Température
          </div>
          <q-card flat bordered class="q-pa-sm bg-grey-1">
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-4">
                <div class="text-caption text-grey-7">Température</div>
                <div class="text-body2">{{ aerodrome?.temp }}°C</div>
              </div>
              <div class="col-12 col-sm-4">
                <div class="text-caption text-grey-7">Point de rosée</div>
                <div class="text-body2">{{ aerodrome?.dewp }}°C</div>
              </div>
              <div class="col-12 col-sm-4">
                <div class="text-caption text-grey-7">Écart</div>
                <div class="text-body2">{{ aerodrome?.temp - aerodrome?.dewp }}°C</div>
              </div>
            </div>
          </q-card>
        </div>

        <!-- Pression -->
        <div>
          <div class="text-caption text-grey-7 text-weight-bold q-mb-xs">
            <q-icon name="compress" size="sm" />
            Pression
          </div>
          <q-card flat bordered class="q-pa-sm bg-grey-1">
            <div class="text-body2">QNH: {{ aerodrome?.altim }} hPa</div>
          </q-card>
        </div>

        <!-- Phénomènes météo -->
        <div v-if="aerodrome?.wxString && aerodrome.wxString !== 'NSW'">
          <div class="text-caption text-grey-7 text-weight-bold q-mb-xs">
            <q-icon name="water_drop" size="sm" />
            Phénomènes météo
          </div>
          <q-card flat bordered class="q-pa-sm bg-grey-1">
            <div class="text-body2">
              {{ translateWeather(aerodrome.wxString) }}
            </div>
          </q-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  metarTranslations,
  translateCloudCover,
  translateWeatherPhenomenon,
  translateFlightCategory,
  formatVisibility,
  formatCloudBase,
  getCardinalDirection,
} from '../../services/metarTranslations'

const props = defineProps({
  aerodrome: {
    type: Object,
    default: null,
  },
})

const sortedClouds = computed(() => {
  if (!props.aerodrome?.clouds) return []
  return [...props.aerodrome.clouds].sort((a, b) => (b.base || 0) - (a.base || 0))
})

const formatTime = (isoString) => {
  if (!isoString) return '-'
  const date = new Date(isoString)
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + 'L'
}

const translateCloudType = (type) => {
  return metarTranslations.cloudTypes[type] || type
}

const translateWeather = (wxString) => {
  if (!wxString || wxString === 'NSW') return 'Aucun phénomène significatif'
  return translateWeatherPhenomenon(wxString)
}

const getCloudColor = (cover) => {
  const colorMap = {
    SKC: 'light-blue',
    CLR: 'light-blue',
    NSC: 'light-blue',
    FEW: 'green',
    SCT: 'orange',
    BKN: 'red',
    OVC: 'red',
  }
  return colorMap[cover] || 'grey'
}
</script>
