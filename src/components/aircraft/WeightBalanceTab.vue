<template>
  <div>
    <!-- Chargement : pleine largeur -->
    <SectionCard title="Chargement" icon="luggage" dense>
      <SliderRow
        v-for="s in stations"
        :key="s.id"
        :label="s.label"
        :model-value="loadout[s.id] ?? 0"
        :max="sliderMax(s)"
        :suffix="s.type === 'fuel' ? 'L' : 'kg'"
        :color="s.type === 'fuel' ? 'orange' : 'primary'"
        @update:model-value="(v) => store.setStation(s.id, v)"
      />

      <q-btn
        flat
        dense
        no-caps
        color="grey-7"
        icon="restart_alt"
        label="Réinitialiser"
        class="q-mt-sm"
        @click="store.resetLoadout()"
      />
    </SectionCard>

    <!-- Enveloppe + devis côte à côte (écran md+) -->
    <div class="row q-col-gutter-lg">
      <div class="col-12 col-md-6">
        <SectionCard title="Enveloppe de centrage" icon="show_chart" dense>
          <div class="envelope-status-chips q-mb-md">
            <q-chip
              :color="takeoffEval.ok ? 'positive' : 'negative'"
              text-color="white"
              :icon="takeoffEval.ok ? 'check_circle' : 'warning'"
            >
              Décollage (plein) : {{ statusLabel(takeoffEval) }}
            </q-chip>
            <q-chip
              :color="landingEval.ok ? 'positive' : 'negative'"
              text-color="white"
              :icon="landingEval.ok ? 'check_circle' : 'warning'"
              outline
            >
              Atterrissage (vide) : {{ statusLabel(landingEval) }}
            </q-chip>
            <q-chip
              :color="currentEval.ok ? 'primary' : 'negative'"
              text-color="white"
              :icon="currentEval.ok ? 'flight' : 'warning'"
            >
              Carburant actuel : {{ statusLabel(currentEval) }}
            </q-chip>
          </div>

          <WeightBalanceEnvelope
            :envelope="aircraft?.envelope ?? []"
            :takeoff="takeoff"
            :landing="landing"
            :line="fuelBurnLine"
            :current="current"
            :takeoff-ok="takeoffEval.ok"
            :landing-ok="landingEval.ok"
            :current-ok="currentEval.ok"
          />
          <div class="text-caption text-grey-6 q-mt-sm">
            Décollage = réservoir plein, atterrissage = réservoir vide. Le losange suit le carburant
            sélectionné ({{ fmt(currentFuel) }} L).
          </div>
        </SectionCard>
      </div>

      <div class="col-12 col-md-6">
        <SectionCard title="Devis de masse" icon="table_chart" dense>
          <WeightBalanceTable
            :rows="current.rows"
            :total-weight="current.totalWeight"
            :total-moment="current.totalMoment"
            :cg="current.cg"
            :max-takeoff-weight="aircraft?.maxTakeoffWeight"
            :over-weight="currentEval.overWeight"
          />
        </SectionCard>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import SectionCard from '../common/SectionCard.vue'
import WeightBalanceEnvelope from './WeightBalanceEnvelope.vue'
import WeightBalanceTable from './WeightBalanceTable.vue'
import SliderRow from './SliderRow.vue'
import { useWeightBalanceStore } from '../../stores/weightBalanceStore'

const store = useWeightBalanceStore()
const {
  aircraft,
  loadout,
  fuelStation,
  takeoff,
  takeoffEval,
  landing,
  landingEval,
  current,
  currentEval,
  fuelBurnLine,
} = storeToRefs(store)

const stations = computed(() => aircraft.value?.stations ?? [])

/** Carburant actuellement sélectionné dans le slider (litres). */
const currentFuel = computed(() => {
  const f = fuelStation.value
  return f ? (loadout.value[f.id] ?? 0) : 0
})

/** Borne haute du slider : limite poste, sinon défaut par type. */
function sliderMax(s) {
  if (s.type === 'fuel') return s.maxVolume || 120
  if (s.maxWeight) return s.maxWeight
  return s.type === 'baggage' ? 60 : 150
}

function statusLabel(ev) {
  if (ev.overWeight) return 'hors masse max'
  if (!ev.inEnvelope) return 'hors enveloppe'
  return 'OK'
}

function fmt(v) {
  if (v == null || Number.isNaN(v)) return '—'
  return Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}
</script>

<style scoped>
.envelope-status-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.envelope-status-chips .q-chip {
  flex: 1 1 auto;
  margin: 0;
  justify-content: flex-start;
}
</style>
