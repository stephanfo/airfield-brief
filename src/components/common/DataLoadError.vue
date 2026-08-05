<template>
  <q-banner v-if="error" rounded class="bg-negative text-white q-mb-md">
    <template #avatar>
      <q-icon name="cloud_off" />
    </template>
    <div class="text-weight-medium">{{ title }}</div>
    <div class="text-caption">
      Les données n'ont pas pu être chargées. Vérifiez votre connexion ou réessayez.
    </div>
    <template #action>
      <q-btn
        flat
        color="white"
        icon="refresh"
        label="Réessayer"
        :loading="isRetrying"
        @click="handleRetry"
      />
    </template>
  </q-banner>
</template>

<script setup>
import { ref } from 'vue'

/**
 * Bannière d'erreur de chargement réutilisable.
 * Affiche un message + bouton "Réessayer" quand le store expose une `error`.
 * S'efface automatiquement (v-if) dès que l'erreur est résolue.
 */
const props = defineProps({
  /** Message d'erreur du store (chaîne ou null). La bannière s'affiche si truthy. */
  error: {
    type: [String, Object],
    default: null,
  },
  /** Titre affiché dans la bannière. */
  title: {
    type: String,
    default: 'Erreur de chargement',
  },
  /** Callback de nouvelle tentative (généralement store.forceRefresh). */
  onRetry: {
    type: Function,
    default: null,
  },
})

const isRetrying = ref(false)

const handleRetry = async () => {
  if (!props.onRetry) return
  isRetrying.value = true
  try {
    await props.onRetry()
  } catch {
    // L'erreur reste affichée via la prop `error` ; un toast est déjà émis par useDataFetcher.
  } finally {
    isRetrying.value = false
  }
}
</script>
