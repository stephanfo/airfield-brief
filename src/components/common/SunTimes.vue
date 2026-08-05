<template>
  <!-- Carte éphémérides à tuiles, cohérente avec les autres cartes du portail
       (Conditions Estimées, AZBA, NOTAM). Utilisée sur l'Accueil et la page dédiée. -->
  <SectionCard :title="title" icon="wb_twilight" :to="to">
    <template #header-actions>
      <q-chip
        :color="stateColor"
        text-color="white"
        :icon="stateIcon"
        :label="state.label"
        class="text-weight-bold"
      />
    </template>

    <div v-if="eph" class="row q-col-gutter-md">
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="q-pa-sm text-center" style="min-height: 70px">
          <div class="text-h6">{{ sunriseFmt.local }}</div>
          <div class="text-caption text-grey-7">Lever</div>
        </q-card>
      </div>
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="q-pa-sm text-center" style="min-height: 70px">
          <div class="text-h6">{{ sunsetFmt.local }}</div>
          <div class="text-caption text-grey-7">Coucher</div>
        </q-card>
      </div>
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="q-pa-sm text-center" style="min-height: 70px">
          <div class="text-h6">{{ aeroDuskFmt.local }}</div>
          <div class="text-caption text-grey-7">Fin jour aéro</div>
        </q-card>
      </div>
      <div class="col-6 col-sm-3">
        <q-card
          flat
          bordered
          class="q-pa-sm text-center"
          :class="countdownBgClass"
          style="min-height: 70px"
        >
          <div class="text-h6">{{ remaining }}</div>
          <div class="text-caption text-grey-7">{{ countdownLabel }}</div>
        </q-card>
      </div>
    </div>
    <div v-else class="text-body2 text-grey-6">Éphémérides indisponibles</div>
  </SectionCard>
</template>

<script setup>
import { computed } from 'vue'
import SectionCard from './SectionCard.vue'
import { useNow } from '../../composables/useNow'
import {
  formatLocalUTC,
  formatDuration,
  timeUntil,
  getDaylightState,
  getNextEvent,
} from '../../utils/ephemerisHelpers'

const props = defineProps({
  /** Éphémérides normalisées (parseEphemeris) — null si données indisponibles */
  ephemeris: {
    type: Object,
    default: null,
  },
  /** Titre de la carte */
  title: {
    type: String,
    default: 'Éphémérides du jour',
  },
  /** Route de détail — rend le titre cliquable (Accueil uniquement) */
  to: {
    type: String,
    default: null,
  },
})

const now = useNow()
const eph = computed(() => props.ephemeris)

const sunriseFmt = computed(() => formatLocalUTC(eph.value?.sunrise))
const sunsetFmt = computed(() => formatLocalUTC(eph.value?.sunset))
const aeroDuskFmt = computed(() => formatLocalUTC(eph.value?.aeroDusk))

const state = computed(() => getDaylightState(eph.value, now.value))
const stateColor = computed(() => state.value.color)
const stateIcon = computed(
  () => ({ day: 'wb_sunny', twilight: 'wb_twilight', night: 'nightlight' })[state.value.state],
)

const nextEvent = computed(() => getNextEvent(eph.value, now.value))
const remaining = computed(() => formatDuration(timeUntil(nextEvent.value?.iso, now.value)))

/**
 * Fond d'alerte du compte à rebours : orange si < 30 min avant la nuit aéro.
 * NB : ce seuil d'alerte UI de 30 min est indépendant de l'offset réglementaire
 * `AERO_NIGHT_OFFSET_MIN` ; coïncidence numérique, pas de lien sémantique.
 */
const countdownBgClass = computed(() => {
  if (state.value.state === 'night') return 'bg-grey-2 text-grey-9'
  const ms = nextEvent.value?.msUntil
  if (nextEvent.value?.key === 'aeroDusk' && ms != null && ms < 30 * 60000) {
    return 'bg-orange-1 text-orange-9'
  }
  return 'bg-green-1 text-green-9'
})

/** Libellé court de la tuile compte à rebours (sous la durée) */
const countdownLabel = computed(() => {
  const key = nextEvent.value?.key
  if (!key) return 'Reste'
  if (key === 'aeroDusk') return 'Avant nuit aéro'
  if (key === 'sunset') return 'Avant coucher'
  if (key === 'aeroDawnNext' || key === 'sunriseNext') return 'Avant jour aéro'
  return 'Reste'
})
</script>
