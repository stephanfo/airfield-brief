<template>
  <SectionCard title="Stress thermique du pilote" icon="device_thermostat">
    <!-- Données indisponibles -->
    <div v-if="!baseLevel" class="text-grey-7 flex items-center">
      <q-icon name="info" class="q-mr-sm" />
      Température / humidité de la station indisponibles — risque non calculable.
    </div>

    <template v-else>
      <!-- Zone courante -->
      <div :class="['q-pa-md rounded-borders q-mb-md', meta.bgClass]">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <q-icon :name="meta.icon" size="md" :class="['q-mr-sm', meta.textColor]" />
            <div>
              <div :class="['text-h6 text-weight-bold', meta.textColor]">
                Zone {{ meta.label.toLowerCase() }}
              </div>
              <div class="text-caption text-grey-8">
                {{ tempLabel }} · {{ humidityLabel }} d'humidité
              </div>
            </div>
          </div>
          <q-chip :color="meta.color" text-color="white" class="text-weight-bold">
            {{ meta.label }}
          </q-chip>
        </div>
        <div v-if="shiftApplied" class="text-caption text-grey-8 q-mt-sm flex items-center">
          <q-icon name="person" class="q-mr-xs" />
          Zone ajustée selon le profil (âge / pathologie) — base :
          {{ baseMeta.label.toLowerCase() }}.
        </div>
      </div>

      <!-- Recommandations FFA -->
      <q-list dense>
        <q-item v-for="(reco, i) in recommendations" :key="i" class="q-px-none">
          <q-item-section avatar style="min-width: 32px">
            <q-icon name="chevron_right" :color="meta.color" />
          </q-item-section>
          <q-item-section>{{ reco }}</q-item-section>
        </q-item>
      </q-list>
    </template>

    <q-separator class="q-my-md" />

    <!-- Réglage personnel -->
    <div class="text-subtitle2 text-weight-bold q-mb-sm flex items-center">
      <q-icon name="manage_accounts" class="q-mr-sm" />
      Profil pilote
    </div>
    <div class="row q-col-gutter-md items-center">
      <div class="col-12 col-sm-6">
        <q-select
          v-model="settings.ageBracket"
          :options="ageOptions"
          emit-value
          map-options
          outlined
          dense
          label="Tranche d'âge"
          @update:model-value="saveSettings"
        />
      </div>
      <div class="col-12 col-sm-6">
        <q-toggle
          v-model="settings.pathologie"
          label="Pathologie / sensibilité accrue à la chaleur"
          @update:model-value="saveSettings"
        />
      </div>
    </div>
    <div class="text-caption text-grey-7 q-mt-sm">
      Nota FFA : la zone est décalée d'un cran vers le haut par tranche de 5 ans au-delà de 65 ans
      ou par pathologie. En cas de doute, consulter son médecin aéronautique.
    </div>

    <q-separator class="q-my-md" />

    <!-- Grille FFA (toujours visible, pleine largeur) -->
    <div class="text-subtitle2 text-weight-bold q-mb-sm flex items-center">
      <q-icon name="grid_on" class="q-mr-sm" />
      Grille FFA
    </div>
    <div style="overflow-x: auto">
      <table class="thermal-grid">
        <thead>
          <tr>
            <th>°C \ %</th>
            <th v-for="h in humidities" :key="h">{{ h }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in gridRows" :key="row.temp">
            <th>{{ row.temp }}</th>
            <td
              v-for="cell in row.cells"
              :key="cell.humidity"
              :class="[cell.cls, cell.current ? 'thermal-current' : '']"
            ></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="text-caption text-grey-7 q-mt-xs">
      Source : Commission Prévention Sécurité FFA (2025_07_01). La vigilance canicule Météo-France
      reste un élément de décision complémentaire.
    </div>
  </SectionCard>
</template>

<script setup>
import { computed } from 'vue'
import SectionCard from '../common/SectionCard.vue'
import { useThermalStressSettings } from '../../composables/useThermalStressSettings'
import {
  getThermalStressLevel,
  applyPersonalShift,
  getThermalStressShift,
  thermalStressMeta,
  thermalStressRecommendations,
  nearestHumidityColumn,
} from '../../utils/thermalStressHelpers'

const props = defineProps({
  /** Température de l'air en °C (depuis la station) */
  temperature: { type: Number, default: null },
  /** Humidité relative en % (depuis la station) */
  humidity: { type: Number, default: null },
})

const { settings, saveSettings } = useThermalStressSettings()

const ageOptions = [
  { label: 'Moins de 65 ans', value: 'under65' },
  { label: '65 – 69 ans', value: '65-69' },
  { label: '70 – 74 ans', value: '70-74' },
  { label: '75 ans et plus', value: '75plus' },
]

const humidities = [10, 20, 30, 40, 50, 60, 70, 80, 90]
const temps = Array.from({ length: 22 }, (_, i) => 45 - i) // 45 → 24

const baseLevel = computed(() => getThermalStressLevel(props.temperature, props.humidity))
const shiftCount = computed(() => getThermalStressShift(settings))
const effectiveLevel = computed(() => applyPersonalShift(baseLevel.value, shiftCount.value))
const shiftApplied = computed(
  () => baseLevel.value && effectiveLevel.value && baseLevel.value !== effectiveLevel.value,
)

const meta = computed(() => thermalStressMeta(effectiveLevel.value))
const baseMeta = computed(() => thermalStressMeta(baseLevel.value))
const recommendations = computed(() => thermalStressRecommendations(effectiveLevel.value))

const tempLabel = computed(() =>
  props.temperature !== null ? `${props.temperature.toFixed(1)} °C` : '—',
)
const humidityLabel = computed(() =>
  props.humidity !== null ? `${props.humidity.toFixed(0)} %` : '—',
)

const HEATMAP_CLASS = {
  faible: 'bg-green-4',
  moyenne: 'bg-yellow-6',
  significative: 'bg-orange-5',
  elevee: 'bg-red-5',
}

const currentTempRow = computed(() =>
  props.temperature !== null ? Math.min(45, Math.max(24, Math.round(props.temperature))) : null,
)
const currentHumCol = computed(() =>
  props.humidity !== null ? nearestHumidityColumn(props.humidity) : null,
)

const gridRows = computed(() =>
  temps.map((temp) => ({
    temp,
    cells: humidities.map((humidity) => ({
      humidity,
      cls: HEATMAP_CLASS[getThermalStressLevel(temp, humidity)] || '',
      current: temp === currentTempRow.value && humidity === currentHumCol.value,
    })),
  })),
)
</script>

<style scoped>
.thermal-grid {
  border-collapse: collapse;
  font-size: 11px;
  width: 100%;
  table-layout: fixed;
}
.thermal-grid th {
  padding: 1px 4px;
  font-weight: 600;
  color: #555;
  text-align: center;
}
.thermal-grid th:first-child,
.thermal-grid tbody th {
  width: 48px;
}
.thermal-grid td {
  height: 18px;
  border: 1px solid #fff;
}
.thermal-grid .thermal-current {
  outline: 3px solid #000;
  outline-offset: -2px;
}
</style>
