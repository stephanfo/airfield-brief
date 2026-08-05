<template>
  <div>
    <div class="q-mb-md">
      <SliderRow
        v-for="p in params"
        :key="p.key"
        :label="p.label"
        :model-value="paramValue(p)"
        :max="p.max"
        :step="p.step"
        :suffix="p.suffix"
        color="orange"
        @update:model-value="(v) => setParam(p, v)"
      />

      <q-btn
        flat
        dense
        no-caps
        color="grey-7"
        icon="restart_alt"
        label="Valeurs par défaut"
        class="q-mt-sm"
        @click="store.resetFuelInput()"
      >
        <q-tooltip>Réinitialise dégagement, réserve, roulage et contingence (VFR jour)</q-tooltip>
      </q-btn>
    </div>

    <q-card flat bordered class="q-mb-md" :class="emportClass">
      <q-card-section class="text-center q-py-md">
        <div class="text-overline text-weight-medium">Emport minimum</div>
        <div class="text-h3 text-weight-bold">{{ fmt(fuelPlan.minimum) }} L</div>
        <div class="text-subtitle2">{{ fmt(fuelPlan.minimumMass) }} kg</div>
        <div v-if="usableFuel != null" class="text-caption q-mt-xs flex flex-center no-wrap">
          <q-icon
            :name="fuelPlan.overCapacity ? 'error' : 'check_circle'"
            size="16px"
            class="q-mr-xs"
          />
          {{
            fuelPlan.overCapacity
              ? `Dépasse la capacité utilisable (${fmt(usableFuel)} L)`
              : `Compatible réservoir (${fmt(usableFuel)} L utilisables)`
          }}
        </div>
      </q-card-section>
    </q-card>

    <q-markup-table flat dense class="fuel-table q-mb-md">
      <tbody>
        <tr>
          <td class="text-left">Roulage</td>
          <td class="text-right">{{ fmt(fuelPlan.breakdown.taxi) }} L</td>
        </tr>
        <tr>
          <td class="text-left">Vol</td>
          <td class="text-right">{{ fmt(fuelPlan.breakdown.trip) }} L</td>
        </tr>
        <tr>
          <td class="text-left">Contingence</td>
          <td class="text-right">{{ fmt(fuelPlan.breakdown.contingency) }} L</td>
        </tr>
        <tr>
          <td class="text-left">Dégagement</td>
          <td class="text-right">{{ fmt(fuelPlan.breakdown.alternate) }} L</td>
        </tr>
        <tr>
          <td class="text-left">Réserve finale</td>
          <td class="text-right">{{ fmt(fuelPlan.breakdown.reserve) }} L</td>
        </tr>
        <tr class="text-weight-bold bg-grey-2">
          <td class="text-left">Emport minimum</td>
          <td class="text-right">
            {{ fmt(fuelPlan.minimum) }} L · {{ fmt(fuelPlan.minimumMass) }} kg
          </td>
        </tr>
      </tbody>
    </q-markup-table>

    <div class="text-caption text-grey-6 q-mt-sm">
      Conso croisière : {{ cruiseBurn ? `${cruiseBurn} L/h` : '—' }} (source .aircraft). Réserve VFR
      jour par défaut 30 min.
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import SliderRow from './SliderRow.vue'
import { useWeightBalanceStore } from '../../stores/weightBalanceStore'

const store = useWeightBalanceStore()
const { fuelInput, fuelPlan, usableFuel, aircraft } = storeToRefs(store)

const cruiseBurn = computed(() => aircraft.value?.fuel?.burn?.cruise ?? null)

// Couleur du bloc emport : neutre sans capacité connue, vert/rouge sinon.
const emportClass = computed(() => {
  if (usableFuel.value == null) return 'bg-blue-1 text-blue-9'
  return fuelPlan.value.overCapacity ? 'bg-red-1 text-red-9' : 'bg-green-1 text-green-9'
})

// Paramètres du bilan, rendus en lignes slider (mêmes que le chargement).
// `contingency` est stockée en fraction (0.05) mais éditée en pourcentage.
const params = [
  { key: 'tripMinutes', label: 'Vol prévu', suffix: 'min', max: 300, step: 5 },
  { key: 'alternateMinutes', label: 'Dégagement', suffix: 'min', max: 120, step: 5 },
  { key: 'reserveMinutes', label: 'Réserve', suffix: 'min', max: 90, step: 5 },
  { key: 'taxiFuel', label: 'Roulage', suffix: 'L', max: 15, step: 1 },
  { key: 'contingency', label: 'Contingence', suffix: '%', max: 20, step: 1, pct: true },
]

function paramValue(p) {
  if (p.pct) return Math.round((fuelInput.value.contingency || 0) * 100)
  return fuelInput.value[p.key] ?? 0
}

function setParam(p, v) {
  store.setFuelInput(p.key, p.pct ? (Number(v) || 0) / 100 : v)
}

function fmt(v) {
  if (v == null || Number.isNaN(v)) return '—'
  return Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}
</script>

<style scoped>
.fuel-table {
  font-variant-numeric: tabular-nums;
}
</style>
