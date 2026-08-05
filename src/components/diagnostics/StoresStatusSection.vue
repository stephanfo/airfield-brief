<template>
  <q-card flat bordered class="q-mb-md">
    <q-card-section>
      <div class="text-h6 text-weight-bold text-primary flex items-center">
        <q-icon name="data_object" class="q-mr-sm" />
        Stores de données
      </div>
    </q-card-section>
    <q-list>
      <q-item v-for="store in storesStatus" :key="store.name">
        <q-item-section avatar>
          <q-icon :name="store.icon" :color="store.color" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ store.label }}</q-item-label>
          <q-item-label caption>
            {{ store.status }}
            <span v-if="store.timestamp" class="q-ml-sm">
              • Généré {{ formatRelativeTime(store.timestamp) }}
            </span>
          </q-item-label>
          <q-item-label v-if="store.lastFetchedAt" caption class="q-mt-xs text-blue-grey-6">
            <q-icon name="cached" size="14px" class="q-mr-xs" />
            Cache : {{ formatRelativeTime(store.lastFetchedAt) }}
            <span v-if="store.nextRefreshAt" class="q-ml-sm">
              • {{ formatNextRefresh(store.nextRefreshAt) }}
            </span>
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn
            outline
            round
            icon="refresh"
            color="primary"
            size="sm"
            :loading="store.loading"
            :aria-label="`Rafraîchir ${store.label}`"
            @click="store.refresh"
          >
            <q-tooltip>Rafraîchir</q-tooltip>
          </q-btn>
        </q-item-section>
      </q-item>
    </q-list>
    <q-separator />
    <q-card-actions>
      <q-btn
        outline
        size="sm"
        color="primary"
        icon="sync"
        label="Rafraîchir tous les stores"
        :loading="isRefreshingAllStores"
        @click="handleRefreshAllStores"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useStoresStatus } from '../../composables/useStoresStatus'
import { logger } from '../../utils/logger'

const $q = useQuasar()
const { storesStatus, refreshAllStores, loadAllStores } = useStoresStatus()

const isRefreshingAllStores = ref(false)

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'jamais'

  const now = Date.now()
  const ts = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp
  if (isNaN(ts)) return 'jamais'
  const diff = now - ts
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `il y a ${days}j`
  if (hours > 0) return `il y a ${hours}h`
  if (minutes > 0) return `il y a ${minutes}min`
  if (seconds > 0) return `il y a ${seconds}s`
  return "à l'instant"
}

/**
 * Formate le temps restant avant le prochain rafraîchissement
 * @param {number} nextRefreshAt - Timestamp en ms du prochain refresh
 * @returns {string}
 */
const formatNextRefresh = (nextRefreshAt) => {
  if (!nextRefreshAt) return ''
  const now = Date.now()
  const diff = nextRefreshAt - now

  if (diff <= 0) return 'Rafraîchissement imminent'

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    const remainingMin = minutes % 60
    return `Refresh dans ${hours}h${remainingMin > 0 ? ` ${remainingMin}min` : ''}`
  }
  if (minutes > 0) return `Refresh dans ${minutes}min`
  return 'Refresh dans < 1min'
}

const handleRefreshAllStores = async () => {
  isRefreshingAllStores.value = true

  try {
    await refreshAllStores()

    $q.notify({
      type: 'positive',
      message: 'Tous les stores rafraîchis',
      timeout: 2000,
    })
  } catch (error) {
    logger.error('Erreur rafraîchissement stores:', error)
    $q.notify({
      type: 'negative',
      message: 'Erreur lors du rafraîchissement',
      timeout: 2000,
    })
  } finally {
    isRefreshingAllStores.value = false
  }
}

onMounted(() => {
  // Charger tous les stores pour afficher les infos de cache de chaque source
  loadAllStores()
})
</script>
