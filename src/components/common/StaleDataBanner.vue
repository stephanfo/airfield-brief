<template>
  <q-banner v-if="isStale" rounded class="bg-orange-1 text-orange-9 q-mb-md" role="alert">
    <template v-slot:avatar>
      <q-icon name="warning" color="warning" />
    </template>
    <div class="text-weight-bold">Données potentiellement périmées</div>
    <div class="text-body2">
      {{ dataLabel }} du {{ formattedTimestamp }} — vérifiez la fraîcheur des informations avant
      toute décision de vol.
    </div>
  </q-banner>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

/**
 * Bandeau d'avertissement affiché quand les données dépassent leur seuil
 * de péremption (staleThreshold de app.config.js). Complète l'indicateur
 * discret UpdateStatusIndicator : sur une PWA utilisée hors-ligne (cache
 * service worker), le pilote doit voir clairement que son brief date.
 */
const props = defineProps({
  /** Timestamp de génération des données (ISO ou parsable par Date). */
  timestamp: {
    type: String,
    default: null,
  },
  /** Seuil en ms au-delà duquel les données sont considérées périmées. */
  staleThreshold: {
    type: Number,
    required: true,
  },
  /** Libellé des données (ex: "NOTAM", "Données météo"). */
  dataLabel: {
    type: String,
    default: 'Données',
  },
})

// Horloge réactive : le bandeau doit apparaître de lui-même si la page
// reste ouverte (session longue, app relancée depuis le cache).
const now = ref(Date.now())
let clockId = null

onMounted(() => {
  clockId = setInterval(() => {
    now.value = Date.now()
  }, 60 * 1000)
})

onUnmounted(() => {
  if (clockId) clearInterval(clockId)
})

const isStale = computed(() => {
  if (!props.timestamp) return false
  const ts = new Date(props.timestamp).getTime()
  if (Number.isNaN(ts)) return false
  return now.value - ts > props.staleThreshold
})

const formattedTimestamp = computed(() => {
  if (!props.timestamp) return '-'
  return (
    new Date(props.timestamp).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'UTC',
    }) + ' UTC'
  )
})
</script>
