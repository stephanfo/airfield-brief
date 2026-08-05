<template>
  <q-card flat bordered class="q-mb-md">
    <q-card-section>
      <div class="text-h5 q-mb-md flex items-center justify-between">
        <div class="flex items-center text-primary text-weight-bold">
          <q-icon name="filter_alt" size="md" class="q-mr-sm" />
          Filtres
          <q-badge
            v-if="activeCount > 0"
            color="accent"
            text-color="white"
            rounded
            class="q-ml-sm"
            :label="activeCount"
          />
        </div>
        <q-btn
          v-if="activeCount > 0"
          flat
          dense
          no-caps
          color="grey-7"
          icon="restart_alt"
          label="Réinitialiser"
          @click="emit('reset')"
        />
      </div>

      <div class="row q-col-gutter-md">
        <div class="col-12">
          <q-input
            :model-value="search"
            outlined
            dense
            clearable
            debounce="300"
            placeholder="Rechercher (titre, description, causes, avion, lieu…)"
            @update:model-value="emit('update:search', $event || '')"
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>

        <div class="col-6 col-md-3">
          <q-select
            :model-value="type"
            outlined
            dense
            emit-value
            map-options
            :options="typeOptions"
            label="Type"
            @update:model-value="emit('update:type', $event)"
          />
        </div>

        <div class="col-6 col-md-3">
          <q-select
            :model-value="subject"
            outlined
            dense
            emit-value
            map-options
            :options="subjectOptions"
            label="Objet"
            @update:model-value="emit('update:subject', $event)"
          />
        </div>

        <div class="col-6 col-md-3">
          <q-select
            :model-value="regime"
            outlined
            dense
            emit-value
            map-options
            :options="regimeOptions"
            label="Régime de vol"
            @update:model-value="emit('update:regime', $event)"
          />
        </div>

        <div class="col-6 col-md-3">
          <q-select
            :model-value="flightKind"
            outlined
            dense
            emit-value
            map-options
            :options="flightKindOptions"
            label="Nature de vol"
            @update:model-value="emit('update:flightKind', $event)"
          />
        </div>

        <div class="col-12 col-md-6">
          <q-select
            :model-value="eventKind"
            outlined
            dense
            emit-value
            map-options
            :options="eventKindOptions"
            label="Classe d'évènement"
            @update:model-value="emit('update:eventKind', $event)"
          />
        </div>

        <div class="col-12 col-md-6 flex items-center">
          <q-toggle
            :model-value="clubOnly"
            color="accent"
            :label="`Déclarés par le club ou survenus à ${CLUB_CONFIG.airfield.icao}`"
            @update:model-value="emit('update:clubOnly', $event)"
          />
        </div>
      </div>

      <div class="text-caption text-grey-7 q-mt-md">
        {{ filteredCount }} REX affiché(s) sur {{ totalCount }}
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'
import { CLUB_CONFIG } from '../../config/club.config'

const props = defineProps({
  search: { type: String, default: '' },
  type: { type: String, default: 'all' },
  subject: { type: String, default: 'all' },
  regime: { type: String, default: 'all' },
  flightKind: { type: String, default: 'all' },
  eventKind: { type: String, default: 'all' },
  clubOnly: { type: Boolean, default: false },
  options: {
    type: Object,
    default: () => ({ types: [], subjects: [], regimes: [], flightKinds: [], eventKinds: [] }),
  },
  filteredCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
})

const emit = defineEmits([
  'update:search',
  'update:type',
  'update:subject',
  'update:regime',
  'update:flightKind',
  'update:eventKind',
  'update:clubOnly',
  'reset',
])

const toOptions = (values) => [
  { label: 'Tout', value: 'all' },
  ...values.map((value) => ({ label: value, value })),
]

/** Nombre de filtres actifs (hors valeurs par défaut) — badge + bouton Réinitialiser. */
const activeCount = computed(() => {
  let count = 0
  if (props.search && props.search.trim()) count++
  for (const value of [
    props.type,
    props.subject,
    props.regime,
    props.flightKind,
    props.eventKind,
  ]) {
    if (value !== 'all') count++
  }
  if (props.clubOnly) count++
  return count
})

const typeOptions = computed(() => toOptions(props.options.types))
const subjectOptions = computed(() => toOptions(props.options.subjects))
const regimeOptions = computed(() => toOptions(props.options.regimes))
const flightKindOptions = computed(() => toOptions(props.options.flightKinds))
const eventKindOptions = computed(() => toOptions(props.options.eventKinds))
</script>
