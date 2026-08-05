<template>
  <q-page class="q-pa-md">
    <div class="q-mt-lg q-mb-xl text-center">
      <div class="text-h3 text-white text-weight-bold">Éphémérides</div>
      <UpdateStatusIndicator
        :timestamp="generatedAt"
        :is-refreshing="isRefreshing"
        :stale-threshold="getEndpointConfig('ephemeris').staleThreshold"
        text-class="text-subtitle2 text-white q-mt-xs flex items-center justify-center"
      />
    </div>

    <DataLoadError
      :error="error"
      title="Erreur de chargement des éphémérides"
      :on-retry="forceRefresh"
    />

    <StaleDataBanner
      :timestamp="generatedAt"
      :stale-threshold="getEndpointConfig('ephemeris').staleThreshold"
      data-label="Éphémérides"
    />

    <!-- Carte principale : aujourd'hui (mêmes tuiles que l'Accueil) -->
    <SunTimes :ephemeris="todayEph" />

    <!-- Exploration des jours : slider + flèches -->
    <SectionCard v-if="days.length" title="Éphémérides par jour" icon="calendar_month">
      <div class="row items-center q-gutter-sm q-mb-md no-wrap">
        <q-btn
          flat
          round
          dense
          icon="chevron_left"
          :disable="selectedIndex === 0"
          aria-label="Jour précédent"
          @click="step(-1)"
        />
        <div class="col text-center">
          <div class="text-subtitle1 text-weight-bold text-primary">
            {{ selectedDateLabel }}
          </div>
          <div v-if="selectedIndex === todayIndex" class="text-caption text-positive">
            Aujourd'hui
          </div>
        </div>
        <q-btn
          flat
          round
          dense
          icon="chevron_right"
          :disable="selectedIndex >= days.length - 1"
          aria-label="Jour suivant"
          @click="step(1)"
        />
      </div>

      <q-slider
        :model-value="selectedIndex"
        :min="0"
        :max="days.length - 1"
        :step="1"
        color="primary"
        label
        :label-value="selectedDateLabel"
        class="q-mb-md"
        @update:model-value="selectDay"
      />

      <template v-if="selectedMetrics">
        <div class="timeline">
          <div
            v-for="ev in selectedMetrics.events"
            :key="ev.key"
            :class="['timeline-item', evClass(ev.key)]"
          >
            <q-icon :name="ev.icon" size="sm" class="q-mr-sm" />
            <span class="timeline-label">{{ ev.label }}</span>
            <span class="timeline-value">{{ formatLocalUTC(ev.iso).combined }}</span>
          </div>
        </div>

        <q-separator class="q-my-md" />

        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6">
            <q-card flat bordered class="q-pa-sm bg-grey-2 text-center" style="min-height: 70px">
              <div class="text-h6">{{ formatDuration(selectedMetrics.dayLength) }}</div>
              <div class="text-caption text-grey-7">Durée du jour (lever → coucher)</div>
            </q-card>
          </div>
          <div class="col-12 col-sm-6">
            <q-card flat bordered class="q-pa-sm bg-grey-2 text-center" style="min-height: 70px">
              <div class="text-h6">{{ formatDuration(selectedMetrics.aeroDayLength) }}</div>
              <div class="text-caption text-grey-7">Jour aéronautique (aube → fin de jour)</div>
            </q-card>
          </div>
        </div>
      </template>

      <div v-if="observerLabel" class="text-caption text-grey-6 q-mt-md">
        Calcul IMCCE — observateur {{ CLUB_CONFIG.airfield.icao }} ({{ observerLabel }})
      </div>
    </SectionCard>

    <!-- Évolution des éphémérides sur la fenêtre fournie -->
    <SectionCard v-if="days.length > 1" title="Évolution sur la période" icon="show_chart">
      <EphemerisEvolutionChart :days="days" :selected-index="selectedIndex" />
    </SectionCard>

    <q-card v-if="!days.length" flat bordered class="q-pa-md">
      <div class="text-body2 text-grey-6">
        Éphémérides indisponibles. Les heures sont calculées quotidiennement par le service externe
        (IMCCE) ; réessayez plus tard.
      </div>
    </q-card>
  </q-page>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import SunTimes from '../components/common/SunTimes.vue'
import EphemerisEvolutionChart from '../components/ephemeris/EphemerisEvolutionChart.vue'
import SectionCard from '../components/common/SectionCard.vue'
import UpdateStatusIndicator from '../components/common/UpdateStatusIndicator.vue'
import DataLoadError from '../components/common/DataLoadError.vue'
import StaleDataBanner from '../components/common/StaleDataBanner.vue'
import { getEndpointConfig } from '../config/app.config'
import { useEphemerisStore } from '../stores/ephemerisStore'
import { useVisibilityRefresh } from '../composables/useVisibilityRefresh'
import {
  formatLocalUTC,
  formatDuration,
  parseEphemeris,
  getDayMetrics,
  getDays,
  findTodayIndex,
} from '../utils/ephemerisHelpers'
import { formatDateOnly } from '../utils/dateHelpers'
import { CLUB_CONFIG } from '../config/club.config'

const ephemerisStore = useEphemerisStore()
const {
  rawData,
  ephemeris: todayEph,
  generatedAt,
  isRefreshing,
  error,
} = storeToRefs(ephemerisStore)

const days = computed(() => getDays(rawData.value))
const todayIndex = computed(() => findTodayIndex(rawData.value, Date.now()))

// Index sélectionné par le slider/flèches. Initialisé sur aujourd'hui dès que les
// données arrivent, mais UNE SEULE FOIS : un refresh en arrière-plan (visibility)
// ne doit pas faire « sauter » le slider si l'utilisateur a choisi un autre jour.
const selectedIndex = ref(0)
const userHasPicked = ref(false)
watch(
  todayIndex,
  (idx) => {
    if (!userHasPicked.value) selectedIndex.value = idx
  },
  { immediate: true },
)

/** Sélectionne un jour (slider/flèches) et fige le choix utilisateur. */
const selectDay = (idx) => {
  if (idx == null || idx < 0 || idx >= days.value.length) return
  userHasPicked.value = true
  selectedIndex.value = idx
}

const step = (delta) => selectDay(selectedIndex.value + delta)

const selectedDay = computed(() => days.value[selectedIndex.value] ?? null)
const selectedMetrics = computed(() =>
  getDayMetrics(parseEphemeris(rawData.value, selectedIndex.value)),
)

const selectedDateLabel = computed(() => {
  const d = selectedDay.value
  if (!d) return '—'
  return formatDateOnly(d.date ?? d.sunrise)
})

const observerLabel = computed(() => {
  const o = rawData.value?.observer
  return o ? `${o.lat}, ${o.lon}` : null
})

const forceRefresh = () => ephemerisStore.forceRefresh()

useVisibilityRefresh(() => ephemerisStore.loadEphemeris())

/** Met en avant l'aube et la fin du jour aéronautique (bornes VFR de jour) */
const evClass = (key) => (key === 'aeroDawn' || key === 'aeroDusk' ? 'timeline-item--aero' : '')
</script>

<style scoped>
.timeline {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.03);
}

.timeline-item--aero {
  background: rgba(243, 156, 18, 0.1);
}

.timeline-label {
  flex: 1;
}

.timeline-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
