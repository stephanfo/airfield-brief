<template>
  <div class="q-gutter-md">
    <!-- TAF Brut -->
    <div>
      <div class="text-subtitle1 text-weight-bold q-mb-sm text-primary">
        <q-icon name="code" />
        TAF Brut
      </div>
      <q-card flat bordered class="q-pa-md bg-grey-2">
        <div class="text-body2" style="font-family: monospace; white-space: pre-wrap">
          {{ tafData?.rawTAF || 'Aucun TAF disponible' }}
        </div>
      </q-card>
    </div>

    <!-- TAF Décodé -->
    <div v-if="tafData?.fcsts && tafData.fcsts.length > 0">
      <div class="text-subtitle1 text-weight-bold q-mb-sm text-primary">
        <q-icon name="translate" />
        TAF Décodé
      </div>

      <!-- Période de validité globale -->
      <q-card flat bordered class="q-pa-sm bg-blue-grey-1 q-mb-sm">
        <div class="text-caption text-grey-7">Période de validité</div>
        <div class="text-body2">
          Du {{ formatTafTime(tafData.validTimeFrom) }} au
          {{ formatTafTime(tafData.validTimeTo) }}
        </div>
      </q-card>

      <!-- Périodes de prévision -->
      <div class="q-gutter-sm">
        <q-card
          v-for="(fcst, index) in tafData.fcsts"
          :key="index"
          flat
          bordered
          class="q-pa-sm"
          :class="fcst.fcstChange ? 'bg-amber-1' : 'bg-grey-1'"
        >
          <!-- En-tête de la période -->
          <div class="row items-center justify-between q-mb-sm q-col-gutter-xs">
            <div class="col-12 col-sm-auto">
              <q-badge
                :color="fcst.fcstChange ? 'warning' : 'primary'"
                :label="getChangeType(fcst.fcstChange)"
              />
            </div>
            <div class="col-12 col-sm text-right text-caption text-grey-7">
              {{ formatTafTime(fcst.timeFrom) }} → {{ formatTafTime(fcst.timeTo) }}
            </div>
          </div>

          <!-- Détails de la prévision -->
          <div class="row q-col-gutter-sm">
            <!-- Vent -->
            <div class="col-12 col-sm-6">
              <div class="text-caption text-grey-7">
                <q-icon name="air" size="xs" />
                Vent
              </div>
              <div class="text-body2">
                <span v-if="fcst.wdir && fcst.wspd">
                  {{ fcst.wdir }}° ({{ getCardinalDirection(fcst.wdir) }}) {{ fcst.wspd }} kt
                  <span v-if="fcst.wgst"> rafales {{ fcst.wgst }} kt</span>
                </span>
                <span v-else>-</span>
              </div>
            </div>

            <!-- Visibilité -->
            <div class="col-12 col-sm-6">
              <div class="text-caption text-grey-7">
                <q-icon name="wb_sunny" size="xs" />
                Visibilité
              </div>
              <div class="text-body2">{{ formatVisibility(fcst.visib) }}</div>
            </div>

            <!-- Nuages -->
            <div class="col-12">
              <div class="text-caption text-grey-7">
                <q-icon name="cloud" size="xs" />
                Nuages
              </div>
              <div v-if="fcst.clouds && fcst.clouds.length > 0" class="q-gutter-xs">
                <q-chip
                  v-for="(cloud, cloudIndex) in getSortedClouds(fcst.clouds)"
                  :key="cloudIndex"
                  dense
                  size="sm"
                  :color="getCloudColor(cloud.cover)"
                  text-color="white"
                >
                  {{ translateCloudCover(cloud.cover) }}
                  <span v-if="cloud.base"> - {{ formatCloudBase(cloud.base) }}</span>
                  <span v-if="cloud.type"> ({{ translateCloudType(cloud.type) }})</span>
                </q-chip>
              </div>
              <div v-else class="text-body2">Pas de nuages</div>
            </div>

            <!-- Phénomènes météo -->
            <div class="col-12" v-if="fcst.wxString && fcst.wxString !== 'NSW'">
              <div class="text-caption text-grey-7">
                <q-icon name="water_drop" size="xs" />
                Phénomènes météo
              </div>
              <div class="text-body2">{{ translateWeather(fcst.wxString) }}</div>
            </div>
          </div>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  metarTranslations,
  translateCloudCover,
  translateWeatherPhenomenon,
  formatVisibility,
  formatCloudBase,
  getCardinalDirection,
  formatTafTime,
  getChangeType,
} from '../../services/metarTranslations'

defineProps({
  tafData: {
    type: Object,
    default: null,
  },
})

const translateCloudType = (type) => {
  return metarTranslations.cloudTypes[type] || type
}

const translateWeather = (wxString) => {
  if (!wxString || wxString === 'NSW') return 'Aucun phénomène significatif'
  return translateWeatherPhenomenon(wxString)
}

const getSortedClouds = (clouds) => {
  if (!clouds) return []
  return [...clouds].sort((a, b) => (b.base || 0) - (a.base || 0))
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
