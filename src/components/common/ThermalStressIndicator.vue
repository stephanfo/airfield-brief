<template>
  <q-card
    v-if="showIndicator"
    flat
    bordered
    :class="['q-mb-lg cursor-pointer', meta.bgClass]"
    @click="goToPage"
  >
    <q-card-section class="row items-center no-wrap q-py-sm">
      <q-icon :name="meta.icon" size="md" :class="['q-mr-md', meta.textColor]" />
      <div class="col">
        <div :class="['text-subtitle1 text-weight-bold', meta.textColor]">
          Stress thermique : zone {{ meta.label.toLowerCase() }}
        </div>
        <div class="text-caption text-grey-8">{{ tagline }}</div>
      </div>
      <q-icon name="chevron_right" :class="meta.textColor" />
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useThermalStressSettings } from '../../composables/useThermalStressSettings'
import {
  getThermalStressLevel,
  applyPersonalShift,
  getThermalStressShift,
  thermalStressMeta,
  THERMAL_STRESS_LEVELS,
} from '../../utils/thermalStressHelpers'

const props = defineProps({
  temperature: { type: Number, default: null },
  humidity: { type: Number, default: null },
})

const router = useRouter()
const { settings } = useThermalStressSettings()

const level = computed(() =>
  applyPersonalShift(
    getThermalStressLevel(props.temperature, props.humidity),
    getThermalStressShift(settings),
  ),
)

// N'apparaît que si le risque est au moins « moyen » (pas de bruit les jours frais).
const showIndicator = computed(
  () => !!level.value && THERMAL_STRESS_LEVELS.indexOf(level.value) >= 1,
)

const meta = computed(() => thermalStressMeta(level.value))

const TAGLINES = {
  moyenne: 'Prévoir de quoi s’hydrater en quantité suffisante.',
  significative: 'Forte hydratation et repos obligatoire entre deux vols.',
  elevee: 'Très forte hydratation, avion sous abri, activité physique à proscrire.',
}
const tagline = computed(() => TAGLINES[level.value] || '')

function goToPage() {
  router.push('/stress-thermique')
}
</script>
