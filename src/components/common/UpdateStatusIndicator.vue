<template>
  <div :class="['update-status', textClass]">
    <span class="update-label">{{ label }}</span>
    <span class="update-value q-ml-xs" :class="freshnessClass">{{ displayValue }}</span>
    <q-icon
      v-if="isRefreshing"
      name="autorenew"
      size="16px"
      class="q-ml-sm update-spinner"
      aria-label="Actualisation en cours"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getUpdateClass } from '../../utils/dateHelpers'

const props = defineProps({
  timestamp: {
    type: String,
    default: null,
  },
  valueText: {
    type: String,
    default: '',
  },
  isRefreshing: {
    type: Boolean,
    default: false,
  },
  label: {
    type: String,
    default: 'Mise à jour :',
  },
  textClass: {
    type: String,
    default: 'text-subtitle2 text-white q-mt-xs flex items-center justify-center',
  },
  /**
   * Seuil en millisecondes au-delà duquel les données sont considérées obsolètes.
   * Déclenche un fond d'avertissement orange.
   * Défaut : 2 heures (rétrocompatible avec l'ancien comportement hardcodé).
   */
  staleThreshold: {
    type: Number,
    default: 2 * 60 * 60 * 1000,
  },
})

const displayValue = computed(() => {
  if (props.valueText) {
    return props.valueText
  }

  if (!props.timestamp) {
    return '-'
  }

  return (
    new Date(props.timestamp).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'UTC',
    }) + ' UTC'
  )
})

const freshnessClass = computed(() => getUpdateClass(props.timestamp, props.staleThreshold))
</script>

<style scoped>
.update-status {
  display: inline-flex;
  align-items: center;
}

.update-label {
  font-weight: 500;
}

.update-spinner {
  animation: update-spinner-rotate 1.1s linear infinite;
}

@keyframes update-spinner-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
