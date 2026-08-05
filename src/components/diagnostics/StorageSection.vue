<template>
  <q-card flat bordered class="q-mb-md">
    <q-card-section>
      <div class="text-h6 text-weight-bold text-primary flex items-center">
        <q-icon name="storage" class="q-mr-sm" />
        Stockage
      </div>
    </q-card-section>
    <q-list v-if="storageInfo.supported">
      <q-item>
        <q-item-section>
          <q-item-label>Espace utilisé / Quota</q-item-label>
          <q-linear-progress
            :value="storageInfo.usagePercent / 100"
            :color="
              storageInfo.usagePercent > 80
                ? 'negative'
                : storageInfo.usagePercent > 50
                  ? 'warning'
                  : 'positive'
            "
            class="q-mt-sm"
            size="20px"
            rounded
          >
            <div class="absolute-full flex flex-center">
              <q-badge color="white" text-color="dark" :label="`${storageInfo.usagePercent}%`" />
            </div>
          </q-linear-progress>
        </q-item-section>
      </q-item>

      <q-item>
        <q-item-section>
          <q-item-label>Détails</q-item-label>
          <q-item-label caption>
            {{ storageInfo.usageMB }} MB utilisés / {{ storageInfo.quotaMB }} MB disponibles
          </q-item-label>
        </q-item-section>
      </q-item>

      <q-item>
        <q-item-section>
          <q-item-label>localStorage</q-item-label>
          <q-item-label caption>
            {{ localStorageInfo.totalKB }} KB • {{ localStorageInfo.itemsCount }} clé{{
              localStorageInfo.itemsCount > 1 ? 's' : ''
            }}
          </q-item-label>
        </q-item-section>
      </q-item>

      <q-item>
        <q-item-section>
          <q-item-label>Stockage persistant</q-item-label>
          <q-item-label caption>
            {{ storageInfo.persisted ? 'Activé (protégé contre éviction)' : 'Désactivé' }}
          </q-item-label>
        </q-item-section>
        <q-item-section side v-if="!storageInfo.persisted">
          <q-btn
            outline
            size="sm"
            color="primary"
            label="Activer"
            @click="handleRequestPersistent"
          />
        </q-item-section>
      </q-item>
    </q-list>
    <q-card-section v-else>
      <div class="text-center text-grey-5">API Storage non supportée</div>
    </q-card-section>
    <q-separator />
    <q-card-actions>
      <q-btn
        outline
        size="sm"
        color="warning"
        icon="cleaning_services"
        label="Réinitialisation douce"
        @click="handleSoftReset"
      >
        <q-tooltip>Supprimer cache et données non critiques</q-tooltip>
      </q-btn>
      <q-btn
        outline
        size="sm"
        color="negative"
        icon="restart_alt"
        label="Réinitialisation complète"
        @click="handleFullReset"
      >
        <q-tooltip>Tout supprimer sauf tokens et préférences critiques</q-tooltip>
      </q-btn>
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { useCache } from '../../composables/useCache'
import { logger } from '../../utils/logger'
import { STORAGE_KEYS } from '../../config/storageKeys'

/**
 * Section diagnostic du stockage : quota navigateur, localStorage,
 * persistance, et actions de réinitialisation. Autonome (état + polling) ;
 * émet `cache-cleared` quand le cache mémoire a été vidé pour que la page
 * rafraîchisse ses statistiques.
 */
const emit = defineEmits(['cache-cleared'])

const $q = useQuasar()
const cache = useCache()

const storageInfo = ref({
  supported: false,
  usage: 0,
  quota: 0,
  usagePercent: 0,
  usageMB: 0,
  quotaMB: 0,
  persisted: false,
})
const localStorageInfo = ref({
  totalBytes: 0,
  totalKB: 0,
  itemsCount: 0,
})
let pollIntervalId = null

const getStorageInfo = async () => {
  if (!navigator.storage || !navigator.storage.estimate) {
    storageInfo.value = { supported: false }
    return
  }

  try {
    const estimate = await navigator.storage.estimate()
    const persisted = await navigator.storage.persisted()

    storageInfo.value = {
      supported: true,
      usage: estimate.usage,
      quota: estimate.quota,
      usagePercent: ((estimate.usage / estimate.quota) * 100).toFixed(2),
      usageMB: (estimate.usage / 1024 / 1024).toFixed(2),
      quotaMB: (estimate.quota / 1024 / 1024).toFixed(2),
      persisted,
    }
  } catch (error) {
    logger.error('Erreur récupération infos stockage:', error)
  }
}

const getLocalStorageInfo = () => {
  let total = 0
  let count = 0

  for (let key in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
      const size = (localStorage[key].length + key.length) * 2 // UTF-16
      total += size
      count++
    }
  }

  localStorageInfo.value = {
    totalBytes: total,
    totalKB: (total / 1024).toFixed(2),
    itemsCount: count,
  }
}

const refreshStorageInfo = async () => {
  await getStorageInfo()
  getLocalStorageInfo()
}

const handleRequestPersistent = async () => {
  try {
    const granted = await navigator.storage.persist()
    await getStorageInfo()

    if (granted) {
      $q.notify({
        type: 'positive',
        message: 'Stockage persistant activé',
        timeout: 2000,
      })
    } else {
      $q.notify({
        type: 'warning',
        message: 'Demande refusée par le navigateur',
        timeout: 2000,
      })
    }
  } catch (error) {
    logger.error('Erreur demande stockage persistant:', error)
  }
}

const handleSoftReset = () => {
  $q.dialog({
    title: 'Réinitialisation douce',
    message: 'Supprimer les NOTAMs masqués/vus ? Les tokens et préférences seront conservés.',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    // Supprimer uniquement les données cache
    localStorage.removeItem(STORAGE_KEYS.HIDDEN_NOTAMS)
    localStorage.removeItem(STORAGE_KEYS.SEEN_NOTAMS)

    // Vider le cache mémoire
    cache.clear()

    getLocalStorageInfo()
    emit('cache-cleared')

    $q.notify({
      type: 'positive',
      message: 'Réinitialisation douce effectuée',
      timeout: 2000,
    })
  })
}

const handleFullReset = () => {
  $q.dialog({
    title: 'Réinitialisation complète',
    message: 'ATTENTION : Supprimer toutes les données sauf tokens FCM et préférences menu ?',
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(() => {
    // Sauvegarder les données critiques : le token FCM (le perdre casse les
    // notifications jusqu'à un réabonnement) et la personnalisation du menu.
    const preserved = [
      STORAGE_KEYS.FCM_TOKEN,
      STORAGE_KEYS.SUBSCRIBED_TOPICS,
      STORAGE_KEYS.MENU_CUSTOMIZATION,
      STORAGE_KEYS.MENU_SHOW_LABELS,
    ].map((key) => [key, localStorage.getItem(key)])

    // Vider tout
    localStorage.clear()
    cache.clear()

    // Restaurer les données critiques
    preserved.forEach(([key, value]) => {
      if (value !== null) localStorage.setItem(key, value)
    })

    getLocalStorageInfo()
    emit('cache-cleared')

    $q.notify({
      type: 'positive',
      message: 'Réinitialisation complète effectuée',
      timeout: 2000,
    })

    // Recharger après 2s
    setTimeout(() => window.location.reload(), 2000)
  })
}

onMounted(() => {
  refreshStorageInfo()
  pollIntervalId = setInterval(refreshStorageInfo, 30 * 1000)
})

onUnmounted(() => {
  if (pollIntervalId) clearInterval(pollIntervalId)
})
</script>
