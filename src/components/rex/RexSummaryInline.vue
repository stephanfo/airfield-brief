<template>
  <span>
    <template v-for="(part, idx) in parts" :key="idx">
      <strong v-if="part.type === 'bold'">{{ part.value }}</strong>
      <template v-else-if="part.type === 'citation'">
        <q-chip
          v-for="id in splitCitationIds(part.value)"
          :key="id"
          dense
          clickable
          color="primary"
          text-color="white"
          size="sm"
          :label="`#${id}`"
          @click="emit('cite', id)"
        />
      </template>
      <template v-else>{{ part.value }}</template>
    </template>
  </span>
</template>

<script setup>
import { splitCitationIds } from '../../utils/rexHelpers'

defineProps({
  parts: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['cite'])
</script>
