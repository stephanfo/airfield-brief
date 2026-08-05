<template>
  <q-select
    :model-value="selectedRegistration"
    :options="options"
    option-value="registration"
    option-label="label"
    emit-value
    map-options
    dense
    outlined
    bg-color="white"
    label="Avion"
    style="min-width: 220px"
    @update:model-value="(v) => store.setSelected(v)"
  >
    <template #prepend>
      <q-icon name="flight" />
    </template>
  </q-select>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAircraftStore } from '../../stores/aircraftStore'

const store = useAircraftStore()
const { aircraftList, selectedRegistration } = storeToRefs(store)

const options = computed(() =>
  aircraftList.value.map((a) => ({
    registration: a.registration,
    label: `${a.registration} — ${a.model}`,
  })),
)
</script>
