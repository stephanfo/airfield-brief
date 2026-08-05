<template>
  <q-card flat bordered class="q-mb-md">
    <q-card-section>
      <div class="text-h5 q-mb-md flex items-center justify-between">
        <div class="flex items-center text-primary text-weight-bold">
          <q-icon name="filter_alt" size="md" class="q-mr-sm" />
          Filtres
        </div>
      </div>
      <div class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-4">
          <div class="text-caption text-grey-7 q-mb-xs">
            <q-icon name="schedule" size="xs" class="q-mr-xs" />
            Filtres et masquage
          </div>
          <q-btn-toggle
            :model-value="validity"
            spread
            no-caps
            toggle-color="primary"
            :options="[
              { label: 'Tout', value: 'all' },
              { label: 'En cours', value: 'current' },
              { label: 'Futur', value: 'future' },
            ]"
            @update:model-value="emit('update:validity', $event)"
          />
        </div>

        <!-- Filtre Traffic -->
        <div class="col-12 col-md-4">
          <div class="text-caption text-grey-7 q-mb-xs">
            <q-icon name="flight" size="xs" class="q-mr-xs" />
            Traffic
          </div>
          <q-btn-toggle
            :model-value="traffic"
            spread
            no-caps
            toggle-color="primary"
            :options="[
              { label: 'Tout', value: 'all' },
              { label: 'VFR', value: 'vfr' },
              { label: 'IFR', value: 'ifr' },
            ]"
            @update:model-value="emit('update:traffic', $event)"
          />
        </div>

        <!-- Filtre FL Range -->
        <div class="col-12 col-md-4">
          <div class="q-px-md">
            <div class="text-caption text-grey-7 q-mb-xs">
              Niveaux de vol (FL): {{ localFlRange.min }} -
              {{ localFlRange.max === 100 ? 'illimité' : localFlRange.max }}
            </div>
            <q-range
              v-model="localFlRange"
              :min="0"
              :max="100"
              :step="5"
              color="primary"
              label
              snap
              @update:model-value="debouncedEmitFlRange"
            />
          </div>
        </div>
      </div>

      <!-- Indicateur de NOTAMs masqués -->
      <div class="row items-center justify-between q-mt-md">
        <div v-if="hiddenCount > 0" class="row items-center q-gutter-sm">
          <div class="text-subtitle2 text-negative">
            <q-icon name="visibility_off" size="xs" class="q-mr-xs" />
            {{ hiddenCount }} NOTAM(s) masqué(s)
          </div>
          <q-btn
            :color="showHidden ? 'primary' : 'grey-7'"
            :icon="showHidden ? 'visibility' : 'visibility_off'"
            :label="showHidden ? 'Cacher les NOTAMs masqués' : 'Afficher les NOTAMs masqués'"
            size="sm"
            outline
            @click="emit('update:showHidden', !showHidden)"
          />
          <q-btn
            color="negative"
            icon="delete"
            label="Réinitialiser le masquage"
            size="sm"
            @click="emit('reset-hidden')"
          />
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'

/**
 * Barre de filtres de la page NOTAM : validité, trafic VFR/IFR, plage de
 * niveaux de vol, et gestion de l'affichage des NOTAMs masqués.
 * Le slider FL est débouncé localement pour éviter de recalculer les
 * listes filtrées à chaque mouvement.
 */
const props = defineProps({
  validity: {
    type: String,
    required: true,
  },
  traffic: {
    type: String,
    required: true,
  },
  flRange: {
    type: Object,
    required: true,
  },
  showHidden: {
    type: Boolean,
    default: false,
  },
  hiddenCount: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits([
  'update:validity',
  'update:traffic',
  'update:flRange',
  'update:showHidden',
  'reset-hidden',
])

// Copie locale du slider : réactivité immédiate à l'écran,
// propagation débouncée vers le parent (filtrage coûteux).
const localFlRange = ref({ ...props.flRange })

watch(
  () => props.flRange,
  (range) => {
    localFlRange.value = { ...range }
  },
)

const debouncedEmitFlRange = useDebounceFn((value) => {
  emit('update:flRange', value)
}, 300)
</script>
