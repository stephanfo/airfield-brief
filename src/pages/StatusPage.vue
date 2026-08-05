<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="q-mt-lg q-mb-xl text-center">
      <div class="text-h3 text-white text-weight-bold">Information Système</div>
      <div class="text-subtitle2 text-white q-mt-xs">État de santé de l'application</div>
    </div>

    <!-- Statut Global -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h6 text-weight-bold text-primary flex items-center">
          <q-icon name="dashboard" class="q-mr-sm" />
          Statut Global
        </div>
      </q-card-section>
      <q-card-section>
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6 col-md-3">
            <q-chip
              :color="globalStatus.color"
              text-color="white"
              icon="circle"
              size="md"
              class="full-width justify-center"
            >
              {{ globalStatus.label }}
            </q-chip>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-chip
              :color="networkStatus.isOffline ? 'negative' : 'positive'"
              text-color="white"
              :icon="networkStatus.isOffline ? 'wifi_off' : 'wifi'"
              size="md"
              class="full-width justify-center"
            >
              {{ networkStatus.isOffline ? 'Hors ligne' : 'En ligne' }}
            </q-chip>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-chip
              :color="pwaStatus.isPWA ? 'positive' : 'warning'"
              text-color="white"
              :icon="pwaStatus.isPWA ? 'smartphone' : 'web'"
              size="md"
              class="full-width justify-center"
            >
              {{ pwaStatus.isPWA ? 'Mode PWA' : 'Mode Browser' }}
            </q-chip>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-chip
              :color="
                swStatus.registered && swStatus.active
                  ? 'positive'
                  : swStatus.supported
                    ? 'warning'
                    : 'negative'
              "
              text-color="white"
              :icon="
                swStatus.registered && swStatus.active
                  ? 'check_circle'
                  : swStatus.supported
                    ? 'warning'
                    : 'cancel'
              "
              size="md"
              class="full-width justify-center"
            >
              {{
                swStatus.registered && swStatus.active
                  ? 'SW Actif'
                  : swStatus.supported
                    ? 'SW Inactif'
                    : 'SW Non supporté'
              }}
            </q-chip>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Service Worker & ses caches -->
    <SwStatusSection
      :sw-status="swStatus"
      :sw-caches="swCaches"
      @refresh-status="getServiceWorkerStatus"
      @refresh-caches="getSWCacheInfo"
    />

    <!-- Notifications -->
    <NotificationsStatusSection />

    <!-- Cache Système -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h6 text-weight-bold text-primary flex items-center">
          <q-icon name="storage" class="q-mr-sm" />
          Cache Système (Mémoire)
        </div>
      </q-card-section>
      <q-list>
        <q-item>
          <q-item-section>
            <q-item-label>Entrées totales</q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="text-subtitle2 text-primary text-weight-bold">{{ cacheStats.total }}</div>
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>Valides / Expirées</q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="row items-center q-gutter-xs">
              <div class="text-subtitle2 text-positive text-weight-bold">
                {{ cacheStats.valid }}
              </div>
              <div class="text-grey-6">/</div>
              <div class="text-subtitle2 text-negative text-weight-bold">
                {{ cacheStats.expired }}
              </div>
            </div>
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>Taille approximative</q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="text-subtitle2 text-weight-bold">
              {{ (cacheStats.size / 1024).toFixed(2) }} KB
            </div>
          </q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>Requêtes en cours</q-item-label>
          </q-item-section>
          <q-item-section side>
            <div
              class="text-subtitle2 text-weight-bold"
              :class="cacheStats.pending > 0 ? 'text-warning' : 'text-grey'"
            >
              {{ cacheStats.pending }}
            </div>
          </q-item-section>
        </q-item>
      </q-list>
      <q-separator />
      <q-card-actions>
        <q-btn
          outline
          size="sm"
          color="negative"
          icon="delete_sweep"
          label="Vider le cache mémoire"
          @click="handleClearMemoryCache"
        />
      </q-card-actions>
    </q-card>

    <!-- Stockage -->
    <StorageSection @cache-cleared="getCacheStats" />

    <!-- Permissions -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h6 text-weight-bold text-primary flex items-center">
          <q-icon name="admin_panel_settings" class="q-mr-sm" />
          Permissions
        </div>
      </q-card-section>
      <q-list>
        <q-item>
          <q-item-section avatar>
            <q-icon
              :name="permissionsStatus.notifications.icon"
              :color="permissionsStatus.notifications.color"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>Notifications</q-item-label>
            <q-item-label caption>
              {{ permissionsStatus.notifications.label }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <!-- Stores de données -->
    <StoresStatusSection />

    <!-- Versions & Environnement -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h6 text-weight-bold text-primary flex items-center">
          <q-icon name="info" class="q-mr-sm" />
          Versions & Environnement
        </div>
      </q-card-section>
      <q-list>
        <q-item>
          <q-item-section>
            <q-item-label>Application</q-item-label>
          </q-item-section>
          <q-item-section side>v{{ appVersion }}</q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>Quasar</q-item-label>
          </q-item-section>
          <q-item-section side>v{{ $q.version }}</q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>Vue</q-item-label>
          </q-item-section>
          <q-item-section side>v{{ vueVersion }}</q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>Système d'exploitation</q-item-label>
          </q-item-section>
          <q-item-section side>{{ platformInfo.os }}</q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>Navigateur</q-item-label>
          </q-item-section>
          <q-item-section side>{{ platformInfo.browser }}</q-item-section>
        </q-item>

        <q-item>
          <q-item-section>
            <q-item-label>Type d'appareil</q-item-label>
          </q-item-section>
          <q-item-section side>{{ platformInfo.deviceType }}</q-item-section>
        </q-item>

        <q-item v-if="connectionInfo.supported">
          <q-item-section>
            <q-item-label>Type de connexion</q-item-label>
          </q-item-section>
          <q-item-section side>
            {{ connectionInfo.effectiveType || 'Inconnu' }}
            <q-icon
              v-if="connectionInfo.saveData"
              name="data_saver_on"
              color="warning"
              class="q-ml-sm"
            >
              <q-tooltip>Mode économie de données actif</q-tooltip>
            </q-icon>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <!-- Paramètres de diagnostic -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h6 text-weight-bold text-primary flex items-center">
          <q-icon name="settings" class="q-mr-sm" />
          Paramètres de diagnostic
        </div>
      </q-card-section>
      <q-list>
        <q-item tag="label">
          <q-item-section avatar>
            <q-icon name="terminal" color="accent" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Activer logging Service Worker</q-item-label>
            <q-item-label caption>
              Intercepte et affiche les logs du SW (peut impacter les performances)
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-toggle
              :model-value="swLoggingEnabled"
              @update:model-value="handleToggleSWLogging"
              color="accent"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <!-- Navigateur localStorage -->
    <LocalStorageBrowser class="q-mb-md" />

    <!-- Console de Logs -->
    <LogsConsole class="q-mb-md" />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { version as vueVersion } from 'vue'
import { useCache } from '../composables/useCache'
import { useNetworkStatus } from '../composables/useNetworkStatus'
import { useStoresStatus } from '../composables/useStoresStatus'
import { useLogsStore } from '../stores/logsStore'
import { storeToRefs } from 'pinia'
import LogsConsole from '../components/diagnostics/LogsConsole.vue'
import LocalStorageBrowser from '../components/diagnostics/LocalStorageBrowser.vue'
import SwStatusSection from '../components/diagnostics/SwStatusSection.vue'
import NotificationsStatusSection from '../components/diagnostics/NotificationsStatusSection.vue'
import StorageSection from '../components/diagnostics/StorageSection.vue'
import StoresStatusSection from '../components/diagnostics/StoresStatusSection.vue'
import { logger } from '../utils/logger'

// ========== QUASAR ==========
const $q = useQuasar()

// ========== STORES ==========
const cache = useCache()
const { isOnline } = useNetworkStatus()
const { storesStatus } = useStoresStatus()
const logsStore = useLogsStore()

const { swLoggingEnabled } = storeToRefs(logsStore)

// ========== STATE ==========
const appVersion = ref('1.0.0')
const swStatus = ref({
  supported: false,
  registered: false,
  active: null,
  waiting: null,
  installing: null,
  controller: null,
})
const pwaStatus = ref({
  isPWA: false,
  isStandalone: false,
  isIosStandalone: false,
  isInWebApk: false,
})
const cacheStats = ref({
  total: 0,
  valid: 0,
  expired: 0,
  pending: 0,
  size: 0,
})
const swCaches = ref([])
const pollInterval = ref(null)

// ========== COMPUTED ==========
const networkStatus = computed(() => ({
  isOffline: !isOnline.value,
}))

const globalStatus = computed(() => {
  const hasErrors = storesStatus.value.some((s) => s.error)
  const isLoading = storesStatus.value.some((s) => s.loading)
  const isOfflineStatus = !isOnline.value

  if (hasErrors) {
    return { color: 'negative', label: 'Erreurs détectées' }
  }
  if (isOfflineStatus) {
    return { color: 'warning', label: 'Mode hors ligne' }
  }
  if (isLoading) {
    return { color: 'info', label: 'Chargement en cours' }
  }
  return { color: 'positive', label: 'Opérationnel' }
})

const permissionsStatus = computed(() => {
  const notifPermission = Notification?.permission || 'default'

  return {
    notifications: {
      permission: notifPermission,
      label:
        notifPermission === 'granted'
          ? 'Accordée'
          : notifPermission === 'denied'
            ? 'Refusée'
            : 'Non demandée',
      color:
        notifPermission === 'granted'
          ? 'positive'
          : notifPermission === 'denied'
            ? 'negative'
            : 'warning',
      icon:
        notifPermission === 'granted'
          ? 'notifications_active'
          : notifPermission === 'denied'
            ? 'notifications_off'
            : 'notifications_none',
    },
  }
})

const platformInfo = computed(() => {
  const p = $q.platform

  let os = 'Inconnu'
  if (p.is.android) os = 'Android'
  else if (p.is.ios) os = 'iOS'
  else if (p.is.mac) os = 'macOS'
  else if (p.is.win) os = 'Windows'
  else if (p.is.linux) os = 'Linux'

  let browser = 'Inconnu'
  if (p.is.chrome) browser = 'Chrome'
  else if (p.is.safari) browser = 'Safari'
  else if (p.is.firefox) browser = 'Firefox'
  else if (p.is.edge) browser = 'Edge'

  let deviceType = 'Ordinateur'
  if (p.is.mobile) deviceType = 'Mobile'
  else if (p.is.tablet) deviceType = 'Tablette'

  return { os, browser, deviceType }
})

const connectionInfo = computed(() => {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (!conn) {
    return { supported: false }
  }

  return {
    supported: true,
    effectiveType: conn.effectiveType,
    downlink: conn.downlink,
    rtt: conn.rtt,
    saveData: conn.saveData,
  }
})

// ========== METHODS ==========
const detectPWAMode = () => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const isIosStandalone = window.navigator.standalone === true
  const isInWebApk = document.referrer.includes('android-app://')

  pwaStatus.value = {
    isPWA: isStandalone || isIosStandalone || isInWebApk,
    isStandalone,
    isIosStandalone,
    isInWebApk,
  }
}

