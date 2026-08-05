<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :maximized="$q.screen.lt.md"
  >
    <q-card
      style="
        min-width: 350px;
        max-width: 900px;
        width: 100%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
      "
    >
      <q-card-section class="bg-primary text-white" style="flex-shrink: 0">
        <div class="row items-center justify-between">
          <div class="col-auto">
            <div class="text-h6">
              {{
                selectedAerodrome?.stationName ||
                selectedAerodrome?.name ||
                selectedAerodrome?.icaoId
              }}
            </div>
            <div class="text-caption text-weight-light">{{ selectedAerodrome?.icaoId }}</div>
          </div>
          <q-chip
            v-if="selectedAerodrome?.fltCat"
            :color="getFlightCategoryColor(selectedAerodrome.fltCat)"
            text-color="white"
            :label="translateFlightCategory(selectedAerodrome.fltCat)"
            class="text-weight-bold q-ma-none"
          />
        </div>
      </q-card-section>

      <q-tabs
        v-model="activeTab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        style="flex-shrink: 0"
      >
        <q-tab name="metar" label="METAR" />
        <q-tab v-if="selectedTafData" name="taf" label="TAF" />
      </q-tabs>

      <q-separator style="flex-shrink: 0" />

      <q-tab-panels v-model="activeTab" animated style="flex: 1; overflow-y: auto">
        <!-- Onglet METAR -->
        <q-tab-panel name="metar">
          <MetarSection :aerodrome="selectedAerodrome" />
        </q-tab-panel>

        <!-- Onglet TAF -->
        <q-tab-panel v-if="selectedTafData" name="taf">
          <TafSection :taf-data="selectedTafData" />
        </q-tab-panel>
      </q-tab-panels>

      <q-card-actions class="justify-end" style="flex-shrink: 0">
        <q-btn flat label="Fermer" color="primary" @click="emit('update:modelValue', false)" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { translateFlightCategory, getFlightCategoryColor } from '../../services/metarTranslations'
import MetarSection from './MetarSection.vue'
import TafSection from './TafSection.vue'

const $q = useQuasar()

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  selectedAerodrome: {
    type: Object,
    default: null,
  },
  tafData: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue', 'close'])

const activeTab = ref('metar')

// Réinitialiser le tab à METAR quand la modal s'ouvre
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      activeTab.value = 'metar'
    }
  },
)

const selectedTafData = computed(() => {
  if (!props.selectedAerodrome || !props.tafData) return null
  return props.tafData.find((t) => t.icaoId === props.selectedAerodrome.icaoId) || null
})
</script>
