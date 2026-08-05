<template>
  <q-page class="q-pa-md">
    <div class="q-mt-lg q-mb-lg text-center">
      <div class="text-h3 text-white text-weight-bold">Préparation vol</div>
      <UpdateStatusIndicator
        :timestamp="generatedAt"
        :is-refreshing="isRefreshing"
        :stale-threshold="getEndpointConfig('aircrafts').staleThreshold"
        text-class="text-subtitle2 text-white q-mt-xs flex items-center justify-center"
      />
    </div>

    <div v-if="aircraftList.length" class="flex flex-center q-mb-lg">
      <AircraftSelector />
    </div>

    <DataLoadError
      :error="error || parseError"
      title="Erreur de chargement des avions"
      :on-retry="forceRefresh"
    />

    <StaleDataBanner
      :timestamp="generatedAt"
      :stale-threshold="getEndpointConfig('aircrafts').staleThreshold"
      data-label="Données avions"
    />

    <div v-if="loading && !aircraftList.length" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="40px" />
    </div>

    <q-card v-else-if="!aircraftList.length && !error" flat bordered class="q-pa-md">
      <div class="text-body2 text-grey-6">
        Aucun avion disponible. Déposez des fichiers <code>.aircraft</code> dans
        <code>public/data/aircrafts/</code> et référencez-les dans <code>aircrafts.json</code>.
      </div>
    </q-card>

    <template v-else-if="selectedAircraft">
      <q-card flat bordered class="q-mb-md">
        <q-tabs
          v-model="tab"
          dense
          no-caps
          align="justify"
          active-color="primary"
          indicator-color="primary"
          class="text-grey-7 prep-tabs"
          narrow-indicator
        >
          <q-tab
            v-for="t in tabs"
            :key="t.name"
            :name="t.name"
            :icon="t.icon"
            :label="showLabels ? t.label : undefined"
          >
            <q-tooltip v-if="!showLabels">{{ t.label }}</q-tooltip>
          </q-tab>
        </q-tabs>
      </q-card>

      <q-tab-panels v-model="tab" animated keep-alive class="bg-transparent">
        <q-tab-panel name="centrage" class="q-pa-none">
          <WeightBalanceTab />
        </q-tab-panel>
        <q-tab-panel name="carburant" class="q-pa-none">
          <SectionCard title="Bilan carburant" icon="local_gas_station" dense>
            <FuelPlanning />
          </SectionCard>
        </q-tab-panel>
        <q-tab-panel name="perf" class="q-pa-none">
          <PerformanceTab />
        </q-tab-panel>
        <q-tab-panel name="checklist" class="q-pa-none">
          <SectionCard title="Check-list interactive" icon="checklist" dense>
            <ChecklistRunner />
          </SectionCard>
        </q-tab-panel>
        <q-tab-panel name="urgence" class="q-pa-none">
          <SectionCard title="Urgence &amp; secours" icon="warning" dense>
            <EmergencyProcedures />
          </SectionCard>
        </q-tab-panel>
        <q-tab-panel name="tarif" class="q-pa-none">
          <FlightPricing />
        </q-tab-panel>
      </q-tab-panels>
    </template>
  </q-page>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import UpdateStatusIndicator from '../components/common/UpdateStatusIndicator.vue'
import DataLoadError from '../components/common/DataLoadError.vue'
import StaleDataBanner from '../components/common/StaleDataBanner.vue'
import SectionCard from '../components/common/SectionCard.vue'
import AircraftSelector from '../components/aircraft/AircraftSelector.vue'
import WeightBalanceTab from '../components/aircraft/WeightBalanceTab.vue'
import FuelPlanning from '../components/aircraft/FuelPlanning.vue'
import PerformanceTab from '../components/aircraft/PerformanceTab.vue'
import FlightPricing from '../components/aircraft/FlightPricing.vue'
import ChecklistRunner from '../components/aircraft/ChecklistRunner.vue'
import EmergencyProcedures from '../components/aircraft/EmergencyProcedures.vue'
import { getEndpointConfig } from '../config/app.config'
import { useAircraftStore } from '../stores/aircraftStore'
import { useWeatherStore } from '../stores/weatherStore'
import { useVisibilityRefresh } from '../composables/useVisibilityRefresh'
import { useTabQuerySync } from '../composables/useTabQuerySync'

const aircraftStore = useAircraftStore()
const weatherStore = useWeatherStore()
const { aircraftList, selectedAircraft, generatedAt, isRefreshing, loading, error, parseError } =
  storeToRefs(aircraftStore)

const tabs = [
  { name: 'centrage', icon: 'balance', label: 'Centrage' },
  { name: 'carburant', icon: 'local_gas_station', label: 'Carburant' },
  { name: 'perf', icon: 'speed', label: 'Perfos' },
  { name: 'checklist', icon: 'checklist', label: 'Check-list' },
  { name: 'urgence', icon: 'warning', label: 'Urgence' },
  { name: 'tarif', icon: 'euro', label: 'Tarif' },
]

// Onglet actif ↔ query `?tab=` (raccourcis directs, ex. /preparation?tab=perf)
const { tab, showLabels } = useTabQuerySync(tabs, 'centrage')

const forceRefresh = () => aircraftStore.forceRefresh()

// Chargement initial + météo (pré-remplissage des performances). Les
// caractéristiques du terrain viennent de la config, sans chargement (ADR-030).
aircraftStore.loadAircrafts()
weatherStore.loadWeather()

useVisibilityRefresh(() => aircraftStore.loadAircrafts())
</script>

<style scoped>
/* Les onglets icône-seule (mobile) ont un min-width Quasar de ~72px : à 6
   onglets ils débordent et passent en mode défilement. On lève le plancher
   pour qu'ils se répartissent (align="justify") et tiennent tous à l'écran. */
.prep-tabs :deep(.q-tab) {
  min-width: 0;
}
</style>
