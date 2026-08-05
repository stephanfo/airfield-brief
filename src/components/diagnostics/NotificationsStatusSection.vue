<template>
  <q-card flat bordered class="q-mb-md">
    <q-card-section>
      <div class="text-h6 text-weight-bold text-primary flex items-center">
        <q-icon name="notifications" class="q-mr-sm" />
        Notifications
      </div>
    </q-card-section>
    <q-list>
      <q-item>
        <q-item-section avatar>
          <q-icon
            :name="notificationsSupported ? 'check_circle' : 'cancel'"
            :color="notificationsSupported ? 'positive' : 'negative'"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label>Notifications supportées</q-item-label>
          <q-item-label caption>
            {{ notificationsSupported ? 'Oui' : 'Non' }}
          </q-item-label>
        </q-item-section>
      </q-item>

      <q-item v-if="notificationsSupported">
        <q-item-section avatar>
          <q-icon :name="notificationPermissionIcon" :color="notificationPermissionColor" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Permission notification</q-item-label>
          <q-item-label caption>
            {{ notificationPermissionLabel }}
          </q-item-label>
        </q-item-section>
      </q-item>

      <q-item v-if="fcmToken">
        <q-item-section avatar>
          <q-icon name="vpn_key" color="primary" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Token FCM</q-item-label>
          <q-item-label caption class="text-wrap">
            {{ fcmToken.substring(0, 30) }}...
            <q-btn
              outline
              size="sm"
              icon="content_copy"
              aria-label="Copier le token FCM"
              @click="handleCopyFCMToken"
              color="primary"
            />
          </q-item-label>
        </q-item-section>
      </q-item>

      <q-item v-if="!fcmToken && notificationPermissionStatus === 'granted'">
        <q-item-section avatar>
          <q-icon name="warning" color="warning" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Token FCM manquant</q-item-label>
          <q-item-label caption>
            Vérifiez la configuration Firebase ou consultez la console
          </q-item-label>
        </q-item-section>
      </q-item>

      <q-item v-if="firebaseConfigured">
        <q-item-section avatar>
          <q-icon name="cloud" color="positive" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Configuration Firebase</q-item-label>
          <q-item-label caption> Project ID: {{ firebaseProjectId }} </q-item-label>
        </q-item-section>
      </q-item>

      <q-item v-else>
        <q-item-section avatar>
          <q-icon name="cloud_off" color="negative" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Configuration Firebase manquante</q-item-label>
          <q-item-label caption> Configurez les variables d'environnement dans .env </q-item-label>
        </q-item-section>
      </q-item>

      <q-item v-if="subscribedTopics.length > 0">
        <q-item-section avatar>
          <q-icon name="notifications" color="accent" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Topics abonnés</q-item-label>
          <q-item-label caption>
            <q-chip
              v-for="topic in subscribedTopics"
              :key="topic"
              size="sm"
              color="primary"
              text-color="white"
              dense
              class="q-mr-xs"
            >
              {{ topic }}
            </q-chip>
          </q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </q-card>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { useNotificationStore } from '../../stores/notificationStore'
import { logger } from '../../utils/logger'
import { STORAGE_KEYS } from '../../config/storageKeys'

/**
 * Section diagnostic des notifications push : support navigateur,
 * permission, token FCM, configuration Firebase et topics abonnés.
 * Autonome : gère son propre état et son polling de rafraîchissement.
 */
const $q = useQuasar()
const notificationStore = useNotificationStore()

const notificationsSupported = ref(false)
const notificationPermissionStatus = ref('default')
const fcmToken = ref(null)
const subscribedTopics = ref([])
const firebaseProjectId = ref('')
const firebaseConfigured = ref(false)
let pollIntervalId = null

const notificationPermissionIcon = computed(() => {
  if (notificationPermissionStatus.value === 'granted') return 'notifications_active'
  if (notificationPermissionStatus.value === 'denied') return 'notifications_off'
  return 'notifications_none'
})

const notificationPermissionColor = computed(() => {
  if (notificationPermissionStatus.value === 'granted') return 'positive'
  if (notificationPermissionStatus.value === 'denied') return 'negative'
  return 'warning'
})

const notificationPermissionLabel = computed(() => {
  if (notificationPermissionStatus.value === 'granted') return 'Accordée'
  if (notificationPermissionStatus.value === 'denied') return 'Refusée'
  return 'Non demandée'
})

const getNotificationInfo = () => {
  // Vérifier le support des notifications
  notificationsSupported.value = 'Notification' in window

  // Récupérer la permission
  if (notificationsSupported.value) {
    notificationPermissionStatus.value = Notification.permission
  }

  // Récupérer le token FCM
  try {
    fcmToken.value = localStorage.getItem(STORAGE_KEYS.FCM_TOKEN)
  } catch (e) {
    logger.error('Erreur lecture token FCM:', e)
  }

  // Récupérer les topics abonnés
  try {
    subscribedTopics.value = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBSCRIBED_TOPICS) || '[]')
  } catch (e) {
    logger.error('Erreur lecture topics:', e)
    subscribedTopics.value = []
  }

  // Vérifier la configuration Firebase
  const config = notificationStore.firebaseConfig
  firebaseProjectId.value = config.projectId || ''
  firebaseConfigured.value = !!(
    config.apiKey &&
    config.apiKey !== 'YOUR_API_KEY' &&
    notificationStore.vapidKey &&
    notificationStore.vapidKey !== 'YOUR_VAPID_KEY'
  )
}

const handleCopyFCMToken = () => {
  if (fcmToken.value) {
    navigator.clipboard.writeText(fcmToken.value)
    $q.notify({
      type: 'positive',
      message: 'Token FCM copié dans le presse-papier',
      icon: 'check_circle',
      timeout: 2000,
    })
  }
}

onMounted(() => {
  getNotificationInfo()
  pollIntervalId = setInterval(getNotificationInfo, 30 * 1000)
})

onUnmounted(() => {
  if (pollIntervalId) clearInterval(pollIntervalId)
})
</script>
