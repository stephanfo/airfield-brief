<template>
  <SectionCard title="Tarif de vol" icon="euro" dense>
    <div v-if="hourlyRate == null" class="text-grey-6 text-body2">
      Aucun tarif horaire défini pour cet avion.
    </div>
    <template v-else>
      <!-- Total estimé : info principale, mise en avant -->
      <div class="text-center q-mb-md">
        <div class="text-overline text-grey-7">Total estimé</div>
        <div class="text-h3 text-weight-bold text-primary">
          {{ formatCurrency(cost.total, currency) }}
        </div>
        <div class="text-caption text-grey-7 q-mt-xs">
          {{ formatMinutes(cost.billedMinutes) }} facturées ·
          {{ formatCurrency(cost.hourlyRate, currency) }}/h
          <span v-if="includesFuel"> · carburant inclus</span>
        </div>
      </div>

      <q-separator class="q-mb-md" />

      <!-- Réglages : durée + déduction sol -->
      <div class="q-mb-xs">
        <div class="row items-baseline justify-between q-mb-xs">
          <span class="text-body2 text-weight-medium">Durée de vol</span>
          <span class="text-h6 text-weight-bold">{{ formatMinutes(durationMinutes) }}</span>
        </div>
        <q-slider
          v-model="durationMinutes"
          :min="0"
          :max="300"
          :step="5"
          label
          :label-value="formatMinutes(durationMinutes)"
          color="primary"
          class="q-mb-sm"
        />
      </div>

      <SliderRow v-model="deduction" label="Déduction sol" :max="30" suffix="min" color="orange" />

      <!-- Récap d'une ligne du calcul -->
      <div class="text-center text-caption text-grey-7 q-mt-sm">
        {{ formatMinutes(cost.grossMinutes) }} − {{ formatMinutes(cost.deductionMinutes) }} =
        <span class="text-weight-medium">{{ formatMinutes(cost.billedMinutes) }} facturées</span>
      </div>

      <!-- Détail complet, repliable -->
      <q-expansion-item
        dense
        icon="receipt_long"
        label="Détail du calcul"
        header-class="text-grey-7"
        class="q-mt-xs"
      >
        <q-markup-table flat dense class="pricing-table">
          <tbody>
            <tr>
              <td class="text-left">Durée brute</td>
              <td class="text-right">{{ formatMinutes(cost.grossMinutes) }}</td>
            </tr>
            <tr>
              <td class="text-left">Déduction (chauffe + roulage)</td>
              <td class="text-right">− {{ formatMinutes(cost.deductionMinutes) }}</td>
            </tr>
            <tr>
              <td class="text-left">Durée facturée</td>
              <td class="text-right text-weight-medium">
                {{ formatMinutes(cost.billedMinutes) }}
              </td>
            </tr>
            <tr>
              <td class="text-left">Tarif horaire</td>
              <td class="text-right">{{ formatCurrency(cost.hourlyRate, currency) }}</td>
            </tr>
            <tr class="text-primary text-weight-bold">
              <td class="text-left">Total estimé</td>
              <td class="text-right">{{ formatCurrency(cost.total, currency) }}</td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-expansion-item>
    </template>
  </SectionCard>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import SectionCard from '../common/SectionCard.vue'
import SliderRow from './SliderRow.vue'
import { useAircraftStore } from '../../stores/aircraftStore'
import { computeFlightCost, formatCurrency, formatMinutes } from '../../utils/pricingHelpers'
import { logger } from '../../utils/logger'
import { STORAGE_KEYS } from '../../config/storageKeys'

const PREFS_KEY = STORAGE_KEYS.PRICING_PREFS

const aircraftStore = useAircraftStore()
const { selectedAircraft } = storeToRefs(aircraftStore)

const hourlyRate = computed(() => selectedAircraft.value?.pricing?.hourlyRate ?? null)
const currency = computed(() => selectedAircraft.value?.pricing?.currency ?? 'EUR')
const includesFuel = computed(() => selectedAircraft.value?.pricing?.includesFuel ?? false)

// Préférences UI persistées (durée + déduction). Rétro-compat avec l'ancien
// format heures/minutes ; déduction par défaut 5 min (roulage).
const prefs = (() => {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
  } catch {
    return {}
  }
})()

const durationMinutes = ref(prefs.durationMinutes ?? (prefs.hours ?? 1) * 60 + (prefs.minutes ?? 0))
const deduction = ref(prefs.deduction ?? 5)

const cost = computed(() =>
  computeFlightCost({
    hourlyRate: hourlyRate.value,
    durationMinutes: durationMinutes.value,
    deductionMinutes: deduction.value,
    currency: currency.value,
  }),
)

watch([durationMinutes, deduction], () => {
  try {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ durationMinutes: durationMinutes.value, deduction: deduction.value }),
    )
  } catch (e) {
    logger.warn('Impossible de mémoriser les préférences de tarif:', e)
  }
})
</script>

<style scoped>
.pricing-table {
  font-variant-numeric: tabular-nums;
}
</style>
