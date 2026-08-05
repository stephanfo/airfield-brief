import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Notify } from 'quasar'
import { CLUB_CONFIG } from '../config/club.config'
import { logger } from '../utils/logger'
import { STORAGE_KEYS } from '../config/storageKeys'

/**
 * Store pour gérer les notifications push (FCM)
 * Gère les permissions, la souscription aux topics et la configuration Firebase
 */
export const useNotificationStore = defineStore('notification', () => {
  // État des permissions
  const permissionStatus = ref(null)
  const isPWAInstalled = ref(false)

  // Topics disponibles — définis par le club (ADR-030). Les `id` sont couplés à
  // l'émetteur (N8N / Cloud Function) et aux abonnements existants.
  const availableTopics = ref(CLUB_CONFIG.notificationTopics)

  // Topics souscrits (stockés dans localStorage)
  const subscribedTopics = ref(
    (() => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBSCRIBED_TOPICS) || '[]')
      } catch (e) {
        logger.warn('localStorage non disponible:', e)
        return []
      }
    })(),
  )

  // Configuration Firebase (à remplacer par vos vraies clés)
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || 'YOUR_API_KEY',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'YOUR_AUTH_DOMAIN',
    projectId: process.env.FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'YOUR_STORAGE_BUCKET',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || 'YOUR_SENDER_ID',
    appId: process.env.FIREBASE_APP_ID || 'YOUR_APP_ID',
  }

  const vapidKey = process.env.FIREBASE_VAPID_KEY || 'YOUR_VAPID_KEY'

  // Computed: état de support des notifications
  const notificationSupport = computed(() => {
    // Vérifier d'abord si la PWA est installée
    // Sur iOS Safari (non-standalone), Notification n'existe pas
    if (!isPWAInstalled.value) {
      return 'not-installed'
    }

    // Ensuite vérifier si les notifications sont supportées
    if (!('Notification' in window)) {
      return 'incompatible'
    }

    return 'compatible'
  })

  // Computed: statut pour l'icône cloche
  const bellStatus = computed(() => {
    if (notificationSupport.value === 'incompatible') {
      return { color: 'grey-9', icon: 'notifications_off', tooltip: 'Notifications non supportées' }
    }
    if (notificationSupport.value === 'not-installed') {
      return {
        color: 'grey-9',
        icon: 'notifications_paused',
        tooltip: "Installez l'application pour activer les notifications",
      }
    }

    if (permissionStatus.value === 'granted') {
      return { color: 'positive', icon: 'notifications_active', tooltip: 'Notifications activées' }
    }
    if (permissionStatus.value === 'denied') {
      return { color: 'negative', icon: 'notifications_off', tooltip: 'Notifications bloquées' }
    }
    return {
      color: 'primary',
      icon: 'notifications_none',
      tooltip: 'Notifications non configurées',
    }
  })

  /**
   * Initialise le store et vérifie l'état actuel
   */
  function initialize() {
    logger.log('🔄 Initialisation du notificationStore...')

    // Vérifier si c'est une PWA installée (plusieurs méthodes pour compatibilité)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIosStandalone = window.navigator.standalone === true
    const isInWebApk = document.referrer.includes('android-app://')

    logger.log('Vérification PWA:', {
      isStandalone,
      isIosStandalone,
      isInWebApk,
      displayMode: window.matchMedia('(display-mode: standalone)').matches
        ? 'standalone'
        : 'browser',
    })

    if (isStandalone || isIosStandalone || isInWebApk) {
      isPWAInstalled.value = true
      logger.log('✅ PWA installée et lancée en mode standalone')
    } else {
      isPWAInstalled.value = false
      logger.log('ℹ️ Application non installée (mode navigateur)')
    }

    // Vérifier le statut des permissions
    if ('Notification' in window) {
      permissionStatus.value = Notification.permission
      logger.log(`Statut des permissions de notification: ${Notification.permission}`)
    } else {
      logger.warn('⚠️ API Notification non disponible dans ce navigateur')
    }

    // Vérifier si Service Worker est supporté
    if ('serviceWorker' in navigator) {
      logger.log('✅ Service Worker supporté')

      // Vérifier l'état du Service Worker
      navigator.serviceWorker
        .getRegistration()
        .then((registration) => {
          if (registration) {
            logger.log('✅ Service Worker enregistré:', {
              scope: registration.scope,
              state: registration.active?.state,
              updateViaCache: registration.updateViaCache,
            })
          } else {
            logger.warn('⚠️ Aucun Service Worker enregistré')
          }
        })
        .catch((error) => {
          logger.error('❌ Erreur lors de la vérification du Service Worker:', error)
        })
    } else {
      logger.warn('⚠️ Service Worker non supporté par ce navigateur')
    }

    logger.log('✅ Initialisation terminée')
  }

  /**
   * Demande la permission de notification
   * @returns {Promise<string>} Le statut de la permission
   */
  async function requestPermission() {
    logger.log('🔄 Demande de permission de notification...')

    if (!('Notification' in window)) {
      const errorMsg = 'Notifications non supportées par ce navigateur'
      logger.error('❌', errorMsg)
      Notify.create({
        type: 'negative',
        message: errorMsg,
        icon: 'error',
        position: 'top-right',
      })
      throw new Error(errorMsg)
    }

    try {
      logger.log('⏳ Affichage de la popup de permission...')
      const permission = await Notification.requestPermission()
      permissionStatus.value = permission

      logger.log(`✅ Permission obtenue: ${permission}`)

      if (permission === 'granted') {
        logger.log("✅ Notifications autorisées par l'utilisateur")

        Notify.create({
          type: 'positive',
          message: 'Notifications activées avec succès',
          icon: 'notifications_active',
          position: 'top-right',
        })

        // Enregistrer le service worker pour les notifications
        logger.log('🔄 Enregistrement du Service Worker pour les notifications...')
        await registerForPushNotifications()
      } else if (permission === 'denied') {
        logger.warn("⚠️ Notifications refusées par l'utilisateur")

        Notify.create({
          type: 'negative',
          message: 'Notifications bloquées. Consultez les réglages de votre navigateur.',
          icon: 'notifications_off',
          position: 'top-right',
        })
      } else {
        logger.log(`ℹ️ Permission en attente: ${permission}`)
      }

      return permission
    } catch (error) {
      logger.error('❌ Erreur lors de la demande de permission:', error)
      logger.error("Type d'erreur:", error.name)
      logger.error('Message:', error.message)

      Notify.create({
        type: 'negative',
        message: 'Erreur lors de la demande de permission',
        caption: error.message || 'Erreur inconnue',
        icon: 'error',
        position: 'top-right',
        timeout: 5000,
      })
      throw error
    }
  }

  /**
   * Enregistre le service worker pour les notifications push
   */
  async function registerForPushNotifications() {
    logger.log("🔄 Début de l'enregistrement pour les notifications push")

    if (!('serviceWorker' in navigator)) {
      const errorMsg = 'Service Worker non supporté par ce navigateur'
      logger.error('❌', errorMsg)
      Notify.create({
        type: 'negative',
        message: errorMsg,
        icon: 'error',
        position: 'top-right',
      })
      throw new Error(errorMsg)
    }

    try {
      logger.log('⏳ Attente du Service Worker...')
      const registration = await navigator.serviceWorker.ready

      if (registration) {
        logger.log('✅ Service Worker prêt:', registration.active?.state)
      } else {
        logger.warn('⚠️ Service Worker registration est undefined')
      }

      // Vérifier si les clés Firebase sont configurées
      if (
        !firebaseConfig.apiKey ||
        firebaseConfig.apiKey === 'YOUR_API_KEY' ||
        !vapidKey ||
        vapidKey === 'YOUR_VAPID_KEY'
      ) {
        const errorMsg = 'Firebase non configuré. Configurez les clés dans .env'
        logger.error('❌', errorMsg)
        logger.error('Configuration actuelle:', {
          hasApiKey: !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY',
          hasVapidKey: !!vapidKey && vapidKey !== 'YOUR_VAPID_KEY',
          projectId: firebaseConfig.projectId,
        })

        Notify.create({
          type: 'negative',
          message:
            'Configuration Firebase manquante. Les notifications ne peuvent pas être activées.',
          caption: "Contactez l'administrateur pour configurer Firebase.",
          icon: 'cloud_off',
          position: 'top-right',
          timeout: 5000,
        })
        return
      }

      logger.log('✅ Configuration Firebase valide')

      // Initialiser Firebase Messaging avec dynamic import pour éviter les erreurs si non installé
      try {
        logger.log('⏳ Chargement du SDK Firebase...')
        const { initializeApp, getApps, getApp } = await import('firebase/app')
        const { getMessaging, getToken } = await import('firebase/messaging')

        logger.log('✅ SDK Firebase chargé')

        // Initialiser Firebase (ou récupérer l'instance existante)
        logger.log('🔄 Initialisation de Firebase App...')
        const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
        logger.log('✅ Firebase App initialisée')

        logger.log('🔄 Initialisation de Firebase Messaging...')
        const messaging = getMessaging(app)
        logger.log('✅ Firebase Messaging initialisé')

        // Obtenir le token FCM
        logger.log('⏳ Obtention du token FCM...')
        logger.log('VAPID Key utilisée:', vapidKey.substring(0, 20) + '...')

        const token = await getToken(messaging, {
          vapidKey: vapidKey,
          serviceWorkerRegistration: registration,
        })

        if (token) {
          logger.log('✅ FCM Token obtenu:', token.substring(0, 20) + '...')

          // Stocker le token localement pour les souscriptions aux topics
          try {
            localStorage.setItem(STORAGE_KEYS.FCM_TOKEN, token)
            logger.log('✅ Token FCM sauvegardé dans localStorage')
          } catch (e) {
            logger.error('❌ Impossible de sauvegarder le token dans localStorage:', e)
          }

          // Abonner aux topics déjà sélectionnés
          if (subscribedTopics.value.length > 0) {
            logger.log(
              `🔄 Abonnement à ${subscribedTopics.value.length} topic(s):`,
              subscribedTopics.value,
            )
            for (const topicId of subscribedTopics.value) {
              await updateBackendSubscription(topicId, 'subscribe')
            }
          } else {
            logger.log('ℹ️ Aucun topic sélectionné pour le moment')
          }

          Notify.create({
            type: 'positive',
            message: 'Appareil enregistré pour les notifications',
            icon: 'check_circle',
            position: 'top-right',
          })
        } else {
          logger.error('❌ Aucun token FCM obtenu (getToken a retourné null)')
          Notify.create({
            type: 'warning',
            message: "Impossible d'obtenir le token de notification",
            caption: 'Vérifiez les permissions et réessayez',
            icon: 'warning',
            position: 'top-right',
            timeout: 5000,
          })
        }
      } catch (importError) {
        logger.error('❌ Erreur lors du chargement de Firebase SDK:', importError)
        logger.error('Stack trace:', importError.stack)

        Notify.create({
          type: 'negative',
          message: 'Firebase SDK non configuré correctement',
          caption: "Impossible d'initialiser les notifications. Contactez l'administrateur.",
          icon: 'error',
          position: 'top-right',
          timeout: 5000,
        })
      }
    } catch (error) {
      logger.error("❌ Erreur lors de l'enregistrement pour les notifications:", error)
      logger.error("Type d'erreur:", error.name)
      logger.error('Message:', error.message)
      logger.error('Stack trace:', error.stack)

      Notify.create({
        type: 'negative',
        message: "Erreur lors de l'enregistrement des notifications",
        caption: error.message || 'Erreur inconnue',
        icon: 'error',
        position: 'top-right',
        timeout: 5000,
      })
      throw error
    }
  }

  /**
   * Souscrit à un topic
   * @param {string} topicId - ID du topic
   */
  async function subscribeToTopic(topicId) {
    logger.log(`🔄 Abonnement au topic "${topicId}"...`)

    if (!subscribedTopics.value.includes(topicId)) {
      subscribedTopics.value.push(topicId)
      try {
        localStorage.setItem(STORAGE_KEYS.SUBSCRIBED_TOPICS, JSON.stringify(subscribedTopics.value))
        logger.log('✅ Topics sauvegardés dans localStorage:', subscribedTopics.value)
      } catch (e) {
        logger.error('❌ Impossible de sauvegarder dans localStorage:', e)
      }

      // Envoyer au backend N8N pour souscription FCM
      await updateBackendSubscription(topicId, 'subscribe')

      const topicLabel = availableTopics.value.find((t) => t.id === topicId)?.label
      logger.log(`✅ Abonné au topic "${topicLabel}"`)

      Notify.create({
        type: 'positive',
        message: `Abonné au topic "${topicLabel}"`,
        icon: 'check_circle',
        position: 'top-right',
      })
    } else {
      logger.log(`ℹ️ Déjà abonné au topic "${topicId}"`)
    }
  }

  /**
   * Se désabonne d'un topic
   * @param {string} topicId - ID du topic
   */
  async function unsubscribeFromTopic(topicId) {
    logger.log(`🔄 Désabonnement du topic "${topicId}"...`)

    const index = subscribedTopics.value.indexOf(topicId)
    if (index > -1) {
      subscribedTopics.value.splice(index, 1)
      try {
        localStorage.setItem(STORAGE_KEYS.SUBSCRIBED_TOPICS, JSON.stringify(subscribedTopics.value))
        logger.log('✅ Topics sauvegardés dans localStorage:', subscribedTopics.value)
      } catch (e) {
        logger.error('❌ Impossible de sauvegarder dans localStorage:', e)
      }

      // Envoyer au backend N8N pour désinscription FCM
      await updateBackendSubscription(topicId, 'unsubscribe')

      const topicLabel = availableTopics.value.find((t) => t.id === topicId)?.label
      logger.log(`✅ Désabonné du topic "${topicLabel}"`)

      Notify.create({
        type: 'info',
        message: `Désabonné du topic "${topicLabel}"`,
        icon: 'info',
        position: 'top-right',
      })
    } else {
      logger.log(`ℹ️ Pas abonné au topic "${topicId}"`)
    }
  }

  /**
   * Met à jour la souscription directement via Firebase
   * Utilise une Cloud Function Firebase pour abonner/désabonner le token au topic
   * @param {string} topic - Nom du topic
   * @param {string} action - 'subscribe' ou 'unsubscribe'
   */
  async function updateBackendSubscription(topic, action) {
    logger.log(`🔄 updateBackendSubscription - Topic: ${topic}, Action: ${action}`)

    try {
      // Récupérer le token FCM depuis localStorage
      let fcmToken
      try {
        fcmToken = localStorage.getItem(STORAGE_KEYS.FCM_TOKEN)
        if (fcmToken) {
          logger.log(`✅ Token FCM récupéré: ${fcmToken.substring(0, 20)}...`)
        } else {
          logger.warn('⚠️ Aucun token FCM trouvé dans localStorage')
        }
      } catch (e) {
        logger.error('❌ Impossible de lire le token depuis localStorage:', e)
      }

      if (!fcmToken) {
        logger.warn('⚠️ Pas de token FCM disponible pour la souscription')
        Notify.create({
          type: 'warning',
          message: 'Token FCM manquant',
          caption: 'Les notifications ne pourront pas être reçues. Réactivez les permissions.',
          icon: 'warning',
          position: 'top-right',
          timeout: 5000,
        })
        return
      }

      // Utiliser la Cloud Function Firebase pour gérer l'abonnement
      // Format: https://us-central1-{PROJECT_ID}.cloudfunctions.net/manageTopicSubscription
      // Dérogation au contrat « pas de fetch() hors useDataFetcher » : il s'agit
      // d'un POST ponctuel vers un service externe (pas de cache ni de TTL).
      const cloudFunctionUrl = `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/manageTopicSubscription`

      logger.log(`🔄 Appel Cloud Function: ${cloudFunctionUrl}`)
      logger.log('Payload:', { action, topic, tokenPreview: fcmToken.substring(0, 20) + '...' })

      const response = await fetch(cloudFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action, // 'subscribe' ou 'unsubscribe'
          topic,
          token: fcmToken,
        }),
      })

      logger.log(`📡 Réponse Cloud Function - Status: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const errorData = await response.json()
        logger.error('❌ Erreur Cloud Function:', errorData)
        throw new Error(`Erreur Cloud Function: ${errorData.error || response.status}`)
      }

      const responseData = await response.json()
      logger.log(`✅ Souscription ${action} pour ${topic} réussie:`, responseData)
    } catch (error) {
      logger.error(
        `❌ Erreur lors de la mise à jour de la souscription (${action} ${topic}):`,
        error,
      )
      logger.error("Type d'erreur:", error.name)
      logger.error('Message:', error.message)

      // Ne pas bloquer si la Cloud Function n'est pas disponible
      Notify.create({
        type: 'warning',
        message: 'Abonnement sauvegardé localement',
        caption: 'La synchronisation se fera au prochain démarrage si le serveur est disponible.',
        icon: 'cloud_off',
        position: 'top-right',
        timeout: 5000,
      })
    }
  }

  /**
   * Vérifie si on est abonné à un topic
   * @param {string} topicId - ID du topic
   * @returns {boolean}
   */
  function isSubscribedToTopic(topicId) {
    return subscribedTopics.value.includes(topicId)
  }

  /**
   * Envoie une notification de test
   */
  function sendTestNotification() {
    if (permissionStatus.value === 'granted') {
      // Contexte window (pas le service worker) : BASE_URL suit le publicPath du build.
      const iconUrl = `${import.meta.env.BASE_URL}icons/icon-128x128.png`
      new Notification(`${CLUB_CONFIG.app.name} - Test`, {
        body: 'Les notifications fonctionnent correctement !',
        icon: iconUrl,
        badge: iconUrl,
        tag: 'test-notification',
      })
    }
  }

  return {
    // État
    permissionStatus,
    isPWAInstalled,
    availableTopics,
    subscribedTopics,
    firebaseConfig,
    vapidKey,

    // Computed
    notificationSupport,
    bellStatus,

    // Actions
    initialize,
    requestPermission,
    subscribeToTopic,
    unsubscribeFromTopic,
    isSubscribedToTopic,
    sendTestNotification,
  }
})