const getServiceWorkerStatus = async () => {
  if (!('serviceWorker' in navigator)) {
    swStatus.value = { supported: false }
    return
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()

    if (!registration) {
      swStatus.value = {
        supported: true,
        registered: false,
      }
      return
    }

    swStatus.value = {
      supported: true,
      registered: true,
      scope: registration.scope,
      updateViaCache: registration.updateViaCache,
      active: registration.active
        ? {
            scriptURL: registration.active.scriptURL,
            state: registration.active.state,
          }
        : null,
      waiting: registration.waiting
        ? {
            scriptURL: registration.waiting.scriptURL,
            state: registration.waiting.state,
          }
        : null,
      installing: registration.installing
        ? {
            scriptURL: registration.installing.scriptURL,
            state: registration.installing.state,
          }
        : null,
      controller: navigator.serviceWorker.controller
        ? {
            scriptURL: navigator.serviceWorker.controller.scriptURL,
          }
        : null,
    }
  } catch (error) {
    logger.error('Erreur récupération statut SW:', error)
  }
}

const getCacheStats = () => {
  cacheStats.value = cache.getStats()
}

const getSWCacheInfo = async () => {
  if (!('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.ready
    if (!registration.active) return

    const messageChannel = new MessageChannel()
    messageChannel.port1.onmessage = (event) => {
      if (event.data?.cacheInfos) {
        swCaches.value = event.data.cacheInfos
      }
    }

    registration.active.postMessage({ type: 'GET_CACHE_INFO' }, [messageChannel.port2])
  } catch (error) {
    logger.error('Erreur récupération infos caches SW:', error)
  }
}

const updateAllStatus = async () => {
  getCacheStats()
  await getSWCacheInfo()
}

// ========== ACTIONS ==========
const handleClearMemoryCache = () => {
  $q.dialog({
    title: 'Vider le cache mémoire',
    message: 'Êtes-vous sûr de vouloir vider le cache en mémoire ?',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    cache.clear()
    getCacheStats()
    $q.notify({
      type: 'positive',
      message: 'Cache mémoire vidé',
      timeout: 2000,
    })
  })
}

const handleToggleSWLogging = () => {
  logsStore.toggleSWLogging()
}

// ========== EVENT LISTENERS ==========
const onOnline = () => {
  logger.log('Connexion rétablie')
  $q.notify({
    type: 'positive',
    message: 'Connexion rétablie',
    icon: 'wifi',
    timeout: 2000,
  })
}

const onOffline = () => {
  logger.warn('Connexion perdue')
  $q.notify({
    type: 'warning',
    message: 'Connexion perdue',
    icon: 'wifi_off',
    timeout: 2000,
  })
}

const onSWControllerChange = () => {
  logger.log('Service Worker controller changé')
  getServiceWorkerStatus()
}

// ========== LIFECYCLE ==========
onMounted(async () => {
  // Démarrer l'interception des logs
  logsStore.startInterception()

  // Initialisation
  detectPWAMode()
  await getServiceWorkerStatus()
  await updateAllStatus()

  // Event listeners pour mises à jour instantanées
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', onSWControllerChange)
  }

  // Polling toutes les 30 secondes pour les autres stats
  pollInterval.value = setInterval(updateAllStatus, 30 * 1000)

  logger.log('StatusPage initialisée')
})

onUnmounted(() => {
  // Arrêter l'interception des logs
  logsStore.stopInterception()

  // Nettoyer les event listeners
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.removeEventListener('controllerchange', onSWControllerChange)
  }

  // Arrêter le polling
  if (pollInterval.value) {
    clearInterval(pollInterval.value)
  }

  logger.log('StatusPage démontée')
})
</script>
